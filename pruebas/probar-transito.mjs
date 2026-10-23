// Tránsito nuevo: menú «Ferramentas», menú del celular, portada con dos caminos, fotos, confianza (CNPJ), servicio.
// Sitio local (http://localhost:3000, o BASE_URL). Uso: node probar-transito.mjs   (desde pruebas/)
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
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-trans-")) });

async function abre(ruta, { w = 1366, h = 800, movil = false, reducido = false } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
  if (reducido) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  return { p, ctx, errores };
}
const visible = (p, sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; }).catch(() => false);

// ============ 1) menú del computador ============
seccion("1) menú «Ferramentas» en el computador");
{
  const { p, ctx, errores } = await abre("/contador-de-linhas-enem/");
  ok(!(await visible(p, "#menuBotao")), "computador: el botón de hamburguesa no se ve");
  ok(!(await visible(p, ".mega")), "al abrir la página el panel está cerrado");
  ok(await p.$eval(".nav-ferramentas", (e) => e.getAttribute("aria-expanded") === "false" && e.getAttribute("role") === "button"), "«Ferramentas» es un botón con aria-expanded=false");
  await p.click(".nav-ferramentas");
  ok(await visible(p, ".mega") && await p.$eval(".nav-ferramentas", (e) => e.getAttribute("aria-expanded") === "true"), "un clic abre el panel y aria-expanded pasa a true");
  const enlaces = await p.$$eval(".mega a", (l) => l.map((a) => a.getAttribute("href").split("?")[0]));
  const esperados = ["/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/gerador-de-referencias-abnt/", "/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/", "/formatacao-abnt-tcc/"];
  ok(esperados.every((h) => enlaces.includes(h)), "el panel enlaza a las 7 herramientas y al servicio", enlaces.join(","));
  const caja = await p.$eval(".mega", (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, w: innerWidth }; });
  ok(caja.l >= 0 && caja.r <= caja.w && caja.b > 100, "el panel cabe en la pantalla y no se corta en el fondo del hero", JSON.stringify(caja));
  const altos = await p.$$eval(".mega a", (l) => l.filter((a) => a.getBoundingClientRect().height > 0).map((a) => Math.round(a.getBoundingClientRect().height)));
  ok(altos.every((h) => h >= 44), "los enlaces del panel miden al menos 44 px", altos.join(","));
  await p.keyboard.press("Escape");
  ok(!(await visible(p, ".mega")), "Esc cierra el panel");
  ok(await p.evaluate(() => document.activeElement.classList.contains("nav-ferramentas")), "Esc devuelve el foco a «Ferramentas»");
  // clic fuera
  await p.click(".nav-ferramentas");
  await p.mouse.click(40, 600);
  ok(!(await visible(p, ".mega")), "un clic fuera cierra el panel");
  // teclado: Tab dentro del panel y salir
  await p.focus(".nav-ferramentas");
  await p.keyboard.press("Enter");
  ok(await visible(p, ".mega"), "Enter abre el panel");
  await p.keyboard.press("Tab");
  ok(await p.evaluate(() => document.activeElement.closest(".mega") !== null), "el siguiente Tab entra al panel");
  const axe = await axeEn(p);
  ok(axe.length === 0, "accesibilidad (axe) con el panel abierto", axe.length ? "\n" + describeAxe(axe) : "");
  // el panel por encima del contenido de la página (el resultado fijo tiene z-index menor)
  const encima = await p.evaluate(() => { const m = document.querySelector(".mega").getBoundingClientRect(); const el = document.elementFromPoint(m.left + m.width / 2, m.bottom - 8); return !!(el && el.closest(".mega")); });
  ok(encima, "el panel queda por encima del contenido de la página");
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  await ctx.close();
}

// ============ 2) menú del celular ============
seccion("2) menú del celular");
{
  const { p, ctx, errores } = await abre("/contador-de-linhas-enem/", { w: 390, h: 800, movil: true });
  ok(await visible(p, "#menuBotao"), "celular: se ve el botón de menú");
  ok(!(await visible(p, "#menuPrincipal")), "celular: la lista está cerrada al abrir");
  const alto = await p.$eval("#menuBotao", (e) => Math.round(e.getBoundingClientRect().height));
  ok(alto >= 44, "el botón mide al menos 44 px", String(alto));
  await p.click("#menuBotao");
  ok(await visible(p, "#menuPrincipal") && await p.$eval("#menuBotao", (e) => e.getAttribute("aria-expanded") === "true" && /Fechar/.test(e.getAttribute("aria-label"))), "un toque abre la lista y cambia el nombre del botón a «Fechar o menu»");
  const items = await p.$$eval("#menuPrincipal a", (l) => l.filter((a) => a.getBoundingClientRect().height > 0).map((a) => a.getAttribute("href").split("?")[0]));
  ok(["/gerador-de-capa-abnt/", "/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/", "/guias/", "/formatacao-abnt-tcc/", "/sobre/"].every((h) => items.includes(h)), "la lista muestra las herramientas ABNT y ENEM, guías, servicio y sobre", items.join(","));
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "celular: el menú abierto no genera scroll horizontal");
  const chicos = await p.$$eval("#menuPrincipal a", (l) => l.filter((a) => { const r = a.getBoundingClientRect(); return r.height > 0 && r.height < 44; }).map((a) => a.textContent.trim().slice(0, 20)));
  ok(chicos.length === 0, "celular: todos los enlaces del menú miden al menos 44 px", chicos.join(","));
  const axe = await axeEn(p);
  ok(axe.length === 0, "celular: accesibilidad (axe) con el menú abierto", axe.length ? "\n" + describeAxe(axe) : "");
  await p.keyboard.press("Escape");
  ok(!(await visible(p, "#menuPrincipal")) && await p.evaluate(() => document.activeElement.id === "menuBotao"), "Esc cierra el menú y devuelve el foco al botón");
  await p.click("#menuBotao");
  await p.click('#menuPrincipal a[href="/calculadora-de-media/"]');
  await p.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  ok(/calculadora-de-media/.test(p.url()), "tocar un enlace del menú lleva a la página");
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  await ctx.close();
}

seccion("2b) revisión: página actual, cierre al tocar un enlace de la misma página, foco sobre fondo oscuro");
{
  const s = await abre("/sobre/");
  ok(await s.p.$eval('.nav a[href="/sobre/"]', (e) => e.getAttribute("aria-current") === "page"), "la página actual (Sobre) queda marcada con aria-current en el menú");
  ok(await s.p.$eval(".nav-ferramentas", (e) => e.getAttribute("aria-expanded") === "false" && e.getAttribute("aria-controls") === "menuFerramentas"), "«Ferramentas» recibe aria-expanded y aria-controls por JavaScript");
  await s.ctx.close();
  const m = await abre("/", { w: 390, h: 800, movil: true });
  await m.p.click("#menuBotao");
  await m.p.click('#menuPrincipal a[href="/#escolha"]');
  await espera(500);
  ok(!(await visible(m.p, "#menuPrincipal")) && await m.p.$eval("#menuBotao", (e) => e.getAttribute("aria-expanded") === "false"), "celular: tocar «Começar grátis» (misma página) cierra el menú");
  await m.ctx.close();
  const d = await abre("/");
  await d.p.click(".nav-ferramentas");
  await d.p.focus(".nav-ferramentas");
  for (let i = 0; i < 12 && !(await d.p.evaluate(() => document.activeElement.matches(".mega-servico a.btn"))); i++) await d.p.keyboard.press("Tab"); // con el teclado, para que cuente como :focus-visible
  const anillo = await d.p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineColor + " " + s.outlineWidth; });
  ok(/250, 248, 243/.test(anillo), "el foco del botón del servicio sobre el panel oscuro se ve (anillo claro)", anillo);
  await d.p.keyboard.press("Escape");
  await d.p.evaluate(() => document.querySelector("#servico-formatacao").scrollIntoView({ block: "center", behavior: "instant" }));
  await d.p.evaluate(() => document.querySelector("#servico-formatacao").previousElementSibling.querySelector("a").focus());
  for (let i = 0; i < 12 && !(await d.p.evaluate(() => document.activeElement.matches("#servico-formatacao a.btn"))); i++) await d.p.keyboard.press("Tab");
  const anillo2 = await d.p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineColor + " " + s.outlineWidth; });
  ok(/250, 248, 243/.test(anillo2), "el foco del botón de la faixa del servicio en la portada se ve (anillo claro)", anillo2);
  await d.ctx.close();
}

// ============ 3) sin JavaScript ============
seccion("3) sin JavaScript el menú sigue funcionando como enlaces");
{
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setJavaScriptEnabled(false);
  await p.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true });
  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  ok(!(await visible(p, "#menuBotao")), "sin JavaScript no aparece el botón de hamburguesa (no haría nada)");
  const hrefs = await p.$$eval(".nav a", (l) => l.filter((a) => a.getBoundingClientRect().height > 0).map((a) => a.getAttribute("href").split("?")[0]));
  ok(hrefs.includes("/guias/") && hrefs.includes("/formatacao-abnt-tcc/") && hrefs.includes("/sobre/"), "sin JavaScript se ven los enlaces del menú", hrefs.join(","));
  ok(await p.$eval(".hero-foto img", (e) => e.complete && e.naturalWidth > 0), "sin JavaScript la foto del hero carga");
  await ctx.close();
}

// ============ 4) portada ============
seccion("4) portada: dos caminos, fotos, confianza");
{
  const { p, ctx, errores } = await abre("/");
  ok(await p.$$eval("h1", (l) => l.length) === 1 && /ENEM/.test(await p.$eval("h1", (e) => e.textContent)), "un solo h1 y menciona el ENEM");
  const caminos = await p.$$eval(".escolha-cartao", (l) => l.map((a) => a.getAttribute("href")));
  ok(JSON.stringify(caminos) === JSON.stringify(["#ferramentas", "#enem"]), "los dos caminos van a las secciones de faculdade y ENEM", JSON.stringify(caminos));
  const dentro = await p.$eval(".escolha", (e) => e.getBoundingClientRect().bottom);
  ok(dentro < 800, "los dos caminos se ven sin hacer scroll en una pantalla de 1366×800", String(dentro));
  await p.evaluate(() => document.querySelector(".garantias").scrollIntoView({ block: "center", behavior: "instant" }));
  await espera(200);
  ok(await p.$eval(".garantias", (e) => { const r = e.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return !!el && e.contains(el); }), "la franja de garantías queda por encima del final del hero (no se tapa)");
  await p.click('.escolha-cartao[href="#enem"]');
  await espera(900);
  const posEnem = await p.$eval("#enem", (e) => Math.round(e.getBoundingClientRect().top));
  ok(Math.abs(posEnem) < 140, "el camino ENEM lleva a la sección ENEM", String(posEnem));
  const fotos = await p.$$eval("main img, .hero-foto img", (l) => l.map((i) => ({ src: i.getAttribute("src"), alt: i.getAttribute("alt"), w: i.getAttribute("width"), h: i.getAttribute("height") })));
  ok(fotos.length >= 5 && fotos.every((f) => f.alt && f.alt.length > 10 && f.w && f.h), "todas las fotos tienen alt descriptivo y width/height (sin saltos)", JSON.stringify(fotos.filter((f) => !(f.alt && f.w && f.h))));
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
  await espera(800);
  const rotas = await p.$$eval("img", (l) => l.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute("src")));
  ok(rotas.length === 0, "ninguna foto está rota", rotas.join(","));
  const texto = await p.evaluate(() => document.body.innerText);
  ok(/CNPJ 67\.704\.102\/0001-69/.test(texto), "la portada muestra el CNPJ");
  ok(!/Em breve|Vem aí/.test(texto), "ya no hay «Em breve»");
  ok((await p.$$eval(".faq details", (l) => l.length)) >= 5, "la portada tiene preguntas frecuentes");
  const ld = await p.$$eval('script[type="application/ld+json"]', (l) => l.map((s) => { try { return JSON.parse(s.textContent)["@type"]; } catch (e) { return null; } }));
  ok(ld.includes("FAQPage"), "datos estructurados FAQPage en la portada", JSON.stringify(ld));
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  await ctx.close();
}
{
  const { p, ctx } = await abre("/");
  const cls = await p.evaluate(() => window.__cls);
  ok(cls < 0.02, "portada: salto de diseño < 0,02 al cargar (computador)", String(cls));
  const axe = await axeEn(p);
  ok(axe.length === 0, "portada: accesibilidad (axe)", axe.length ? "\n" + describeAxe(axe) : "");
  await ctx.close();
}
{
  const { p, ctx } = await abre("/", { w: 390, h: 800, movil: true });
  const cls = await p.evaluate(() => window.__cls);
  ok(cls < 0.02, "portada: salto de diseño < 0,02 al cargar (celular)", String(cls));
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "portada: sin scroll horizontal en el celular");
  ok(await visible(p, ".garantia-icone"), "celular: los íconos de la franja de garantías se ven");
  const dentro = await p.$eval(".escolha-cartao", (e) => e.getBoundingClientRect().top);
  ok(dentro < 800, "celular: el primer camino está a la vista sin hacer scroll", String(dentro));
  const axe = await axeEn(p);
  ok(axe.length === 0, "portada en celular: accesibilidad (axe)", axe.length ? "\n" + describeAxe(axe) : "");
  await ctx.close();
}

// ============ 5) servicio y sobre ============
seccion("5) servicio de formatación y Sobre: quién soy y CNPJ");
{
  const { p, ctx, errores } = await abre("/formatacao-abnt-tcc/");
  const t = await p.evaluate(() => document.body.innerText);
  ok(/CNPJ 67\.704\.102\/0001-69/.test(t), "el servicio muestra el CNPJ");
  await p.evaluate(() => document.getElementById("quem-faz").scrollIntoView({ block: "center", behavior: "instant" }));
  await espera(700);
  ok(await p.$eval("#quem-faz img", (e) => e.complete && e.naturalWidth > 0 && /Lian/.test(e.alt)), "aparece la foto de quien presta el servicio, con alt");
  ok(/inteligência artificial/.test(await p.$eval("#quem-faz", (e) => e.textContent)), "el bloque «quién soy» dice con claridad que se usa inteligencia artificial");
  ok(/15 dias/.test(await p.$eval("#quem-faz", (e) => e.textContent)), "dice que el archivo se borra 15 días después de la entrega (coincide con los Termos)");
  const axe = await axeEn(p);
  ok(axe.length === 0, "servicio: accesibilidad (axe)", axe.length ? "\n" + describeAxe(axe) : "");
  ok(errores.length === 0, "sin errores de JavaScript", errores.join(" | "));
  await ctx.close();
  const s = await abre("/sobre/");
  const ts = await s.p.evaluate(() => document.body.innerText);
  ok(/CNPJ 67\.704\.102\/0001-69/.test(ts), "Sobre muestra el CNPJ");
  ok(!/O que vem por aí/.test(ts) && /contador de linhas da redação do ENEM/.test(ts), "Sobre ya no dice que las herramientas «vêm por aí»");
  await s.ctx.close();
  const f = await abre("/termos-de-uso/");
  ok(/contador de linhas da reda/.test(await f.p.evaluate(() => document.body.innerText)), "Termos listan las herramientas nuevas");
  await f.ctx.close();
}

await b.close();
console.log(`\n${fallos ? fallos + " FALLOS de " : "Todo OK: "}${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
