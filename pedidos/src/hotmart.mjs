// Aviso automático da Hotmart (webhook 2.0): cada venda, reembolso ou carrinho abandonado do Kit TCC chega aqui.
// A Hotmart manda o código secreto «hottok» no cabeçalho X-HOTMART-HOTTOK; ele fica guardado como segredo HOTMART_HOTTOK.
// Não guardamos dados do comprador (nome, e-mail, documento): só o evento, o produto, o valor e a data.
import { json, erro, lerJson, ahora, avisarLian, hmacHex } from "./util.mjs";

const AVISOS = {
  PURCHASE_APPROVED: "Venda aprovada na Hotmart",
  PURCHASE_REFUNDED: "Reembolso na Hotmart",
  PURCHASE_CHARGEBACK: "Contestação (chargeback) na Hotmart",
  PURCHASE_CANCELED: "Compra cancelada na Hotmart",
  PURCHASE_PROTEST: "Pedido de reembolso na Hotmart",
  PURCHASE_OUT_OF_SHOPPING_CART: "Carrinho abandonado na Hotmart",
};
const EVENTO_RE = /^[A-Z_]{3,60}$/;

async function iguais(a, b) {
  // Comparação em tempo constante (não revela quantos caracteres batem)
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}

const texto = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : null);

export async function webhook(request, env) {
  const recebido = request.headers.get("X-HOTMART-HOTTOK") || "";
  if (!env.HOTMART_HOTTOK || !recebido || !(await iguais(recebido, env.HOTMART_HOTTOK))) return erro(401, "Não autorizado.");
  const corpo = await lerJson(request, 65536);
  if (!corpo || !EVENTO_RE.test(corpo.event || "")) return erro(400, "Dados inválidos.");
  const d = corpo.data && typeof corpo.data === "object" ? corpo.data : {};
  const compra = d.purchase && typeof d.purchase === "object" ? d.purchase : {};
  const produto = texto(d.product && d.product.name, 120);
  const original = texto(compra.transaction, 80) || texto(corpo.id, 80);
  if (!original) return erro(400, "Dados inválidos.");
  const transacao = await hmacHex(env, "hotmart|" + original); // cifrado: serve só para não contar a mesma venda duas vezes
  const preco = compra.price && typeof compra.price === "object" ? compra.price : {};
  const valor = typeof preco.value === "number" ? preco.value : typeof preco.value === "string" && preco.value.trim() ? Number(preco.value) : NaN;
  const centavos = Number.isFinite(valor) && valor >= 0 && valor < 100000 ? Math.round(valor * 100) : null;
  const moeda = texto(preco.currency_value, 8);
  // A Hotmart pode repetir o mesmo aviso: a chave (transação, evento) garante que cada um conta uma vez só.
  const r = await env.DB.prepare(
    "INSERT OR IGNORE INTO vendas_hotmart (transacao, evento, produto, valor_centavos, moeda, criado_em) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  ).bind(transacao, corpo.event, produto, centavos, moeda, ahora()).run();
  const novo = r.meta && r.meta.changes > 0;
  if (novo && AVISOS[corpo.event]) {
    const valorTexto = centavos != null ? ` · ${moeda || "BRL"} ${(centavos / 100).toFixed(2).replace(".", ",")}` : "";
    await avisarLian(env, AVISOS[corpo.event], `${produto || "Produto"}${valorTexto}`);
  }
  return json({ ok: true, novo });
}
