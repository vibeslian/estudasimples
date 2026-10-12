// Capturas de Sobre, Contacto, Privacidad y Términos (computador y celular).
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import pathMod from "node:path";
const CAP = pathMod.join(pathMod.dirname(fileURLToPath(import.meta.url)), "..", "capturas");
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const [dev, vp] of [["computador", { width: 1280, height: 900 }], ["celular", { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }]]) {
  for (const [n, u] of [["sobre", "/sobre/"], ["contato", "/contato/"], ["privacidade", "/politica-de-privacidade/"], ["termos", "/termos-de-uso/"]]) {
    const p = await b.newPage(); await p.setViewport(vp);
    await p.goto("http://localhost:3000" + u, { waitUntil: "networkidle0" });
    await p.screenshot({ path: pathMod.join(CAP, `${dev}-${n}.png`), fullPage: true }); await p.close();
  }
}
await b.close(); console.log("ok");
