// Accesibilidad con axe-core (el mismo motor que usa Lighthouse) en TODAS las páginas del sitio, en celular (390 px) y computador (1280 px),
// más algunos estados de las herramientas (lista con referencias, formularios llenos, errores). Falla si axe encuentra algún problema.
// Uso: node probar-accesibilidad.mjs            (sitio local en :3000)
//      BASE_URL=https://estudasimples.com.br node probar-accesibilidad.mjs
//      PAGINAS=/gerador-de-referencias-abnt/,/sobre/ node probar-accesibilidad.mjs   (solo algunas)
// axe-core y la regla "region" desactivada: ver lib-axe.mjs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { llena } from "./lib-referencias.mjs";
import { axeEn, describeAxe } from "./lib-axe.mjs";
import { CASOS } from "./ejemplos-referencias.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function urlsDelSitio() {
  if (process.env.PAGINAS) return process.env.PAGINAS.split(",");
  const xml = await (await fetch(BASE + "/sitemap.xml")).text();
  const rutas = [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  return rutas.concat("/404.html", "/anuncie/"); // /anuncie/ está escondida (fuera del sitemap) pero se revisa igual
}

let fallos = 0, total = 0;
const VP = { celular: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, computador: { width: 1280, height: 900, deviceScaleFactor: 1 } };

async function auditar(p, etiqueta) {
  const r = await axeEn(p);
  total++;
  if (r.length) { fallos++; console.log(`FALLA ${etiqueta}`); console.log(describeAxe(r)); }
  else console.log(`OK    ${etiqueta}`);
}

const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-axe-")) });
const rutas = await urlsDelSitio();
for (const [nombre, vp] of Object.entries(VP)) {
  for (const ruta of rutas) {
    const p = await b.newPage();
    await p.setViewport(vp);
    await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
    await auditar(p, `${nombre} ${ruta}`);
    await p.close();
  }
}

// estados de las herramientas
const caso = (inicio) => CASOS.find((c) => c.esperado.startsWith(inicio)).dados;
for (const [nombre, vp] of Object.entries(VP)) {
  if (process.env.PAGINAS) break;
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(BASE + "/gerador-de-referencias-abnt/", { waitUntil: "networkidle0" });
  await llena(p, caso("PAES"));
  await auditar(p, `${nombre} referências: formulario de livro lleno (referencia armada)`);
  await p.click("#btnAdicionar");
  for (const ini of ["MARTELETO", "OLIVEIRA, Aloídes", "BRASIL. Lei nº 14.681"]) { await llena(p, caso(ini)); await p.click("#btnAdicionar"); }
  await new Promise((r) => setTimeout(r, 400));
  await auditar(p, `${nombre} referências: lista con 4 referencias`);
  await p.click('.ref-item [data-acao="editar"]');
  await new Promise((r) => setTimeout(r, 300));
  await auditar(p, `${nombre} referências: editando una referencia`);
  await p.close();
}
await b.close();

console.log(`\n${fallos ? "FALLÓ" : "Todo OK"}: ${total - fallos}/${total} páginas o estados sin problemas de accesibilidad`);
process.exit(fallos ? 1 : 0);
