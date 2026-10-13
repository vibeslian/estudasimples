// Capturas del gerador de sumário y de la portada (computador y celular), con datos de ejemplo. Salida: capturas/sumario-*.png
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { lanza, abre, preenche, URL_PAGINA, BASE, fs } from "./lib-archivos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
const OUT = path.resolve(AQUI, "../capturas").split("\\").join("/");
const TMP = path.resolve(AQUI, "../ejemplos/_pruebas").split("\\").join("/");
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const c = createCanvas(400, 400); const g = c.getContext("2d");
g.fillStyle = "#1f4e8c"; g.beginPath(); g.moveTo(60, 40); g.lineTo(340, 40); g.lineTo(340, 220); g.quadraticCurveTo(340, 350, 200, 380); g.quadraticCurveTo(60, 350, 60, 220); g.closePath(); g.fill();
fs.writeFileSync(TMP + "/logo-captura.png", c.toBuffer("image/png"));
const LOGO = TMP + "/logo-captura.png";

const LISTA = ["1 Introdução ..... 9", "2 Referencial teórico ..... 12", "  Conceitos fundamentais ..... 12", "    Redes sociais e aprendizagem ..... 14", "    Letramento digital ..... 16", "  Estudos anteriores ..... 19", "3 Metodologia ..... 24", "  Participantes e local da pesquisa ..... 24", "  Instrumentos de coleta de dados ..... 26", "4 Resultados e discussão ..... 31", "5 Considerações finais ..... 42", "REFERÊNCIAS ..... 45", "APÊNDICE A – Roteiro da entrevista ..... 49", "ANEXO A – Parecer do comitê de ética ..... 52"].join("\n");
const LONGA = Array.from({ length: 40 }, (_, i) => (i % 5 === 0 ? `${i / 5 + 1} Capítulo de exemplo` : i % 5 === 1 ? "  Seção secundária com um título um pouco mais longo" : i % 5 === 2 ? "    Subseção terciária" : i % 5 === 3 ? "      Quarto nível" : "        Quinto nível") + ` ..... ${10 + i * 2}`).join("\n");
const DADOS = { institution: "Universidade Federal de Viçosa", course: "Administração", authors: ["Maria Silva", "João Pereira"], title: "A influência das redes sociais no aprendizado", subtitle: "um estudo com alunos do ensino médio", city: "Viçosa - MG", year: "2026", workType: "tcc", degree: "Bacharel em Administração", advisor: "Prof. Dr. Carlos Almeida", font: "Arial" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const desktop = { width: 1280, height: 900, deviceScaleFactor: 1 };
const movil = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const scrollA = (page, sel, extra = -20) => page.evaluate((s, e) => { const el = document.querySelector(s); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + e, behavior: "instant" }); }, sel, extra);

const browser = await lanza();
async function ficha(rota, vp, extra) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(BASE + rota, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await preenche(page, { ...DADOS, ...extra });
  await espera(500);
  return page;
}

let p = await ficha(URL_PAGINA.sumario, desktop, { colar: LISTA });
await scrollA(p, "main.tool", -10);
await p.screenshot({ path: `${OUT}/sumario-1-escritorio-herramienta.png` });
await p.evaluate(() => { document.getElementById("estilo").open = true; document.getElementById("boxColar").open = true; });
await scrollA(p, "#boxColar", -20);
await p.screenshot({ path: `${OUT}/sumario-2-escritorio-pegar-y-estilo.png` });
await p.close();

p = await ficha(URL_PAGINA.sumario, desktop, { colar: LONGA, font: "Times New Roman", niveis: { 3: [false, false, true], 4: [false, false, true], 5: [false, false, true] } });
await scrollA(p, "#painelPrevia", -10);
await p.screenshot({ path: `${OUT}/sumario-3-escritorio-dos-paginas-times-cursiva.png` });
await p.close();

p = await ficha(URL_PAGINA.sumario, desktop, { colar: LISTA, incCapa: true, incFolha: true, logoArquivo: LOGO, logoTamanho: "medio" });
await scrollA(p, "main.tool", -10);
await p.screenshot({ path: `${OUT}/sumario-4-escritorio-capa-folha-y-sumario.png` });
await p.close();

p = await ficha(URL_PAGINA.sumario, movil, { colar: LISTA });
await scrollA(p, "#listaSumario", -90);
await p.screenshot({ path: `${OUT}/sumario-5-celular-lista.png` });
await p.$eval("#abaPrevia", (e) => e.click()); await espera(400);
await p.screenshot({ path: `${OUT}/sumario-6-celular-previa.png` });
await p.$eval("#btnAmpliar", (e) => e.click()); await espera(500);
await p.screenshot({ path: `${OUT}/sumario-7-celular-ampliada.png` });
await p.close();

p = await browser.newPage(); await p.setViewport(desktop);
await p.goto(BASE + "/", { waitUntil: "networkidle0" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
await scrollA(p, "#ferramentas", -20); await espera(400);
await p.screenshot({ path: `${OUT}/sumario-8-inicio-escritorio.png` });
await p.close();
p = await browser.newPage(); await p.setViewport(movil);
await p.goto(BASE + "/", { waitUntil: "networkidle0" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
await scrollA(p, ".grade-3 a:nth-child(3)", -10); await espera(400);
await p.screenshot({ path: `${OUT}/sumario-9-inicio-celular.png` });
await p.close();
await browser.close();
console.log(fs.readdirSync(OUT).filter((f) => f.startsWith("sumario-")).join("\n"));
