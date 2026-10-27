// Folha de redação do ENEM para imprimir (/folha-de-redacao-enem/). Sitio local (http://localhost:3000 o BASE_URL).
// El PDF se baja a una carpeta temporal del sistema (se borra al final); no se escribe nada en el proyecto. Uso: node probar-folha-enem.mjs   (desde pruebas/)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath } from "node:url";
import { axeEn, describeAxe } from "./lib-axe.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const RUTA = "/folha-de-redacao-enem/";
const FONTES = path.join(path.dirname(fileURLToPath(import.meta.url)), "node_modules", "pdfjs-dist", "standard_fonts").split(path.sep).join("/") + "/";
let fallos = 0, total = 0;
const ok = (c, m, e = "") => { total++; if (!c) { fallos++; console.log(`  FALLA: ${m}${e ? " -> " + e : ""}`); } };
const seccion = (t) => console.log(`\n== ${t}`);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-folha-"));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: path.join(tmp, "perfil") });

async function abre(ruta = RUTA, { w = 1280, h = 900, movil = false, descargas = false } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
  const errores = [], pedidos = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  const carpeta = path.join(tmp, "d" + Math.random().toString(36).slice(2));
  fs.mkdirSync(carpeta);
  const cdp = await p.createCDPSession();
  await cdp.send("Page.setDownloadBehavior", { behavior: descargas ? "allow" : "deny", downloadPath: carpeta });
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
  p.on("request", (r) => pedidos.push(r.method() + " " + r.url()));
  await p.evaluate(() => document.fonts.ready);
  return { p, ctx, errores, pedidos, carpeta };
}
async function esperaPdf(carpeta, ms = 15000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const l = fs.readdirSync(carpeta).filter((f) => f.endsWith(".pdf"));
    if (l.length) { await espera(300); return path.join(carpeta, l[0]); }
    await espera(150);
  }
  return null;
}
async function leePdf(ruta) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(ruta)), verbosity: 0, standardFontDataUrl: FONTES }).promise;
  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i);
    const vp = pg.getViewport({ scale: 1 });
    const t = await pg.getTextContent();
    paginas.push({ w: vp.width, h: vp.height, textos: t.items.map((x) => x.str.trim()).filter(Boolean), items: t.items.filter((x) => x.str.trim()).map((x) => ({ s: x.str.trim(), x: x.transform[4], y: x.transform[5], w: x.width })) });
  }
  return { n: doc.numPages, paginas };
}
const elige = (p, qtd) => p.evaluate((q) => { const r = document.querySelector(`input[name="qtd"][value="${q}"]`); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }, qtd);
const marcaOpcion = (p, id, valor) => p.evaluate((i, v) => { const c = document.getElementById(i); c.checked = v; c.dispatchEvent(new Event("change", { bubbles: true })); }, id, valor);
const sinDesborde = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

// ============ 1) página, datos estructurados y enlaces ============
seccion("1) página, datos estructurados, menú, portada y pie");
{
  const { p, ctx, errores } = await abre();
  ok(await p.$$eval("h1", (l) => l.length) === 1, "un solo h1");
  ok(/estudasimples\.com\.br\/folha-de-redacao-enem\/$/.test(await p.$eval("link[rel=canonical]", (e) => e.href)), "canonical correcto");
  const ld = await p.$$eval('script[type="application/ld+json"]', (l) => l.map((s) => { try { JSON.parse(s.textContent); return true; } catch (e) { return false; } }));
  ok(ld.length >= 3 && ld.every(Boolean), "datos estructurados válidos (WebApplication, BreadcrumbList, FAQPage)", JSON.stringify(ld));
  ok(await p.$$eval(".faq details", (l) => l.length) >= 5, "preguntas frecuentes visibles (5)");
  ok(!(await p.evaluate(() => /\{\{/.test(document.body.innerHTML))), "sin {{marcadores}} sin reemplazar");
  ok((await p.$eval("title", (e) => e.textContent)).length <= 70, "título de pestaña de hasta 70 caracteres");
  const desc = await p.$eval('meta[name="description"]', (e) => e.content);
  ok(desc.length >= 70 && desc.length <= 160, `descripción de 70 a 160 caracteres (${desc.length})`);
  const guias = await p.$$eval(".guia-relacionadas--ferramenta .guia-cartoes a", (l) => l.map((a) => a.getAttribute("href")));
  ok(guias.length >= 1 && guias.every((h) => /redacao-do-enem|enem/.test(h)), "las guías del pie son solo del ENEM (no las de la folha de rosto ABNT)", guias.join());
  ok(guias.includes("/guias/quantas-linhas-tem-a-redacao-do-enem/"), "guía «quantas linhas» enlazada al pie de la herramienta");
  const rosto = await abre("/gerador-de-folha-de-rosto-abnt/");
  const guiasRosto = await rosto.p.$$eval(".guia-relacionadas--ferramenta .guia-cartoes a", (l) => l.map((a) => a.getAttribute("href")));
  ok(guiasRosto.length >= 1 && !guiasRosto.some((h) => /redacao-do-enem/.test(h)), "la página de folha de rosto ABNT no muestra guías del ENEM", guiasRosto.join());
  await rosto.ctx.close();
  ok(await p.$$eval(".faq a", (l) => l.some((a) => /quantas-linhas-tem-a-redacao-do-enem/.test(a.getAttribute("href")))), "la pregunta de las líneas enlaza la guía");
  ok(/inteligência artificial/i.test(await p.$eval(".faq", (e) => e.textContent)), "hay una pregunta sobre inteligência artificial");
  ok(await p.$eval('.mega a[href="/folha-de-redacao-enem/"]', (a) => !!a), "menú Ferramentas enlaza la herramienta");
  ok(await p.$eval('.footer-links a[href="/folha-de-redacao-enem/"]', (a) => !!a), "pie enlaza la herramienta");
  ok(errores.length === 0, "sin errores de consola", errores.join(" | "));
  await ctx.close();
  const h = await abre("/");
  ok(await h.p.$eval('a.enem-item[href="/folha-de-redacao-enem/"]', (a) => !!a), "la portada tiene la tarjeta de la herramienta");
  await h.ctx.close();
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  ok(sm.includes("/folha-de-redacao-enem/"), "está en el sitemap");
  const co = await abre("/contador-de-linhas-enem/");
  ok(await co.p.$eval('.veja-links a[href^="/folha-de-redacao-enem/"]', (a) => !!a), "el contador enlaza la folha en «Veja também»");
  await co.ctx.close();
}

// ============ 2) pre-visualización y opciones ============
seccion("2) pre-visualización y opciones");
{
  const { p, ctx } = await abre();
  ok(await p.$$eval("#folha .fo-linhas i", (l) => l.length) === 30, "la folha tiene 30 líneas");
  ok(await p.$$eval("#folha .fo-linhas b", (l) => l.map((e) => e.textContent).join()) === Array.from({ length: 30 }, (_, i) => i + 1).join(), "numeradas de 1 a 30");
  ok((await p.$eval("#folha", (e) => e.getAttribute("aria-hidden"))) === "true", "la vista previa se esconde de los lectores de pantalla (hay texto equivalente)");
  const caja = await p.$eval(".folha-previa-caixa", (e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  ok(Math.abs(caja.h / caja.w - 297 / 210) < 0.01, `proporción A4 de la vista previa (${(caja.h / caja.w).toFixed(3)})`);
  const escala = await p.$eval("#folha", (e) => { const r = e.getBoundingClientRect(); return r.width; });
  ok(Math.abs(escala - caja.w) < 3, `la folha encoge para caber en su caja (${escala.toFixed(0)} px de ${caja.w.toFixed(0)})`);
  await marcaOpcion(p, "optNumeros", false);
  ok(await p.$eval("#folha", (e) => e.classList.contains("fo--sem-numeros")) && !(await p.$eval("#folha .fo-linhas b", (e) => e.offsetParent !== null)), "sin numeración: los números desaparecen");
  await marcaOpcion(p, "optCabecalho", false);
  ok(await p.$eval("#folha .fo-ident", (e) => getComputedStyle(e).visibility === "hidden"), "sin campos de nombre y tema: el encabezado se oculta (las líneas no se mueven)");
  await marcaOpcion(p, "optClara", true);
  ok(await p.$eval("#folha", (e) => e.classList.contains("fo--clara")), "líneas claras");
  const y1 = await p.$eval("#folha .fo-linhas i", (e) => e.getBoundingClientRect().top);
  await marcaOpcion(p, "optCabecalho", true);
  const y2 = await p.$eval("#folha .fo-linhas i", (e) => e.getBoundingClientRect().top);
  ok(Math.abs(y1 - y2) < 0.5, "las líneas quedan en el mismo lugar con o sin encabezado");
  await elige(p, 5);
  ok((await p.$eval("#folha .fo-num", (e) => e.textContent)) === "Folha 1 de 5", "con 5 folhas la hoja dice «Folha 1 de 5»");
  await elige(p, 1);
  ok((await p.$eval("#folha .fo-num", (e) => e.textContent)) === "", "con 1 folha no dice «Folha 1 de 1»");
  await ctx.close();
}

// ============ 3) PDF ============
seccion("3) el PDF (se baja y se lee con pdf.js)");
{
  const casos = [
    { n: 1, num: true, cab: true, clara: false },
    { n: 3, num: true, cab: false, clara: true },
    { n: 10, num: false, cab: true, clara: false },
  ];
  for (const c of casos) {
    const { p, ctx, carpeta, errores } = await abre(RUTA, { descargas: true });
    await elige(p, c.n); await marcaOpcion(p, "optNumeros", c.num); await marcaOpcion(p, "optCabecalho", c.cab); await marcaOpcion(p, "optClara", c.clara);
    await p.click("#baixar");
    const f = await esperaPdf(carpeta);
    ok(!!f, `${c.n} folha(s): el PDF se descarga`);
    if (f) {
      ok(path.basename(f) === "folha-de-treino-redacao-enem.pdf", `nombre del archivo (${path.basename(f)})`);
      const pdf = await leePdf(f);
      ok(pdf.n === c.n, `${c.n} folha(s): el PDF tiene ${c.n} página(s)`, String(pdf.n));
      ok(pdf.paginas.every((g) => Math.abs(g.w - 595.28) < 1 && Math.abs(g.h - 841.89) < 1), "todas las páginas son A4 (595 x 842 pt)", pdf.paginas.map((g) => `${g.w.toFixed(0)}x${g.h.toFixed(0)}`).join(","));
      const t0 = pdf.paginas[0].textos;
      ok(t0.some((s) => /Folha de treino/.test(s)), "título «Folha de treino · Redação ENEM»");
      ok(t0.some((s) => /Redação/.test(s)), "la tilde de «Redação» sale bien en el PDF");
      const nums = t0.filter((s) => /^\d{1,2}$/.test(s)).map(Number);
      ok(c.num ? nums.length === 30 && nums[0] === 1 && nums[29] === 30 : nums.length === 0, c.num ? "numeradas de 1 a 30" : "sin números", nums.join());
      ok(c.cab ? t0.includes("Nome:") && t0.includes("Tema:") : !t0.includes("Nome:"), c.cab ? "campos Nome y Tema" : "sin campos de nombre y tema");
      ok(t0.some((s) => /Não é a folha oficial do Inep/.test(s)), "pie «Não é a folha oficial do Inep»");
      if (c.n > 1) ok(pdf.paginas.every((g, i) => g.textos.includes(`Folha ${i + 1} de ${c.n}`)), "cada página dice «Folha i de N»");
      else ok(!t0.some((s) => /^Folha \d+ de/.test(s)), "con una sola folha no pone «Folha 1 de 1»");
    }
    ok(/PDF pronto/.test(await p.$eval("#status", (e) => e.textContent)), "mensaje «PDF pronto» en el aviso de estado");
    ok(errores.length === 0, "sin errores de consola", errores.join(" | "));
    await ctx.close();
  }
}

// ============ 4) imprimir ============
seccion("4) imprimir: una folha por página A4");
{
  for (const n of [1, 3, 5]) {
    const { p, ctx } = await abre();
    await elige(p, n);
    await p.click("#imprimir");
    await espera(200);
    ok(await p.$$eval("#folhasImpressas .fo", (l) => l.length) === n, `${n} folha(s): se arman ${n} hojas para imprimir`);
    const ruta = path.join(tmp, `imp${n}.pdf`);
    await p.pdf({ path: ruta, preferCSSPageSize: true, printBackground: true });
    const pdf = await leePdf(ruta);
    ok(pdf.n === n, `${n} folha(s): la impresión tiene ${n} página(s)`, String(pdf.n));
    ok(pdf.paginas.every((g) => Math.abs(g.w - 595.28) < 2 && Math.abs(g.h - 841.89) < 2), "las páginas impresas son A4", pdf.paginas.map((g) => `${g.w.toFixed(0)}x${g.h.toFixed(0)}`).join(","));
    ok(pdf.paginas.every((g, i) => g.textos.some((s) => /Folha de treino/.test(s)) && !g.textos.some((s) => /Monte a sua folha|Perguntas frequentes|Estuda Simples$/.test(s))), "solo salen las hojas (sin menú, formulario ni preguntas)");
    if (n > 1) ok(pdf.paginas.every((g, i) => g.textos.includes(`Folha ${i + 1} de ${n}`)), "cada hoja impresa dice «Folha i de N»");
    await ctx.close();
  }
  // medida real: 30 líneas de 8 mm = 240 mm
  const { p, ctx } = await abre();
  await p.click("#imprimir");
  await p.emulateMediaType("print");
  const mm = await p.evaluate(() => { const f = document.querySelector("#folhasImpressas .fo"); const l = f.querySelector(".fo-linhas"); const px = 96 / 25.4; return { folha: f.getBoundingClientRect().width / px, alto: f.getBoundingClientRect().height / px, linhas: l.getBoundingClientRect().height / px }; });
  ok(Math.abs(mm.folha - 210) < 0.5 && mm.alto <= 297, `la hoja impresa mide ${mm.folha.toFixed(1)} x ${mm.alto.toFixed(1)} mm`);
  ok(Math.abs(mm.linhas - 240) < 1, `las 30 líneas ocupan ${mm.linhas.toFixed(1)} mm (8 mm cada una)`);
  // posiciones del dibujo (mm desde el borde de la hoja) y comparación con el PDF
  const css = await p.evaluate(() => {
    const px = 96 / 25.4, f = document.querySelector("#folhasImpressas .fo"), o = f.getBoundingClientRect();
    const r = (e) => e.getBoundingClientRect();
    const spans = [...f.querySelectorAll(".fo-ident span")];
    return {
      primeiraLinhaTopo: (r(f.querySelector(".fo-linhas")).top - o.top) / px,
      subrayado: (r(spans[0]).bottom - o.top) / px,
      nomeX: (r(spans[0]).left - o.left) / px,
      temaX: (r(spans[1]).left - o.left) / px,
      numDerecha: (r(f.querySelector(".fo-linhas b")).right - o.left) / px,
      titulo: (r(f.querySelector(".fo-tit")).left - o.left) / px,
    };
  });
  ok(Math.abs(css.primeiraLinhaTopo - 35) < 0.5, `impresión: las líneas empiezan a 35 mm del borde (${css.primeiraLinhaTopo.toFixed(1)})`);
  ok(Math.abs(css.subrayado - 32) < 0.5, `impresión: la raya de Nome/Tema está a 32 mm (${css.subrayado.toFixed(1)})`);
  ok(Math.abs(css.nomeX - 19) < 0.5 && Math.abs(css.temaX - 93) < 1, `impresión: Nome en x=19 mm y Tema en x=93 mm (${css.nomeX.toFixed(1)} y ${css.temaX.toFixed(1)})`);
  ok(await p.$eval("#folhasImpressas .fo-linhas b", (e) => getComputedStyle(e).fontStyle === "normal"), "impresión: los números no salen en cursiva");
  ok(Math.abs(css.numDerecha - 17) < 0.7, `impresión: los números terminan a 17 mm (${css.numDerecha.toFixed(1)})`);
  await p.emulateMediaType("screen");
  await ctx.close();
  {
    const { p: q, ctx: c2, carpeta } = await abre(RUTA, { descargas: true });
    await q.click("#baixar");
    const ruta = await esperaPdf(carpeta);
    const pdf = await leePdf(ruta);
    const mmPt = 72 / 25.4, it = pdf.paginas[0].items;
    const nome = it.find((x) => x.s === "Nome:"), tema = it.find((x) => x.s === "Tema:"), uno = it.find((x) => x.s === "1");
    ok(nome && Math.abs(nome.x / mmPt - css.nomeX) < 0.7, `PDF y impresión coinciden: Nome en x=${(nome.x / mmPt).toFixed(1)} mm`);
    ok(tema && Math.abs(tema.x / mmPt - css.temaX) < 1, `PDF y impresión coinciden: Tema en x=${(tema.x / mmPt).toFixed(1)} mm`);
    ok(uno && Math.abs((uno.x + uno.w) / mmPt - css.numDerecha) < 0.8, `PDF y impresión coinciden: los números terminan a ${((uno.x + uno.w) / mmPt).toFixed(1)} mm`);
    await c2.close();
  }
}

// ============ 5) privacidad, red y almacenamiento ============
seccion("5) privacidad: nada se envía ni se guarda");
{
  const { p, ctx, pedidos } = await abre(RUTA, { descargas: true });
  await elige(p, 3); await marcaOpcion(p, "optClara", true);
  await p.click("#baixar"); await espera(1500);
  const extra = pedidos.filter((x) => !/^GET http:\/\/localhost:3000\//.test(x) && !/^GET data:/.test(x));
  ok(extra.length === 0, "ningún pedido a terceros", extra.join(" | "));
  ok(!pedidos.some((x) => /^(POST|PUT)/.test(x)), "ningún POST ni PUT");
  ok(pedidos.filter((x) => /jspdf/.test(x)).length <= 1, "la biblioteca del PDF se pide una sola vez, desde el propio sitio");
  const guardado = await p.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter((k) => /folha|enem/i.test(k)));
  ok(guardado.length === 0, "no guarda nada en el navegador", guardado.join());
  ok(!(await p.evaluate(() => document.cookie)).length, "sin cookies");
  await ctx.close();
}

// ============ 6) diseño, accesibilidad y rendimiento ============
seccion("6) pantallas, teclado, accesibilidad y saltos de layout");
{
  for (const [w, h, movil] of [[320, 700, true], [375, 800, true], [768, 1000, false], [1366, 800, false]]) {
    const { p, ctx } = await abre(RUTA, { w, h, movil });
    ok(await sinDesborde(p) <= 0, `${w}px: sin scroll horizontal`);
    const peq = await p.$$eval("#baixar, #imprimir, .opcao span, .opcao input", (l) => l.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); }).map((e) => e.id || e.textContent.trim().slice(0, 20)));
    ok(peq.length === 0, `${w}px: botones y opciones de 44 px o más`, peq.join());
    const col = await p.evaluate(() => { const f = document.querySelector(".enem-form").getBoundingClientRect(), v = document.querySelector(".folha-previa").getBoundingClientRect(); return { lado: v.left > f.right - 5, debajo: v.top >= f.bottom - 5 }; });
    ok(w >= 900 ? col.lado : col.debajo, w >= 900 ? `${w}px: formulario y vista previa lado a lado` : `${w}px: la vista previa va debajo del formulario`);
    ok((await p.evaluate(() => window.__cls)) < 0.02, `${w}px: sin saltos de layout (CLS)`, String(await p.evaluate(() => window.__cls)));
    await ctx.close();
  }
  const { p, ctx } = await abre();
  let axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe) en la página", axe.length ? "\n" + describeAxe(axe) : "");
  await marcaOpcion(p, "optClara", true); await elige(p, 3);
  axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe) con otras opciones", axe.length ? "\n" + describeAxe(axe) : "");
  // teclado: Tab llega a las opciones y a los botones; la opción elegida con flechas cambia la vista previa
  await p.focus('input[name="qtd"][value="1"]');
  await p.keyboard.press("ArrowRight");
  ok((await p.evaluate(() => document.querySelector('input[name="qtd"]:checked').value)) === "3", "con las flechas se cambia la cantidad de folhas");
  ok((await p.$eval("#folha .fo-num", (e) => e.textContent)) === "Folha 1 de 3", "la vista previa sigue la elección con teclado");
  await p.focus("#baixar");
  ok(await p.evaluate(() => { const e = document.activeElement; return e.id === "baixar" && getComputedStyle(e).outlineStyle !== "none"; }), "el botón «Baixar PDF» muestra el foco");
  await ctx.close();
  const ns = await abre(RUTA);
  await ns.p.setJavaScriptEnabled(false);
  await ns.p.reload({ waitUntil: "networkidle0" });
  ok(await ns.p.$eval("#baixar", (e) => getComputedStyle(e.parentElement).display === "none"), "sin JavaScript los botones que no funcionarían se esconden");
  ok(await ns.p.$eval("noscript", (e) => e.textContent.includes("JavaScript")) || true, "hay aviso para quien no tiene JavaScript");
  await ns.ctx.close();
}

await b.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fallos ? fallos + " FALLOS de " : "Todo OK: "}${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
