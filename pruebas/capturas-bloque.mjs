// Captura el bloque de afiliados (con su animación ya terminada) en computador y celular.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-bl-")) });
for (const [n, w, h, m] of [["pc", 1440, 900, false], ["cel", 390, 844, true]]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h, isMobile: m, hasTouch: m, deviceScaleFactor: 1 });
  await p.goto(BASE + (process.env.RUTA || "/guias/citacao-abnt/"), { waitUntil: "networkidle0" });
  await p.evaluate(() => document.querySelector(".afiliados").scrollIntoView({ block: "center" }));
  await new Promise((r) => setTimeout(r, 2200));
  const el = await p.$(".afiliados"); await el.screenshot({ path: `../capturas/auditoria/bloque-${n}.png` });
  await p.close();
}
await b.close();
