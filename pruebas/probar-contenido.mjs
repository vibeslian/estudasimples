// Etapa 4: contenido, datos estructurados, anuncios y cero peticiones a terceros.
// Requiere el sitio en http://localhost:3000 (npm run dev).
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
import fs from "node:fs";
const GUIAS = JSON.parse(fs.readFileSync("../conteudo/guias.json", "utf8")).map((g) => `/guias/${g.slug}/`);
const PAGINAS = ["/", "/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/gerador-de-referencias-abnt/", "/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/", "/formatacao-abnt-tcc/", "/sobre/", "/contato/", "/politica-de-privacidade/", "/termos-de-uso/", "/guias/", ...GUIAS];
const ok = (c) => (c ? "OK   " : "FALLA");
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const externos = new Set();
// Único tercero declarado en la Política de Privacidade (sección 2.2): estadísticas de Cloudflare, que el borde inyecta en el sitio publicado.
const PERMITIDOS = new Set(["static.cloudflareinsights.com"]);
const falhas = [];
const marca = (cond, msg) => { console.log(ok(cond), msg); if (!cond) falhas.push(msg); };

async function abre(url, vp = { width: 1280, height: 900 }) {
  const p = await browser.newPage();
  await p.setViewport(vp);
  await p.evaluateOnNewDocument(() => { const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) return; return c.call(this); }; });
  p.on("request", (r) => { try { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.hostname !== new URL(BASE).hostname && !PERMITIDOS.has(u.hostname)) externos.add(u.hostname + " <- " + url); } catch (e) { /* data: etc. */ } });
  await p.goto(BASE + url, { waitUntil: "networkidle0" });
  return p;
}

console.log("== 1) Estructura de cada página ==");
const existentes = new Set(PAGINAS);
for (const url of PAGINAS) {
  const p = await abre(url);
  const d = await p.evaluate(() => ({
    h1: document.querySelectorAll("h1").length,
    title: document.title, desc: document.querySelector('meta[name="description"]')?.content || "",
    canon: document.querySelector('link[rel="canonical"]')?.href || "",
    og: !!document.querySelector('meta[property="og:image"]'),
    ids: [...document.querySelectorAll("[id]")].map((e) => e.id),
    links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h.startsWith("/")),
    saltoNivel: (() => { let prev = 0, mal = false; document.querySelectorAll("h1,h2,h3,h4").forEach((h) => { const n = +h.tagName[1]; if (prev && n > prev + 1) mal = true; prev = n; }); return mal; })(),
  }));
  const dup = d.ids.filter((x, i) => d.ids.indexOf(x) !== i);
  marca(d.h1 === 1 && d.title.length > 10 && d.title.length <= 75 && d.desc.length >= 70 && d.desc.length <= 175 && d.canon.endsWith(url) && d.og && !dup.length && !d.saltoNivel,
    `${url.padEnd(28)} h1=${d.h1} title=${d.title.length}c desc=${d.desc.length}c canonical✓ og:image✓ ids únicos✓ jerarquía de títulos✓`);
  for (const l of d.links) { const base = l.split("#")[0].split("?")[0] || "/"; if (!existentes.has(base) && !base.startsWith("/assets/")) marca(false, `${url}: enlace roto ${l}`); }
  await p.close();
}

console.log("\n== 2) Datos estructurados (FAQPage) vs. texto visible ==");
for (const urlFaq of ["/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/formatacao-abnt-tcc/"]) {
  const p = await abre(urlFaq);
  const r = await p.evaluate(() => {
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));
    const faq = ld.find((x) => x["@type"] === "FAQPage");
    const vis = [...document.querySelectorAll(".faq details")].map((d) => ({ q: d.querySelector("summary").textContent.trim(), a: [...d.querySelectorAll(".faq-resposta p")].map((x) => x.textContent.trim()).join(" ").replace(/\s+/g, " ") }));
    return { tipos: ld.map((x) => x["@type"]), faq: faq ? faq.mainEntity.map((m) => ({ q: m.name, a: m.acceptedAnswer.text })) : null, vis };
  });
  marca(r.tipos.includes("FAQPage") && (r.tipos.includes("WebApplication") || r.tipos.includes("Service")) && r.tipos.includes("BreadcrumbList"), `${urlFaq} JSON-LD válido (JSON.parse) con tipos: ${r.tipos.join(", ")}`);
  marca(r.faq && r.faq.length === r.vis.length && r.faq.every((f, i) => f.q === r.vis[i].q && f.a === r.vis[i].a), `${urlFaq} FAQPage: ${r.faq?.length} preguntas, idénticas (pregunta y respuesta) al texto visible`);
  await p.close();
}

console.log("\n== 3) Cero peticiones a terceros (incluye generar PDF y Word) ==");
{
  const p = await abre("/gerador-de-capa-abnt/");
  await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }; set("title", "Teste"); set("city", "Recife"); document.querySelector("#autores input").value = "Ana"; set("institution", "Instituição"); });
  const jaChamou = [];
  p.on("request", (r) => { if (/vendor/.test(r.url())) jaChamou.push(r.url().split("/").pop()); });
  for (const id of ["btnPdf", "btnDocx"]) { await p.$eval("#" + id, (e) => e.click()); await new Promise((r) => setTimeout(r, 3000)); }
  marca(jaChamou.some((x) => x.startsWith("jspdf")) && jaChamou.some((x) => x.startsWith("docx")), `bibliotecas servidas desde el propio sitio: ${[...new Set(jaChamou)].join(", ")}`);
  marca(!(await p.$eval("#toast", (e) => e.classList.contains("erro"))), `descargas OK: "${await p.$eval("#toast", (e) => e.textContent)}"`);
  await p.close();
}
marca(externos.size === 0, externos.size ? "peticiones externas: " + [...externos].join(" | ") : "ninguna petición a terceros salvo las estadísticas de Cloudflare declaradas en la política (todas las páginas + generación de PDF y Word)");

console.log("\n== 4) Anuncios ==");
// site.config.json → anuncios.adsenseAtivo. Apagado: los espacios no ocupan lugar (ningún hueco). Encendido: reservan su altura (sin saltos).
// Para probar el estado encendido sin rehacer el sitio, se les quita la clase "anuncio--desligado" en la página (es lo único que cambia el build).
const ADS_ON = JSON.parse(fs.readFileSync("../site.config.json", "utf8")).anuncios.adsenseAtivo === true;
async function infoAnuncios(url, vp, { preview = false, activar = false } = {}) {
  const p = await abre(url + (preview ? "?ads=preview" : ""), vp);
  if (activar) await p.evaluate(() => document.querySelectorAll(".anuncio--desligado").forEach((a) => a.classList.remove("anuncio--desligado")));
  const r = await p.evaluate(() => {
    const doc = document.documentElement.scrollHeight;
    const slots = [...document.querySelectorAll(".anuncio")].map((a) => {
      const b = a.getBoundingClientRect(); const s = getComputedStyle(a);
      return { slot: a.dataset.slot, y: Math.round(b.top + scrollY), h: Math.round(b.height), w: Math.round(b.width), borde: s.borderTopStyle, fondo: s.backgroundImage !== "none", display: s.display, texto: getComputedStyle(a.querySelector("span")).display !== "none" };
    });
    const q = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY) }; };
    return { doc, slots, form: q("#form"), botones: q(".acoes"), prev: q("#painelPrevia"), hero: q(".hero"), aviso: q(".aviso-norma"), tool: q(".tool-grid") };
  });
  await p.close();
  return r;
}
marca(true, "anuncios.adsenseAtivo = " + ADS_ON + (ADS_ON ? " (espacios reservados)" : " (los espacios no ocupan lugar)"));
for (const [ferr, lateral] of [["/gerador-de-capa-abnt/", "capa-lateral"], ["/gerador-de-folha-de-rosto-abnt/", "folha-lateral"], ["/gerador-de-sumario-abnt/", "sumario-lateral"]])
for (const [nome, vp] of [["computador 1280", { width: 1280, height: 900 }], ["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  console.log("-- " + ferr + " " + nome);
  const real = await infoAnuncios(ferr, vp);
  const on = ADS_ON ? real : await infoAnuncios(ferr, vp, { activar: true });
  if (!ADS_ON) {
    marca(real.slots.length > 0 && real.slots.every((s) => s.display === "none" && s.h === 0), "AdSense apagado: " + real.slots.length + " espacios en el HTML y ninguno ocupa lugar (display none, 0 px)");
    const prev = await infoAnuncios(ferr, vp, { preview: true });
    const pv = prev.slots.filter((s) => s.display !== "none");
    marca(pv.length > 0 && pv.every((s) => s.borde === "dashed" && s.texto), "con ?ads=preview se ven " + pv.length + " cajas con borde punteado y texto \"Anúncio\" (para saber dónde irán)");
  }
  const vis = on.slots.filter((s) => s.display !== "none");
  marca(vis.every((s) => s.borde === "none" && !s.fondo && !s.texto), "encendido: " + vis.length + " espacios visibles, sin borde, sin fondo y sin texto");
  marca(vis.length > 0 && vis.every((s) => s.h >= 250), "encendido: reservan altura (" + vis.map((s) => s.slot + "=" + s.h + "px").join(", ") + ")");
  const primero = Math.min(...vis.map((s) => s.y));
  marca(primero > (on.form ? on.form.bottom : 0), "ningún anuncio encima del formulario (primer anuncio y=" + primero + "px; formulario termina y=" + on.form?.bottom + "px)");
  const masCerca = Math.min(...vis.filter((s) => s.y > on.botones.bottom).map((s) => s.y - on.botones.bottom));
  marca(masCerca >= 150, "distancia del anuncio más cercano a los botones de descarga: " + masCerca + "px (mínimo pedido: bien separado)");
  marca(vis.filter((s) => s.y < on.aviso.bottom).length === 0, "no hay anuncios dentro de la zona de la herramienta (formulario, prévia y aviso)");
  if (nome.startsWith("computador")) marca(on.slots.some((s) => s.slot === lateral && s.display !== "none" && s.h >= 600), "encendido: columna lateral de 300x600 presente en computador");
  else marca(on.slots.find((s) => s.slot === lateral).display === "none", "columna lateral oculta en celular");
}
{
  const vp = { width: 1280, height: 900 };
  const on = ADS_ON ? await infoAnuncios("/", vp) : await infoAnuncios("/", vp, { activar: true });
  console.log("-- inicio");
  marca(on.slots.length === 1 && on.slots[0].y > on.hero.bottom, "1 espacio entre secciones (y=" + on.slots[0].y + "px), debajo de la portada (termina y=" + on.hero.bottom + "px)");
  if (!ADS_ON) { const real = await infoAnuncios("/", vp); marca(real.slots[0].h === 0, "portada con AdSense apagado: el espacio no ocupa lugar"); }
}
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALLAS` : "\nTodo OK");
process.exit(falhas.length ? 1 : 0);
