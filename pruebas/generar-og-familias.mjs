// Genera las imágenes para compartir (1200x630) de cada familia de páginas: ENEM, guías, servicio y kit.
// La imagen general (og.png) sigue saliendo de generar-og.mjs. Uso: cd pruebas && node generar-og-familias.mjs
import puppeteer from "puppeteer-core";
import { fileURLToPath, pathToFileURL } from "node:url";
import pathMod from "node:path";
import fs from "node:fs";
import os from "node:os";
const AQUI = pathMod.dirname(fileURLToPath(import.meta.url));
const raiz = pathMod.join(AQUI, "..");
const nunito = pathToFileURL(pathMod.join(raiz, "src/assets/fonts/nunito-latin.woff2")).href;
const inter = pathToFileURL(pathMod.join(raiz, "src/assets/fonts/inter-latin.woff2")).href;

const FAMILIAS = [
  { arq: "og-enem.png", h1: "Ajuda para o ENEM, sem enrolação", p: "Contador de linhas, cronograma, folha de redação e guias da prova. Grátis e sem cadastro.", btn: "Ver as ferramentas", cor: "#fce6de", tinta: "#8a3420" },
  { arq: "og-guias.png", h1: "Guias das normas ABNT", p: "Explicações claras, com exemplos e com as fontes que usei.", btn: "Ler os guias", cor: "#b5c9b7", tinta: "#22362b" },
  { arq: "og-servico.png", h1: "Formatação ABNT de TCC", p: "Mande o arquivo pelo WhatsApp e receba o trabalho formatado, em Word e PDF.", btn: "Pedir orçamento", cor: "#c9d6e1", tinta: "#22362b" },
  { arq: "og-kit.png", h1: "Kit TCC: modelo em Word nas normas ABNT", p: "Sumário automático, checklist e guia rápido. Compra pela Hotmart.", btn: "Ver o kit", cor: "#fce6de", tinta: "#8a3420" },
];

const pagina = (f) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Nunito;font-weight:800;src:url("${nunito}")}
@font-face{font-family:Inter;font-weight:400 700;src:url("${inter}")}
body{margin:0;width:1200px;height:630px;background:#f1f5f0;font-family:Inter;color:#1e2924;position:relative;overflow:hidden}
.m1{position:absolute;width:760px;height:760px;left:-200px;top:-260px;border-radius:50%;background:radial-gradient(closest-side,#b5c9b7,rgba(181,201,183,0));opacity:.9}
.m2{position:absolute;width:700px;height:600px;right:-140px;top:-80px;border-radius:50%;background:radial-gradient(closest-side,#c9d6e1,rgba(201,214,225,0))}
.m3{position:absolute;width:560px;height:560px;left:420px;bottom:-320px;border-radius:50%;background:radial-gradient(closest-side,${f.cor},rgba(255,255,255,0))}
.logo{position:absolute;left:80px;top:60px;font:800 44px Nunito;color:#22362b}
.logo i{display:inline-block;width:14px;height:14px;border-radius:50%;background:#e8674a;margin-left:6px}
h1{position:absolute;left:80px;top:170px;width:700px;margin:0;font:800 66px/1.08 Nunito;letter-spacing:-1px}
p{position:absolute;left:80px;top:360px;width:640px;margin:0;font-size:30px;line-height:1.4;color:#4a5750}
.btn{position:absolute;left:80px;top:535px;background:#e8674a;border-radius:999px;padding:16px 34px;font:700 26px Inter;color:#1e2924}
.cartao{position:absolute;right:100px;top:90px;width:300px;height:430px;background:#fff;border-radius:10px;box-shadow:0 30px 60px rgba(34,54,43,.22);transform:rotate(3deg);padding:44px 34px;box-sizing:border-box}
.cartao b{display:block;height:14px;border-radius:7px;background:#e4ece3;margin-bottom:22px}
.cartao b:nth-child(1){width:60%;background:${f.tinta};opacity:.85}.cartao b:nth-child(3){width:85%}.cartao b:nth-child(5){width:70%}.cartao b:nth-child(7){width:90%}
.cartao em{position:absolute;right:30px;bottom:30px;width:64px;height:64px;border-radius:50%;background:#e8674a}
</style><div class="m1"></div><div class="m2"></div><div class="m3"></div>
<div class="logo">Estuda Simples<i></i></div>
<h1>${f.h1}</h1><p>${f.p}</p><div class="btn">${f.btn}</div>
<div class="cartao"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><em></em></div>`;

const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const f of FAMILIAS) {
  const p = await b.newPage();
  await p.setViewport({ width: 1200, height: 630 });
  const tmp = pathMod.join(os.tmpdir(), "og-familia.html"); // desde un arquivo local, para que Chrome deixe carregar as fontes
  fs.writeFileSync(tmp, pagina(f));
  await p.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({ path: pathMod.join(raiz, "src/assets", f.arq) });
  await p.close();
  console.log("ok src/assets/" + f.arq);
}
await b.close();
