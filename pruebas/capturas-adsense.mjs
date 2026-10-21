// Etapa 18: capturas del aviso de cookies (sitio construido ENCENDIDO con IDs de ejemplo; nunca se contacta a Google).
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
import { construye, sirve, limpia } from "./lib-anuncie.mjs";
const r = construye({ anuncios: { adsenseAtivo: true, adsense: { blocos: { conteudo: "1234567890", lateral: "0987654321" }, legalAtualizadoEm: "2026-10-22" } } }, "capt-ads");
const s = await sirve(r.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-capt-")) });
for (const [nome, w, h, movil] of [["celular", 390, 844, true], ["computador", 1280, 800, false]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 2 });
  await p.setRequestInterception(true);
  p.on("request", (q) => (/googlesyndication/.test(q.url()) ? q.abort() : q.continue()));
  await p.goto(s.url + "/gerador-de-capa-abnt/", { waitUntil: "networkidle0" });
  await p.screenshot({ path: `../capturas/adsense/aviso-${nome}.png` });
  await p.close();
}
await b.close(); await s.cierra(); limpia(r.dir);
