// Gera as 5 cenas (PNG 1200x900) do vídeo de 15 s do Kit TCC, com páginas REAIS do modelo.
// Uso: node crear-video-kit.mjs <pasta-com-as-paginas> <pasta-saida>
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const [pg, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const fontes = pathToFileURL(path.resolve("../src/assets/fonts")).href;
const img = (n) => pathToFileURL(path.join(pg, `Modelo-TCC-ABNT-p${n}.png`)).href;
const CENAS = [
  { p: 1, t: "Capa pronta, nas normas da ABNT", s: "É só trocar os textos entre colchetes pelos seus." },
  { p: 11, t: "Sumário automático", s: "Escreveu um título novo? Aperte F9 e o sumário se atualiza com as páginas certas.", f9: true },
  { p: 13, t: "Títulos numerados até 5 níveis", s: "Citação longa com recuo de 4 cm e nota de rodapé já no estilo certo." },
  { p: 12, t: "Número da página no lugar certo", s: "A capa não conta, e o número aparece no alto, à direita, a partir da Introdução." },
  { fim: true },
];
const base = `<style>
@font-face{font-family:Nunito;src:url(${fontes}/nunito-latin.woff2) format("woff2");font-weight:200 1000}
@font-face{font-family:Inter;src:url(${fontes}/inter-latin.woff2) format("woff2");font-weight:100 900}
*{box-sizing:border-box}body{margin:0;width:1200px;height:900px;background:#faf8f3;font-family:Inter,sans-serif;color:#1e2924;overflow:hidden;position:relative}
.m1{position:absolute;width:620px;height:620px;border-radius:50%;background:#e4ece3;left:-220px;top:-200px;filter:blur(50px)}
.m2{position:absolute;width:520px;height:520px;border-radius:50%;background:#fce6de;right:-160px;bottom:-200px;filter:blur(60px)}
.tag{position:absolute;left:56px;top:44px;background:#22362b;color:#fff;font-weight:700;font-size:20px;padding:8px 18px;border-radius:999px}
.pag{position:absolute;left:70px;top:110px;height:760px;border-radius:6px;box-shadow:0 2px 6px rgba(34,54,43,.12),0 30px 60px rgba(34,54,43,.22);background:#fff}
.txt{position:absolute;left:650px;right:60px;top:250px;display:flex;flex-direction:column;gap:22px}
h1{margin:0;font-family:Nunito,sans-serif;font-weight:900;font-size:58px;line-height:1.05;letter-spacing:-.01em}
p{margin:0;font-size:29px;line-height:1.4;color:#4a5750}
.f9{display:inline-flex;align-items:center;justify-content:center;width:120px;height:120px;border-radius:22px;background:#fff;border:3px solid #22362b;box-shadow:0 10px 0 #22362b;font-family:Nunito,sans-serif;font-weight:900;font-size:56px;margin-top:8px}
.fim{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center;padding:60px}
.fim h1{font-size:76px}.fim p{font-size:34px}
.btn{background:#e8674a;color:#1e2924;font-weight:800;font-size:34px;padding:22px 40px;border-radius:999px;box-shadow:0 14px 30px rgba(232,103,74,.35)}
.url{font-weight:700;color:#2f5242;font-size:30px}
</style>`;

const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const page = await b.newPage();
await page.setViewport({ width: 1200, height: 900 });
for (const [i, c] of CENAS.entries()) {
  const corpo = c.fim
    ? `<div class="fim"><span class="tag" style="position:static">Kit TCC · modelo de TCC pronto no Word</span><h1>Teste antes de comprar</h1><p>Baixe grátis 3 páginas do modelo e aperte F9 no seu Word.</p><span class="btn">Baixar 3 páginas grátis</span><span class="url">estudasimples.com.br/kit-tcc</span></div>`
    : `<span class="tag">Páginas reais do modelo</span><img class="pag" src="${img(c.p)}"><div class="txt"><h1>${c.t}</h1><p>${c.s}</p>${c.f9 ? '<span class="f9">F9</span>' : ""}</div>`;
  const arq = path.join(out, `cena${i + 1}.html`);
  fs.writeFileSync(arq, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">${base}</head><body><div class="m1"></div><div class="m2"></div>${corpo}</body></html>`);
  await page.goto(pathToFileURL(arq).href, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, `cena${i + 1}.png`) });
}
await b.close();
console.log("ok", CENAS.length);
