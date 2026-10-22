import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-cc-")) });
for (const [n, w, h, m] of [["pc", 1366, 800, false], ["cel", 390, 800, true]]) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: m, hasTouch: m, deviceScaleFactor: 1 });
  const cdp = await p.createCDPSession(); await cdp.send("Page.setDownloadBehavior", { behavior: "deny" });
  await p.goto(BASE + "/gerador-de-capa-abnt/?exemplo=1", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  if (m) { await p.click("#abaPrevia").catch(() => {}); await p.waitForFunction(() => /Exemplo preenchido/.test(document.querySelector(".nota-previa").textContent), { timeout: 20000 }).catch(() => {}); await p.click("#abaDados"); }
  else await p.waitForFunction(() => /Exemplo preenchido/.test(document.getElementById("toast").textContent), { timeout: 20000 });
  await p.click("#btnPdf");
  await new Promise((r) => setTimeout(r, 900));
  await p.screenshot({ path: `../capturas/auditoria/f2-flotante-${n}.png` });
  await ctx.close();
}
await b.close();
