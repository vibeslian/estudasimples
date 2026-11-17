// Pruebas del contador anónimo (/api/m) y del aviso de la Hotmart (/api/hotmart/webhook), sin wrangler:
// se importan los módulos del Worker y se les da una base de datos SQLite en memoria con el mismo esquema que D1.
// Uso (desde la carpeta pruebas/): node probar-metricas.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const RAIZ = path.resolve("..");
const importa = (f) => import(pathToFileURL(path.join(RAIZ, "pedidos", "src", f)).href);
const metricas = await importa("metricas.mjs");
const hotmart = await importa("hotmart.mjs");

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log("FALLA", msg); } else console.log("OK   ", msg); };

// D1 de mentira sobre SQLite (prepare → bind → run/first/all)
function d1() {
  const db = new DatabaseSync(":memory:");
  db.exec(fs.readFileSync(path.join(RAIZ, "pedidos", "schema.sql"), "utf8"));
  return {
    sqlite: db,
    prepare(sql) {
      let args = [];
      const st = () => db.prepare(sql);
      const api = {
        bind(...a) { args = a; return api; },
        async run() { const r = st().run(...args); return { meta: { changes: r.changes } }; },
        async first() { return st().get(...args) ?? null; },
        async all() { return { results: st().all(...args) }; },
      };
      return api;
    },
  };
}

const tg = [];
const fetchReal = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  if (String(u).includes("/sendMessage")) { tg.push(JSON.parse(o.body)); return new Response("{}"); }
  return fetchReal(u, o);
};

const novoEnv = () => {
  const DB = d1();
  DB.sqlite.prepare("INSERT INTO ajustes (chave, valor) VALUES ('telegram_chat', '123')").run();
  const PAGINAS = ["/kit-tcc/", "/gerador-de-capa-abnt/"];
  const ASSETS = { fetch: async (r) => new Response(null, { status: PAGINAS.includes(new URL(r.url).pathname) ? 200 : 404 }) };
  return { DB, ASSETS, PUBLIC_BASE: "https://estudasimples.com.br", HOTMART_HOTTOK: "hottok-de-prueba-123", TELEGRAM_TOKEN: "tg", TELEGRAM_API_BASE: "https://tg.test" };
};
const req = (url, corpo, headers = {}) => new Request("https://estudasimples.com.br" + url, { method: "POST", headers: { "User-Agent": "Mozilla/5.0 Chrome/150", "Sec-Fetch-Site": "same-origin", ...headers }, body: typeof corpo === "string" ? corpo : JSON.stringify(corpo) });
const soma = (env, pagina, evento) => (env.DB.sqlite.prepare("SELECT SUM(n) AS n FROM metricas WHERE pagina=? AND evento=?").get(pagina, evento).n || 0);

try {
  console.log("== Contador anónimo ==");
  const env = novoEnv();
  ok((await metricas.registra(req("/api/m", { p: "/kit-tcc/", e: "vista" }), env)).status === 204, "una visita válida responde 204 (sin contenido)");
  await metricas.registra(req("/api/m", { p: "/kit-tcc/", e: "vista" }), env);
  await metricas.registra(req("/api/m", { p: "/gerador-de-capa-abnt/", e: "kit" }), env);
  ok(soma(env, "/kit-tcc/", "vista") === 2, "dos visitas a /kit-tcc/ suman 2 en el mismo día");
  ok(soma(env, "/gerador-de-capa-abnt/", "kit") === 1, "el clic en el kit desde la capa queda contado");
  ok((await metricas.registra(req("/api/m", { p: "/kit-tcc/", e: "roubar" }), env)).status === 400, "evento desconocido: 400 y no se guarda");
  await metricas.registra(req("/api/m", { p: "/pagina-inventada-1/", e: "vista" }), env);
  ok(soma(env, "/pagina-inventada-1/", "vista") === 0, "un camino que no existe en el sitio no se guarda (no se puede llenar la base con basura)");
  ok((await metricas.registra(req("/api/m", { p: "/kit-tcc/", e: "vista" }, { "Sec-Fetch-Site": "cross-site" }), env)).status === 403, "desde otro sitio (Sec-Fetch-Site: cross-site): 403");
  ok((await metricas.registra(req("/api/m", { p: "/kit-tcc/", e: "vista" }, { "Sec-Fetch-Site": "", Origin: "https://estudasimples.com.br" }), env)).status === 204, "navegador antiguo sin Sec-Fetch-Site pero con nuestro Origin: se cuenta");
  ok((await metricas.registra(req("/api/m", { p: "https://otro.site/", e: "vista" }), env)).status === 400, "página que no es un camino del sitio: 400");
  ok((await metricas.registra(req("/api/m", { p: "/<script>/", e: "vista" }), env)).status === 400, "camino con caracteres raros: 400");
  ok((await metricas.registra(req("/api/m", { p: "//evil", e: "vista" }), env)).status === 400, "camino con doble barra: 400");
  ok((await metricas.registra(req("/api/m", "x".repeat(2000)), env)).status === 400, "cuerpo grande o que no es JSON: 400");
  await metricas.registra(req("/api/m", { p: "/kit-tcc/", e: "vista" }, { "User-Agent": "Googlebot/2.1" }), env);
  ok(soma(env, "/kit-tcc/", "vista") === 3, "los robots (Googlebot) no se cuentan");
  const cols = env.DB.sqlite.prepare("PRAGMA table_info(metricas)").all().map((c) => c.name).join(",");
  ok(cols === "dia,pagina,evento,n", `la tabla solo guarda día, página, evento y número (sin IP ni datos personales): ${cols}`);
  const r = await (await metricas.resumo(env, 7)).json();
  ok(r.ok && r.porEvento.find((x) => x.evento === "vista").n === 3 && r.porPagina[0].pagina === "/gerador-de-capa-abnt/", "el resumo del panel suma por evento y ordena las páginas por clics de compra");
  ok(/^\d{4}-\d{2}-\d{2}$/.test(metricas.diaBrasil()) && metricas.diaBrasil(Date.UTC(2026, 10, 17, 2, 0)) === "2026-11-16", "el día se cuenta en horario de Brasília (02:00 UTC del 17 = 16 en Brasil)");

  console.log("\n== Aviso de la Hotmart ==");
  const venda = { id: "evt-1", event: "PURCHASE_APPROVED", version: "2.0.0", data: { product: { id: 1, name: "Kit TCC" }, purchase: { transaction: "HP123", price: { value: 29.9, currency_value: "BRL" } }, buyer: { name: "Maria Teste", email: "maria@example.com", document: "00000000000" } } };
  const h = (t) => ({ "X-HOTMART-HOTTOK": t });
  ok((await hotmart.webhook(req("/api/hotmart/webhook", venda), env)).status === 401, "sin el código secreto (hottok): 401, no se registra nada");
  ok((await hotmart.webhook(req("/api/hotmart/webhook", venda, h("hottok-errado")), env)).status === 401, "con un código equivocado: 401");
  ok((await hotmart.webhook(req("/api/hotmart/webhook", venda, h("hottok-de-prueba-123")), { ...env, HOTMART_HOTTOK: "" })).status === 401, "sin el secreto configurado en Cloudflare: queda cerrado (401)");
  ok(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM vendas_hotmart").get().n === 0, "los intentos rechazados no dejaron nada en la base");
  const r1 = await hotmart.webhook(req("/api/hotmart/webhook", venda, h("hottok-de-prueba-123")), env);
  ok(r1.status === 200 && (await r1.json()).novo === true, "venta con el código correcto: 200 y registrada");
  ok(tg.length === 1 && /Venda aprovada/.test(tg[0].text) && /Kit TCC/.test(tg[0].text) && /29,90/.test(tg[0].text), `aviso por Telegram: «${tg[0] && tg[0].text.split("\n").slice(0, 2).join(" | ")}»`);
  ok(!/Maria|maria@|00000000000/.test(tg[0].text), "el aviso de Telegram no lleva nombre, e-mail ni documento del comprador");
  const fila = env.DB.sqlite.prepare("SELECT * FROM vendas_hotmart").get();
  ok(fila.valor_centavos === 2990 && fila.produto === "Kit TCC" && !JSON.stringify(fila).includes("maria"), "en la base: producto y R$ 29,90, sin datos del comprador");
  ok(/^[0-9a-f]{32}$/.test(fila.transacao) && !JSON.stringify(fila).includes("HP123"), "el código de la transacción se guarda cifrado, no el original");
  const r2 = await hotmart.webhook(req("/api/hotmart/webhook", venda, h("hottok-de-prueba-123")), env);
  ok(r2.status === 200 && (await r2.json()).novo === false && tg.length === 1, "si la Hotmart repite el mismo aviso, no se cuenta dos veces ni se avisa de nuevo");
  await hotmart.webhook(req("/api/hotmart/webhook", { ...venda, id: "evt-2", event: "PURCHASE_REFUNDED" }, h("hottok-de-prueba-123")), env);
  ok(tg.length === 2 && /Reembolso/.test(tg[1].text), "el reembolso avisa por Telegram");
  await hotmart.webhook(req("/api/hotmart/webhook", { id: "evt-3", event: "PURCHASE_OUT_OF_SHOPPING_CART", version: "2.0.0", data: { product: { name: "Kit TCC" }, buyer: { email: "x@example.com" } } }, h("hottok-de-prueba-123")), env);
  ok(tg.length === 3 && /Carrinho abandonado/.test(tg[2].text), "el carrito abandonado (sin transacción) se registra con el id del evento y avisa");
  await hotmart.webhook(req("/api/hotmart/webhook", { ...venda, id: "evt-4", event: "PURCHASE_COMPLETE" }, h("hottok-de-prueba-123")), env);
  ok(tg.length === 3 && env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM vendas_hotmart").get().n === 4, "«compra completa» (fin de la garantía) se guarda sin avisar de nuevo");
  ok((await hotmart.webhook(req("/api/hotmart/webhook", { event: "x; DROP TABLE" }, h("hottok-de-prueba-123")), env)).status === 400, "evento con formato raro: 400");
  ok((await hotmart.webhook(req("/api/hotmart/webhook", { ...venda, data: { ...venda.data, purchase: { ...venda.data.purchase, price: { value: 1e9 } } } , id: "evt-5", event: "PURCHASE_DELAYED"}, h("hottok-de-prueba-123")), env)).status === 200 && env.DB.sqlite.prepare("SELECT valor_centavos FROM vendas_hotmart WHERE evento='PURCHASE_DELAYED'").get().valor_centavos === null, "un valor absurdo no se guarda como precio");
} catch (e) {
  fallos++; console.log("FALLA (error inesperado)", e && e.stack ? e.stack : e);
} finally {
  globalThis.fetch = fetchReal;
}
console.log(fallos ? `\n${fallos} FALLA(S) de ${total}` : `\nTodo OK: ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
