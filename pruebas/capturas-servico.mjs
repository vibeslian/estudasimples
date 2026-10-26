// Capturas de la etapa 8: página del servicio (computador y celular), bloque en las herramientas, menú y Política.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "../capturas/servico";
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const PC = { width: 1280, height: 900 }, CEL = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, CEL320 = { ...CEL, width: 320 };
async function abre(url, vp) {
  const p = await b.newPage(); await p.setViewport(vp);
  await p.goto(BASE + url, { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important}" }); await new Promise((r) => setTimeout(r, 400));
  await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
  return p;
}
const seccion = async (p, sel, nombre, margen = 0) => { const el = await p.$(sel); await el.screenshot({ path: `${OUT}/${nombre}.png` }); };

let p = await abre("/formatacao-abnt-tcc/", PC);
await p.evaluate(() => document.querySelector(".faq details").setAttribute("open", ""));
await p.screenshot({ path: `${OUT}/servico-0-computador-completa.png`, fullPage: true });
await p.evaluate(() => document.querySelector(".faq details").removeAttribute("open"));
await p.screenshot({ path: `${OUT}/servico-1-computador-portada.png` });
await seccion(p, "#incluido", "servico-2-computador-incluido");
await seccion(p, "#nao-inclui", "servico-3-computador-nao-inclui");
await seccion(p, "#como-funciona", "servico-4-computador-como-funciona");
await seccion(p, "#prazo-e-precos", "servico-5-computador-prazo-e-precos");
await p.evaluate(() => document.querySelector(".faq details").setAttribute("open", ""));
await seccion(p, "#perguntas-frequentes", "servico-6-computador-faq");
await p.close();

p = await abre("/formatacao-abnt-tcc/", CEL);
// página completa del celular: en pedazos de 4000 px (a 2x una sola captura pasaría el límite de 16384 px del navegador y se repetiría el principio) y pegados
await p.addStyleTag({ content: ".barra-whatsapp{display:none!important}" });
await p.evaluate(() => document.querySelector(".faq details").setAttribute("open", ""));
const alto = await p.evaluate(() => document.documentElement.scrollHeight);
const trozos = [];
for (let y = 0; y < alto; y += 4000) trozos.push(await p.screenshot({ clip: { x: 0, y, width: 390, height: Math.min(4000, alto - y) }, captureBeyondViewport: true }));
const lienzo = createCanvas(780, alto * 2); const cx = lienzo.getContext("2d");
for (let i = 0; i < trozos.length; i++) cx.drawImage(await loadImage(trozos[i]), 0, i * 8000);
fs.writeFileSync(`${OUT}/servico-0-celular-completa.png`, lienzo.toBuffer("image/png"));
await p.evaluate(() => document.querySelector(".faq details").removeAttribute("open"));
await p.evaluate(() => { const st = document.querySelector("style:last-of-type"); });

await p.screenshot({ path: `${OUT}/servico-7-celular-portada.png` });
await seccion(p, "#antes-e-depois", "servico-8-celular-antes-e-depois");
await p.close();
p = await abre("/formatacao-abnt-tcc/#origem=capa", CEL);
await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
for (const [sel, desp, nombre] of [["body", 0, "barra-1-arriba-oculta"], ["#incluido", 0, "barra-2-visible-en-incluido"], ["#antes-e-depois", -20, "barra-3-visible-en-antes-depois"], ["#prazo-e-precos .preco-rodape a", 400, "barra-4-oculta-con-boton-de-precos"], ["footer", 300, "barra-5-visible-sobre-el-pie"]]) {
  await p.evaluate((sel, d) => { window.scrollTo({ top: sel === "body" ? 0 : document.querySelector(sel).getBoundingClientRect().top + scrollY - d, behavior: "instant" }); }, sel, desp);
  await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({ path: `${OUT}/servico-${nombre}.png` });
}
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: `${OUT}/servico-barra-6-final-de-la-pagina.png` });
await p.close();
p = await abre("/formatacao-abnt-tcc/", CEL320);
await p.screenshot({ path: `${OUT}/servico-10-celular-320-portada.png` });
await p.close();

// bloque en las herramientas: recorte de la zona de los botones de descarga
for (const [url, id] of [["/gerador-de-capa-abnt/", "capa"], ["/gerador-de-folha-de-rosto-abnt/", "folha"], ["/gerador-de-sumario-abnt/", "sumario"]]) {
  for (const [vp, n] of [[PC, "computador"], [CEL, "celular"]]) {
    p = await abre(url, vp);
    const r = await p.evaluate(() => { const a = document.querySelector(".acoes").getBoundingClientRect(), c = document.querySelector(".convite-servico").getBoundingClientRect(); return { x: 0, y: Math.max(0, a.top + scrollY - 40), w: innerWidth, h: c.bottom - a.top + 90 }; });
    await p.screenshot({ path: `${OUT}/ferramenta-${id}-${n}.png`, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    await p.close();
  }
}
// portada: aviso discreto
for (const [vp, n] of [[PC, "computador"], [CEL, "celular"]]) { p = await abre("/", vp); await p.screenshot({ path: `${OUT}/portada-aviso-${n}.png` }); await p.close(); }
// Política: la sección nueva
p = await abre("/politica-de-privacidade/", PC);
const h = await p.$("#servico-formatacao");
const box = await p.evaluate(() => { const e = document.getElementById("servico-formatacao"); const f = document.querySelector("h3#servico-formatacao ~ h3"); return { top: e.getBoundingClientRect().top + scrollY - 20, bottom: f.getBoundingClientRect().top + scrollY }; });
await p.screenshot({ path: `${OUT}/politica-secao-2-4.png`, clip: { x: 0, y: box.top, width: 1280, height: box.bottom - box.top } });
await p.close();
await b.close();
console.log(fs.readdirSync(OUT).join("\n"));
