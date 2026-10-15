// Capturas de la Etapa 8.5: panel "Próximo passo", indicador "Monte seu TCC passo a passo" y oferta propia (computador y celular).
// Las descargas se hacen en memoria (nada se abre ni queda en Descargas).
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "../capturas/conexiones";
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const VPS = { computador: { width: 1280, height: 900 }, celular: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const DADOS = { title: "Redes sociais e estudo", city: "Recife", year: "2026", institution: "Universidade Exemplo", author: "Ana Souza" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function abre(url, vp) {
  const p = await b.newPage(); await p.setViewport(vp);
  await p.evaluateOnNewDocument(() => { window.__arquivos = []; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__arquivos.push(this.download); return; } return c.call(this); }; });
  await p.goto(BASE + url, { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important} html{scroll-behavior:auto!important}" });
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
  return p;
}
async function preenche(p, extra = {}) {
  await p.evaluate((d) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); } };
    set("title", d.title); set("city", d.city); set("year", d.year); set("institution", d.institution);
    const a = document.querySelector("#autores input"); a.value = d.author; a.dispatchEvent(new Event("input", { bubbles: true }));
    if (d.colar) { document.getElementById("colarLista").value = d.colar; document.getElementById("btnColarSub").click(); }
  }, { ...DADOS, ...extra });
}
async function baixa(p, id = "btnPdf") {
  const n = await p.evaluate(() => window.__arquivos.length);
  await p.$eval("#" + id, (e) => e.click());
  await p.waitForFunction((n) => window.__arquivos.length > n, { timeout: 30000 }, n);
  await espera(400);
}
// recorte da zona "botões de baixar + painel", com margem
async function recortaPainel(p, nombre) {
  const r = await p.evaluate(() => { const a = document.querySelector(".acoes"), pn = document.getElementById("proximoPasso"); const sc = window.scrollY; const t = a.getBoundingClientRect().top + sc - 24; const bt = pn.getBoundingClientRect().bottom + sc + 60; return { y: Math.max(0, t), h: bt - t }; });
  await p.evaluate((y) => window.scrollTo(0, y), r.y); await espera(300);
  await p.screenshot({ path: `${OUT}/${nombre}.png`, clip: { x: 0, y: r.y, width: p.viewport().width, height: r.h }, captureBeyondViewport: true });
}

for (const [nome, vp] of Object.entries(VPS)) {
  // 1) capa → panel sugiere la folha de rosto
  let p = await abre("/gerador-de-capa-abnt/", vp);
  await preenche(p); await baixa(p);
  await recortaPainel(p, `1-proximo-passo-capa-${nome}`);
  // indicador en la capa, con la capa ya marcada
  const ind = await p.$(".percurso"); await ind.screenshot({ path: `${OUT}/2-indicador-en-la-capa-${nome}.png` });
  // 2) la oferta propia de la capa
  const of = await p.$(".oferta"); await of.scrollIntoView?.(); await of.screenshot({ path: `${OUT}/3-oferta-propia-capa-${nome}.png` });
  // 3) portada con la capa marcada
  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important}" });
  await espera(400);
  const sec = await p.$("#passo-a-passo"); await sec.screenshot({ path: `${OUT}/4-indicador-en-la-portada-${nome}.png` });
  await p.screenshot({ path: `${OUT}/4b-portada-completa-arriba-${nome}.png` });
  const fin = await p.$(".percurso-final"); await fin.screenshot({ path: `${OUT}/6-paso-4-detalle-${nome}.png` });
  await p.close();

  // 4) sumário → panel sugiere el servicio
  p = await abre("/gerador-de-sumario-abnt/", vp);
  await preenche(p, { colar: "1 Introdução ..... 7\n2 Desenvolvimento ..... 9\n3 Conclusão ..... 20" }); await baixa(p);
  await recortaPainel(p, `5-proximo-passo-sumario-servicio-${nome}`);
  await p.close();
}
await b.close();
console.log(fs.readdirSync(OUT).join("\n"));
