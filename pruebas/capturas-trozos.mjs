// Trozos de página (para revisar a ojo): node capturas-trozos.mjs <ruta> <ancho> <alto-trozo> <max> <nombre>
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const [ruta, w, h, max, nombre] = process.argv.slice(2);
const movil = +w < 768;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-tr-")) });
const p = await b.newPage();
await p.setViewport({ width: +w, height: +h, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
await p.goto((process.env.BASE_URL || "https://estudasimples.com.br") + ruta, { waitUntil: "networkidle0" });
await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important}" });
const alto = await p.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < Math.min(+max, Math.ceil(alto / +h)); i++) await p.screenshot({ path: `../capturas/auditoria/${nombre}-${i + 1}.png`, clip: { x: 0, y: i * +h, width: +w, height: Math.min(+h, alto - i * +h) } });
console.log(nombre, "alto", alto);
await b.close();
