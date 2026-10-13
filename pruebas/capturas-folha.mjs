// Capturas de las herramientas (capa y folha de rosto) en computador y celular, con datos de ejemplo. Salida: capturas/folha-*.png
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lanza, abre, preenche, URL_PAGINA, BASE, fs } from "./lib-archivos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
const OUT = path.resolve(AQUI, "../capturas").split("\\").join("/");
const LOGO = path.resolve(AQUI, "../ejemplos/_pruebas/folha/logo-transparente.png");
fs.mkdirSync(OUT, { recursive: true });
const DADOS = { institution: "Universidade Federal de Viçosa", course: "Administração", authors: ["Maria Silva", "João Pereira"], title: "A influência das redes sociais no aprendizado", subtitle: "um estudo com alunos do ensino médio", city: "Viçosa - MG", year: "2026",
  workType: "tcc", degree: "Bacharel em Administração", advisor: "Prof. Dr. Carlos Almeida", coadvisors: ["Profa. Dra. Ana Souza"] };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await lanza();

async function ficha(rota, vp, nombre, extra = {}, antes) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(BASE + rota, { waitUntil: "networkidle0" });
  await preenche(page, { ...DADOS, ...extra });
  if (antes) await antes(page);
  await espera(500);
  return page;
}
const desktop = { width: 1280, height: 900, deviceScaleFactor: 1 };
const movil = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const scrollA = (page, sel, extra = -20) => page.evaluate((s, e) => { const el = document.querySelector(s); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + e, behavior: "instant" }); }, sel, extra);

// 1) Folha de rosto, computador: formulario + prévia
let p = await ficha(URL_PAGINA.folha, desktop, "f");
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await scrollA(p, "main.tool", -10);
await p.screenshot({ path: `${OUT}/folha-1-escritorio-herramienta.png` });
// Folha: la parte del formulario con natureza y orientación
await scrollA(p, ".titulo-form", -20);
await p.screenshot({ path: `${OUT}/folha-2-escritorio-natureza.png` });
await p.close();

// 2) Capa + folha juntas con logo, computador (dos páginas en la prévia)
p = await ficha(URL_PAGINA.capa, desktop, "c", { juntas: true, logoArquivo: LOGO, logoTamanho: "medio" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await scrollA(p, "main.tool", -10);
await p.screenshot({ path: `${OUT}/folha-3-escritorio-capa-y-folha-juntas.png` });
// Opciones nuevas abiertas (logo, modelo escolar, datos de la folha)
await p.evaluate(() => { for (const id of ["boxLogo", "boxEscolar"]) document.getElementById(id).open = true; });
await scrollA(p, "#boxLogo", -20);
await p.screenshot({ path: `${OUT}/folha-4-escritorio-logo-y-escolar.png` });
await p.close();

// 3) Celular: folha de rosto (formulario y prévia) y capa+folha ampliada
p = await ficha(URL_PAGINA.folha, movil, "m");
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await scrollA(p, "main.tool", -70);
await p.screenshot({ path: `${OUT}/folha-5-celular-formulario.png` });
await p.$eval("#abaPrevia", (e) => e.click()); await espera(400);
await p.screenshot({ path: `${OUT}/folha-6-celular-previa.png` });
await p.close();
p = await ficha(URL_PAGINA.capa, movil, "m2", { juntas: true });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.$eval("#abaPrevia", (e) => e.click()); await espera(300);
await p.$eval("#btnAmpliar", (e) => e.click()); await espera(500);
await p.screenshot({ path: `${OUT}/folha-7-celular-ampliada-2-paginas.png` });
await p.close();

// 4) Inicio y modelo escolar
p = await browser.newPage(); await p.setViewport(desktop);
await p.goto(BASE + "/", { waitUntil: "networkidle0" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
await scrollA(p, "#ferramentas", -20);
await espera(400);
await p.screenshot({ path: `${OUT}/folha-8-inicio-escritorio.png` });
await p.close();
p = await browser.newPage(); await p.setViewport(movil);
await p.goto(BASE + "/", { waitUntil: "networkidle0" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
await scrollA(p, "#ferramentas", -10);
await espera(400);
await p.screenshot({ path: `${OUT}/folha-9-inicio-celular.png` });
await p.close();

p = await ficha(URL_PAGINA.folha, desktop, "e", { institution: "Escola Estadual Santos Dumont", course: "", authors: ["Lucas Andrade", "Beatriz Costa"], title: "Energia solar na escola", subtitle: "", city: "Juiz de Fora", escolar: true, discipline: "Física", teacher: "Ana Lima", teacherLabel: "1", juntas: true });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await scrollA(p, "main.tool", -10);
await p.screenshot({ path: `${OUT}/folha-10-escritorio-modelo-escolar.png` });
await p.close();
await browser.close();
console.log(fs.readdirSync(OUT).filter((f) => f.startsWith("folha-")).join("\n"));
