import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-h-")) });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto(process.env.BASE_URL || "https://estudasimples.com.br/", { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: "../capturas/auditoria/hero-pc-espera.png" });
await b.close();
