// Parte privada (solo Lian, detrás de Cloudflare Access): ver pedidos, bajar el original, subir el trabajo y marcar «pronto».
import { MAX_ARCHIVO, DIAS_APAGAR_ENTREGA, TIPOS, ID_RE, ahora, json, erro, arquivo, tipoReal, primeiroNome, temChave } from "./util.mjs";

const CAMPOS_LISTA = "id, nome, whatsapp, tamanho, arquivo_nome, arquivo_tipo, arquivo_bytes, status, valor_centavos, tem_previa, tem_docx, tem_pdf, aviso, criado_em, pronto_em, pago_em, apagar_em";

export async function listar(env) {
  const r = await env.DB.prepare(`SELECT ${CAMPOS_LISTA} FROM pedidos WHERE status != 'apagado' OR aviso IS NOT NULL ORDER BY (status IN ('recebido','em_andamento','pronto')) DESC, criado_em DESC LIMIT 200`).all();
  return json({ ok: true, pedidos: r.results });
}

async function pedido(env, id) {
  if (!ID_RE.test(id)) return null;
  const p = await env.DB.prepare("SELECT * FROM pedidos WHERE id=?1").bind(id).first();
  return p && (p.status !== "apagado" || p.aviso) ? p : null; // um pedido apagado só aparece se tiver um aviso para o Lian (por exemplo, pagamento depois do apagamento)
}

export async function detalhe(env, id) {
  const p = await pedido(env, id);
  if (!p) return erro(404, "Pedido não encontrado.");
  const { token, ip_hash, mp_url, ...resto } = p;
  return json({ ok: true, pedido: resto, link: `${env.PUBLIC_BASE}/pedido/#${token}` });
}

export async function baixarOriginal(env, id) {
  const p = await pedido(env, id);
  if (!p) return erro(404, "Pedido não encontrado.");
  if (p.status === "apagado") return erro(404, "Os arquivos deste pedido já foram apagados.");
  const o = await env.ARQUIVOS.get(`orig/${p.id}/original.${TIPOS[p.arquivo_tipo].ext}`);
  if (!o) return erro(404, "Arquivo não encontrado.");
  return arquivo(o.body, TIPOS[p.arquivo_tipo].mime, `original-${p.id}.${TIPOS[p.arquivo_tipo].ext}`);
}

const ONDE = {
  previa: { tipo: "pdf", chave: (id) => `previa/${id}/previa.pdf`, coluna: "tem_previa" },
  docx: { tipo: "docx", chave: (id) => `final/${id}/trabalho.docx`, coluna: "tem_docx" },
  pdf: { tipo: "pdf", chave: (id) => `final/${id}/trabalho.pdf`, coluna: "tem_pdf" },
};

export async function subir(request, env, id, qual) {
  const p = await pedido(env, id);
  const alvo = temChave(ONDE, qual) ? ONDE[qual] : null;
  if (!p || !alvo) return erro(404, "Pedido ou tipo de arquivo não encontrado.");
  if (["pago", "reembolsado", "apagado"].includes(p.status)) return erro(409, "Este pedido já foi concluído; não dá para trocar os arquivos.");
  if (Number(request.headers.get("Content-Length") || 0) > MAX_ARCHIVO) return erro(413, "Arquivo grande demais (limite de 25 MB).");
  const corpo = await request.arrayBuffer();
  if (!corpo.byteLength || corpo.byteLength > MAX_ARCHIVO) return erro(400, "Arquivo vazio ou grande demais.");
  const blob = new Blob([corpo]);
  if ((await tipoReal(blob)) !== alvo.tipo) return erro(400, alvo.tipo === "pdf" ? "Este arquivo precisa ser um PDF." : "Este arquivo precisa ser Word (.docx).");
  await env.ARQUIVOS.put(alvo.chave(p.id), corpo, { httpMetadata: { contentType: TIPOS[alvo.tipo].mime } });
  const novoStatus = p.status === "recebido" ? "em_andamento" : p.status;
  await env.DB.prepare(`UPDATE pedidos SET ${alvo.coluna}=1, status=?2 WHERE id=?1`).bind(p.id, novoStatus).run();
  return json({ ok: true });
}

export async function andamento(env, id) {
  const p = await pedido(env, id);
  if (!p) return erro(404, "Pedido não encontrado.");
  if (p.status === "recebido") await env.DB.prepare("UPDATE pedidos SET status='em_andamento' WHERE id=?1").bind(p.id).run();
  return json({ ok: true });
}

export async function marcarPronto(request, env, id) {
  const p = await pedido(env, id);
  if (!p) return erro(404, "Pedido não encontrado.");
  if (!["recebido", "em_andamento", "pronto"].includes(p.status)) return erro(409, "Este pedido já foi concluído ou apagado.");
  let c = null;
  try { c = await request.json(); } catch { /* sem corpo */ }
  const centavos = Math.round(Number(c && c.valor_reais) * 100);
  if (!Number.isInteger(centavos) || centavos < 500 || centavos > 100000) return erro(400, "Informe o valor em reais (entre 5 e 1.000).");
  if (!p.tem_previa || !p.tem_docx || !p.tem_pdf) return erro(400, "Envie primeiro a prévia, o trabalho em Word e o trabalho em PDF.");
  if (p.status === "pronto" && p.mp_url && centavos !== p.valor_centavos) return erro(409, "O link de pagamento já foi aberto com outro valor. Apague o pedido e crie de novo, ou fale com o suporte.");
  const t = ahora();
  await env.DB.prepare(
    "UPDATE pedidos SET status='pronto', valor_centavos=?2, pronto_em=COALESCE(pronto_em, ?3), apagar_em=?4 WHERE id=?1",
  ).bind(p.id, centavos, t, t + DIAS_APAGAR_ENTREGA * 86400).run();
  const link = `${env.PUBLIC_BASE}/pedido/#${p.token}`;
  const nome = primeiroNome(p.nome);
  const texto = `Oi${nome ? ", " + nome : ""}! Aqui é o Lian, do Estuda Simples. O seu trabalho está pronto. Veja a prévia e pague por Pix neste link: ${link}`;
  return json({ ok: true, link, whatsapp: `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(texto)}`, texto });
}

export async function reembolsado(env, id) {
  const p = await pedido(env, id);
  if (!p) return erro(404, "Pedido não encontrado.");
  await env.DB.prepare("UPDATE pedidos SET status='reembolsado' WHERE id=?1").bind(p.id).run();
  return json({ ok: true });
}

// Apaga arquivos e dados pessoais (botão «apagar» e limpeza diária). Primeiro marca o pedido como apagado (e, na limpeza,
// só se continua vencido e no mesmo estado: assim um pagamento que entra bem agora não perde os arquivos); depois apaga os arquivos.
export async function apagarPedido(env, p, soSeVencido = false) {
  const t = ahora();
  const r = await env.DB.prepare(
    "UPDATE pedidos SET status='apagado', nome=NULL, whatsapp=NULL, arquivo_nome=NULL, ip_hash=NULL, mp_url=NULL, tem_previa=0, tem_docx=0, tem_pdf=0, apagado_em=?2 WHERE id=?1 AND status=?3 AND (?4=0 OR apagar_em <= ?2)",
  ).bind(p.id, t, p.status, soSeVencido ? 1 : 0).run();
  if (!r.meta.changes) return false;
  await env.ARQUIVOS.delete([`orig/${p.id}/original.docx`, `orig/${p.id}/original.pdf`, `previa/${p.id}/previa.pdf`, `final/${p.id}/trabalho.docx`, `final/${p.id}/trabalho.pdf`]);
  return true;
}

export async function apagar(env, id) {
  const p = await pedido(env, id);
  if (!p) return erro(404, "Pedido não encontrado.");
  try { await apagarPedido(env, p); } catch (e) { console.error("falha ao apagar arquivos", p.id, e && e.message); return erro(500, "Não consegui apagar os arquivos agora. Tente de novo."); }
  return json({ ok: true });
}

export async function limpezaDiaria(env) {
  const vencidos = await env.DB.prepare("SELECT * FROM pedidos WHERE status != 'apagado' AND apagar_em <= ?1 LIMIT 100").bind(ahora()).all();
  let n = 0;
  for (const p of vencidos.results) {
    try { if (await apagarPedido(env, p, true)) n++; } catch (e) { console.error("falha ao apagar", p.id, e && e.message); } // um pedido com problema não impede apagar os outros
  }
  await env.DB.prepare("DELETE FROM limites WHERE expira < ?1").bind(ahora()).run();
  return n;
}
