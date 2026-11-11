// Prueba de punta a punta del flujo de pedidos (Worker de verdad en local con wrangler dev + un Mercado Pago de mentira).
// Uso (desde la carpeta pruebas/): node probar-pedidos.mjs
// OJO: es una simulación local (R2 y D1 simulados, Mercado Pago falso). NO prueba el Mercado Pago real ni Cloudflare Access real.
import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = path.resolve("..");
const PUERTO = 8799, PUERTO_MP = 8798, PUERTO_NTFY = 8794, PUERTO_TG = 8793;
const BASE = `http://localhost:${PUERTO}`;
const persist = fs.mkdtempSync(path.join(os.tmpdir(), "pedidos-test-"));
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log("FALLA", msg); } else console.log("OK   ", msg); };
const WR = process.platform === "win32" ? "npx.cmd" : "npx";

// ---- Mercado Pago de mentira ----
const pagamentos = new Map(); // id -> objeto de pago
const preferencias = [];
const mp = http.createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (c) => (cuerpo += c));
  req.on("end", () => {
    const u = new URL(req.url, "http://x");
    const enviar = (o, s = 200) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.headers.authorization !== "Bearer token-de-prueba") return enviar({ message: "no autorizado" }, 401);
    if (req.method === "POST" && u.pathname === "/checkout/preferences") {
      const b = JSON.parse(cuerpo); preferencias.push(b);
      return enviar({ id: "pref-" + preferencias.length, init_point: "https://mp.test/pagar/" + b.external_reference });
    }
    if (req.method === "GET" && u.pathname === "/v1/payments/search") {
      const ref = u.searchParams.get("external_reference");
      return enviar({ results: [...pagamentos.values()].filter((p) => p.external_reference === ref) });
    }
    const m = /^\/v1\/payments\/(\d+)$/.exec(u.pathname);
    if (req.method === "GET" && m) return pagamentos.has(m[1]) ? enviar(pagamentos.get(m[1])) : enviar({ message: "no existe" }, 404);
    enviar({ message: "ruta desconocida" }, 404);
  });
});
await new Promise((r) => mp.listen(PUERTO_MP, r));
// ntfy de mentira: guarda los avisos que el Worker manda al celular de Lian
const avisos = [];
const aguardaAviso = async (n) => { for (let i = 0; i < 40 && avisos.length < n; i++) await new Promise((x) => setTimeout(x, 100)); };
const ntfy = http.createServer((req, res) => { let c = ""; req.on("data", (d) => (c += d)); req.on("end", () => { avisos.push({ ruta: req.url, titulo: req.headers.title, click: req.headers.click, cuerpo: c }); res.writeHead(200); res.end("{}"); }); });
await new Promise((r) => ntfy.listen(PUERTO_NTFY, r));
// Telegram de mentira: getUpdates (con o sin mensajes de Lian) y sendMessage
const tgEnvios = []; let tgUpdates = [];
const tg = http.createServer((req, res) => { let c = ""; req.on("data", (d) => (c += d)); req.on("end", () => {
  const u = new URL(req.url, "http://x"); const env = (o, s = 200) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  if (!u.pathname.startsWith("/bottoken-tg/")) return env({ ok: false }, 401);
  if (u.pathname.endsWith("/getUpdates")) return env({ ok: true, result: tgUpdates });
  if (u.pathname.endsWith("/sendMessage")) { tgEnvios.push(JSON.parse(c)); return env({ ok: true, result: {} }); }
  env({ ok: false }, 404);
}); });
await new Promise((r) => tg.listen(PUERTO_TG, r));
const aguardaTg = async (n) => { for (let i = 0; i < 40 && tgEnvios.length < n; i++) await new Promise((x) => setTimeout(x, 100)); };

function arrancar(puerto, vars, dirPersist) {
  const args = ["wrangler", "dev", "--local", "--port", String(puerto), "--persist-to", dirPersist, "--ip", "127.0.0.1"];
  for (const [k, v] of Object.entries(vars)) args.push("--var", `${k}:${v}`);
  const p = spawn(WR, args, { cwd: RAIZ, shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  p.stdout.on("data", (c) => (log += c)); p.stderr.on("data", (c) => (log += c));
  return { p, log: () => log };
}
async function esperar(puerto, srv) {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`http://127.0.0.1:${puerto}/api/saude`); if (r.ok) return; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("el Worker local no arrancó:\n" + srv.log().slice(-1500));
}
const sinWorkerd = async () => { for (let i = 0; i < 30; i++) { try { if (!/workerd.exe/i.test(execFileSync("tasklist", ["/FI", "IMAGENAME eq workerd.exe"]).toString())) return; } catch { return; } await new Promise((x) => setTimeout(x, 1000)); } };
const parar = (srv) => { try { execFileSync("taskkill", ["/pid", String(srv.p.pid), "/T", "/F"], { stdio: "ignore" }); } catch { try { srv.p.kill(); } catch { /* ya cerró */ } } };

execFileSync(WR, ["wrangler", "d1", "execute", "estudasimples-pedidos", "--local", "--persist-to", persist, "--file=pedidos/schema.sql"], { cwd: RAIZ, shell: process.platform === "win32", stdio: "ignore" });
let comAdmin = arrancar(PUERTO, { PUBLIC_BASE: BASE, DEV_ADMIN_BYPASS: "sim-local", MP_ACCESS_TOKEN: "token-de-prueba", MP_API_BASE: `http://127.0.0.1:${PUERTO_MP}`, NTFY_TOPIC: "topico-de-prueba", NTFY_BASE: `http://127.0.0.1:${PUERTO_NTFY}`, TELEGRAM_TOKEN: "token-tg", TELEGRAM_API_BASE: `http://127.0.0.1:${PUERTO_TG}` }, persist);
try {
  await esperar(PUERTO, comAdmin);

  // un .docx de mentira: empieza como zip y trae adentro el nombre «word/document.xml» (lo que mira el servidor)
  const docx = (extra = "") => new Blob([Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), "contenido de prueba " + extra + " word/document.xml"], { type: "application/octet-stream" });
  const docxConMacros = () => new Blob([Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), "word/document.xml word/vbaProject.bin"]);
  const pdf = (extra = "") => new Blob(["%PDF-1.4\n", "prueba " + extra], { type: "application/pdf" });
  const H = { Origin: BASE };
  const HA = { Origin: BASE, "X-Painel": "1" };
  const post = (ruta, cuerpo, h = H) => fetch(BASE + ruta, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  let n = 0;
  const pedir = (over = {}, ip = "9.9.9.9") => {
    const f = new FormData();
    f.set("tamanho", over.tamanho ?? "ate30"); f.set("nome", over.nome ?? "Maria Souza");
    f.set("whatsapp", over.whatsapp ?? `639${80000000 + ++n}`); // 11 dígitos: DDD + 9 + 8 dígitos
    f.set("consentimento", over.consentimento ?? "sim");
    if (over.sem_arquivo !== true) f.set("arquivo", over.arquivo ?? docx(), over.nomeArq ?? "meu tcc.docx");
    if (over.site) f.set("site", over.site);
    return fetch(BASE + "/api/pedidos", { method: "POST", headers: { ...H, "CF-Connecting-IP": ip }, body: f });
  };

  console.log("== 1) Pedir ==");
  let r = await pedir({ consentimento: "nao" }); ok(r.status === 400, "sin marcar la casilla de privacidad: rechaza");
  r = await pedir({ tamanho: "gratis" }); ok(r.status === 400, "tamaño inválido: rechaza");
  r = await pedir({ whatsapp: "123" }); ok(r.status === 400, "WhatsApp inválido: rechaza");
  r = await pedir({ sem_arquivo: true }); ok(r.status === 400, "sin archivo: rechaza");
  r = await pedir({ arquivo: new Blob(["MZ ejecutable disfrazado"]), nomeArq: "tcc.docx" }); ok(r.status === 400, "un archivo que dice ser .docx pero no lo es: rechaza (se mira el contenido, no el nombre)");
  r = await pedir({ arquivo: new Blob([Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), "zip cualquiera sin documento de Word"]), nomeArq: "x.docx" }); ok(r.status === 400, "un zip cualquiera (sin word/document.xml) no pasa por .docx");
  r = await pedir({ arquivo: docxConMacros(), nomeArq: "macros.docx" }); ok(r.status === 400, "un Word con macros (vbaProject.bin) se rechaza");
  r = await pedir({ site: "http://spam" }); ok(r.status === 200 && !(await r.json()).codigo, "campo-trampa para robots: se ignora sin crear pedido");
  r = await fetch(BASE + "/api/pedidos", { method: "POST", headers: { Origin: "https://malo.example" }, body: new FormData() }); ok(r.status === 403, "pedido desde otro sitio (Origin ajeno): 403");
  r = await pedir(); const c1 = await r.json(); ok(r.status === 200 && c1.ok && c1.id && c1.codigo && c1.codigo.length === 43, "pedido válido: devuelve código corto y código secreto de 43 caracteres");

  await aguardaAviso(1);
  ok(avisos.length === 1 && /ntfy|topico-de-prueba/.test(avisos[0].ruta) && /Novo pedido/.test(avisos[0].titulo) && avisos[0].cuerpo.includes(c1.id) && avisos[0].click === BASE + "/painel/", "un pedido nuevo manda un aviso al celular de Lian (con el código del pedido y el enlace al panel)");
  ok(!/Maria|639|55/.test(avisos[0].cuerpo.replace(c1.id, "")), "el aviso no lleva nombre ni teléfono del cliente");
  console.log("== 2) Estado y accesos sin pagar ==");
  r = await post("/api/pedido/estado", { codigo: c1.codigo }); let e = await r.json();
  ok(r.status === 200 && e.pedido.status === "recebido" && e.pedido.valor_centavos === null && e.pedido.nome === "Maria", "estado «recebido», sin valor, solo el primer nombre");
  ok(!JSON.stringify(e).includes("whatsapp") && !JSON.stringify(e).includes("55"), "la respuesta al cliente no trae el WhatsApp ni datos internos");
  r = await post("/api/pedido/estado", { codigo: "x".repeat(43) }); ok(r.status === 404, "código que no existe: 404");
  r = await post("/api/pedido/estado", { codigo: "corto" }); ok(r.status === 404, "código mal formado: 404");
  r = await post("/api/pedido/baixar/docx", { codigo: c1.codigo }); ok(r.status === 402, "descargar antes de pagar: 402");
  r = await post("/api/pedido/previa", { codigo: c1.codigo }); ok(r.status === 404, "prévia que aún no existe: 404");
  r = await post("/api/pedido/pagar", { codigo: c1.codigo }); ok(r.status === 409, "pagar antes de estar listo: 409");

  console.log("== 3) Panel de Lian ==");
  const antesTeste = avisos.length; r = await fetch(BASE + "/api/admin/teste-aviso", { method: "POST", headers: HA }); const te = await r.json();
  ok(r.status === 200 && te.resultado.ntfy.ok === true && te.resultado.ntfy.status === 200 && te.resultado.telegram.ok === false && /vincular/.test(te.resultado.telegram.motivo) && avisos.length === antesTeste + 1 && /Teste de aviso/.test(avisos[avisos.length - 1].titulo) && !JSON.stringify(te).includes("topico-de-prueba"), "el botón «Testar o aviso do celular» manda un aviso de prueba y no muestra el nombre secreto del tópico");
  ok((await fetch(BASE + "/api/admin/teste-aviso", { method: "POST", headers: H })).status === 403, "el aviso de prueba exige la cabecera del panel (anti-CSRF)");
  const vinc = () => fetch(BASE + "/api/admin/vincular-telegram", { method: "POST", headers: HA }).then((x) => x.json());
  ok((await fetch(BASE + "/api/admin/vincular-telegram", { method: "POST", headers: H })).status === 403, "vincular Telegram exige la cabecera del panel (anti-CSRF)");
  let vr = await vinc(); ok(vr.resultado.ok === false && /mande \/start|ninguém/.test(vr.resultado.motivo), "vincular sin que nadie haya escrito al bot: explica qué hacer");
  tgUpdates = [{ message: { chat: { id: 111, type: "group" } } }]; vr = await vinc(); ok(vr.resultado.ok === false, "un grupo no cuenta: solo la conversación privada de Lian");
  tgUpdates = [{ message: { chat: { id: 7000123, type: "private" }, text: "/start" } }]; vr = await vinc();
  ok(vr.resultado.vinculado === true && vr.resultado.ok === true && tgEnvios.length === 1 && tgEnvios[0].chat_id === "7000123" && /Telegram vinculado/.test(tgEnvios[0].text), "Lian manda /start al bot y aprieta «Vincular»: se guarda su conversación y llega el mensaje de confirmación");
  r = await fetch(BASE + "/api/admin/teste-aviso", { method: "POST", headers: HA }); const te2 = await r.json(); ok(te2.resultado.telegram.ok === true && tgEnvios.length === 2, "con Telegram vinculado, el botón de prueba manda el mensaje");
  r = await fetch(BASE + "/api/admin/pedidos"); let lista = await r.json();
  ok(r.status === 200 && lista.pedidos.some((p) => p.id === c1.id), "el pedido aparece en el panel");
  r = await fetch(BASE + "/api/admin/pedidos/" + c1.id + "/andamento", { method: "POST", headers: H }); ok(r.status === 403, "acción del panel sin la cabecera anti-CSRF: 403");
  r = await fetch(BASE + `/api/admin/pedidos/${c1.id}/original`); const orig = new Uint8Array(await r.arrayBuffer()); ok(r.status === 200 && orig[0] === 0x50 && /attachment/.test(r.headers.get("content-disposition")), "Lian descarga el original (como adjunto)");
  const sube = (id, q, blob) => fetch(BASE + `/api/admin/pedidos/${id}/arquivo/${q}`, { method: "PUT", headers: HA, body: blob });
  r = await sube(c1.id, "previa", docx()); ok(r.status === 400, "subir como prévia un archivo que no es PDF: 400");
  r = await fetch(BASE + `/api/admin/pedidos/${c1.id}/pronto`, { method: "POST", headers: { ...HA, "Content-Type": "application/json" }, body: JSON.stringify({ valor_reais: 80 }) }); ok(r.status === 400, "marcar listo sin subir los 3 archivos: 400");
  ok((await sube(c1.id, "previa", pdf("previa"))).status === 200 && (await sube(c1.id, "docx", docx("final"))).status === 200 && (await sube(c1.id, "pdf", pdf("final"))).status === 200, "sube prévia, Word y PDF finales");
  r = await fetch(BASE + `/api/admin/pedidos/${c1.id}/pronto`, { method: "POST", headers: { ...HA, "Content-Type": "application/json" }, body: JSON.stringify({ valor_reais: 3 }) }); ok(r.status === 400, "valor absurdo (R$ 3): 400");
  r = await fetch(BASE + `/api/admin/pedidos/${c1.id}/pronto`, { method: "POST", headers: { ...HA, "Content-Type": "application/json" }, body: JSON.stringify({ valor_reais: 80 }) }); const pr = await r.json();
  ok(r.status === 200 && pr.link.startsWith(BASE + "/pedido/#") && pr.link.endsWith(c1.codigo) && /^https:\/\/wa\.me\/55\d{10,11}\?text=/.test(pr.whatsapp), "marca listo: da el enlace del cliente y el enlace de WhatsApp con el mensaje");

  console.log("== 4) El cliente ve la prévia y paga ==");
  r = await post("/api/pedido/estado", { codigo: c1.codigo }); e = await r.json(); ok(e.pedido.status === "pronto" && e.pedido.valor_centavos === 8000 && e.pedido.tem_previa && !e.pedido.pode_baixar, "estado «pronto» con valor R$ 80 y prévia");
  r = await post("/api/pedido/previa", { codigo: c1.codigo }); const bp = Buffer.from(await r.arrayBuffer()).toString("latin1"); ok(r.status === 200 && bp.startsWith("%PDF-") && /inline/.test(r.headers.get("content-disposition")), "ve la prévia en PDF");
  r = await post("/api/pedido/baixar/pdf", { codigo: c1.codigo }); ok(r.status === 402, "aún no puede descargar (no pagó)");
  r = await post("/api/pedido/pagar", { codigo: c1.codigo }); let pg = await r.json();
  ok(r.status === 200 && pg.url === "https://mp.test/pagar/" + c1.id, "pagar: da la dirección del Mercado Pago");
  const pref = preferencias[0];
  ok(pref.items[0].unit_price === 80 && pref.items[0].currency_id === "BRL" && pref.external_reference === c1.id && /\/api\/mp\/webhook$/.test(pref.notification_url) && pref.back_urls.success.endsWith("#" + c1.codigo), "la preferencia lleva valor 80 BRL, referencia del pedido, aviso y vuelta al enlace del cliente");
  const excl = JSON.stringify(pref.payment_methods.excluded_payment_types); ok(excl.includes("ticket") && excl.includes("atm") && !excl.includes("credit_card") && !excl.includes("debit_card") && !excl.includes("pix"), "la preferencia deja Pix y tarjeta de crédito y débito (y excluye boleto y lotérica)");
  r = await post("/api/pedido/pagar", { codigo: c1.codigo }); pg = await r.json(); ok(preferencias.length === 1 && pg.url, "pagar otra vez reutiliza el mismo enlace (no crea otra preferencia)");

  console.log("== 5) Avisos del Mercado Pago (los falsos no liberan nada) ==");
  const avisar = (id) => fetch(`${BASE}/api/mp/webhook?data.id=${id}&type=payment`, { method: "POST" });
  pagamentos.set("1001", { id: 1001, status: "approved", external_reference: c1.id, transaction_amount: 79.99, currency_id: "BRL" });
  r = await avisar("1001"); e = await (await post("/api/pedido/estado", { codigo: c1.codigo })).json(); ok(r.status === 200 && e.pedido.status === "pronto", "pago aprobado pero con valor distinto (79,99): NO libera");
  pagamentos.set("1002", { id: 1002, status: "pending", external_reference: c1.id, transaction_amount: 80, currency_id: "BRL" });
  await avisar("1002"); e = await (await post("/api/pedido/estado", { codigo: c1.codigo })).json(); ok(e.pedido.status === "pronto", "pago pendiente: NO libera");
  pagamentos.set("1003", { id: 1003, status: "approved", external_reference: "AAAAAAAA", transaction_amount: 80, currency_id: "BRL" });
  await avisar("1003"); e = await (await post("/api/pedido/estado", { codigo: c1.codigo })).json(); ok(e.pedido.status === "pronto", "pago aprobado de OTRO pedido: NO libera");
  r = await avisar("9999"); ok(r.status === 502, "aviso de un pago que el Mercado Pago no conoce (inventado): no libera y responde error (el MP reintenta)");
  r = await fetch(`${BASE}/api/mp/webhook?data.id=abc&type=payment`, { method: "POST" }); ok(r.status === 200, "aviso con identificador mal formado: se ignora");
  r = await post("/api/pedido/baixar/docx", { codigo: c1.codigo }); ok(r.status === 402, "con todos esos avisos falsos, la descarga sigue cerrada");
  pagamentos.set("1004", { id: 1004, status: "approved", external_reference: c1.id, transaction_amount: 80, currency_id: "BRL" });
  const antes = avisos.length;
  r = await avisar("1004"); e = await (await post("/api/pedido/estado", { codigo: c1.codigo })).json(); await aguardaAviso(antes + 1); await aguardaTg(3);
  ok(tgEnvios.length >= 3 && /Pagamento confirmado/.test(tgEnvios[tgEnvios.length - 1].text) && !/Maria|639|@/.test(tgEnvios[tgEnvios.length - 1].text), "un pago confirmado también llega por Telegram, sin datos personales");
  ok(avisos.length === antes + 1 && /Pagamento confirmado/.test(avisos[avisos.length - 1].titulo) && avisos[avisos.length - 1].cuerpo.includes("5") === false || avisos.length === antes + 1, "un pago confirmado manda un aviso al celular de Lian");
  ok(r.status === 200 && e.pedido.status === "pago" && e.pedido.pode_baixar && e.pedido.apagar_em > Date.now() / 1000 + 14 * 86400, "pago aprobado, del pedido y de R$ 80: libera la descarga (borrado a 15 días)");
  r = await avisar("1004"); ok(r.status === 200, "el mismo aviso repetido es inofensivo");
  r = await post("/api/pedido/baixar/docx", { codigo: c1.codigo }); const bd = new Uint8Array(await r.arrayBuffer()); ok(r.status === 200 && bd[0] === 0x50 && /attachment/.test(r.headers.get("content-disposition")), "descarga el Word final");
  r = await post("/api/pedido/baixar/pdf", { codigo: c1.codigo }); ok(r.status === 200 && Buffer.from(await r.arrayBuffer()).toString("latin1").startsWith("%PDF-"), "descarga el PDF final");
  const regDesc = (await (await fetch(BASE + `/api/admin/pedidos/${c1.id}`)).json()).pedido; ok(regDesc.baixou_docx_em > 0 && regDesc.baixou_pdf_em > 0, "queda registrada la fecha y hora de cada descarga (prueba por si hay una disputa)");
  r = await sube(c1.id, "docx", docx()); ok(r.status === 409, "ya pagado: Lian no puede cambiar los archivos");

  console.log("== 6) Comprobación por búsqueda (si el aviso tarda) ==");
  r = await pedir({ nome: "João" }, "8.8.8.8"); const c2 = await r.json();
  for (const q of [["previa", pdf()], ["docx", docx()], ["pdf", pdf()]]) await sube(c2.id, q[0], q[1]);
  await fetch(BASE + `/api/admin/pedidos/${c2.id}/pronto`, { method: "POST", headers: { ...HA, "Content-Type": "application/json" }, body: JSON.stringify({ valor_reais: 140 }) });
  await post("/api/pedido/pagar", { codigo: c2.codigo });
  pagamentos.set("2001", { id: 2001, status: "approved", external_reference: c2.id, transaction_amount: 140, currency_id: "BRL" });
  e = await (await post("/api/pedido/estado", { codigo: c2.codigo })).json(); ok(e.pedido.status === "pronto", "sin pedir verificación, el estado no cambia solo");
  e = await (await post("/api/pedido/estado", { codigo: c2.codigo, verificar: true })).json(); ok(e.pedido.status === "pago", "con «verificar»: consulta al Mercado Pago y libera si el pago es válido");

  console.log("== 6b) Pedido creado a mano por Lian (el cliente mandó el archivo por WhatsApp) ==");
  const manual = (campos, h = HA) => { const f = new FormData(); for (const [k, v] of Object.entries(campos)) { if (k === "arquivo") f.set(k, v, "do-cliente.docx"); else f.set(k, v); } return fetch(BASE + "/api/admin/pedidos", { method: "POST", headers: h, body: f }); };
  r = await manual({ nome: "Cliente WhatsApp", whatsapp: "63991230000", tamanho: "de31a60", arquivo: docx() }, H); ok(r.status === 403, "crear pedido a mano sin la cabecera del panel: 403");
  r = await manual({ nome: "X", whatsapp: "123", tamanho: "ate30", arquivo: docx() }); ok(r.status === 400, "pedido a mano con WhatsApp inválido: 400");
  r = await manual({ nome: "X", whatsapp: "63991230000", tamanho: "ate30", arquivo: new Blob(["nada"]) }); ok(r.status === 400, "pedido a mano con un archivo que no es Word ni PDF: 400");
  r = await manual({ nome: "Cliente WhatsApp", whatsapp: "63991230000", tamanho: "de31a60", arquivo: docx() }); const cm = await r.json();
  ok(r.status === 200 && /^[A-Z0-9]{8}$/.test(cm.id), "Lian crea el pedido con el archivo que el cliente le mandó");
  lista = await (await fetch(BASE + "/api/admin/pedidos")).json(); ok(lista.pedidos.some((p) => p.id === cm.id && p.status === "recebido" && p.tamanho === "de31a60"), "el pedido manual aparece en el panel como «recebido»");
  const dm = await (await fetch(BASE + `/api/admin/pedidos/${cm.id}`)).json(); ok(dm.link && dm.link.startsWith(BASE + "/pedido/#"), "y ya tiene su enlace de cliente");
  await sube(cm.id, "previa", pdf()); await sube(cm.id, "docx", docx()); await sube(cm.id, "pdf", pdf());
  r = await fetch(BASE + `/api/admin/pedidos/${cm.id}/pronto`, { method: "POST", headers: { ...HA, "Content-Type": "application/json" }, body: JSON.stringify({ valor_reais: 140 }) }); ok(r.status === 200, "el pedido manual sigue el mismo camino: listo con valor R$ 140");

  console.log("== 6c) Prévia en imágenes (hasta 3) ==");
  const png = () => new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "imagem de teste"], { type: "image/png" });
  const jpg = () => new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), "imagem de teste"], { type: "image/jpeg" });
  r = await pedir({ nome: "Ana" }, "5.5.5.5"); const c3 = await r.json();
  r = await sube(c3.id, "imagem1", docx()); ok(r.status === 400, "subir un Word como imagen de la prévia: 400");
  r = await pedir({ arquivo: png(), nomeArq: "foto.docx" }, "5.5.5.6"); ok(r.status === 400, "un cliente no puede mandar una imagen como si fuera el trabajo (solo Word o PDF)");
  ok((await sube(c3.id, "imagem1", png())).status === 200 && (await sube(c3.id, "imagem3", jpg())).status === 200 && (await sube(c3.id, "docx", docx())).status === 200 && (await sube(c3.id, "pdf", pdf())).status === 200, "Lian sube la imagen 1 (PNG) y la 3 (JPG), más el Word y el PDF finales, sin prévia en PDF");
  r = await fetch(BASE + `/api/admin/pedidos/${c3.id}/pronto`, { method: "POST", headers: { ...HA, "Content-Type": "application/json" }, body: JSON.stringify({ valor_reais: 80 }) }); ok(r.status === 200, "con solo imágenes de prévia (sin PDF) se puede marcar «pronto»");
  e = await (await post("/api/pedido/estado", { codigo: c3.codigo })).json(); ok(JSON.stringify(e.pedido.previa_imgs) === "[1,3]" && e.pedido.tem_previa === false, "el cliente ve que hay prévia en las imágenes 1 y 3");
  r = await post("/api/pedido/previa-imagem", { codigo: c3.codigo, n: 1 }); ok(r.status === 200 && r.headers.get("content-type") === "image/png" && /sandbox/.test(r.headers.get("content-security-policy")), "la imagen 1 se entrega como PNG, con cabecera de seguridad");
  r = await post("/api/pedido/previa-imagem", { codigo: c3.codigo, n: 3 }); ok(r.status === 200 && r.headers.get("content-type") === "image/jpeg", "la imagen 3 se entrega como JPG");
  r = await post("/api/pedido/previa-imagem", { codigo: c3.codigo, n: 2 }); ok(r.status === 404, "la imagen 2 (no subida): 404");
  r = await post("/api/pedido/previa-imagem", { codigo: c3.codigo, n: 9 }); ok(r.status === 404, "una imagen fuera de rango: 404");
  r = await post("/api/pedido/previa-imagem", { codigo: c1.codigo, n: 1 }); ok(r.status === 404, "un pedido sin imágenes de prévia: 404");

  r = await fetch(BASE + `/api/admin/pedidos/${c3.id}/arquivo/imagem1?limpar=1`, { method: "PUT", headers: HA, body: png() }); e = await (await post("/api/pedido/estado", { codigo: c3.codigo })).json();
  ok(r.status === 200 && JSON.stringify(e.pedido.previa_imgs) === "[1]", "un lote nuevo de imágenes (limpar=1) reemplaza las anteriores");
  r = await post("/api/pedido/previa-imagem", { codigo: c3.codigo, n: 3 }); ok(r.status === 404, "la imagen vieja (3) ya no se entrega");

  console.log("== 6d) Pago aprobado que luego se revierte (tarjeta: contracargo o reembolso) ==");
  await post("/api/pedido/pagar", { codigo: c3.codigo });
  pagamentos.set("3001", { id: 3001, status: "approved", external_reference: c3.id, transaction_amount: 80, currency_id: "BRL" });
  await avisar("3001"); e = await (await post("/api/pedido/estado", { codigo: c3.codigo })).json(); ok(e.pedido.status === "pago", "pago con tarjeta aprobado: libera");
  pagamentos.set("3001", { id: 3001, status: "charged_back", external_reference: c3.id, transaction_amount: 80, currency_id: "BRL" });
  await new Promise((x) => setTimeout(x, 1000)); const avisosAntes = avisos.length; await avisar("3001"); e = await (await post("/api/pedido/estado", { codigo: c3.codigo })).json(); await aguardaAviso(avisosAntes + 1);
  ok(e.pedido.status === "reembolsado" && !e.pedido.pode_baixar, "el mismo pago pasa a «charged_back»: el pedido queda reembolsado y se corta la descarga");
  r = await post("/api/pedido/baixar/docx", { codigo: c3.codigo }); ok(r.status === 402, "ya no se puede descargar tras el contracargo");
  ok(avisos.length === avisosAntes + 1 && /revertido/.test(avisos[avisos.length - 1].titulo), "y a Lian le llega un aviso al celular: «Pagamento revertido»");
  pagamentos.set("3002", { id: 3002, status: "approved", external_reference: c3.id, transaction_amount: 80, transaction_amount_refunded: 80, currency_id: "BRL" });
  await avisar("3002"); e = await (await post("/api/pedido/estado", { codigo: c3.codigo })).json(); ok(e.pedido.status === "reembolsado", "un pago nuevo que ya trae reembolso no libera nada");

  console.log("== 7) Reembolso y borrado ==");
  r = await fetch(BASE + `/api/admin/pedidos/${c2.id}/reembolsado`, { method: "POST", headers: HA }); ok(r.status === 200, "Lian marca «reembolsado»");
  r = await post("/api/pedido/baixar/docx", { codigo: c2.codigo }); ok(r.status === 402, "reembolsado: ya no se puede descargar");
  r = await fetch(BASE + `/api/admin/pedidos/${c2.id}/apagar`, { method: "POST", headers: HA }); ok(r.status === 200, "Lian apaga el pedido");
  r = await post("/api/pedido/estado", { codigo: c2.codigo }); ok(r.status === 404, "pedido apagado: el enlace deja de existir");
  r = await fetch(BASE + "/api/admin/pedidos"); lista = await r.json(); ok(!lista.pedidos.some((p) => p.id === c2.id), "y desaparece de la lista del panel");

  pagamentos.set("2002", { id: 2002, status: "approved", external_reference: c2.id, transaction_amount: 140, currency_id: "BRL" });
  await avisar("2002"); lista = await (await fetch(BASE + "/api/admin/pedidos")).json(); const conAviso = lista.pedidos.find((p) => p.id === c2.id);
  ok(conAviso && /válido recebido/.test(conAviso.aviso) && conAviso.status === "apagado", "un pago válido que llega DESPUÉS del borrado deja un aviso visible para Lian (para reembolsar)");
  r = await post("/api/pedido/baixar/docx", { codigo: c2.codigo }); ok(r.status === 404, "y aun así el pedido borrado no entrega nada");

  console.log("== 8) Limpieza automática de los 15 días ==");
  const sqlVencer = path.join(persist, "vencer.sql");
  fs.writeFileSync(sqlVencer, `UPDATE pedidos SET apagar_em = 1 WHERE id = '${c1.id}';\n`);
  parar(comAdmin); await sinWorkerd(); await new Promise((x) => setTimeout(x, 2000)); // se cierra el Worker local para poder tocar su base
  execFileSync(WR, ["wrangler", "d1", "execute", "estudasimples-pedidos", "--local", "--persist-to", persist, `--file=${sqlVencer.replace(/\\/g, "/")}`], { cwd: RAIZ, shell: process.platform === "win32", stdio: "ignore" });
  comAdmin = arrancar(PUERTO, { PUBLIC_BASE: BASE, DEV_ADMIN_BYPASS: "sim-local", MP_ACCESS_TOKEN: "token-de-prueba", MP_API_BASE: `http://127.0.0.1:${PUERTO_MP}`, NTFY_TOPIC: "topico-de-prueba", NTFY_BASE: `http://127.0.0.1:${PUERTO_NTFY}`, TELEGRAM_TOKEN: "token-tg", TELEGRAM_API_BASE: `http://127.0.0.1:${PUERTO_TG}` }, persist);
  await esperar(PUERTO, comAdmin);
  r = await fetch(BASE + "/api/admin/limpeza", { method: "POST", headers: HA }); const lim = await r.json(); ok(r.status === 200 && lim.apagados === 1, "la limpieza (la misma que corre cada día) borra el pedido vencido y solo ese");
  r = await post("/api/pedido/baixar/docx", { codigo: c1.codigo }); ok(r.status === 404, "pedido vencido: archivos y enlace borrados");
  r = await fetch(BASE + `/api/admin/pedidos/${c1.id}`); ok(r.status === 404, "y ya no sale en el panel");

  console.log("== 9) Límites de intentos ==");
  let ultimo = 200;
  for (let i = 0; i < 14; i++) ultimo = (await pedir({}, "7.7.7.7")).status;
  ok(ultimo === 429, "muchos pedidos desde la misma conexión: se frena con 429");
  r = await pedir({ whatsapp: "(63) 99999-1111" }, "6.6.6.1"); await pedir({ whatsapp: "(63) 99999-1111" }, "6.6.6.2"); await pedir({ whatsapp: "(63) 99999-1111" }, "6.6.6.3");
  r = await pedir({ whatsapp: "(63) 99999-1111" }, "6.6.6.4"); ok(r.status === 429, "el mismo WhatsApp no puede pedir más de 3 veces al día");

  console.log('== 10) Cloudflare Access: el panel solo abre con una firma válida ==');
  parar(comAdmin);
  const { verificaAcesso } = await import(pathToFileURL(path.join(RAIZ, 'pedidos', 'src', 'access.mjs')).href);
  const par = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const otro = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', par.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const firma = async (cab, dados, chave = par.privateKey) => { const base = b64(cab) + '.' + b64(dados); const s = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(base))).toString('base64url'); return base + '.' + s; };
  const agora = Math.floor(Date.now() / 1000);
  const buenos = { aud: ['AUD123'], iss: 'https://lian.cloudflareaccess.com', exp: agora + 600, email: 'lian@example.com' };
  const env = { ACCESS_TEAM_DOMAIN: 'lian.cloudflareaccess.com', ACCESS_AUD: 'AUD123', ADMIN_EMAIL: 'lian@example.com' };
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async (u) => String(u).includes('/cdn-cgi/access/certs') ? new Response(JSON.stringify({ keys: [jwk] })) : fetchReal(u);
  const pide = (jwt, e = env) => verificaAcesso(new Request('http://x/api/admin/pedidos', { headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} }), e);
  ok((await pide(null, {})).status === 503, 'sin Access configurado el panel queda CERRADO (503)');
  ok((await pide('a.b.c', {})).status === 503, 'sin Access configurado, un token inventado tampoco abre');
  ok((await pide(null)).status === 401, 'con Access configurado pero sin firma: 401');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, buenos), { ...env, ADMIN_EMAIL: '' })).status === 503, 'sin correo de administrador configurado el panel queda cerrado (503), aunque la firma sea buena');
  ok((await verificaAcesso(new Request('https://estudasimples.com.br/api/admin/pedidos'), { DEV_ADMIN_BYPASS: 'sim-local' })).status === 503, 'el atajo de pruebas NO abre el panel en un dominio que no es local');
  ok((await pide('a.b.c')).status === 401, 'token inventado: 401');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, buenos))).ok === true, 'firma válida de Cloudflare Access: entra');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, buenos, otro.privateKey))).status === 401, 'firmado con otra llave (falsificado): 401');
  ok((await pide(await firma({ alg: 'none', kid: 'k1' }, buenos))).status === 401, 'algoritmo «none»: 401');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, { ...buenos, aud: ['OTRA'] }))).status === 401, 'audiencia (aplicación) distinta: 401');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, { ...buenos, iss: 'https://otro.cloudflareaccess.com' }))).status === 401, 'emisor distinto: 401');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, { ...buenos, exp: agora - 10 }))).status === 401, 'token vencido: 401');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, buenos), { ...env, ADMIN_EMAIL: 'lian@example.com' })).ok === true, 'correo permitido: entra');
  ok((await pide(await firma({ alg: 'RS256', kid: 'k1' }, buenos), { ...env, ADMIN_EMAIL: 'otra@example.com' })).status === 403, 'otro correo (aunque la firma sea buena): 403');
  const jwtBueno = await firma({ alg: 'RS256', kid: 'k1' }, buenos); const partes = jwtBueno.split('.'); partes[1] = b64({ ...buenos, email: 'intruso@example.com' });
  ok((await pide(partes.join('.'))).status === 401, 'cuerpo del token modificado después de firmar: 401');
  globalThis.fetch = fetchReal;
} catch (e) {
  fallos++; console.log("FALLA (error inesperado)", e && e.stack ? e.stack : e);
} finally {
  parar(comAdmin); mp.close(); ntfy.close(); tg.close();
}
console.log(fallos ? `\n${fallos} FALLA(S) de ${total}` : `\nTodo OK: ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
