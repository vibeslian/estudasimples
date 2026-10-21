// Auditoría visual: capturas del sitio EN VIVO (portada, herramienta, guía con afiliados, servicio) en computador y celular.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "https://estudasimples.com.br";
const PAGINAS = [["inicio", "/"], ["capa", "/gerador-de-capa-abnt/"], ["guia", "/guias/normas-abnt/"], ["servico", "/formatacao-abnt-tcc/"], ["guias", "/guias/"]];
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-aud-")) });
for (const [nome, w, h, movil] of [["pc", 1440, 900, false], ["cel", 390, 844, true]]) {
  for (const [id, ruta] of PAGINAS) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
    await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
    await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important}" });
    const alto = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.screenshot({ path: `../capturas/auditoria/${id}-${nome}.png`, fullPage: true });
    console.log(id, nome, "alto", alto);
    await p.close();
  }
}
await b.close();
