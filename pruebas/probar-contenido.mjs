// Etapa 4: contenido, datos estructurados, anuncios y cero peticiones a terceros.
// Requiere el sitio en http://localhost:3000 (npm run dev).
import puppeteer from "puppeteer-core";
const BASE = "http://localhost:3000";
const PAGINAS = ["/", "/gerador-de-capa-abnt/", "/sobre/", "/contato/", "/politica-de-privacidade/", "/termos-de-uso/"];
const ok = (c) => (c ? "OK   " : "FALLA");
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const externos = new Set();
const falhas = [];
const marca = (cond, msg) => { console.log(ok(cond), msg); if (!cond) falhas.push(msg); };

async function abre(url, vp = { width: 1280, height: 900 }) {
  const p = await browser.newPage();
  await p.setViewport(vp);
  p.on("request", (r) => { try { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.hostname !== "localhost") externos.add(u.hostname + " <- " + url); } catch (e) { /* data: etc. */ } });
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
{
  const p = await abre("/gerador-de-capa-abnt/");
  const r = await p.evaluate(() => {
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));
    const faq = ld.find((x) => x["@type"] === "FAQPage");
    const vis = [...document.querySelectorAll(".faq details")].map((d) => ({ q: d.querySelector("summary").textContent.trim(), a: [...d.querySelectorAll(".faq-resposta p")].map((x) => x.textContent.trim()).join(" ").replace(/\s+/g, " ") }));
    return { tipos: ld.map((x) => x["@type"]), faq: faq ? faq.mainEntity.map((m) => ({ q: m.name, a: m.acceptedAnswer.text })) : null, vis };
  });
  marca(r.tipos.includes("FAQPage") && r.tipos.includes("WebApplication") && r.tipos.includes("BreadcrumbList"), `JSON-LD válido (JSON.parse) con tipos: ${r.tipos.join(", ")}`);
  marca(r.faq && r.faq.length === r.vis.length && r.faq.every((f, i) => f.q === r.vis[i].q && f.a === r.vis[i].a), `FAQPage: ${r.faq?.length} preguntas, idénticas (pregunta y respuesta) al texto visible`);
  await p.close();
}

console.log("\n== 3) Cero peticiones a terceros (incluye generar PDF y Word) ==");
{
  const p = await abre("/gerador-de-capa-abnt/");
  await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }; set("title", "Teste"); set("city", "Recife"); document.querySelector("#autores input").value = "Ana"; set("institution", "Instituição"); });
  const jaChamou = [];
  p.on("request", (r) => { if (/vendor/.test(r.url())) jaChamou.push(r.url().split("/").pop()); });
  for (const id of ["btnPdf", "btnDocx"]) { await p.click("#" + id); await new Promise((r) => setTimeout(r, 3000)); }
  marca(jaChamou.some((x) => x.startsWith("jspdf")) && jaChamou.some((x) => x.startsWith("docx")), `bibliotecas servidas desde el propio sitio: ${[...new Set(jaChamou)].join(", ")}`);
  marca(!(await p.$eval("#toast", (e) => e.classList.contains("erro"))), `descargas OK: "${await p.$eval("#toast", (e) => e.textContent)}"`);
  await p.close();
}
marca(externos.size === 0, externos.size ? "peticiones externas: " + [...externos].join(" | ") : "ninguna petición salió del sitio (todas las páginas + generación de PDF y Word)");

console.log("\n== 4) Anuncios ==");
async function infoAnuncios(url, vp, preview) {
  const p = await abre(url + (preview ? "?ads=preview" : ""), vp);
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
for (const [nome, vp] of [["computador 1280", { width: 1280, height: 900 }], ["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  console.log(`-- ${nome}`);
  const sin = await infoAnuncios("/gerador-de-capa-abnt/", vp, false);
  const con = await infoAnuncios("/gerador-de-capa-abnt/", vp, true);
  const vis = sin.slots.filter((s) => s.display !== "none");
  marca(sin.slots.every((s) => s.borde === "none" && !s.fondo && !s.texto), `sin ?ads=preview: ${sin.slots.length} espacios, todos invisibles (sin borde, sin fondo, sin texto)`);
  marca(vis.every((s) => s.h >= 250), `espacios visibles reservan altura: ${vis.map((s) => s.slot + "=" + s.h + "px").join(", ")}`);
  marca(sin.doc === con.doc, `la altura de la página es la misma con y sin ?ads=preview (${sin.doc}px): nada salta`);
  const prevVis = con.slots.filter((s) => s.display !== "none");
  marca(prevVis.every((s) => s.borde === "dashed" && s.texto), `con ?ads=preview: ${prevVis.length} cajas con borde punteado y texto "Anúncio"`);
  const primero = Math.min(...vis.map((s) => s.y));
  marca(primero > (sin.form ? sin.form.bottom : 0), `ningún anuncio encima del formulario (primer anuncio y=${primero}px; formulario termina y=${sin.form?.bottom}px)`);
  const sep = vis.map((s) => s.y - sin.botones.bottom).filter((d) => d > -9999 && d > 0);
  const masCerca = Math.min(...vis.filter((s) => s.y > sin.botones.bottom).map((s) => s.y - sin.botones.bottom));
  marca(masCerca >= 150, `distancia del anuncio más cercano a los botones de descarga: ${masCerca}px (mínimo pedido: bien separado)`);
  const hijosTool = vis.filter((s) => s.y < sin.aviso.bottom);
  marca(hijosTool.length === 0, "no hay anuncios dentro de la zona de la herramienta (formulario, prévia y aviso)");
  if (nome.startsWith("computador")) marca(sin.slots.some((s) => s.slot === "capa-lateral" && s.display !== "none" && s.h >= 600), "columna lateral de 300x600 presente en computador");
  else marca(sin.slots.find((s) => s.slot === "capa-lateral").display === "none", "columna lateral oculta en celular");
}
{
  const vp = { width: 1280, height: 900 };
  const sin = await infoAnuncios("/", vp, false);
  const con = await infoAnuncios("/", vp, true);
  console.log("-- inicio");
  marca(sin.slots.length === 1 && sin.slots[0].y > sin.hero.bottom && sin.doc === con.doc, `1 espacio entre secciones (y=${sin.slots[0].y}px), debajo de la portada (termina y=${sin.hero.bottom}px); altura estable`);
}
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALLAS` : "\nTodo OK");
process.exit(falhas.length ? 1 : 0);
