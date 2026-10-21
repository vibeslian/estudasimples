// Verificación EN VIVO de la Etapa 17 (bloque "Recomendado para o seu trabalho"): espera al deploy y comprueba, sin hacer clic en ningún enlace
// de afiliado (un clic contaría en la cuenta de Amazon): el bloque en las guías elegidas, el enlace exacto de cada botón (con tag), la frase de Amazon,
// que no aparece en ninguna otra página, y las secciones nuevas de Termos y Política. Saca 2 capturas de /guias/como-fazer-tcc/ (celular y computador).
// Uso: node verificar-vivo-afiliados.mjs   (desde pruebas/)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL || "https://estudasimples.com.br";
const CFG = JSON.parse(fs.readFileSync("../site.config.json", "utf8")).afiliados;
const FRASE = "Como Associado da Amazon, ganho com compras qualificadas.";
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
const ok = (c, m, e = "") => { console.log(`${c ? "OK   " : "FALLA"} ${m}${!c && e ? " -> " + e : ""}`); if (!c) fallos++; };
const bajar = async (ruta) => { const r = await fetch(BASE + ruta + "?n=" + Date.now(), { headers: { "Cache-Control": "no-cache" } }); return { status: r.status, texto: await r.text() }; };

// 1) esperar el deploy
let tcc;
for (let i = 0; i < 40; i++) { tcc = await bajar("/guias/como-fazer-tcc/"); if (tcc.status === 200 && tcc.texto.includes('class="afiliados"')) break; await esp(15000); }
ok(tcc.status === 200 && tcc.texto.includes('class="afiliados"'), "deploy en vivo: /guias/como-fazer-tcc/ ya tiene el bloque");

// 2) las 14 guías elegidas
const guias = [...new Set(CFG.produtos.flatMap((p) => p.guias))].sort();
ok(guias.length === 14, "14 guías elegidas en la configuración", String(guias.length));
for (const g of guias) {
  const r = await bajar(`/guias/${g}/`);
  const b = (/<section class="afiliados"[\s\S]*?<\/section>/.exec(r.texto) || [""])[0];
  const esperado = CFG.produtos.filter((p) => p.guias.includes(g));
  const hrefs = [...b.matchAll(/class="btn afiliado-botao" href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  const titulos = [...b.matchAll(/class="afiliado-titulo">([^<]+)</g)].map((m) => m[1]);
  ok(r.status === 200 && JSON.stringify(hrefs) === JSON.stringify(esperado.map((p) => p.url)), `${g}: ${esperado.length} botón(es) con el enlace exacto (…?tag=estudasimples-20)`, hrefs.join(" | "));
  ok(hrefs.every((h) => new URL(h).searchParams.get("tag") === "estudasimples-20" && new URL(h).hostname === "www.amazon.com.br"), `${g}: todos con tag=estudasimples-20 en amazon.com.br`);
  ok(titulos.length === esperado.length && titulos.every((t, i) => t.replace(/&amp;/g, "&") === esperado[i].titulo), `${g}: los títulos coinciden con la lista`, titulos.join(" | "));
  ok(b.includes(FRASE) && (b.match(/Link de afiliado<\/span>/g) || []).length === esperado.length && (b.match(/rel="sponsored nofollow noopener noreferrer"/g) || []).length === esperado.length, `${g}: frase de Amazon, etiqueta "Link de afiliado" y rel=sponsored nofollow`);
  ok(r.texto.indexOf('class="afiliados"') < r.texto.indexOf('class="guia-relacionadas"'), `${g}: el bloque va antes de "Guias relacionadas"`);
}

// 3) en ninguna otra página
const sitemap = (await bajar("/sitemap.xml")).texto;
const urls = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
ok(urls.length === 40, `sitemap en vivo: ${urls.length} URLs (esperado 40)`);
const elegidas = new Set(guias.map((g) => `/guias/${g}/`));
const sobran = [];
for (const u of urls) { if (elegidas.has(u)) continue; const r = await bajar(u); if (r.status !== 200 || /class="afiliados"|Link de afiliado/.test(r.texto) && !/termos-de-uso|politica-de-privacidade/.test(u)) sobran.push(`${u} (${r.status})`); }
ok(sobran.length === 0, `ninguna de las otras ${urls.length - elegidas.size} páginas muestra el bloque (y todas responden 200)`, sobran.join(", "));

// 4) Termos y Política
for (const [ruta, nombre] of [["/termos-de-uso/", "Termos de Uso"], ["/politica-de-privacidade/", "Política de Privacidade"]]) {
  const r = await bajar(ruta);
  ok(/<h2 id="links-de-afiliado">12\. Links de afiliado<\/h2>/.test(r.texto), `${nombre}: sección "12. Links de afiliado"`);
  ok(r.texto.includes(FRASE), `${nombre}: tiene la frase de Amazon`);
  ok(r.texto.includes("Última atualização: 20 de outubro de 2026."), `${nombre}: fecha de actualización 20 de outubro de 2026`);
}

// 5) capturas en vivo: /guias/como-fazer-tcc/
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-vivo-")) });
fs.mkdirSync("../capturas/afiliados", { recursive: true });
for (const [nombre, vp] of [["computador", { width: 1280, height: 900, deviceScaleFactor: 1 }], ["celular", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(BASE + "/guias/como-fazer-tcc/?n=" + Date.now(), { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important} html{scroll-behavior:auto!important}" });
  await esp(300);
  const a = await (await p.$(".afiliados")).boundingBox(), r = await (await p.$(".guia-relacionadas")).boundingBox();
  const sy = await p.evaluate(() => window.scrollY);
  await p.screenshot({ path: `../capturas/afiliados/vivo-como-fazer-tcc-${nombre}.png`, clip: { x: 0, y: sy + a.y - 40, width: vp.width, height: r.y - a.y + 40 + Math.min(r.height, 200) }, captureBeyondViewport: true });
  await p.close();
}
await b.close();
console.log(fallos ? "\nFALLÓ" : "\nTodo OK en vivo");
process.exit(fallos ? 1 : 0);
