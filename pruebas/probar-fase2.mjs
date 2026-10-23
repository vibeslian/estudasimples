// Fase 2: "Preencher com exemplo" (capa y folha), ?exemplo=1, festa + compartir después de descargar.
// Usa el sitio local (http://localhost:3000, o BASE_URL). Las descargas se BLOQUEAN (nada se guarda en el PC).
// Uso: node probar-fase2.mjs   (desde pruebas/)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { axeEn, describeAxe } from "./lib-axe.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
let fallos = 0, total = 0;
const ok = (c, m, e = "") => { total++; if (!c) { fallos++; console.log(`  FALLA: ${m}${e ? " -> " + e : ""}`); } };
const seccion = (t) => console.log(`\n== ${t}`);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-f2-")) });

async function abre(ruta, { w = 1280, h = 900, movil = false, reducido = false, permisos = false } = {}) {
  const ctx = await b.createBrowserContext();
  if (permisos) await ctx.overridePermissions(BASE, ["clipboard-read", "clipboard-write"]);
  const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
  if (reducido) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  const cdp = await p.createCDPSession();
  await cdp.send("Page.setDownloadBehavior", { behavior: "deny" }); // ningún archivo se guarda
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
  return { p, ctx, errores };
}
const campos = (p) => p.evaluate(() => ({
  institution: document.getElementById("institution").value, course: document.getElementById("course").value,
  autor: document.querySelector("#autores input").value, title: document.getElementById("title").value,
  subtitle: document.getElementById("subtitle").value, city: document.getElementById("city").value,
  caja: !document.getElementById("exemploRapido").hidden,
}));

seccion("1) capa: botón de ejemplo con el formulario vacío");
{
  const { p, ctx, errores } = await abre("/gerador-de-capa-abnt/");
  let c = await campos(p);
  ok(c.caja, "el recuadro «Quer ver funcionando?» se ve con el formulario vacío");
  await p.click("#btnExemploRapido");
  await espera(300);
  c = await campos(p);
  ok(!c.caja && c.institution.length > 0 && c.institution.length < "Universidade Exemplo".length, "al empezar se esconde el recuadro y los campos se escriben poco a poco (no de golpe)", JSON.stringify(c));
  await p.waitForFunction(() => document.getElementById("city").value === "Belo Horizonte", { timeout: 15000 }).catch(() => {});
  c = await campos(p);
  ok(c.institution === "Universidade Exemplo" && c.course === "Curso de Administração" && c.autor === "Maria Silva" && c.title === "A influência das redes sociais no aprendizado" && c.subtitle === "um estudo com alunos do ensino médio" && c.city === "Belo Horizonte", "al terminar todos los campos del ejemplo están completos", JSON.stringify(c));
  const prev = await p.evaluate(() => document.getElementById("painelPrevia").textContent.toLowerCase());
  ok(prev.includes("maria silva") && prev.includes("influência das redes sociais"), "la vista previa se montó con los datos del ejemplo");
  await p.waitForFunction(() => /Exemplo preenchido/.test(document.getElementById("toast").textContent), { timeout: 8000 }).catch(() => {});
  const msg = await p.$eval("#toast", (e) => e.textContent);
  ok(/Exemplo preenchido/.test(msg), "mensaje: «Exemplo preenchido! Troque pelos seus dados»", msg);
  ok(await p.evaluate(() => window.__cls) < 0.02, "salto de diseño (CLS) durante la demostración < 0,02", String(await p.evaluate(() => window.__cls)));
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  await ctx.close();
}

seccion("2) ?exemplo=1 abre y se llena solo; con datos propios no toca nada");
{
  const { p, ctx } = await abre("/gerador-de-capa-abnt/?exemplo=1");
  await p.waitForFunction(() => document.getElementById("city").value === "Belo Horizonte", { timeout: 15000 }).catch(() => {});
  ok((await campos(p)).title === "A influência das redes sociais no aprendizado", "con ?exemplo=1 la capa se llena sola");
  await ctx.close();
  const o = await abre("/gerador-de-capa-abnt/");
  await o.p.type("#title", "Meu título");
  const caja = await o.p.evaluate(() => !document.getElementById("exemploRapido").hidden);
  ok(!caja, "al escribir algo propio el recuadro de ejemplo desaparece");
  await o.p.reload({ waitUntil: "networkidle0" });
  const c2 = await campos(o.p);
  ok(c2.title === "Meu título" && !c2.caja, "con datos guardados en la pestaña, el recuadro no vuelve y el ejemplo nunca pisa los datos", JSON.stringify(c2));
  await o.p.evaluate(() => sessionStorage.clear());
  await o.ctx.close();
  const q = await abre("/gerador-de-capa-abnt/?exemplo=1");
  await q.p.type("#title", "X");
  await espera(2500);
  const t = await q.p.$eval("#title", (e) => e.value);
  ok(t.startsWith("X") && t.length < 40, "si la persona escribe durante la demostración, esta se detiene", t);
  await q.ctx.close();
}

seccion("3) folha de rosto y sumário");
{
  const f = await abre("/gerador-de-folha-de-rosto-abnt/");
  ok((await campos(f.p)).caja, "folha de rosto: aparece el recuadro de ejemplo");
  await f.p.click("#btnExemploRapido");
  await f.p.waitForFunction(() => document.getElementById("advisor") && document.getElementById("advisor").value === "Prof. Dr. João Silva", { timeout: 20000 }).catch(() => {});
  ok(await f.p.$eval("#advisor", (e) => e.value) === "Prof. Dr. João Silva", "folha de rosto: también se completa el orientador");
  await f.ctx.close();
  const s = await abre("/gerador-de-sumario-abnt/");
  ok(await s.p.$("#exemploRapido") === null && await s.p.$("#btnExemplo") !== null, "sumário: no se duplica el botón (ya tenía el suyo)");
  await s.ctx.close();
}

seccion("4) celular y movimiento reducido");
{
  const m = await abre("/gerador-de-capa-abnt/", { w: 390, h: 800, movil: true });
  ok(await m.p.$eval("#btnExemploRapido", (e) => e.getBoundingClientRect().width === 0), "celular: en la pestaña «1. Preencher» el botón no estorba (vive sobre la vista previa vacía)");
  await m.p.click("#abaPrevia");
  await m.p.click("#btnExemploRapido");
  await espera(900);
  const aba = await m.p.$eval("#abaPrevia", (e) => e.getAttribute("aria-selected"));
  const c = await campos(m.p);
  ok(aba === "true" && c.city === "Belo Horizonte", "celular: se llena al instante y pasa a la pestaña de la vista previa", `aba=${aba}`);
  ok(await m.p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, "celular: sin desborde horizontal");
  await m.ctx.close();
  const r = await abre("/gerador-de-capa-abnt/", { reducido: true });
  await r.p.click("#btnExemploRapido");
  await espera(600);
  ok((await campos(r.p)).city === "Belo Horizonte", "con movimiento reducido se llena de golpe (sin animación)");
  await r.ctx.close();
}

seccion("5) después de descargar: festa y compartir (descarga bloqueada)");
{
  const { p, ctx, errores } = await abre("/gerador-de-capa-abnt/", { permisos: true });
  ok(await p.$eval("#compartilhar", (e) => e.hidden), "antes de descargar el bloque de compartir está escondido");
  await p.click("#btnExemploRapido");
  await p.waitForFunction(() => document.getElementById("city").value === "Belo Horizonte", { timeout: 15000 });
  await p.click("#btnPdf");
  ok(/Espere o exemplo/.test(await p.$eval("#toast", (e) => e.textContent)), "bajar el archivo mientras el ejemplo aún se escribe está bloqueado con un aviso (no sale un archivo a medio llenar)");
  await p.waitForFunction(() => /Exemplo preenchido/.test(document.getElementById("toast").textContent), { timeout: 20000 });
  await p.click("#btnPdf");
  await p.waitForFunction(() => !!document.getElementById("btnIndicar"), { timeout: 30000 }).catch(() => {});
  ok(await p.$eval("#compartilhar", (e) => e.hidden), "al terminar la descarga NO aparece nada flotante por sí solo: solo el enlace «Gostou? Indicar a um colega» junto al mensaje");
  ok(await p.$eval("#btnIndicar", (e) => e.closest("#toast") !== null), "el enlace «Indicar a um colega» vive dentro del mensaje de «Pronto!»");
  await p.click("#btnIndicar");
  ok(await p.$eval("#compartilhar", (e) => !e.hidden), "al tocar «Indicar a um colega» se abre «Gostou? Mande para um colega»");
  const href = await p.$eval("#compZap", (e) => e.href);
  const texto = decodeURIComponent(href.split("?text=")[1] || "");
  ok(href.startsWith("https://wa.me/?text=") && texto.includes("/?origem=compartilhar") && !/estudasimples-20|tag=/.test(texto), "el enlace de WhatsApp lleva el mensaje y el link del sitio (sin ningún dato de la persona)", texto);
  ok((await p.$eval("#compZap", (e) => e.target + "|" + e.rel)) === "_blank|noopener noreferrer", "WhatsApp se abre en otra pestaña con rel=noopener");
  ok(!/Maria Silva|Universidade Exemplo|influência/.test(texto), "el mensaje de compartir NO incluye lo que la persona escribió");
  const confete = await p.$$eval(".confete i", (l) => l.length);
  ok(confete >= 10, `se lanzó el confeti (${confete} piezas) y no mueve el diseño`);
  ok(await p.evaluate(() => window.__cls) < 0.04, "CLS < 0,04 incluyendo el mensaje largo de ejemplo, el enlace y la festa (el panel «Próximo passo» ya existente aporta ~0,02)", String(await p.evaluate(() => window.__cls)));
  await espera(2000);
  ok((await p.$$eval(".confete", (l) => l.length)) === 0, "el confeti se limpia solo");
  await p.click("#compCopiar");
  await espera(400);
  const aviso = await p.$eval("#compAviso", (e) => e.textContent);
  ok(/Link copiado|O link é/.test(aviso), "«Copiar o link» responde", aviso);
  const copiado = await p.evaluate(() => navigator.clipboard.readText().catch(() => "")).catch(() => "");
  ok(!copiado || copiado.includes("?origem=compartilhar"), "lo copiado es el link del sitio", copiado);
  const axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe) sin problemas con el recuadro y el bloque de compartir abiertos", axe.length ? "\n" + describeAxe(axe) : "");
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  await ctx.close();
  const rr = await abre("/gerador-de-capa-abnt/", { reducido: true });
  await rr.p.click("#btnExemploRapido");
  await espera(500);
  await rr.p.click("#btnPdf");
  await rr.p.waitForFunction(() => !!document.getElementById("btnIndicar"), { timeout: 30000 }).catch(() => {});
  ok((await rr.p.$$eval(".confete", (l) => l.length)) === 0 && !!(await rr.p.$("#btnIndicar")), "con movimiento reducido no hay confeti, pero sí el enlace para indicar a un colega");
  await rr.ctx.close();
}

seccion("5b) correcciones de la revisión: foco, teclado, ?exemplo=1 + Limpar, datos de ejemplo, celular");
{
  // foco y teclado (escritorio)
  const { p, ctx } = await abre("/gerador-de-capa-abnt/");
  ok(await p.$eval("#form", (f) => f.firstElementChild.id) === "btnExemploTeclado", "el botón para teclado es lo PRIMERO del formulario (no hay que dar 29 Tab)");
  ok(await p.$eval("#btnExemploTeclado", (e) => e.getBoundingClientRect().width <= 2), "sin foco el botón de teclado no se ve ni mueve nada");
  await p.keyboard.press("Tab");
  const foco1 = await p.evaluate(() => document.activeElement.id);
  const visibleFoco = await p.$eval("#btnExemploTeclado", (e) => e.getBoundingClientRect().width > 40);
  ok(visibleFoco || foco1 !== "btnExemploTeclado", "con el foco, el botón de teclado se hace visible", foco1);
  await p.focus("#btnExemploTeclado");
  ok(await p.$eval("#btnExemploTeclado", (e) => e.getBoundingClientRect().width > 40), "con el foco, el botón de teclado se ve");
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.getElementById("city").value === "Belo Horizonte", { timeout: 20000 });
  ok(await p.$$eval("#form input", (l) => l.some((i) => i.value === "Universidade Exemplo")), "el botón de teclado también llena el ejemplo");
  await ctx.close();
  const f = await abre("/gerador-de-capa-abnt/");
  await f.p.click("#btnExemploRapido");
  await espera(250);
  ok(await f.p.evaluate(() => document.activeElement.id) === "institution", "tras pulsar el botón el foco no se pierde: pasa al primer campo");
  await f.ctx.close();
  // "Agora não"
  const a = await abre("/gerador-de-capa-abnt/");
  await a.p.click("#exemploDispensa");
  const ocultos = await a.p.evaluate(() => document.getElementById("exemploRapido").hidden && document.getElementById("btnExemploTeclado").hidden);
  ok(ocultos, "«Agora não» cierra el convite (y el botón de teclado)");
  await a.ctx.close();
  // ?exemplo=1 + Limpar dados: no vuelve a llenarse
  const l = await abre("/gerador-de-capa-abnt/?exemplo=1");
  await l.p.waitForFunction(() => document.getElementById("city").value === "Belo Horizonte", { timeout: 20000 });
  ok(!/exemplo=1/.test(l.p.url()), "al empezar la demostración se quita ?exemplo=1 de la dirección", l.p.url());
  await l.p.waitForFunction(() => document.getElementById("advisor") && document.getElementById("advisor").value === "Prof. Dr. João Silva", { timeout: 20000 }).catch(() => {});
  await l.p.click("#btnLimpar");
  await Promise.all([l.p.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), l.p.click("#btnLimpar").catch(() => {})]);
  await espera(3500);
  const vacio = await campos(l.p);
  ok(vacio.institution === "" && vacio.title === "", "tras «Limpar dados» el formulario queda vacío y el ejemplo NO se vuelve a llenar", JSON.stringify(vacio));
  await l.ctx.close();
  // con datos propios parciales (solo el curso) la demostración no pisa nada
  const q = await abre("/gerador-de-capa-abnt/");
  await q.p.type("#course", "Meu curso");
  await q.p.goto(BASE + "/gerador-de-capa-abnt/?exemplo=1", { waitUntil: "networkidle0" });
  await espera(2500);
  const cq = await campos(q.p);
  ok(cq.course === "Meu curso" && cq.title === "" && !cq.caja, "con solo el curso guardado, ?exemplo=1 no pisa nada y no ofrece el ejemplo", JSON.stringify(cq));
  await q.p.evaluate(() => sessionStorage.clear());
  await q.ctx.close();
  // Nova capa durante la demostración la detiene
  const n = await abre("/gerador-de-capa-abnt/?exemplo=1");
  await espera(2300);
  await n.p.click("#btnNova");
  await espera(5000);
  ok((await campos(n.p)).title === "", "«Nova capa» durante la demostración la detiene (no vuelve a escribir el título)");
  await n.ctx.close();
  // datos de ejemplo: aviso al descargar
  const d = await abre("/gerador-de-capa-abnt/");
  await d.p.click("#btnExemploRapido");
  await d.p.waitForFunction(() => /Exemplo preenchido/.test(document.getElementById("toast").textContent), { timeout: 20000 });
  await d.p.click("#btnPdf");
  await d.p.waitForFunction(() => /Pronto! O arquivo/.test(document.getElementById("toast").textContent), { timeout: 30000 });
  ok(/dados de EXEMPLO/.test(await d.p.$eval("#toast", (e) => e.textContent)), "al descargar el ejemplo, el aviso dice que el archivo tiene datos de EJEMPLO");
  await d.p.evaluate(() => sessionStorage.clear());
  await d.ctx.close();
  // celular: aviso dentro de la vista previa y sin salto de diseño al descargar
  const m = await abre("/gerador-de-capa-abnt/", { w: 390, h: 800, movil: true });
  await m.p.click("#abaPrevia");
  await m.p.click("#btnExemploRapido");
  await espera(700);
  const nota = await m.p.$eval(".nota-previa", (e) => e.textContent);
  ok(/Exemplo preenchido/.test(nota), "celular: el aviso aparece dentro de la vista previa (la pestaña 1 está oculta)", nota);
  await m.p.click("#abaDados");
  const cls0 = await m.p.evaluate(() => window.__cls);
  await m.p.click("#btnPdf");
  await m.p.waitForFunction(() => /Pronto! O arquivo/.test(document.getElementById("toast").textContent), { timeout: 30000 });
  await espera(1200);
  const cls1 = await m.p.evaluate(() => window.__cls);
  ok(cls1 - cls0 < 0.07, `celular: al descargar el salto de diseño es < 0,07 (antes 0,089 con el bloque de compartir arriba; ~0,04 lo pone el panel «Próximo passo» que ya existía): ${(cls1 - cls0).toFixed(3)}`);
  ok(await m.p.$eval("#compartilhar", (e) => e.hidden), "celular: tras descargar no aparece nada tapando el mensaje de «Pronto!»");
  await m.p.click("#btnIndicar");
  ok(await m.p.$eval("#compartilhar", (e) => !e.hidden && getComputedStyle(e).position === "fixed"), "celular: al tocar el enlace se abre la cartinha flotante (no mueve nada)");
  await espera(700); // la entrada tarda 0,45 s
  const cajaM = await m.p.$eval("#compartilhar", (e) => { const r = e.getBoundingClientRect(); return [r.left >= 0, r.right <= innerWidth, r.bottom <= innerHeight + 1]; });
  ok(cajaM.every(Boolean), "celular: la cartinha cabe dentro de la pantalla", JSON.stringify(cajaM));
  await m.p.click("#compCopiar");
  await espera(400);
  ok(await m.p.$eval("#compAviso", (e) => e.getBoundingClientRect().height > 0 && e.textContent.trim().length > 0), "celular: el resultado de «Copiar o link» se ve (antes quedaba escondido)");
  const tam = await m.p.$$eval("#btnIndicar, #compZap, #compCopiar, #compFechar", (l) => l.map((e) => Math.round(e.getBoundingClientRect().height)));
  ok(tam.every((h) => h >= 44), "celular: enlace «Indicar», WhatsApp, Copiar y × miden al menos 44 px de alto", tam.join(","));
  await m.p.keyboard.press("Escape");
  ok(await m.p.$eval("#compartilhar", (e) => e.hidden), "celular: Esc cierra la cartinha");
  await m.p.click("#btnIndicar");
  await m.p.click("#compFechar");
  ok(await m.p.$eval("#compartilhar", (e) => e.hidden), "celular: la cartinha se cierra con la ×");
  await m.ctx.close();
}

seccion("6) portada: el botón lleva al ejemplo en vivo");
{
  const { p, ctx } = await abre("/");
  const hrefs = await p.$$eval(".hero-exemplo a", (l) => l.map((a) => a.getAttribute("href") + "|" + a.textContent.trim()));
  ok(hrefs.some((h) => h === "/gerador-de-capa-abnt/?exemplo=1|Ver um exemplo ao vivo"), "el botón de la portada abre la capa con ?exemplo=1", hrefs.join(" ; "));
  await ctx.close();
}

await b.close();
console.log(`\n${total - fallos}/${total} comprobaciones correctas${fallos ? `, ${fallos} FALLAN` : ""}`);
process.exit(fallos ? 1 : 0);
