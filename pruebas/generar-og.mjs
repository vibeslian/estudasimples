// Genera src/assets/og.png (1200x630), la imagen que aparece al compartir el sitio en redes y WhatsApp.
import puppeteer from "puppeteer-core";
import { fileURLToPath, pathToFileURL } from "node:url";
import pathMod from "node:path";
const AQUI = pathMod.dirname(fileURLToPath(import.meta.url));
const raiz = pathMod.join(AQUI, "..");
const nunito = pathToFileURL(pathMod.join(raiz, "src/assets/fonts/nunito-latin.woff2")).href;
const inter = pathToFileURL(pathMod.join(raiz, "src/assets/fonts/inter-latin.woff2")).href;
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Nunito;font-weight:800;src:url("${nunito}")}
@font-face{font-family:Inter;font-weight:400 700;src:url("${inter}")}
body{margin:0;width:1200px;height:630px;background:#f1f5f0;font-family:Inter;color:#1e2924;position:relative;overflow:hidden}
.m1{position:absolute;width:760px;height:760px;left:-200px;top:-260px;border-radius:50%;background:radial-gradient(closest-side,#b5c9b7,rgba(181,201,183,0));opacity:.9}
.m2{position:absolute;width:700px;height:600px;right:-140px;top:-80px;border-radius:50%;background:radial-gradient(closest-side,#c9d6e1,rgba(201,214,225,0))}
.m3{position:absolute;width:520px;height:520px;left:360px;bottom:-300px;border-radius:50%;background:radial-gradient(closest-side,#fce6de,rgba(252,230,222,0))}
.logo{position:absolute;left:80px;top:60px;font:800 44px Nunito;color:#22362b}
.logo i{display:inline-block;width:14px;height:14px;border-radius:50%;background:#e8674a;margin-left:6px}
h1{position:absolute;left:80px;top:190px;width:640px;margin:0;font:800 74px/1.06 Nunito;letter-spacing:-1px}
p{position:absolute;left:80px;top:430px;width:600px;margin:0;font-size:30px;line-height:1.4;color:#4a5750}
.btn{position:absolute;left:80px;top:530px;background:#e8674a;border-radius:999px;padding:16px 34px;font:700 26px Inter;color:#1e2924}
.capa{position:absolute;right:90px;top:70px;width:340px;height:480px;background:#fff;border-radius:6px;box-shadow:0 30px 60px rgba(34,54,43,.22);transform:rotate(-3deg);padding:15% 9% 9% 14%;box-sizing:border-box;display:flex;flex-direction:column;text-align:center;font:10.5px/1.7 Arial;color:#000}
.capa b{display:block}.capa .a{margin-top:3em}.capa .t{margin:auto 0;font-size:11.5px}.capa .t b{display:inline}.capa .z b+b{margin-top:1.6em}
</style><div class="m1"></div><div class="m2"></div><div class="m3"></div>
<div class="logo">Estuda Simples<i></i></div>
<h1>Capa ABNT em poucos minutos</h1><p>Preencha, confira a prévia e baixe em PDF ou Word. Grátis e sem cadastro.</p><div class="btn">Criar minha capa</div>
<div class="capa"><div><b>UNIVERSIDADE EXEMPLO</b><b>CURSO DE ADMINISTRAÇÃO</b></div><div class="a"><b>MARIA SILVA</b></div><div class="t"><b>A INFLUÊNCIA DAS REDES SOCIAIS NO APRENDIZADO:</b> um estudo com alunos do ensino médio</div><div class="z"><b>BELO HORIZONTE</b><b>2026</b></div></div>`;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 630 });
await p.setContent(html, { waitUntil: "load" }); await new Promise((r) => setTimeout(r, 600));
await p.screenshot({ path: pathMod.join(raiz, "src/assets/og.png") }); await b.close(); console.log("ok src/assets/og.png");
