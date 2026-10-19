// Captura del "modelo de sumário" de la página del gerador de sumário en celular (390 px), para comparar antes/después de arreglar
// la línea rota de components.css. Uso: node capturas-css-sumario.mjs antes|despues   (sitio en :3000). Salen en ../capturas/css-sumario/.
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const etiqueta = process.argv[2] || "antes";
const OUT = "../capturas/css-sumario";
fs.mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const [nome, vp] of [["celular", { width: 390, height: 900, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["computador", { width: 1280, height: 900, deviceScaleFactor: 1 }]]) {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(BASE + "/gerador-de-sumario-abnt/", { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important} html{scroll-behavior:auto!important}" });
  const el = await p.$(".modelo-sumario");
  if (!el) { console.log(nome, "sin .modelo-sumario"); await p.close(); continue; }
  await el.screenshot({ path: `${OUT}/${etiqueta}-${nome}.png` });
  const css = await p.evaluate(() => { const e = document.querySelector(".ms-pagina"); const s = getComputedStyle(e); return { fundo: s.backgroundColor, relleno: s.paddingTop }; });
  console.log(etiqueta, nome, JSON.stringify(css));
  await p.close();
}
await b.close();
