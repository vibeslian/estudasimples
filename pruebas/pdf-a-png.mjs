// Convierte un PDF en imágenes PNG (una por página) sin abrir ningún programa: pdf.js + @napi-rs/canvas.
// Uso: node pdf-a-png.mjs <archivo.pdf> <carpeta-salida> [escala=1.4]   -> <carpeta>/<nombre>-p1.png, -p2.png...
// Para revisar un .docx: conviértelo a PDF con Word oculto (ver lib-archivos.mjs, wordParaPdf) y pasa ese PDF.
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath } from "node:url";

// fuentes estándar (Helvetica, Times) incluidas en pdf.js: sin ellas Node dibuja letras con anchos equivocados
const FONTES = path.join(path.dirname(fileURLToPath(import.meta.url)), "node_modules", "pdfjs-dist", "standard_fonts") .split(path.sep).join("/") + "/";

export async function pdfAPng(arquivo, pasta, escala = 1.4) {
  fs.mkdirSync(pasta, { recursive: true });
  const nome = path.basename(arquivo).replace(/\.pdf$/i, "");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(arquivo)), verbosity: 0, standardFontDataUrl: FONTES }).promise;
  const saidas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const vp = pagina.getViewport({ scale: escala });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, viewport: vp }).promise;
    const saida = path.join(pasta, `${nome}-p${i}.png`);
    fs.writeFileSync(saida, canvas.toBuffer("image/png"));
    saidas.push(saida);
  }
  return saidas;
}

if (process.argv[1] && process.argv[1].endsWith("pdf-a-png.mjs")) {
  const [arquivo, pasta, escala] = process.argv.slice(2);
  if (!arquivo || !pasta) { console.log("Uso: node pdf-a-png.mjs <archivo.pdf> <carpeta-salida> [escala]"); process.exit(1); }
  console.log((await pdfAPng(arquivo, pasta, escala ? Number(escala) : 1.4)).join("\n"));
}
