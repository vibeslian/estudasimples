// Captura la oferta del Kit TCC dentro de una herramienta (computador y celular), para revisarla a ojo.
// Uso (desde pruebas/, con el servidor local en :3000): node captura-oferta-kit.mjs
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SALIDA = path.join(os.tmpdir(), "oferta-kit");
fs.mkdirSync(SALIDA, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
try {
  for (const [nombre, vp] of [["computador", { width: 1280, height: 900 }], ["celular", { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }]]) {
    const p = await browser.newPage();
    await p.setViewport(vp);
    await p.goto(BASE + "/gerador-de-capa-abnt/", { waitUntil: "networkidle0" });
    await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
    const k = await p.$('.oferta[data-oferta="kit"]');
    await k.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
    await new Promise((r) => setTimeout(r, 700));
    await k.screenshot({ path: path.join(SALIDA, `kit-${nombre}.png`) });
    await p.close();
  }
  console.log("capturas en " + SALIDA);
} finally {
  await browser.close();
}
