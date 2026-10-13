// Genera los ejemplos finales (PDF y Word) con el propio sitio y los guarda en ejemplos/. No abre ningún archivo.
// Para revisarlos sin abrir programas: convierte cada Word a PDF con Word oculto y luego a PNG en ejemplos/_pruebas/png/ (se borra al final).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { lanza, abre, preenche, baixaArquivo, wordParaPdf, URL_PAGINA, fs } from "./lib-archivos.mjs";
import { pdfAPng } from "./pdf-a-png.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
const EJ = path.resolve(AQUI, "../ejemplos").split("\\").join("/");
const TMP = EJ + "/_pruebas";
const PNG = TMP + "/png";
fs.mkdirSync(PNG, { recursive: true });

// logo de ejemplo (un escudo sencillo, ficticio)
const c = createCanvas(500, 500); const g = c.getContext("2d");
g.fillStyle = "#1f4e8c"; g.beginPath(); g.moveTo(60, 40); g.lineTo(440, 40); g.lineTo(440, 260); g.quadraticCurveTo(440, 430, 250, 470); g.quadraticCurveTo(60, 430, 60, 260); g.closePath(); g.fill();
g.fillStyle = "#fff"; g.font = "bold 150px sans-serif"; g.textAlign = "center"; g.fillText("UE", 250, 300);
g.strokeStyle = "#f2c94c"; g.lineWidth = 12; g.stroke();
fs.writeFileSync(TMP + "/logo-ejemplo.png", c.toBuffer("image/png"));

const BASE = { institution: "Universidade Federal de Viçosa", course: "Administração", authors: ["Maria Silva", "João Pereira"], title: "A influência das redes sociais no aprendizado", subtitle: "um estudo com alunos do ensino médio", city: "Viçosa - MG", year: "2026", font: "Arial" };
const EJEMPLOS = [
  { id: "01-folha-de-rosto-TCC", rota: "folha", dados: { ...BASE, workType: "tcc", degree: "Bacharel em Administração", advisor: "Prof. Dr. Carlos Almeida", coadvisors: ["Profa. Dra. Ana Souza"] } },
  { id: "02-capa-e-folha-de-rosto-juntas-com-logo", rota: "capa", dados: { ...BASE, font: "Times New Roman", titleSize: "14", workType: "tcc", degree: "Licenciado em Pedagogia", course: "Pedagogia", advisor: "Profa. Dra. Maria Souza", advisorLabel: "1", juntas: true, logoArquivo: TMP + "/logo-ejemplo.png", logoTamanho: "medio" } },
  { id: "03-folha-de-rosto-dissertacao", rota: "folha", dados: { institution: "Universidade Federal de Minas Gerais", course: "Educação", authors: ["Ana Beatriz de Oliveira-Santos"], title: "Desafios e perspectivas da educação básica no Brasil contemporâneo", subtitle: "uma análise crítica das políticas públicas dos últimos vinte anos", city: "Belo Horizonte", year: "2026", font: "Times New Roman", workType: "dissertacao", degree: "Mestre em Educação", area: "Políticas Públicas e Gestão", advisorLabel: "1", advisor: "Profa. Dra. Helena Costa" } },
  { id: "04-trabalho-escolar-capa-e-folha", rota: "capa", dados: { institution: "Escola Estadual Santos Dumont", course: "Ensino Médio", authors: ["Lucas Andrade", "Beatriz Costa", "Pedro Henrique Lima"], title: "Energia solar na escola", subtitle: "", city: "Juiz de Fora", year: "2026", font: "Arial", escolar: true, discipline: "Física", teacher: "Ana Lima", teacherLabel: "1", juntas: true } },
  { id: "05-capa-sola", rota: "capa", dados: { ...BASE, volume: "2" } },
];

for (const f of fs.readdirSync(EJ)) if (f !== "_pruebas") fs.rmSync(`${EJ}/${f}`, { recursive: true, force: true });
const browser = await lanza();
for (const e of EJEMPLOS) {
  const page = await abre(browser, URL_PAGINA[e.rota]);
  await preenche(page, e.dados);
  const pdf = await baixaArquivo(page, "#btnPdf", 0);
  const docx = await baixaArquivo(page, "#btnDocx", 1);
  fs.writeFileSync(`${EJ}/${e.id}.pdf`, pdf.buf);
  fs.writeFileSync(`${EJ}/${e.id}.docx`, docx.buf);
  await page.close();
  // revisión sin abrir programas: Word oculto -> PDF -> PNG
  const pdfWord = `${PNG}/${e.id}.word.pdf`;
  const paginas = wordParaPdf(`${EJ}/${e.id}.docx`, pdfWord);
  await pdfAPng(`${EJ}/${e.id}.pdf`, PNG, 1.0);
  await pdfAPng(pdfWord, PNG, 1.0);
  console.log(`${e.id}: PDF ${(pdf.buf.length / 1024).toFixed(1)} KB, Word ${(docx.buf.length / 1024).toFixed(1)} KB, ${paginas} página(s) en Word`);
}
await browser.close();
