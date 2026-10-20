// Capturas de la página /anuncie/ (computador y celular) y del cartón "Parceiro recomendado" en una guía, para revisar el diseño.
// Construye una versión ENCENDIDA con números de EJEMPLO (inventados) y un anunciante de ejemplo; el sitio real sigue apagado.
// Salen en ../capturas/anuncie/. Uso: node capturas-anuncie.mjs
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { NUMEROS_EJEMPLO, PARCEIRO_EJEMPLO, construye, sirve, limpia } from "./lib-anuncie.mjs";

const OUT = "../capturas/anuncie";
fs.mkdirSync(OUT, { recursive: true });
const on = construye({ anuncie: { ativo: true, numeros: NUMEROS_EJEMPLO, parceiroRecomendado: { ativo: true, anuncios: [PARCEIRO_EJEMPLO] } } }, "cap");
if (!on.ok) { console.log(on.salida); process.exit(1); }
const off = construye({}, "cap-off");
const srv = await sirve(on.dir);
const srvOff = await sirve(off.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
const abre = async (base, ruta, vp) => {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(base + ruta, { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important} html{scroll-behavior:auto!important}" });
  await esp(300);
  return p;
};
const PC = { width: 1280, height: 900, deviceScaleFactor: 1 };
const CEL = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
for (const [nome, vp] of [["computador", PC], ["celular", CEL]]) {
  // página encendida, completa
  let p = await abre(srv.url, "/anuncie/", vp);
  await p.screenshot({ path: `${OUT}/anuncie-${nome}.png`, fullPage: true });
  if (nome === "celular") {
    // en trozos de ~1400 px para poder revisarla con detalle
    const alto = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0, y = 0; y < alto; i++, y += 1400) await p.screenshot({ path: `${OUT}/anuncie-celular-parte${i + 1}.png`, clip: { x: 0, y, width: 390, height: Math.min(1400, alto - y) } });
  }
  await p.close();
  // cartón en una guía (fin de la guía: guías relacionadas + cartón)
  p = await abre(srv.url, "/guias/como-fazer-referencia-abnt/", vp);
  const el = await p.$(".guia-relacionadas");
  const caja = await el.boundingBox();
  await p.screenshot({ path: `${OUT}/cartao-na-guia-${nome}.png`, clip: { x: 0, y: caja.y - 40, width: vp.width, height: caja.height + 90 } });
  await p.close();
}
// página apagada (lo que vería quien encuentre el enlace): se ve igual, con el aviso de números sin preencher
const pOff = await abre(srvOff.url, "/anuncie/", PC);
await pOff.screenshot({ path: `${OUT}/anuncie-apagada-computador.png`, fullPage: true });
await pOff.close();
await b.close();
await srv.cierra(); await srvOff.cierra();
limpia(on.dir); limpia(off.dir);
console.log("Capturas en", OUT);
