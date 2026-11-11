// Prueba en navegador real (Chrome) de las páginas del pedido: formulario, panel de Lian y página del cliente,
// con el Worker local (wrangler dev) y un Mercado Pago de mentira. Uso (desde pruebas/): node probar-pedidos-ui.mjs
// Es una simulación local: NO prueba el Mercado Pago real ni Cloudflare Access real.
import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const RAIZ = path.resolve("..");
const PUERTO = 8796, PUERTO_MP = 8795, BASE = `http://localhost:${PUERTO}`;
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SALIDA = process.env.CAPTURAS || path.join(os.tmpdir(), "pedidos-ui");
fs.mkdirSync(SALIDA, { recursive: true });
const persist = fs.mkdtempSync(path.join(os.tmpdir(), "pedidos-ui-"));
const WR = process.platform === "win32" ? "npx.cmd" : "npx";
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log("FALLA", msg); } else console.log("OK   ", msg); };

const pagamentos = new Map();
const mp = http.createServer((req, res) => {
  let c = ""; req.on("data", (d) => (c += d));
  req.on("end", () => {
    const u = new URL(req.url, "http://x"); const env = (o, s = 200) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.method === "POST" && u.pathname === "/checkout/preferences") { const b = JSON.parse(c); return env({ id: "p1", init_point: "https://mp.test/pagar/" + b.external_reference }); }
    const m = /^\/v1\/payments\/(\d+)$/.exec(u.pathname);
    if (m && pagamentos.has(m[1])) return env(pagamentos.get(m[1]));
    env({}, 404);
  });
});
await new Promise((r) => mp.listen(PUERTO_MP, r));

execFileSync(WR, ["wrangler", "d1", "execute", "estudasimples-pedidos", "--local", "--persist-to", persist, "--file=pedidos/schema.sql"], { cwd: RAIZ, shell: process.platform === "win32", stdio: "ignore" });
const vars = { PUBLIC_BASE: BASE, DEV_ADMIN_BYPASS: "sim-local", MP_ACCESS_TOKEN: "t", MP_API_BASE: `http://127.0.0.1:${PUERTO_MP}` };
const args = ["wrangler", "dev", "--local", "--port", String(PUERTO), "--persist-to", persist, "--ip", "127.0.0.1"];
for (const [k, v] of Object.entries(vars)) args.push("--var", `${k}:${v}`);
const srv = spawn(WR, args, { cwd: RAIZ, shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
let log = ""; srv.stdout.on("data", (d) => (log += d)); srv.stderr.on("data", (d) => (log += d));
const parar = () => { try { execFileSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* ya cerró */ } };

// archivos de prueba
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pedidos-arq-"));
const fDocx = path.join(tmp, "meu-tcc.docx"); fs.writeFileSync(fDocx, Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("conteudo do trabalho word/document.xml")]));
const fPdf = path.join(tmp, "previa.pdf"); fs.writeFileSync(fPdf, "%PDF-1.4\nprevia");
const fDocx2 = path.join(tmp, "final.docx"); fs.writeFileSync(fDocx2, Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("trabalho formatado word/document.xml")]));
const fPdf2 = path.join(tmp, "final.pdf"); fs.writeFileSync(fPdf2, "%PDF-1.4\nfinal");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fPng1 = path.join(tmp, "pagina1.png"); fs.writeFileSync(fPng1, PNG);
const fPng2 = path.join(tmp, "pagina2.png"); fs.writeFileSync(fPng2, PNG);

let browser;
try {
  for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://127.0.0.1:${PUERTO}/api/saude`)).ok) break; } catch { /* aún no */ } await new Promise((r) => setTimeout(r, 1000)); if (i === 119) throw new Error("el Worker no arrancó\n" + log.slice(-1200)); }
  browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const abre = async (ancho, alto) => { const p = await browser.newPage(); await p.setViewport({ width: ancho, height: alto }); p.errores = []; p.on("pageerror", (e) => p.errores.push(String(e))); p.on("console", (m) => { if (m.type() === "error") p.errores.push(m.text()); }); return p; };
  const sinScrollH = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

  console.log("== Formulario (celular y computador) ==");
  let linkPedido = "";
  for (const [nombre, ancho, alto] of [["celular", 390, 844], ["computador", 1280, 900]]) {
    const p = await abre(ancho, alto);
    await p.goto(BASE + "/pedir-formatacao/", { waitUntil: "networkidle0" });
    ok(await sinScrollH(p), `${nombre}: la página del pedido no tiene scroll horizontal`);
    await p.screenshot({ path: path.join(SALIDA, `pedir-${nombre}.png`), fullPage: true });
    // validaciones del navegador
    await p.type("#pdWhats", "123"); await (await p.$("#pdEnviar")).click(); await new Promise((r) => setTimeout(r, 300));
    ok(await p.$eval("#pdErro", (e) => !e.hidden && /WhatsApp/.test(e.textContent)), `${nombre}: WhatsApp inválido muestra el aviso`);
    await p.$eval("#pdWhats", (e) => (e.value = "")); await p.type("#pdWhats", nombre === "celular" ? "(63) 98123-4567" : "(63) 98123-9999");
    await p.type("#pdNome", "Maria Souza");
    await (await p.$("#pdEnviar")).click(); await new Promise((r) => setTimeout(r, 300));
    ok(await p.$eval("#pdErro", (e) => !e.hidden && /Anexe/.test(e.textContent)), `${nombre}: sin archivo muestra el aviso`);
    await (await p.$("#pdArquivo")).uploadFile(fDocx);
    ok(/meu-tcc\.docx/.test(await p.$eval("#pdArquivoNome", (e) => e.textContent)), nombre + ": el campo de archivo muestra el nombre del archivo elegido");
    await (await p.$("#pdEnviar")).click(); await new Promise((r) => setTimeout(r, 300));
    ok(await p.$eval("#pdErro", (e) => !e.hidden && /concordar/.test(e.textContent)), `${nombre}: sin marcar la casilla muestra el aviso`);
    await p.click("#pdConsent");
    await (await p.$("#pdEnviar")).click();
    await p.waitForFunction(() => !document.getElementById("pdFeito").hidden, { timeout: 15000 });
    const link = await p.$eval("#pdLink", (e) => e.value);
    ok(/\/pedido\/#[A-Za-z0-9_-]{43}$/.test(link) && /Pedido recebido/.test(await p.$eval("#pdFeito", (e) => e.textContent)), `${nombre}: aparece «Pedido recebido» con el enlace del pedido`);
    ok(await p.$eval("#pdFeito", (e) => /\(63\) 99216-7482/.test(e.textContent)), `${nombre}: el aviso dice de qué número llegará el mensaje`);
    await p.screenshot({ path: path.join(SALIDA, `pedido-recebido-${nombre}.png`), fullPage: true });
    if (nombre === "celular") linkPedido = link;
    ok(p.errores.length === 0, `${nombre}: sin errores en la consola ${p.errores.join(" | ")}`);
    await p.close();
  }

  console.log("== Panel de Lian ==");
  const pn = await abre(1280, 900);
  await pn.goto(BASE + "/painel/", { waitUntil: "networkidle0" });
  await pn.waitForSelector(".pn-item");
  const items = await pn.$$eval(".pn-item", (n) => n.map((x) => x.textContent));
  ok(items.length === 2 && items.every((t) => /Recebido/.test(t)), "el panel lista los 2 pedidos recibidos");
  await (await pn.$(".pn-item")).click(); await pn.waitForSelector("#pn-previa");
  await (await pn.$("#pn-previa")).uploadFile(fPdf); await (await pn.$("#pn-docx")).uploadFile(fDocx2); await (await pn.$("#pn-pdf")).uploadFile(fPdf2); await (await pn.$("#pn-imgs")).uploadFile(fPng1, fPng2);
  await pn.$eval("#pnValor", (e) => (e.value = "80.00"));
  await pn.screenshot({ path: path.join(SALIDA, "painel.png"), fullPage: true });
  const botones = await pn.$$(".pn-botoes button");
  let pronto; for (const b of botones) if (/Marcar como pronto/.test(await b.evaluate((e) => e.textContent))) pronto = b;
  await pronto.click(); await new Promise((r) => setTimeout(r, 2500));
  ok(/Pronto, aguarda pagamento/.test(await pn.$eval("#pnDetalhe", (e) => e.textContent)) && (await pn.$("#pnZap")) !== null, "marcar como pronto: el estado cambia y aparece el botón de WhatsApp con el mensaje");
  const zap = await pn.$eval("#pnZap", (a) => a.href);
  ok(/^https:\/\/wa\.me\/55\d+\?text=/.test(zap) && decodeURIComponent(zap).includes("/pedido/#"), "el enlace de WhatsApp lleva el mensaje con el enlace del cliente");
  const idPrimero = (await pn.$eval("#pnDetalhe h3", (e) => e.textContent)).match(/#([A-Z0-9]{8})/)[1];
  const detalle = await (await fetch(`${BASE}/api/admin/pedidos/${idPrimero}`)).json();
  ok(pn.errores.length === 0, "panel: sin errores en la consola " + pn.errores.join(" | "));
  await pn.close();

  console.log("== Página del cliente ==");
  const linkListo = detalle.link; const idListo = idPrimero;
  const cl = await abre(390, 844);
  let navegado = null; await cl.setRequestInterception(true);
  cl.on("request", (rq) => { if (rq.isNavigationRequest() && rq.url().startsWith("https://mp.test")) { navegado = rq.url(); rq.abort(); } else rq.continue(); });
  await cl.goto(linkListo, { waitUntil: "networkidle0" });
  ok(/Seu trabalho está pronto/.test(await cl.$eval("#pedidoApp", (e) => e.textContent)) && /R\$ 80,00/.test(await cl.$eval("#pedidoApp", (e) => e.textContent)), "el cliente ve «pronto», con el valor R$ 80,00");
  ok(await sinScrollH(cl), "celular: la página del pedido no tiene scroll horizontal");
  await cl.waitForFunction(() => document.querySelectorAll(".pd-galeria img").length === 2 && [...document.querySelectorAll(".pd-galeria img")].every((i) => i.complete && i.naturalWidth > 0), { timeout: 10000 });
  ok(true, "las 2 imágenes de la prévia aparecen dentro de la página del pedido");
  ok(/Pagar com Pix ou cartão/.test(await cl.$eval("#pedidoApp button.btn-acento", (b) => b.textContent)), "el botón dice «Pagar com Pix ou cartão»");
  const prev = await cl.$eval("#pedidoApp a.btn", (a) => a.href); ok(prev.startsWith("blob:"), "la prévia se abre como PDF desde el propio pedido");
  await cl.screenshot({ path: path.join(SALIDA, "cliente-pronto.png"), fullPage: true });
  await cl.click("#pedidoApp button.btn-acento"); await new Promise((r) => setTimeout(r, 1500));
  ok(navegado === "https://mp.test/pagar/" + idListo, "«Pagar con Pix» lleva a la página del Mercado Pago de este pedido");
  pagamentos.set("5001", { id: 5001, status: "approved", external_reference: idListo, transaction_amount: 80, currency_id: "BRL" });
  await fetch(`${BASE}/api/mp/webhook?data.id=5001&type=payment`, { method: "POST" });
  await cl.goto(linkListo + "?payment_id=5001&status=approved", { waitUntil: "networkidle0" }); await cl.reload({ waitUntil: "networkidle0" });
  await cl.waitForFunction(() => /Pagamento confirmado/.test(document.getElementById("pedidoApp").textContent), { timeout: 15000 });
  const botonesDl = await cl.$$eval("#pedidoApp button", (b) => b.map((x) => x.textContent));
  ok(botonesDl.some((t) => /Word/.test(t)) && botonesDl.some((t) => /PDF/.test(t)), "tras el pago aprobado aparecen los botones de descarga (Word y PDF)");
  await cl.screenshot({ path: path.join(SALIDA, "cliente-pago.png"), fullPage: true });
  ok(cl.errores.length === 0, "cliente: sin errores en la consola " + cl.errores.join(" | "));
  await cl.close();
  const sinCodigo = await abre(390, 844); await sinCodigo.goto(BASE + "/pedido/", { waitUntil: "networkidle0" });
  ok(/Link incompleto/.test(await sinCodigo.$eval("#pedidoApp", (e) => e.textContent)), "abrir /pedido/ sin código muestra «Link incompleto»");
  await sinCodigo.close();
} catch (e) {
  fallos++; console.log("FALLA (error inesperado)", e && e.stack ? e.stack : e);
} finally {
  if (browser) await browser.close(); parar(); mp.close();
}
console.log(fallos ? `\n${fallos} FALLA(S) de ${total}` : `\nTodo OK: ${total} comprobaciones (capturas en ${SALIDA})`);
process.exit(fallos ? 1 : 0);
