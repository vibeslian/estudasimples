// Capturas del menú nuevo: node capturas-menu.mjs  -> ../capturas/auditoria/menu-*.png
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "menu-cap-")) });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
{
  const p = await b.newPage(); await p.setViewport({ width: 1366, height: 700 });
  await p.goto(BASE + "/contador-de-linhas-enem/", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: "../capturas/auditoria/menu-pc-cerrado.png" });
  await p.click(".nav-ferramentas"); await espera(300);
  await p.screenshot({ path: "../capturas/auditoria/menu-pc-abierto.png" });
  await p.close();
}
{
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true });
  await p.goto(BASE + "/contador-de-linhas-enem/", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: "../capturas/auditoria/menu-cel-cerrado.png" });
  await p.click("#menuBotao"); await espera(300);
  await p.screenshot({ path: "../capturas/auditoria/menu-cel-abierto.png" });
  await p.close();
}
await b.close();
console.log("listo");
