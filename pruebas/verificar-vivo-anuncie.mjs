// Verificación EN VIVO de la Etapa 15 (página /anuncie/ escondida + arreglo del ejemplo de sumário en celular).
// Espera a que el deploy esté en vivo y comprueba: /anuncie/ responde 200 con noindex, no está en el sitemap, ninguna página del sitio
// la enlaza, y el modelo de sumário se ve con estilo a 390 px. Uso: node verificar-vivo-anuncie.mjs
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL || "https://estudasimples.com.br";
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
const ok = (c, m, e = "") => { console.log(`${c ? "OK   " : "FALLA"} ${m}${!c && e ? " -> " + e : ""}`); if (!c) fallos++; };
const bajar = async (ruta) => { const r = await fetch(BASE + ruta + (ruta.includes("?") ? "&" : "?") + "n=" + Date.now(), { headers: { "Cache-Control": "no-cache" } }); return { status: r.status, texto: await r.text() }; };

// 1) esperar el deploy: la página /anuncie/ existe en vivo
let anuncie;
for (let i = 0; i < 40; i++) { anuncie = await bajar("/anuncie/"); if (anuncie.status === 200 && anuncie.texto.includes("YouTube e no Instagram")) break; await esp(15000); }
ok(anuncie.status === 200 && anuncie.texto.includes("YouTube e no Instagram"), "deploy en vivo: /anuncie/ responde 200 con el texto nuevo", String(anuncie.status));
ok(/<meta name="robots" content="noindex">/.test(anuncie.texto), "/anuncie/ en vivo tiene noindex");
ok(/Números ainda não preenchidos/.test(anuncie.texto), "/anuncie/ en vivo no muestra cifras inventadas");

// 2) fuera del sitemap y sin enlaces desde ninguna página del sitemap
const sitemap = await bajar("/sitemap.xml");
const urls = [...sitemap.texto.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(sitemap.status === 200 && urls.length === 40, `sitemap en vivo: ${urls.length} URLs (esperado 40)`);
ok(!urls.some((u) => u.includes("/anuncie")), "sitemap en vivo: /anuncie/ no está");
const conEnlace = [];
for (const u of urls) { const r = await bajar(new URL(u).pathname); if (r.status !== 200) conEnlace.push(`${u} (${r.status})`); else if (/href="[^"]*\/anuncie/.test(r.texto)) conEnlace.push(u); }
ok(conEnlace.length === 0, `ninguna de las ${urls.length} páginas del sitemap enlaza a /anuncie/ (y todas responden 200)`, conEnlace.join(", "));
const r404 = await fetch(BASE + "/404-que-no-existe-" + Date.now());
ok(r404.status === 404, "una dirección inexistente sigue dando 404");

// 3) ejemplo de sumário con estilo en celular (y en computador)
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const [nombre, vp] of [["celular 390", { width: 390, height: 900, isMobile: true, hasTouch: true }], ["computador 1280", { width: 1280, height: 900 }]]) {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(BASE + "/gerador-de-sumario-abnt/?n=" + Date.now(), { waitUntil: "networkidle0" });
  const s = await p.evaluate(() => { const e = document.querySelector(".ms-pagina"); const st = getComputedStyle(e); const li = getComputedStyle(e.querySelector("li")); return { fundo: st.backgroundColor, pad: st.paddingTop, grade: li.display, desborde: document.documentElement.scrollWidth - innerWidth }; });
  ok(s.fundo === "rgb(255, 255, 255)" && s.grade === "grid" && s.desborde <= 0, `ejemplo de sumário con estilo en ${nombre} (fondo blanco, filas en grade, sin desborde)`, JSON.stringify(s));
  await p.close();
}
const p = await b.newPage();
await p.setViewport({ width: 390, height: 900, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto(BASE + "/gerador-de-sumario-abnt/?n=" + Date.now(), { waitUntil: "networkidle0" });
await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important}" });
const el = await p.$(".modelo-sumario");
await el.screenshot({ path: "../capturas/css-sumario/vivo-celular.png" });
await b.close();
console.log(fallos ? "\nFALLÓ" : "\nTodo OK en vivo");
process.exit(fallos ? 1 : 0);
