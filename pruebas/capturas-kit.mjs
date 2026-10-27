// Capturas de la página del Kit TCC (encendida con un link de PRUEBA, solo en una copia temporal) en capturas/auditoria/kit-*.png.
import path from "node:path";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { construye, sirve, limpia, RAIZ } from "./lib-anuncie.mjs";

const salida = path.join(RAIZ, "capturas", "auditoria");
fs.mkdirSync(salida, { recursive: true });
const on = construye({ kit: { ativo: true, urlCompra: "https://pay.hotmart.com/PRUEBA123X", legalAtualizadoEm: "2026-10-28" } }, "kitcap");
const srv = await sirve(on.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const [nombre, w, h, movil] of [["escritorio", 1366, 900, false], ["celular", 390, 844, true]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
  await p.goto(srv.url + "/kit-tcc/", { waitUntil: "networkidle0" });
  await p.evaluate(() => { document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel", "visible", "in", "revelado")); return document.fonts.ready; });
  await p.screenshot({ path: path.join(salida, `kit-${nombre}.png`), fullPage: true });
  await p.close();
}
await b.close();
await srv.cierra();
limpia(on.dir);
console.log("ok");
