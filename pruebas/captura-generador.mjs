// Capturas completas de la página del generador (celular y computador), con y sin ?ads=preview.
// Genera: capturas/generador-<aparato>-<modo>.png (página entera) y ...-columnas.png (la misma página repartida en columnas, para verla de un vistazo).
import puppeteer from "puppeteer-core";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import pathMod from "node:path";
import fs from "node:fs";
const AQUI = pathMod.dirname(fileURLToPath(import.meta.url));
const CAP = pathMod.join(AQUI, "..", "capturas");
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });

const APARATOS = {
  celular: { vp: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, colAlto: 2900, cols: 4 },
  computador: { vp: { width: 1280, height: 900, deviceScaleFactor: 1 }, colAlto: 2800, cols: 3 },
};

for (const [nome, ap] of Object.entries(APARATOS)) {
  for (const modo of ["sin-anuncios", "con-anuncios"]) {
    const p = await browser.newPage();
    await p.setViewport(ap.vp);
    await p.goto("http://localhost:3000/gerador-de-capa-abnt/" + (modo === "con-anuncios" ? "?ads=preview" : ""), { waitUntil: "networkidle0" });
    await p.evaluate(() => {
      const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); };
      set("institution", "Universidade Federal de Viçosa"); set("course", "Curso de Administração");
      document.querySelector("#autores input").value = "Maria Silva";
      set("title", "A influência das redes sociais no aprendizado"); set("subtitle", "um estudo com alunos do ensino médio"); set("city", "Viçosa - MG");
    });
    // recorre la página para que aparezcan los bloques (aparecen suavemente al hacer scroll)
    await p.evaluate(async () => {
      document.documentElement.style.scrollBehavior = "auto";
      for (let y = 0; y < document.body.scrollHeight; y += 350) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
      window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 900));
    });
    // en celular se muestra la pestaña "Preencher"; para ver la prévia en la misma captura la hacemos visible
    if (nome === "celular") await p.addStyleTag({ content: "#painelPrevia{display:block !important}" });
    await new Promise((r) => setTimeout(r, 500));
    const arq = pathMod.join(CAP, `generador-${nome}-${modo}.png`);
    const buf = Buffer.from(await p.screenshot({ fullPage: true }));
    fs.writeFileSync(arq, buf);
    const img = await loadImage(buf);
    // montaje en columnas
    const cols = Math.min(ap.cols, Math.ceil(img.height / ap.colAlto));
    const gap = 24;
    const cv = createCanvas(cols * img.width + (cols - 1) * gap, ap.colAlto);
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#cfdccf"; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < cols; i++) ctx.drawImage(img, 0, i * ap.colAlto, img.width, ap.colAlto, i * (img.width + gap), 0, img.width, ap.colAlto);
    fs.writeFileSync(arq.replace(".png", "-columnas.png"), cv.toBuffer("image/png"));
    console.log("ok", nome, modo, `${img.width}x${img.height}`, `${cols} columnas`);
    await p.close();
  }
}
await browser.close();
