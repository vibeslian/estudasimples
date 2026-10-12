import { fileURLToPath } from "node:url";
import pathMod from "node:path";
const PRUEBAS = pathMod.dirname(fileURLToPath(import.meta.url)).split(String.fromCharCode(92)).join("/");
import puppeteer from "puppeteer-core";
const OUT = PRUEBAS + "/../capturas";
const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });

const DEV = {
  celular: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  computador: { width: 1280, height: 800, deviceScaleFactor: 1 },
};

async function abre(dev, url, { reduzido = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport(DEV[dev]);
  if (reduzido) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE + url, { waitUntil: "networkidle0" });
  return page;
}
async function rolaTudo(page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 900));
  });
}
async function foto(page, nome) { await page.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true }); console.log("ok", nome); }

for (const dev of ["celular", "computador"]) {
  for (const [nome, url] of [["inicio", "/"], ["guia", "/_guia-de-estilo/"], ["sobre", "/sobre/"]]) {
    const p = await abre(dev, url); await rolaTudo(p); await foto(p, `${dev}-${nome}`); await p.close();
  }
  // generador con datos de ejemplo
  const p = await abre(dev, "/gerador-de-capa-abnt/");
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); };
    set("institution", "Universidade Federal de Viçosa"); set("course", "Curso de Administração");
    document.querySelector("#autores input").value = "Maria Silva";
    set("title", "A influência das redes sociais no aprendizado"); set("subtitle", "um estudo com alunos do ensino médio"); set("city", "Viçosa - MG");
  });
  await rolaTudo(p);
  await foto(p, `${dev}-capa`);
  if (dev === "celular") { await p.click("#abaPrevia"); await new Promise((r) => setTimeout(r, 400)); await foto(p, "celular-capa-previa"); }
  await p.close();
}

// Prueba de movimiento reducido
for (const reduzido of [false, true]) {
  const p = await abre("celular", "/", { reduzido });
  const r = await p.evaluate(() => {
    const m = getComputedStyle(document.querySelector(".mancha-1"));
    const abaixo = [...document.querySelectorAll(".revelar")].pop();
    const b = getComputedStyle(document.querySelector(".btn-acento"));
    return { animMancha: m.animationName, opacidadeSecaoAbaixoDaDobra: getComputedStyle(abaixo).opacity, transicaoBotao: b.transitionDuration };
  });
  console.log("prefers-reduced-motion:", reduzido ? "reduce" : "no-preference", JSON.stringify(r));
  await p.close();
}

// Nada se mueve en la herramienta: ningún elemento con animación/transición dentro del formulario o la vista previa
const p = await abre("computador", "/gerador-de-capa-abnt/");
const mov = await p.evaluate(() => {
  const alvos = [...document.querySelectorAll("#painelForm *, #painelPrevia *")];
  return alvos.filter((e) => { const s = getComputedStyle(e); return s.animationName !== "none" || (parseFloat(s.transitionDuration) > 0 && s.transitionProperty !== "all") || e.classList.contains("revelar"); })
    .map((e) => e.tagName + "." + e.className).slice(0, 10);
});
console.log("Elementos con movimiento dentro de formulario/prévia:", JSON.stringify(mov));
const mancha = await p.evaluate(() => { const h = document.querySelector(".hero").getBoundingClientRect(); const t = document.querySelector(".tool").getBoundingClientRect(); return { heroFim: Math.round(h.bottom), herramientaInicio: Math.round(t.top) }; });
console.log("Hero (manchas) termina en", mancha.heroFim, "px; la herramienta empieza en", mancha.herramientaInicio, "px");
await browser.close();
