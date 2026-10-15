// Capturas de las guías (computador y celular) para revisar el diseño. Uso: node capturas-guias.mjs [slug ...] (sin argumentos: margens-abnt e o índice)
// En celular, la página completa se saca en pedazos de 4000 px y se pega (a 2x, una sola captura supera el límite de 16384 px del navegador).
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "../capturas/guias";
fs.mkdirSync(OUT, { recursive: true });
const PC = { width: 1280, height: 900 }, CEL = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ["indice", "margens-abnt"];
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const slug of slugs) {
  const url = slug === "indice" ? "/guias/" : `/guias/${slug}/`;
  for (const [n, vp] of [["computador", PC], ["celular", CEL]]) {
    const p = await b.newPage(); await p.setViewport(vp);
    await p.goto(BASE + url, { waitUntil: "networkidle0" });
    await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important} html{scroll-behavior:auto!important}" });
    await new Promise((r) => setTimeout(r, 400));
    await p.evaluate(() => document.querySelectorAll(".faq details").forEach((d, i) => { if (i === 0) d.setAttribute("open", ""); }));
    const alto = await p.evaluate(() => document.documentElement.scrollHeight);
    const f = vp.deviceScaleFactor || 1, ancho = vp.width;
    const trozos = [];
    for (let y = 0; y < alto; y += 4000) trozos.push(await p.screenshot({ clip: { x: 0, y, width: ancho, height: Math.min(4000, alto - y) }, captureBeyondViewport: true }));
    const lienzo = createCanvas(ancho * f, alto * f); const cx = lienzo.getContext("2d");
    for (let i = 0; i < trozos.length; i++) cx.drawImage(await loadImage(trozos[i]), 0, i * 4000 * f);
    fs.writeFileSync(`${OUT}/${slug}-${n}-completa.png`, lienzo.toBuffer("image/png"));
    // además, la parte de arriba (lo que se ve primero)
    await p.screenshot({ path: `${OUT}/${slug}-${n}-arriba.png` });
    console.log(slug, n, `${ancho * f}x${alto * f}`);
    await p.close();
  }
}
await b.close();
