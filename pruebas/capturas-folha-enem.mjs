// Capturas de la hoja de redacción ENEM (computador, celular) y del PDF → PNG, en capturas/auditoria/. Sitio local.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { pdfAPng } from "./pdf-a-png.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SALIDA = path.resolve("../capturas/auditoria");
fs.mkdirSync(SALIDA, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-capfolha-"));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: path.join(tmp, "p") });
for (const [nombre, w, h, movil] of [["escritorio", 1366, 900, false], ["celular", 390, 844, true]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
  await p.goto(BASE + "/folha-de-redacao-enem/", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel", "visible", "in")));
  await p.screenshot({ path: path.join(SALIDA, `folha-enem-${nombre}.png`), fullPage: true });
  await p.close();
}
const p = await b.newPage();
const cdp = await p.createCDPSession();
await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: tmp });
await p.goto(BASE + "/folha-de-redacao-enem/", { waitUntil: "networkidle0" });
await p.evaluate(() => { const r = document.querySelector('input[name="qtd"][value="3"]'); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); });
await p.click("#baixar");
const fin = Date.now() + 15000; let pdf;
while (Date.now() < fin && !(pdf = fs.readdirSync(tmp).find((f) => f.endsWith(".pdf")))) await new Promise((r) => setTimeout(r, 200));
await new Promise((r) => setTimeout(r, 400));
const out = await pdfAPng(path.join(tmp, pdf), SALIDA, 1.2);
console.log(out.slice(0, 1).join("\n"));
await b.close();
fs.rmSync(tmp, { recursive: true, force: true });
