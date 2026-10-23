// Capturas de la portada: node capturas-home.mjs [ruta]  -> ../capturas/auditoria/home-*.png
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ruta = process.argv[2] || "/";
const nombre = process.argv[3] || "home";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "home-cap-")) });
for (const [n, vp] of [["pc", { width: 1366, height: 900 }], ["cel", { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage(); await p.setViewport(vp);
  await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  // baja poco a poco para que aparezcan las secciones (animación de entrada) y las fotos perezosas
  await p.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({ path: `../capturas/auditoria/${nombre}-${n}.png`, fullPage: true });
  await p.close();
}
await b.close();
console.log("listo");
