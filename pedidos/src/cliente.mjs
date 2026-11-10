// Parte pública: lo que hace el cliente (pedir, ver el estado, pagar, descargar) y el aviso del Mercado Pago.
import {
  MAX_ARCHIVO, DIAS_APAGAR_ENTREGA, DIAS_APAGAR_SIN_CONCLUIR, TIPOS, TOKEN_RE,
  ahora, json, erro, arquivo, novoId, novoToken, normalizaWhatsapp, nomeLimpo, primeiroNome,
  nomeArquivoSeguro, tipoReal, limitar, ipHash, hmacHex, lerJson, temChave,
} from "./util.mjs";
import { criaPreferencia, lePagamento, procuraPagamentos, pagamentoValeParaPedido } from "./mp.mjs";

const TAMANHOS = new Set(["ate30", "de31a60", "mais60"]);
const VERSAO_TERMOS = "2026-11-07";

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // antispam opcional: só vale se a chave estiver configurada
  if (!token) return false;
  const f = new FormData();
  f.append("secret", env.TURNSTILE_SECRET);
  f.append("response", token);
  f.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: f });
    return (await r.json()).success === true;
  } catch {
    return false;
  }
}

// ---------- 1) O cliente faz o pedido ----------
export async function criaPedido(request, env) {
  const tamanhoDoCorpo = Number(request.headers.get("Content-Length") || 0);
  if (tamanhoDoCorpo > MAX_ARCHIVO + 200 * 1024) return erro(413, "O arquivo é grande demais. O limite é de 25 MB.");
  const ip = await ipHash(request, env);
  if (!(await limitar(env, `ped-ip:${ip}`, 12, 3600))) return erro(429, "Muitas tentativas. Tente de novo mais tarde.");
  const hoje = await env.DB.prepare("SELECT COUNT(*) AS n FROM pedidos WHERE criado_em > ?1").bind(ahora() - 86400).first();
  if (hoje.n >= Number(env.MAX_PEDIDOS_DIA || 30)) return erro(429, "Recebi muitos pedidos hoje. Tente de novo amanhã ou chame no WhatsApp do site.");
  let f;
  try { f = await request.formData(); } catch { return erro(400, "Não foi possível ler o formulário."); }

  if (f.get("consentimento") !== "sim") return erro(400, "É preciso concordar com os Termos de Uso e a Política de Privacidade.");
  if (f.get("site")) return json({ ok: true }); // campo-armadilha para robôs: quem o preenche é ignorado em silêncio
  if (!(await turnstileOk(env, f.get("cf-turnstile-response"), request.headers.get("CF-Connecting-IP") || ""))) return erro(400, "Não foi possível confirmar que você não é um robô. Tente de novo.");
  const tamanho = String(f.get("tamanho") || "");
  if (!TAMANHOS.has(tamanho)) return erro(400, "Escolha o tamanho do trabalho.");
  const whatsapp = normalizaWhatsapp(f.get("whatsapp"));
  if (!whatsapp) return erro(400, "Confira o WhatsApp: use o DDD e o número, por exemplo (63) 91234-5678.");
  const nome = nomeLimpo(f.get("nome"));
  const arq = f.get("arquivo");
  if (!arq || typeof arq === "string" || !arq.size) return erro(400, "Anexe o arquivo do trabalho.");
  if (arq.size > MAX_ARCHIVO) return erro(413, "O arquivo é grande demais. O limite é de 25 MB.");
  const tipo = await tipoReal(arq);
  if (!tipo) return erro(400, "O arquivo precisa ser Word (.docx) ou PDF. Se o seu for .doc, abra no Word e salve como .docx.");
  if (!(await limitar(env, `ped-tel:${await hmacHex(env, whatsapp)}`, 3, 86400))) return erro(429, "Muitas tentativas. Tente de novo mais tarde ou chame no WhatsApp do site.");

  const id = novoId();
  const token = novoToken();
  const t = ahora();
  const chave = `orig/${id}/original.${TIPOS[tipo].ext}`;
  await env.ARQUIVOS.put(chave, await arq.arrayBuffer(), { httpMetadata: { contentType: TIPOS[tipo].mime } });
  try {
    await env.DB.prepare(
      "INSERT INTO pedidos (id, token, nome, whatsapp, tamanho, arquivo_nome, arquivo_tipo, arquivo_bytes, status, criado_em, apagar_em, consentimento_em, consentimento_versao, ip_hash) " +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'recebido', ?9, ?10, ?9, ?11, ?12)",
    ).bind(id, token, nome || null, whatsapp, tamanho, nomeArquivoSeguro(arq.name), tipo, arq.size, t, t + DIAS_APAGAR_SIN_CONCLUIR * 86400, VERSAO_TERMOS, ip).run();
  } catch (e) {
    await env.ARQUIVOS.delete(chave); // não deixa arquivo solto se o registro falhar
    return erro(500, "Não foi possível registrar o pedido. Tente de novo em instantes.");
  }
  return json({ ok: true, id, codigo: token });
}

// ---------- ajudas do cliente ----------
async function pedidoPorCodigo(request, env) {
  if (!(await limitar(env, `api-ip:${await ipHash(request, env)}`, 240, 3600))) return { erroResp: erro(429, "Muitas tentativas. Tente de novo mais tarde.") };
  const corpo = await lerJson(request);
  const codigo = corpo && typeof corpo.codigo === "string" ? corpo.codigo : "";
  if (!TOKEN_RE.test(codigo)) return { erroResp: erro(404, "Pedido não encontrado.") };
  const p = await env.DB.prepare("SELECT * FROM pedidos WHERE token = ?1").bind(codigo).first();
  if (!p || p.status === "apagado") return { erroResp: erro(404, "Pedido não encontrado ou já apagado.") };
  return { p, corpo };
}

const visao = (p) => ({
  id: p.id,
  status: p.status,
  nome: primeiroNome(p.nome),
  valor_centavos: p.status === "recebido" || p.status === "em_andamento" ? null : p.valor_centavos,
  tem_previa: !!p.tem_previa,
  pode_baixar: p.status === "pago",
  apagar_em: p.status === "pago" ? p.apagar_em : null,
});

// Marca o pedido como pago, uma única vez (a condição status='pronto' impede repetir).
async function liberaPagamento(env, p, pagamentoId) { // só libera se o valor do pedido continua o mesmo que foi pago
  const t = ahora();
  await env.DB.prepare(
    "UPDATE pedidos SET status='pago', aviso=NULL, pago_em=?2, apagar_em=?3, mp_pagamento_id=?4 WHERE id=?1 AND status='pronto' AND valor_centavos=?5",
  ).bind(p.id, t, t + DIAS_APAGAR_ENTREGA * 86400, String(pagamentoId), p.valor_centavos).run();
}

async function confereComMercadoPago(env, p) {
  const achados = await procuraPagamentos(env, p.id);
  for (const pg of achados) {
    const v = pagamentoValeParaPedido(pg, p);
    if (v.ok) { await liberaPagamento(env, p, pg.id); return true; }
    if (pg.status === "approved") await env.DB.prepare("UPDATE pedidos SET aviso=?2 WHERE id=?1").bind(p.id, `Pagamento ${pg.id} aprovado mas ${v.motivo}`).run();
  }
  return false;
}

// ---------- 2) Estado do pedido (o cliente abre o link) ----------
export async function estado(request, env) {
  const { p, corpo, erroResp } = await pedidoPorCodigo(request, env);
  if (erroResp) return erroResp;
  let atual = p;
  if (corpo.verificar === true && p.status === "pronto" && p.mp_preferencia_id && env.MP_ACCESS_TOKEN && (await limitar(env, `ver:${p.id}`, 30, 3600))) {
    try {
      if (await confereComMercadoPago(env, p)) atual = await env.DB.prepare("SELECT * FROM pedidos WHERE id=?1").bind(p.id).first();
    } catch { /* se o Mercado Pago falhar, mostra o estado que já tem */ }
  }
  return json({ ok: true, pedido: visao(atual) });
}

export async function previa(request, env) {
  const { p, erroResp } = await pedidoPorCodigo(request, env);
  if (erroResp) return erroResp;
  if (!p.tem_previa || !["pronto", "pago"].includes(p.status)) return erro(404, "A prévia ainda não está disponível.");
  const o = await env.ARQUIVOS.get(`previa/${p.id}/previa.pdf`);
  if (!o) return erro(404, "A prévia não foi encontrada.");
  return new Response(o.body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="previa.pdf"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}

// ---------- 3) Pagar ----------
export async function pagar(request, env) {
  const { p, erroResp } = await pedidoPorCodigo(request, env);
  if (erroResp) return erroResp;
  if (p.status === "pago") return json({ ok: true, ja_pago: true });
  if (p.status !== "pronto" || !p.valor_centavos) return erro(409, "Este pedido ainda não está pronto para pagamento.");
  if (!env.MP_ACCESS_TOKEN) return erro(503, "O pagamento ainda não está disponível. Fale comigo pelo WhatsApp.");
  if (!(await limitar(env, `pagar:${p.id}`, 12, 3600))) return erro(429, "Muitas tentativas. Tente de novo mais tarde.");
  if (p.mp_url) return json({ ok: true, url: p.mp_url });
  try {
    const pref = await criaPreferencia(env, p);
    const r = await env.DB.prepare("UPDATE pedidos SET mp_preferencia_id=?2, mp_url=?3 WHERE id=?1 AND status='pronto' AND valor_centavos=?4 AND mp_url IS NULL").bind(p.id, pref.id, pref.url, p.valor_centavos).run();
    if (!r.meta.changes) { // outra aba abriu o pagamento ao mesmo tempo, ou o valor mudou agora
      const atual = await env.DB.prepare("SELECT * FROM pedidos WHERE id=?1").bind(p.id).first();
      if (atual && atual.status === "pronto" && atual.mp_url && atual.valor_centavos === p.valor_centavos) return json({ ok: true, url: atual.mp_url });
      return erro(409, "O valor do pedido mudou agora. Abra o link de novo.");
    }
    return json({ ok: true, url: pref.url });
  } catch {
    return erro(502, "Não consegui abrir o pagamento agora. Tente de novo em instantes.");
  }
}

// ---------- 4) Baixar (só depois de o pagamento ser confirmado no servidor) ----------
export async function baixar(request, env, tipo) {
  if (!temChave(TIPOS, tipo)) return erro(404, "Arquivo não encontrado.");
  const { p, erroResp } = await pedidoPorCodigo(request, env);
  if (erroResp) return erroResp;
  if (p.status !== "pago") return erro(402, "O download só é liberado depois que o pagamento for confirmado.");
  if (p.apagar_em <= ahora()) return erro(410, "O prazo de download acabou e o arquivo já foi apagado.");
  const o = await env.ARQUIVOS.get(`final/${p.id}/trabalho.${TIPOS[tipo].ext}`);
  if (!o) return erro(404, "Arquivo não encontrado.");
  return arquivo(o.body, TIPOS[tipo].mime, `trabalho-formatado-${p.id}.${TIPOS[tipo].ext}`);
}

// ---------- 5) Aviso do Mercado Pago (webhook) ----------
export async function webhookMp(request, env) {
  const url = new URL(request.url);
  let id = url.searchParams.get("data.id") || (url.searchParams.get("topic") === "payment" ? url.searchParams.get("id") : null);
  let tipo = url.searchParams.get("type") || url.searchParams.get("topic");
  if (!id && request.method === "POST") {
    const c = await lerJson(request, 20000);
    if (c) { id = c.data && c.data.id != null ? String(c.data.id) : null; tipo = tipo || c.type; }
  }
  if (tipo !== "payment" || !id || !/^\d{1,20}$/.test(id)) return json({ ok: true }); // outro tipo de aviso: confirma e ignora
  if (!env.MP_ACCESS_TOKEN) return erro(503, "Pagamento sem configurar.");
  let pagamento;
  try {
    pagamento = await lePagamento(env, id);
  } catch {
    return erro(502, "Falha ao consultar o Mercado Pago."); // erro 5xx: o Mercado Pago tenta de novo depois
  }
  const pedidoId = String((pagamento && pagamento.external_reference) || "");
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(pedidoId)) return json({ ok: true });
  const p = await env.DB.prepare("SELECT * FROM pedidos WHERE id=?1").bind(pedidoId).first();
  if (!p) return json({ ok: true });
  const v = pagamentoValeParaPedido(pagamento, p);
  if (v.ok && p.status === "pronto") await liberaPagamento(env, p, pagamento.id);
  else if (v.ok && p.mp_pagamento_id !== String(pagamento.id)) await env.DB.prepare("UPDATE pedidos SET aviso=?2 WHERE id=?1").bind(p.id, `Pagamento ${pagamento.id} válido recebido, mas o pedido está "${p.status}". Confira e, se for o caso, reembolse no Mercado Pago.`).run();
  else if (pagamento.status === "approved" && !v.ok) await env.DB.prepare("UPDATE pedidos SET aviso=?2 WHERE id=?1").bind(p.id, `Pagamento ${pagamento.id} aprovado mas ${v.motivo}`).run();
  return json({ ok: true });
}
