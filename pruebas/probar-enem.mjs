// Fase 3: contador de linhas, cronograma de estudos y calculadora de média (ENEM). Sitio local (http://localhost:3000 o BASE_URL).
// Las descargas se bloquean; no se escribe nada en el PC. Uso: node probar-enem.mjs   (desde pruebas/)
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
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-enem-")) });

async function abre(ruta, { w = 1280, h = 900, movil = false, reducido = false } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
  if (reducido) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const errores = [], pedidos = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  const cdp = await p.createCDPSession();
  await cdp.send("Page.setDownloadBehavior", { behavior: "deny" });
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
  p.on("request", (r) => pedidos.push(r.method() + " " + r.url())); // desde aquí: cualquier pedido nuevo es sospechoso
  await p.evaluate(() => document.fonts.ready);
  return { p, ctx, errores, pedidos };
}
const poneTexto = (p, sel, valor) => p.evaluate((s, v) => { const el = document.querySelector(s); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, sel, valor);
const texto = (p, sel) => p.$eval(sel, (e) => e.textContent.trim());
const sinDesborde = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const enDias = (n) => iso(new Date(Date.now() + n * 86400000));
const soloEstaticos = (l) => l.filter((x) => !/^GET (data:|http:\/\/localhost:3000\/.*(\.woff2|\.css|\.js)(\?|$))/.test(x) && !/^GET http:\/\/localhost:3000\/[a-z0-9\-\/]*\/?$/.test(x));
const lorem = (n) => Array(n).fill("palavra").join(" ");

// ============ 0) sitio: páginas, sitemap, portada, rodapé ============
seccion("0) páginas, sitemap, portada y rodapé");
{
  for (const ruta of ["/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/"]) {
    const { p, ctx, errores } = await abre(ruta);
    ok(await p.$$eval("h1", (l) => l.length) === 1, `${ruta}: un solo h1`);
    ok((await p.$eval("link[rel=canonical]", (e) => e.href)) === BASE + ruta || /estudasimples\.com\.br/.test(await p.$eval("link[rel=canonical]", (e) => e.href)), `${ruta}: canonical correcto`);
    const ld = await p.$$eval('script[type="application/ld+json"]', (l) => l.map((s) => { try { JSON.parse(s.textContent); return true; } catch (e) { return false; } }));
    ok(ld.length >= 3 && ld.every(Boolean), `${ruta}: datos estructurados válidos (WebApplication, BreadcrumbList, FAQPage)`, JSON.stringify(ld));
    ok(await p.$$eval(".faq details", (l) => l.length) >= 4, `${ruta}: preguntas frecuentes visibles`);
    ok(!(await p.evaluate(() => /\{\{|\[PLACEHOLDER/.test(document.body.innerHTML))), `${ruta}: sin {{marcadores}} sin reemplazar`);
    ok(errores.length === 0, `${ruta}: sin errores de JavaScript ni de consola`, errores.join(" | "));
    await ctx.close();
  }
  const { p, ctx } = await abre("/");
  ok(!(await p.evaluate(() => /Em breve/.test(document.body.textContent))), "la portada ya no dice «Em breve»");
  const hrefs = await p.$$eval("#enem a.cartao", (l) => l.map((a) => a.getAttribute("href")));
  ok(JSON.stringify(hrefs) === JSON.stringify(["/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/"]), "la portada enlaza a las 3 herramientas", JSON.stringify(hrefs));
  const pie = await p.$$eval(".footer-links a", (l) => l.map((a) => a.getAttribute("href")));
  ok(["/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/"].every((h) => pie.includes(h)), "el pie de página enlaza a las 3 herramientas");
  ok(!/7 a 30/.test(await p.evaluate(() => document.documentElement.outerHTML)), "ya no queda el texto «7 a 30 linhas» (el mínimo es 8: hasta 7 = cero)");
  await ctx.close();
  const sm = fs.readFileSync(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  ok(["contador-de-linhas-enem", "cronograma-de-estudos-enem", "calculadora-de-media"].every((s) => sm.includes(`/${s}/`)), "el sitemap trae las 3 URLs nuevas");
}

// ============ 1) contador ============
seccion("1) contador de linhas");
{
  const { p, ctx, errores, pedidos } = await abre("/contador-de-linhas-enem/");
  ok(await p.$$eval("#folha .folha-linha", (l) => l.length) === 30, "la hoja tiene 30 líneas");
  ok(await p.$$eval("#faixa i", (l) => l.length) === 30, "la franja tiene 30 marcas");
  ok(await texto(p, "#numLinhas") === "0" && /Escreva ou cole/.test(await texto(p, "#rotuloEstado")), "estado vacío");
  ok(await texto(p, "#amplitude") === "", "sin texto no hay rango de letra");
  // 1 línea
  await poneTexto(p, "#texto", "Uma frase curta.");
  ok(await texto(p, "#numLinhas") === "1" && /insuficiente/i.test(await texto(p, "#rotuloEstado")), "1 línea = texto insuficiente");
  ok(/nota zero/.test(await texto(p, "#explicaEstado")) && /8 linhas/.test(await texto(p, "#explicaEstado")), "explica nota cero y el mínimo de 8");
  ok(await p.$eval("#resultado", (e) => e.dataset.estado) === "erro", "estado de error");
  // 8 líneas: 8 párrafos
  await poneTexto(p, "#texto", Array(8).fill(lorem(5)).join("\n"));
  ok(await texto(p, "#numLinhas") === "8" && /Dentro do limite/.test(await texto(p, "#rotuloEstado")), "8 líneas = dentro del límite");
  ok(await p.$$eval("#folha .folha-linha.usada", (l) => l.length) === 8 && await p.$$eval("#faixa i.on", (l) => l.length) === 8, "la hoja y la franja marcan 8 líneas");
  ok(/cerca de/.test(await texto(p, "#amplitude")), "muestra el rango con letra 15% mayor y menor");
  // 7 líneas = cero
  await poneTexto(p, "#texto", Array(7).fill(lorem(5)).join("\n"));
  ok(await texto(p, "#numLinhas") === "7" && /insuficiente/i.test(await texto(p, "#rotuloEstado")), "7 líneas = insuficiente (hasta 7 = cero)");
  // 30 líneas
  await poneTexto(p, "#texto", Array(30).fill(lorem(5)).join("\n"));
  ok(await texto(p, "#numLinhas") === "30" && /30 linhas da folha/.test(await texto(p, "#explicaEstado")), "30 líneas = usa toda la hoja");
  // 31 líneas
  await poneTexto(p, "#texto", Array(34).fill(lorem(5)).join("\n"));
  ok(await texto(p, "#numLinhas") === "34" && /Passou de 30/.test(await texto(p, "#rotuloEstado")), "34 líneas = pasó de 30");
  ok(/\+ 4 linhas além da folha/.test(await texto(p, "#excesso")), "avisa cuántas líneas sobran", await texto(p, "#excesso"));
  ok(await p.$$eval("#faixa i.fora", (l) => l.length) === 30, "con exceso toda la franja se pinta en alerta");
  // caracteres por línea
  const largo = Array(6).fill(lorem(60)).join("\n");
  await poneTexto(p, "#texto", largo);
  const l70 = Number(await texto(p, "#numLinhas"));
  await p.click("#mais"); await p.click("#mais"); // 80
  const l80 = Number(await texto(p, "#numLinhas"));
  ok(await p.$eval("#car", (e) => e.value) === "80" && l80 < l70, "más caracteres por línea = menos líneas", `${l70} -> ${l80}`);
  await p.reload({ waitUntil: "networkidle0" });
  pedidos.length = 0;
  ok(await p.$eval("#car", (e) => e.value) === "80", "el número de caracteres por línea se recuerda en el aparato");
  ok(await p.$eval("#texto", (e) => e.value) === "", "el TEXTO no se guarda (privacidad)");
  await p.click("#padrao");
  ok(await p.$eval("#car", (e) => e.value) === "70", "«Voltar ao 70»");
  await poneTexto(p, "#car", "abc"); // inválido
  await p.$eval("#car", (e) => e.dispatchEvent(new Event("change", { bubbles: true })));
  ok(await p.$eval("#car", (e) => e.value) === "70", "valor inválido vuelve al 70");
  await poneTexto(p, "#car", "5000");
  ok(await p.$eval("#car", (e) => e.value) === "120", "valor enorme se limita a 120");
  // limpiar
  await poneTexto(p, "#texto", "alguma coisa");
  await p.click("#limpar");
  ok(await p.$eval("#texto", (e) => e.value === "" && document.activeElement === e), "«Limpar o texto» vacía y devuelve el foco");
  // voz del lector de pantalla
  await poneTexto(p, "#texto", Array(10).fill(lorem(5)).join("\n"));
  await espera(1100);
  ok(/10 linhas de 30/.test(await texto(p, "#vivo")), "la región para lectores de pantalla se actualiza tras una pausa", await texto(p, "#vivo"));
  ok(await p.$eval("#vivo", (e) => e.getAttribute("role") === "status"), "región role=status");
  // privacidad: nada salió
  ok(soloEstaticos(pedidos).length === 0, "al escribir no se hace NINGÚN pedido de red", pedidos.join(" | "));
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  const cls = await p.evaluate(() => window.__cls);
  ok(cls < 0.02, "salto de diseño (CLS) < 0,02 al escribir", String(cls));
  await poneTexto(p, "#texto", Array(40).fill(lorem(5)).join("\n"));
  let axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe) con el estado de alerta", axe.length ? "\n" + describeAxe(axe) : "");
  await poneTexto(p, "#texto", Array(12).fill(lorem(5)).join("\n"));
  axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe) con el estado correcto", axe.length ? "\n" + describeAxe(axe) : "");
  await ctx.close();
  // orden: en el celular el resultado está arriba del texto; en el escritorio, a la derecha
  const m = await abre("/contador-de-linhas-enem/", { w: 390, h: 800, movil: true });
  const pos = await m.p.evaluate(() => { const f = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right }; }; return { r: f("resultado"), t: f("texto") }; });
  ok(pos.r.top < pos.t.top && pos.t.top < 800, "celular: el resultado queda arriba y el campo de texto se ve sin hacer scroll", JSON.stringify([pos.r.top, pos.t.top]));
  await m.ctx.close();
  const d = await abre("/contador-de-linhas-enem/", { w: 1366, h: 900 });
  const pd = await d.p.evaluate(() => { const f = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right }; }; return { r: f("resultado"), t: f("texto") }; });
  ok(pd.r.left > pd.t.right - 5, "escritorio: el resultado queda a la derecha del texto");
  await d.ctx.close();
}

// ============ 2) calculadora de média ============
seccion("2) calculadora de média");
{
  const { p, ctx, errores, pedidos } = await abre("/calculadora-de-media/");
  ok(await p.$$eval("#notas input", (l) => l.length) === 3 && await p.$$eval("#notas .a-calcular", (l) => l.length) === 1, "4 bimestres: 3 notas + la última «a calcular»");
  ok(await p.$eval("#resultado", (e) => e.dataset.estado) === "neutro", "al abrir, estado neutro (sin números inventados)");
  ok(await p.$eval("#media", (e) => e.value) === "", "la media NO viene rellena (cada escuela define la suya)");
  await poneTexto(p, "#media", "6,0"); await poneTexto(p, "#nota1", "7,5"); await poneTexto(p, "#nota2", "6,0");
  ok(/Falta a nota do 3º bimestre/.test(await texto(p, "#pergunta")), "avisa qué nota falta");
  await poneTexto(p, "#nota3", "5,5");
  ok(await texto(p, "#numNota") === "5,0", "ejemplo 7,5/6,0/5,5 con media 6,0 = 5,0");
  ok(/\(7,5 \+ 6,0 \+ 5,5 \+ 5,0\) ÷ 4 = 6,0/.test(await texto(p, "#conta")), "muestra la cuenta", await texto(p, "#conta"));
  ok(await p.$eval("#barra", (e) => e.style.width) === "50%", "la barra marca el 50 %");
  await poneTexto(p, "#nota1", "7.5");
  ok(await texto(p, "#numNota") === "5,0", "acepta punto decimal");
  await poneTexto(p, "#nota1", "9"); await poneTexto(p, "#nota2", "9"); await poneTexto(p, "#nota3", "9");
  ok(await texto(p, "#numNota") === "0,0" && /já garantiu/.test(await texto(p, "#pergunta")), "ya aprobado con 9,9,9");
  await poneTexto(p, "#media", "7"); await poneTexto(p, "#nota1", "2"); await poneTexto(p, "#nota2", "2"); await poneTexto(p, "#nota3", "2");
  ok(await p.$eval("#resultado", (e) => e.dataset.estado) === "erro" && await texto(p, "#numNota") === "22,0", "imposible: muestra cuánto haría falta (22,0) en estado de alerta", await texto(p, "#numNota"));
  ok(/recuperação/.test(await texto(p, "#conta")), "imposible: manda ver el reglamento");
  await poneTexto(p, "#nota3", "abc");
  ok(/não está certa/.test(await texto(p, "#pergunta")), "nota inválida avisa");
  await poneTexto(p, "#nota3", "11");
  ok(/não está certa/.test(await texto(p, "#pergunta")), "nota mayor que 10 avisa");
  await poneTexto(p, "#nota3", "5"); await poneTexto(p, "#media", "0");
  ok(/maior que 0 e no máximo 10/.test(await texto(p, "#pergunta")), "media 0 avisa");
  // trimestres: conserva lo escrito
  await poneTexto(p, "#media", "6"); await poneTexto(p, "#nota1", "7"); await poneTexto(p, "#nota2", "5");
  await p.select("#etapas", "3");
  ok(await p.$$eval("#notas input", (l) => l.length) === 2 && /trimestre/.test(await p.$eval("#notas", (e) => e.textContent)), "3 trimestres: 2 notas");
  ok(await p.$eval("#nota1", (e) => e.value) === "7" && await p.$eval("#nota2", (e) => e.value) === "5", "al cambiar de etapas se conservan las notas escritas");
  ok(await texto(p, "#numNota") === "6,0", "3 trimestres, 7 y 5, media 6: necesita 6,0", await texto(p, "#numNota"));
  await p.select("#etapas", "2");
  ok(await p.$$eval("#notas input", (l) => l.length) === 1 && await p.$eval("#nota1", (e) => e.value) === "7", "2 semestres: 1 nota");
  ok(await texto(p, "#numNota") === "5,0", "2 semestres, 7, media 6: necesita 5,0", await texto(p, "#numNota"));
  // pesos
  await p.select("#etapas", "4");
  await poneTexto(p, "#media", "6"); await poneTexto(p, "#nota1", "5"); await poneTexto(p, "#nota2", "5"); await poneTexto(p, "#nota3", "5");
  await p.click("#mais summary");
  await poneTexto(p, "#peso4", "3");
  ok(await texto(p, "#numNota") === "7,0" && /ponderada/.test(await texto(p, "#conta")), "con peso 3 en la última: necesita 7,0 (media ponderada)", await texto(p, "#numNota"));
  await poneTexto(p, "#peso4", "0");
  ok(/pesos/.test(await texto(p, "#pergunta")), "peso 0 avisa");
  await poneTexto(p, "#peso4", "1"); await poneTexto(p, "#maxima", "5"); await poneTexto(p, "#media", "4"); await poneTexto(p, "#nota1", "4"); await poneTexto(p, "#nota2", "4"); await poneTexto(p, "#nota3", "4");
  ok(await texto(p, "#escalaMax") === "5" && await texto(p, "#numNota") === "4,0", "con nota máxima 5, media 4 y 4,4,4 necesita 4,0");
  // revisión: máxima inválida avisa, notas con 2 decimales, pesos redondeados, anuncio inicial
  await poneTexto(p, "#maxima", "100x");
  ok(/nota máxima precisa ser/.test(await texto(p, "#pergunta")), "nota máxima inválida avisa (no calcula en silencio con 10)");
  await poneTexto(p, "#maxima", "10"); await poneTexto(p, "#media", "abc");
  ok(/Não entendi a média/.test(await texto(p, "#pergunta")), "media inválida avisa");
  await poneTexto(p, "#media", "6,5"); await poneTexto(p, "#nota1", "7,25"); await poneTexto(p, "#nota2", "5,75"); await poneTexto(p, "#nota3", "6");
  ok(/7,25 \+ 5,75/.test(await texto(p, "#conta")), "la cuenta muestra 7,25 y 5,75 sin redondear a 1 decimal", await texto(p, "#conta"));
  await p.$eval("#mais", (e) => { e.open = true; });
  await poneTexto(p, "#peso1", "0,1"); await poneTexto(p, "#peso2", "0,2"); await poneTexto(p, "#peso3", "1"); await poneTexto(p, "#peso4", "1");
  ok(!/0,3000/.test(await texto(p, "#conta")), "la suma de pesos no muestra ruido de coma flotante", await texto(p, "#conta"));
  await poneTexto(p, "#peso1", "1"); await poneTexto(p, "#peso2", "1");
  // privacidad
  ok(soloEstaticos(pedidos).length === 0, "al calcular no se hace NINGÚN pedido de red", pedidos.join(" | "));
  ok(await p.evaluate(() => Object.keys(localStorage).filter((k) => /nota|media|peso/i.test(k)).length) === 0, "las notas y la media no se guardan en el aparato");
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  await poneTexto(p, "#media", "6"); await poneTexto(p, "#maxima", "10"); await poneTexto(p, "#nota1", "7");
  const axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe)", axe.length ? "\n" + describeAxe(axe) : "");
  await ctx.close();
  // celular: nada se sale de la pantalla
  const m = await abre("/calculadora-de-media/", { w: 390, h: 800, movil: true });
  ok((await sinDesborde(m.p)) <= 0, "celular: sin scroll horizontal");
  const fuera = await m.p.$$eval("input, select, button", (l) => l.filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.id || e.tagName));
  ok(fuera.length === 0, "celular: ningún campo se sale de la pantalla", fuera.join(","));
  const chicos = await m.p.$$eval("#notas input, #media, #etapas", (l) => l.filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.id));
  ok(chicos.length === 0, "celular: campos de al menos 44 px de alto", chicos.join(","));
  await m.ctx.close();
}

{
  const n = await abre("/calculadora-de-media/");
  await espera(1200);
  ok((await texto(n.p, "#vivo")) === "", "al abrir, el lector de pantalla NO recibe ningún anuncio (solo tras interactuar)");
  await n.ctx.close();
}

// ============ 3) cronograma ============
seccion("3) cronograma de estudos");
{
  const { p, ctx, errores, pedidos } = await abre("/cronograma-de-estudos-enem/");
  ok(!(await p.$eval("#vazio", (e) => e.hidden)) && await p.$eval("#plano", (e) => e.hidden), "al abrir: mensaje «Seu plano aparece aqui» y sin plan");
  await p.click("#montar");
  ok(/Escolha a data/.test(await texto(p, "#erro")) && !(await p.$eval("#erro", (e) => e.hidden)), "sin fecha: avisa con claridad");
  await poneTexto(p, "#data", enDias(-5));
  await p.click("#montar");
  ok(/já passou/.test(await texto(p, "#erro")), "fecha pasada: avisa");
  const faltan = 24;
  await poneTexto(p, "#data", enDias(faltan));
  await p.click("#montar");
  await espera(200);
  ok(!(await p.$eval("#plano", (e) => e.hidden)) && await p.$eval("#vazio", (e) => e.hidden), "con fecha válida aparece el plan");
  ok(new RegExp(`Faltam ${faltan} dias`).test(await texto(p, "#planoTitulo")), "título: faltan 24 días", await texto(p, "#planoTitulo"));
  ok(await p.evaluate(() => document.activeElement.id) === "planoTitulo", "el foco pasa al título del plan (lectores de pantalla)");
  const resumen = await texto(p, "#planoResumo");
  ok(/semanas? no plano · 6 dias de estudo por semana · 2 h por dia/.test(resumen), "resumen: semanas, 6 días, 2 h", resumen);
  const nSem = await p.$$eval(".semana-bloco", (l) => l.length);
  ok(nSem >= 4 && nSem <= 5, "24 días = 4 o 5 semanas de lunes a domingo", String(nSem));
  ok(await p.$$eval(".semana-bloco:not([hidden])", (l) => l.length) === 1, "en pantalla se ve una semana a la vez");
  ok(await p.$eval("#anterior", (e) => e.getAttribute("aria-disabled") === "true") && await p.$eval("#proxima", (e) => e.getAttribute("aria-disabled") === "false"), "primera semana: «anterior» desactivado (aria-disabled, el foco no se pierde)");
  const t1 = await texto(p, "#semanaTitulo");
  await p.click("#proxima");
  ok(await texto(p, "#semanaTitulo") !== t1 && await p.$eval("#anterior", (e) => e.getAttribute("aria-disabled") === "false"), "«próxima» cambia de semana");
  await p.focus("#proxima");
  await p.keyboard.press("Enter");
  ok(await p.evaluate(() => document.activeElement.id) === "proxima", "con teclado el foco se queda en «próxima»");
  for (let i = 0; i < nSem; i++) { if (!(await p.$eval("#proxima", (e) => e.disabled))) await p.click("#proxima"); }
  ok(await p.$eval("#proxima", (e) => e.getAttribute("aria-disabled") === "true"), "última semana: «próxima» desactivado");
  await p.focus("#proxima"); await p.keyboard.press("Enter");
  ok(await p.evaluate(() => document.activeElement.id) === "proxima", "en la última semana el foco no se pierde");
  const semUlt = await texto(p, "#semanaTitulo");
  await p.click('input[name="horas"][value="3"]');
  await espera(150);
  ok(await texto(p, "#semanaTitulo") === semUlt, "cambiar una respuesta mantiene la semana que se estaba viendo");
  await poneTexto(p, "#data", "0002-11-08");
  ok(!(await p.$eval("#plano", (e) => e.hidden)) && !/já passou/.test(await p.$eval("#erro", (e) => e.hidden ? "" : e.textContent)), "un año a medio escribir (0002) no esconde el plan ni grita «já passou»");
  ok(await texto(p, "#semanaTitulo") === semUlt, "un año a medio escribir (0002) no borra ni cambia el plan");
  await poneTexto(p, "#data", enDias(faltan));
  ok(await p.$$eval(".bloco--prova", (l) => l.length) === 1, "aparece un único «Dia da prova»");
  const prova = await p.$eval(".semana-bloco:not([hidden]) .bloco--prova", (e) => e.textContent);
  ok(/Dia da prova/.test(prova), "el día de la prueba está en la última semana");
  // 3 horas
  await p.click('input[name="horas"][value="3"]');
  await espera(150);
  const bloquesPorDia = await p.$$eval(".sem-dia:not(.livre)", (l) => l.map((e) => e.querySelectorAll(".bloco:not(.bloco--prova)").length).filter((n) => n > 0));
  ok(bloquesPorDia.length > 0 && bloquesPorDia.every((n) => n === 3), "con 3 h por día cada día tiene 3 bloques", JSON.stringify(bloquesPorDia));
  // refuerzo
  await p.click('input[name="reforco"][value="mat"]');
  await espera(150);
  const cuenta = await p.evaluate(() => ({ mat: document.querySelectorAll(".bloco--mat").length, lin: document.querySelectorAll(".bloco--lin").length }));
  ok(cuenta.mat > cuenta.lin, "el área de refuerzo (Matemática) aparece más veces", JSON.stringify(cuenta));
  // siete días: un día libre por semana
  await p.click('input[name="dias"][value="6"]');
  await espera(150);
  ok(/6 dias de estudo por semana/.test(await texto(p, "#planoResumo")), "marcando los 7 días se estudia 6 (uno queda libre)", await texto(p, "#planoResumo"));
  // sin días: error
  for (const v of [0, 1, 2, 3, 4, 5, 6]) { if (await p.$eval(`input[name="dias"][value="${v}"]`, (e) => e.checked)) await p.click(`input[name="dias"][value="${v}"]`); }
  await espera(150);
  ok(/pelo menos um dia/.test(await texto(p, "#erro")) && await p.$eval("#plano", (e) => e.hidden), "sin días marcados: avisa y oculta el plan");
  await p.click('input[name="dias"][value="2"]');
  await espera(150);
  ok(!(await p.$eval("#plano", (e) => e.hidden)) && /1 dia de estudo por semana/.test(await texto(p, "#planoResumo")), "con un solo día vuelve el plan: «1 dia de estudo por semana»", await texto(p, "#planoResumo"));
  // se recuerda
  await p.reload({ waitUntil: "networkidle0" });
  await espera(400);
  const clsRecarga = await p.evaluate(() => window.__cls);
  pedidos.length = 0;
  ok(await p.$eval("#data", (e) => e.value) === enDias(faltan) && !(await p.$eval("#plano", (e) => e.hidden)), "las respuestas se recuerdan y el plan reaparece");
  ok(await p.$eval('input[name="horas"][value="3"]', (e) => e.checked), "se recuerdan las horas");
  // impresión: todas las semanas, sin el formulario
  await p.emulateMediaType("print");
  const imp = await p.evaluate(() => ({
    visibles: [...document.querySelectorAll(".semana-bloco")].filter((e) => getComputedStyle(e).display !== "none").length,
    total: document.querySelectorAll(".semana-bloco").length,
    form: getComputedStyle(document.getElementById("form")).display,
    cab: getComputedStyle(document.querySelector(".site-header")).display,
    titulos: [...document.querySelectorAll(".titulo-semana-imp")].filter((e) => getComputedStyle(e).display !== "none").length,
  }));
  ok(imp.visibles === imp.total && imp.titulos === imp.total, "impresión: salen todas las semanas, cada una con su título", JSON.stringify(imp));
  ok(imp.form === "none" && imp.cab === "none", "impresión: sin formulario ni menú");
  await p.emulateMediaType("screen");
  ok(soloEstaticos(pedidos).length === 0, "al montar el plan no se hace NINGÚN pedido de red", pedidos.join(" | "));
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  ok(clsRecarga < 0.1, "quien vuelve con respuestas guardadas: salto de diseño (CLS) < 0,1 al reaparecer el plan", String(clsRecarga));
  const axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe) con el plan armado", axe.length ? "\n" + describeAxe(axe) : "");
  await ctx.close();
  // celular
  const m = await abre("/cronograma-de-estudos-enem/", { w: 390, h: 800, movil: true });
  await poneTexto(m.p, "#data", enDias(30));
  await m.p.click("#montar");
  await espera(200);
  ok((await sinDesborde(m.p)) <= 0, "celular: sin scroll horizontal con el plan armado");
  ok(await m.p.$eval(".semana", (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length) === 1, "celular: la semana es una lista (un día por fila)");
  const chicos = await m.p.$$eval("#form input, #montar, #imprimir, #anterior, #proxima, .opcao span", (l) => l.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44) && e.type !== "radio" && e.type !== "checkbox"; }).map((e) => e.textContent || e.id));
  ok(chicos.length === 0, "celular: todos los controles miden al menos 44 px", chicos.join(","));
  const axeM = await axeEn(m.p);
  ok(axeM.length === 0, "celular: accesibilidad (axe)", axeM.length ? "\n" + describeAxe(axeM) : "");
  await m.ctx.close();
  // escritorio: ningún texto cortado en las 7 columnas
  const d = await abre("/cronograma-de-estudos-enem/", { w: 1366, h: 900 });
  await poneTexto(d.p, "#data", enDias(30));
  await d.p.click("#montar");
  await espera(200);
  const cortados = await d.p.$$eval(".sem-dia .bloco", (l) => l.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  ok(cortados.length === 0, "escritorio: ningún bloque tiene el texto cortado en las 7 columnas", cortados.join(" | "));
  const partidos = await d.p.$$eval(".sem-dia .bloco:not(.bloco--prova)", (l) => l.filter((e) => e.getBoundingClientRect().height > 64).map((e) => e.textContent));
  ok(partidos.length === 0, "escritorio: ninguna palabra se parte en dos líneas dentro de los bloques (Matemática, Linguagens…)", partidos.slice(0, 3).join(" | "));
  await d.ctx.close();
  const mid = await abre("/cronograma-de-estudos-enem/", { w: 1024, h: 800 });
  await poneTexto(mid.p, "#data", enDias(30));
  await mid.p.click("#montar");
  await espera(200);
  ok(await mid.p.$eval(".semana", (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length) === 1, "1024 px: la semana es una lista (las 7 columnas no caben con comodidad)");
  ok((await sinDesborde(mid.p)) <= 0, "1024 px: sin scroll horizontal");
  await mid.ctx.close();
  const d2 = { ctx: { close: async () => {} } };
  await d2.ctx.close();
}

// ============ 4) todos los anchos ============
seccion("4) sin scroll horizontal en 320, 375, 768 y 1366 px");
for (const ruta of ["/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/", "/"]) {
  for (const w of [320, 375, 768, 1366]) {
    const { p, ctx } = await abre(ruta, { w, h: 800, movil: w < 768 });
    if (ruta === "/contador-de-linhas-enem/") await poneTexto(p, "#texto", Array(34).fill(lorem(12)).join("\n"));
    const d = await sinDesborde(p);
    ok(d <= 0, `${ruta} a ${w}px sin scroll horizontal`, String(d));
    await ctx.close();
  }
}

await b.close();
console.log(`\n${fallos ? fallos + " FALLOS de " : "Todo OK: "}${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
