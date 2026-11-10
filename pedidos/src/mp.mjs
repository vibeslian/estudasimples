// Mercado Pago: cobro por Pix con el Checkout Pro (la persona paga en la página del Mercado Pago).
// El Worker NUNCA confía en lo que diga el navegador ni en el aviso (webhook): siempre vuelve a preguntarle a
// la API del Mercado Pago, con la clave secreta, si el pago existe, está aprobado y es de este pedido y de este valor.

const base = (env) => (env.MP_API_BASE || "https://api.mercadopago.com").replace(/\/$/, "");

async function mpFetch(env, ruta, opciones = {}) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN sem configurar");
  const r = await fetch(base(env) + ruta, {
    ...opciones,
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", ...(opciones.headers || {}) },
  });
  const texto = await r.text();
  let corpo = null;
  try { corpo = JSON.parse(texto); } catch { /* resposta sem JSON */ }
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status}`);
  return corpo;
}

export async function criaPreferencia(env, pedido) {
  const volta = `${env.PUBLIC_BASE}/pedido/#${pedido.token}`;
  const corpo = {
    items: [{ id: pedido.id, title: `Formatação ABNT do trabalho (pedido ${pedido.id})`, quantity: 1, unit_price: pedido.valor_centavos / 100, currency_id: "BRL" }],
    external_reference: pedido.id,
    notification_url: `${env.PUBLIC_BASE}/api/mp/webhook`,
    back_urls: { success: volta, pending: volta, failure: volta },
    auto_return: "approved",
    payment_methods: {
      excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }, { id: "prepaid_card" }],
      installments: 1,
    },
    statement_descriptor: "ESTUDASIMPLES",
  };
  const r = await mpFetch(env, "/checkout/preferences", { method: "POST", body: JSON.stringify(corpo) });
  if (!r || !r.id || !r.init_point) throw new Error("resposta inesperada do Mercado Pago");
  return { id: String(r.id), url: String(r.init_point) };
}

export const lePagamento = (env, id) => mpFetch(env, `/v1/payments/${encodeURIComponent(id)}`);

export async function procuraPagamentos(env, pedidoId) {
  const r = await mpFetch(env, `/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}&sort=date_created&criteria=desc&limit=10`);
  return (r && r.results) || [];
}

// O pagamento só libera o trabalho se for do pedido, aprovado, em reais e do valor combinado.
export function pagamentoValeParaPedido(pagamento, pedido) {
  if (!pagamento || pagamento.status !== "approved") return { ok: false, motivo: "não aprovado" };
  if (String(pagamento.external_reference) !== pedido.id) return { ok: false, motivo: "outro pedido" };
  if (pagamento.currency_id && pagamento.currency_id !== "BRL") return { ok: false, motivo: "moeda diferente" };
  const centavos = Math.round(Number(pagamento.transaction_amount) * 100);
  if (centavos !== pedido.valor_centavos) return { ok: false, motivo: "valor diferente" };
  return { ok: true };
}
