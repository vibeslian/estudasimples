// Capturas de las 3 herramientas del ENEM (escritorio y celular): node capturas-enem.mjs  -> ../capturas/auditoria/enem-*.png
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "enem-cap-")), args: ["--no-sandbox"] });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const parrafo = "A importância de estudar com planejamento é reconhecida por muitos especialistas em educação, porque ajuda o estudante a organizar o tempo e a reduzir a ansiedade antes da prova. ";
const texto = (parrafo.repeat(4) + "\n" + parrafo.repeat(5) + "\n" + parrafo.repeat(4) + "\n" + parrafo.repeat(3)).trim();
const hoje = new Date(); const prova = new Date(hoje.getTime() + 24 * 86400000);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

for (const [nome, vp] of [["pc", { width: 1366, height: 900 }], ["cel", { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage(); await p.setViewport(vp);
  // contador
  await p.goto(BASE + "/contador-de-linhas-enem/", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await p.type("#texto", texto, { delay: 0 });
  await espera(500);
  await p.screenshot({ path: `../capturas/auditoria/enem-contador-${nome}.png`, fullPage: nome === "cel" });
  // cronograma
  await p.goto(BASE + "/cronograma-de-estudos-enem/", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate((v) => { const d = document.getElementById("data"); d.value = v; }, iso(prova));
  await p.click("#montar");
  await espera(400);
  await p.screenshot({ path: `../capturas/auditoria/enem-cronograma-${nome}.png`, fullPage: nome === "cel" });
  // media
  await p.goto(BASE + "/calculadora-de-media/", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await p.type("#media", "6,0"); await p.type("#nota1", "7,5"); await p.type("#nota2", "6,0"); await p.type("#nota3", "5,5");
  await espera(400);
  await p.screenshot({ path: `../capturas/auditoria/enem-media-${nome}.png`, fullPage: nome === "cel" });
  // portada
  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  await p.evaluate(() => { document.getElementById("enem").scrollIntoView(); });
  await espera(1200);
  await p.screenshot({ path: `../capturas/auditoria/enem-portada-${nome}.png` });
  await ctx.close();
}
await b.close();
console.log("capturas listas");
