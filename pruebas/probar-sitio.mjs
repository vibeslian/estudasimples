// Revisión de todas las páginas en 6 anchos de pantalla: sin scroll horizontal, sin errores de consola, sin recursos rotos,
// sin imágenes sin texto alternativo, objetivos táctiles razonables. Requiere el sitio en http://localhost:3000.
const BASE = process.env.BASE_URL || "http://localhost:3000";
import puppeteer from "puppeteer-core";
const PAGINAS = ["/", "/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/sobre/", "/contato/", "/politica-de-privacidade/", "/termos-de-uso/", "/pagina-que-no-existe/"];
const ANCHOS = [320, 375, 414, 768, 1024, 1280, 1920];
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
let falhas = 0;
for (const w of ANCHOS) {
  const movil = w < 768;
  for (const url of PAGINAS) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: movil ? 800 : 900, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
    const errores = [];
    p.on("pageerror", (e) => errores.push("js: " + e.message));
    p.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) errores.push("consola: " + m.text()); });
    p.on("requestfailed", (r) => errores.push("fallo: " + r.url()));
    p.on("response", (r) => { if (r.status() >= 400 && r.url() !== BASE + url) errores.push(r.status() + " " + r.url()); });
    const resp = await p.goto(BASE + "" + url, { waitUntil: "networkidle0" });
    const r = await p.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const culpables = overflow > 0 ? [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 3).map((e) => e.tagName + "." + e.className) : [];
      const sinAlt = [...document.querySelectorAll("img:not([alt])")].length;
      const peque = [...document.querySelectorAll("a, button, summary, input, select, textarea")].filter((e) => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && (b.height < 24 || b.width < 24) && !e.closest(".sr-only") && !e.matches(".skip") && e.type !== "checkbox" && !(e.tagName === "A" && e.closest("p, li, dd, .artigo-meta, .faq-resposta")); }).map((e) => (e.textContent || e.id || e.tagName).trim().slice(0, 25));
      return { overflow, culpables, sinAlt, peque, h1: document.querySelectorAll("h1").length };
    });
    const esperado404 = url.includes("no-existe");
    const mal = r.overflow > 0 || r.sinAlt || r.peque.length || errores.length || r.h1 !== 1 || (esperado404 ? resp.status() !== 404 : resp.status() !== 200);
    if (mal) { falhas++; console.log("FALLA", w + "px", url, JSON.stringify({ overflow: r.overflow, culpables: r.culpables, sinAlt: r.sinAlt, peque: r.peque, h1: r.h1, status: resp.status(), errores })); }
    await p.close();
  }
}
await b.close();
console.log(falhas ? `${falhas} combinaciones con problemas` : `Todo OK: ${PAGINAS.length} páginas × ${ANCHOS.length} anchos (${ANCHOS.join(", ")} px): sin scroll horizontal, sin errores, sin recursos rotos, 404 correcto`);
