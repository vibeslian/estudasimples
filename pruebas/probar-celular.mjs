const BASE = process.env.BASE_URL || "http://localhost:3000";
import { fileURLToPath } from "node:url";
import pathMod from "node:path";
const PRUEBAS = pathMod.dirname(fileURLToPath(import.meta.url)).split(String.fromCharCode(92)).join("/");
// Prueba en un celular emulado: pestañas, "Ampliar prévia" (abrir, zoom, cerrar con botón y con Esc), "Nueva capa", y descarga.
import puppeteer from "puppeteer-core";
const OUT = PRUEBAS + "/../capturas";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
await page.evaluateOnNewDocument(() => { window.__arq = []; const o = URL.createObjectURL; URL.createObjectURL = (b) => { window.__b = b; return o.call(URL, b); }; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__arq.push({ nome: this.download, tipo: window.__b.type, tam: window.__b.size }); return; } return c.call(this); }; });
const RUTA = process.env.RUTA || "/gerador-de-capa-abnt/";
const ZOOM = RUTA.includes("folha") ? "sheetZoomFolha" : "sheetZoom"; // la hoja ampliada de la herramienta que se prueba // RUTA=/gerador-de-folha-de-rosto-abnt/ para probar la folha de rosto
await page.goto(BASE + RUTA, { waitUntil: "networkidle0" });
const log = (k, v) => console.log(k.padEnd(48), JSON.stringify(v));
const set = (id, v) => page.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, id, v);

await set("institution", "Universidade Federal de Viçosa"); await set("course", "Curso de Administração");
await page.evaluate(() => { document.querySelector("#autores input").value = "Maria Silva"; });
await set("title", "A influência das redes sociais no aprendizado"); await set("subtitle", "um estudo com alunos do ensino médio"); await set("city", "Viçosa - MG");

log("botón Ampliar visible en celular", await page.$eval("#btnAmpliar", (e) => getComputedStyle(e).display !== "none"));
await page.tap("#abaPrevia"); await new Promise((r) => setTimeout(r, 300));
log("botón Ampliar visible (pestaña prévia)", await page.$eval("#btnAmpliar", (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height >= 44; }));
await page.screenshot({ path: `${OUT}/celular-previa-con-boton.png` });
await page.tap("#btnAmpliar"); await new Promise((r) => setTimeout(r, 500));
log("diálogo abierto", await page.$eval("#dlgZoom", (d) => d.open));
log("hoja ampliada con texto", await page.$eval("#" + ZOOM, (s) => s.textContent.slice(0, 60)));
const info = async () => page.evaluate((ZOOM) => { const s = document.getElementById(ZOOM); const a = document.getElementById("zoomArea"); return { escala: +(new DOMMatrix(getComputedStyle(s).transform).a).toFixed(3), anchoAreaPx: a.clientWidth, anchoHojaPx: Math.round(s.getBoundingClientRect().width), scrollH: a.scrollWidth > a.clientWidth }; }, ZOOM);
log("zoom nivel 1 (página entera)", await info());
await page.screenshot({ path: `${OUT}/celular-ampliada-1.png` });
await page.tap("#zoomMais"); await page.tap("#zoomMais"); await new Promise((r) => setTimeout(r, 300));
log("zoom nivel 3", await info());
await page.evaluate(() => { const a = document.getElementById("zoomArea"); a.scrollTop = 300; a.scrollLeft = (a.scrollWidth - a.clientWidth) / 2; });
await page.screenshot({ path: `${OUT}/celular-ampliada-3.png` });
await page.tap("#zoomMenos"); await page.tap("#zoomMenos"); await new Promise((r) => setTimeout(r, 200));
log("botón − desactivado en nivel 1", await page.$eval("#zoomMenos", (b) => b.disabled));
await page.tap("#zoomFechar"); await new Promise((r) => setTimeout(r, 300));
log("cerrado con el botón Fechar", !(await page.$eval("#dlgZoom", (d) => d.open)));
await page.tap("#btnAmpliar"); await new Promise((r) => setTimeout(r, 300));
await page.keyboard.press("Escape"); await new Promise((r) => setTimeout(r, 300));
log("cerrado con Esc", !(await page.$eval("#dlgZoom", (d) => d.open)));
log("foco vuelve al botón Ampliar", await page.evaluate(() => document.activeElement.id));

// descarga desde el celular
await page.tap("#abaDados"); await new Promise((r) => setTimeout(r, 200));
for (const id of ["btnPdf", "btnDocx"]) { await page.tap("#" + id); await new Promise((r) => setTimeout(r, 3500)); }
log("descargas desde el celular", await page.evaluate(() => window.__arq));
log("mensaje", await page.$eval("#toast", (e) => e.textContent));
// nueva capa
await page.tap("#btnNova"); await new Promise((r) => setTimeout(r, 300));
log("nueva capa: título vacío / autor conservado", await page.evaluate(() => ({ titulo: document.getElementById("title").value, autor: document.querySelector("#autores input").value, instit: document.getElementById("institution").value })));
// sin título: debe avisar
await page.$eval("#btnPdf", (e) => e.click()); await new Promise((r) => setTimeout(r, 400)); // clic por programa: con scroll suave el toque falla
log("sin título → aviso", await page.$eval("#toast", (e) => ({ t: e.textContent, erro: e.classList.contains("erro") })));
log("scroll horizontal de la página (debe ser false)", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
// capa + folha juntas en el celular: la prévia ampliada muestra las dos páginas
await set("title", "Redes sociais");
await page.evaluate(() => { const e = document.getElementById("incFolha") || document.getElementById("incCapa"); e.checked = true; e.dispatchEvent(new Event("input", { bubbles: true })); });
await page.tap("#abaPrevia"); await new Promise((r) => setTimeout(r, 300));
log("juntas: las dos páginas se ven en la prévia", await page.evaluate(() => [!document.getElementById("pagCapa").hidden, !document.getElementById("pagFolha").hidden]));
await page.tap("#btnAmpliar"); await new Promise((r) => setTimeout(r, 400));
log("juntas: prévia ampliada con 2 páginas (anchos)", await page.evaluate(() => [...document.querySelectorAll(".zoom-pag:not([hidden])")].map((p) => Math.round(p.getBoundingClientRect().width))));
await page.screenshot({ path: `${OUT}/celular-ampliada-juntas.png` });
await page.tap("#zoomFechar"); await new Promise((r) => setTimeout(r, 300));
await page.tap("#abaDados"); await new Promise((r) => setTimeout(r, 200));
log("scroll horizontal de la página con 2 páginas (debe ser false)", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
log("errores de consola", erros);
await browser.close();
