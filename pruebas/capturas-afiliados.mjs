// Capturas del bloque "Recomendado para o seu trabalho" (computador y celular), encendido con productos de EJEMPLO (enlaces inventados), y de las
// secciones "Links de afiliado" de Termos de Uso y Política de Privacidade. El sitio real sigue apagado. Salen en ../capturas/afiliados/.
// Uso: node capturas-afiliados.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { CONFIG_REAL, construye, sirve, limpia } from "./lib-anuncie.mjs";

const OUT = "../capturas/afiliados";
fs.mkdirSync(OUT, { recursive: true });
const AF = CONFIG_REAL.afiliados;
const produtos = AF.produtos.map((p, i) => ({ ...p, url: `https://www.amazon.com.br/dp/B00EJEMPLO${String(i + 1).padStart(2, "0")}` })).concat({
  id: "curso-ejemplo", tipo: "curso", titulo: "Curso de exemplo: escrita acadêmica", autor: "", frase: "Aulas curtas sobre como organizar e escrever o trabalho acadêmico.", url: "https://www.exemplo.com.br/curso", guias: ["resumo-abnt"],
});
const on = construye({ afiliados: { ativo: true, amazonTag: "exemplo-20", legalAtualizadoEm: "2026-10-21", produtos } }, "af-cap");
if (!on.ok) { console.log(on.salida); process.exit(1); }
const srv = await sirve(on.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-afcap-")) });
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
const abre = async (ruta, vp) => {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(srv.url + ruta, { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important} html{scroll-behavior:auto!important}" });
  await esp(300);
  return p;
};
const VPS = { computador: { width: 1280, height: 900, deviceScaleFactor: 1 }, celular: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, "celular-320": { width: 320, height: 700, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const recorta = async (p, sel, nombre, antes = 30, despues = 30) => {
  const el = await p.$(sel);
  const c = await el.boundingBox();
  const vp = p.viewport();
  await p.screenshot({ path: `${OUT}/${nombre}.png`, clip: { x: 0, y: Math.max(0, c.y - antes), width: vp.width, height: c.height + antes + despues }, captureBeyondViewport: true });
};
for (const [nombre, vp] of Object.entries(VPS)) {
  let p = await abre("/guias/como-fazer-tcc/", vp);
  // el bloque y, debajo, "Guias relacionadas" (para ver que va antes)
  const el = await p.$(".afiliados"), rel = await p.$(".guia-relacionadas");
  const a = await el.boundingBox(), r = await rel.boundingBox();
  await p.screenshot({ path: `${OUT}/guia-tcc-${nombre}.png`, clip: { x: 0, y: a.y - 40, width: vp.width, height: r.y + Math.min(r.height, 260) - a.y + 40 }, captureBeyondViewport: true });
  await p.close();
  if (nombre === "celular-320") continue;
  p = await abre("/guias/resumo-abnt/", vp);
  await recorta(p, ".afiliados", `guia-resumo-con-curso-${nombre}`);
  await p.close();
  for (const [pag, id] of [["termos-de-uso", "termos"], ["politica-de-privacidade", "privacidade"]]) {
    p = await abre(`/${pag}/#links-de-afiliado`, vp);
    const h = await p.$("#links-de-afiliado");
    const c = await h.boundingBox();
    const sy = await p.evaluate(() => window.scrollY); // el #ancla ya desplazó la página
    await p.screenshot({ path: `${OUT}/${id}-secao-${nombre}.png`, clip: { x: 0, y: sy + c.y - 30, width: vp.width, height: vp.width < 700 ? 900 : 440 }, captureBeyondViewport: true });
    await p.close();
  }
}
await b.close();
await srv.cierra();
limpia(on.dir);
console.log("Capturas en", OUT);
