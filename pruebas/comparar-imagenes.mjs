import { fileURLToPath } from "node:url";
import pathMod from "node:path";
const PRUEBAS = pathMod.dirname(fileURLToPath(import.meta.url)).split(String.fromCharCode(92)).join("/");
// Genera imágenes: vista previa (captura de la página) | PDF descargado | Word descargado (abierto en Word real)
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import path from "node:path";

const ROOT = PRUEBAS + "/resultados";
const CAP = PRUEBAS + "/../capturas";
import { pathToFileURL } from "node:url";

const CASOS = [
  { id: "1-arial-padrao", titulo: "Estilo padrão · Arial", dados: { institution: "Universidade Federal de Viçosa", course: "Curso de Administração", authors: ["Maria Silva", "João Pereira"], title: "A influência das redes sociais no aprendizado", subtitle: "um estudo com alunos do ensino médio", volume: "2", city: "Viçosa - MG", font: "Arial" } },
  { id: "2-times-personalizado", titulo: "Estilo personalizado · Times New Roman 16", dados: { institution: "", course: "", authors: ["Ana Beatriz de Oliveira-Santos"], title: "Desafios e perspectivas da educação básica no Brasil contemporâneo", subtitle: "uma análise crítica dos últimos vinte anos de políticas públicas", volume: "", city: "São Paulo", font: "Times New Roman", titleSize: "16",
      estilo: { institution: [false, false], title: [false, true], subtitle: [true, true], author: [false, false], city: [false, false], year: [false, false] } } },
  { id: "4-times-completo-14", titulo: "Capa completa · Times New Roman 14", dados: { institution: "Universidade de São Paulo – Faculdade de Filosofia, Letras e Ciências Humanas", course: "Departamento de Letras Clássicas e Vernáculas", authors: ["Fernanda Albuquerque Cavalcanti de Souza", "Rafael Mendes", "Luiza Prado"],
      title: "A representação da memória e do esquecimento na literatura brasileira do século XX e XXI", subtitle: "estudo comparado de narrativas contemporâneas", volume: "1", city: "São Paulo - SP", font: "Times New Roman", titleSize: "14", estilo: { author: [true, false], course: [true, false] } } },
];

// Abre el PDF en el visor de Chrome (el mismo que usaría un estudiante) y recorta la hoja.
async function pdfParaPng(arquivo) {
  const p = await browser.newPage();
  await p.setViewport({ width: 900, height: 1200 });
  await p.goto(pathToFileURL(arquivo).href + "#toolbar=0&navpanes=0&scrollbar=0&view=Fit", { waitUntil: "load" }).catch(() => {});
  await p.bringToFront();
  await new Promise((r) => setTimeout(r, 5000));
  const completa = Buffer.from(await p.screenshot());
  await p.close();
  const img = await loadImage(completa); // recorta solo la hoja (el visor la deja con margen oscuro)
  const canvas = createCanvas(840, 1188);
  canvas.getContext("2d").drawImage(img, 30, 4, 840, 1188, 0, 0, 840, 1188);
  return canvas.toBuffer("image/png");
}

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
for (const c of CASOS) {
  // 1) vista previa real
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1300 });
  await page.goto("http://localhost:3000/gerador-de-capa-abnt/", { waitUntil: "networkidle0" });
  await page.evaluate((d) => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); };
    set("institution", d.institution); set("course", d.course); set("title", d.title); set("subtitle", d.subtitle); set("volume", d.volume); set("city", d.city); set("font", d.font); if (d.titleSize) set("titleSize", d.titleSize);
    while (document.querySelectorAll("#autores input").length < d.authors.length) document.getElementById("addAutor").click();
    document.querySelectorAll("#autores input").forEach((el, i) => { el.value = d.authors[i]; }); set("title", d.title);
  }, c.dados);
  const rot = { institution: "Instituição", course: "Curso / departamento", author: "Autor(es)", title: "Título", subtitle: "Subtítulo", city: "Cidade", year: "Ano" };
  for (const [k, [caps, bold]] of Object.entries(c.dados.estilo || {})) for (const [prop, v] of [["maiúsculas", caps], ["negrito", bold]]) { const sel = `input[aria-label="${rot[k]}: ${prop}"]`; if ((await page.$eval(sel, (e) => e.checked)) !== v) await page.$eval(sel, (e) => e.click()); }
  await page.addStyleTag({ content: "#sheet{transform:none !important;position:fixed !important;left:0 !important;top:0 !important;z-index:9999 !important}" });
  await new Promise((r) => setTimeout(r, 600));
  const prevPng = Buffer.from(await page.screenshot({ clip: { x: 0, y: 0, width: 794, height: 1123 } }));
  await page.close();

  // 2) PDF y Word (PDF exportado por Word real)
  const pdfPng = await pdfParaPng(`${ROOT}/${c.id}.pdf`);
  const wordPng = await pdfParaPng(`${ROOT}/${c.id}.word.pdf`);
  fs.writeFileSync(`${CAP}/_${c.id}-previa.png`, prevPng); fs.writeFileSync(`${CAP}/_${c.id}-pdf.png`, pdfPng); fs.writeFileSync(`${CAP}/_${c.id}-word.png`, wordPng);

  // 3) montaje
  const b64 = (b) => "data:image/png;base64," + b.toString("base64");
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#e4ece3;font-family:Segoe UI,Arial,sans-serif;color:#1e2924}
    h1{font-size:22px;margin:0 0 16px}.fila{display:flex;gap:20px}.col{flex:1}.col h2{font-size:15px;margin:0 0 8px}.col img{width:100%;display:block;box-shadow:0 2px 10px rgba(0,0,0,.25);background:#fff}</style>
    <h1>${c.titulo}</h1><div class="fila">
    <div class="col"><h2>1. Vista previa (en la página)</h2><img src="${b64(prevPng)}"></div>
    <div class="col"><h2>2. PDF descargado</h2><img src="${b64(pdfPng)}"></div>
    <div class="col"><h2>3. Word (.docx) abierto en Microsoft Word</h2><img src="${b64(wordPng)}"></div></div>`;
  const p2 = await browser.newPage();
  await p2.setViewport({ width: 1700, height: 900 });
  await p2.setContent(html, { waitUntil: "load" });
  await p2.screenshot({ path: `${CAP}/comparacion-${c.id}.png`, fullPage: true });
  await p2.close();
  console.log("ok", c.id);
}
await browser.close();
