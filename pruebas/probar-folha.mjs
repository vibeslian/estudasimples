// Prueba de la Etapa 6: folha de rosto, capa + folha juntas, logo y modelo escolar.
// Genera PDF y Word desde la página real y los compara con la vista previa (posiciones, fuente, negrita, mayúsculas, tamaño),
// incluido el Word REAL (si hay Microsoft Word instalado; para saltarlo: SEM_WORD=1). Requiere el sitio en http://localhost:3000.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { lanza, abre, preenche, linhasPrevia, palavrasPrevia, imagemPrevia, lePdf, palavrasDoPdf, leDocx, wordParaPdf, compara, difPalavras, difImagem, baixaArquivo, achaPlaceholders, URL_PAGINA, SHEET, fs } from "./lib-archivos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
const OUT = path.resolve(AQUI, "../ejemplos/_pruebas/folha").split("\\").join("/"); // los archivos de prueba van a ejemplos/ y no se abren
const USAR_WORD = !process.env.SEM_WORD;
const SOLO = process.env.SOLO; // ej.: SOLO=F1 para correr un caso
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// Logos de prueba (se crean aquí; no se publican)
function creaLogos() {
  const png = createCanvas(600, 300); // transparente, con un círculo azul y un texto
  let g = png.getContext("2d");
  g.fillStyle = "#1f4e8c"; g.beginPath(); g.arc(150, 150, 130, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#c0392b"; g.fillRect(320, 60, 240, 40); g.fillStyle = "#222"; g.font = "bold 60px sans-serif"; g.fillText("LOGO", 330, 220);
  fs.writeFileSync(OUT + "/logo-transparente.png", png.toBuffer("image/png"));
  const jpg = createCanvas(400, 400); // cuadrado, sin transparencia
  g = jpg.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 400, 400); g.fillStyle = "#2e7d32"; g.fillRect(40, 40, 320, 320); g.fillStyle = "#fff"; g.font = "bold 90px sans-serif"; g.fillText("UF", 110, 240);
  fs.writeFileSync(OUT + "/logo-cuadrado.jpg", jpg.toBuffer("image/jpeg", 90));
}
creaLogos();
const LOGO_PNG = OUT + "/logo-transparente.png";
const LOGO_JPG = OUT + "/logo-cuadrado.jpg";

const BASE_TCC = { institution: "Universidade Federal de Viçosa", course: "Administração", authors: ["Maria Silva", "João Pereira"], title: "A influência das redes sociais no aprendizado", subtitle: "um estudo com alunos do ensino médio", volume: "2", city: "Viçosa - MG", year: "2026", font: "Arial" };

const CENARIOS = [
  { id: "F1-folha-arial-tcc", rota: "folha", paginas: ["folha"], dados: { ...BASE_TCC, workType: "tcc", degree: "Bacharel em Administração", advisor: "Prof. Dr. Carlos Almeida", coadvisors: ["Profa. Dra. Ana Souza", "Prof. Me. Pedro Lima"] } },
  { id: "F2-folha-times-dissertacao", rota: "folha", paginas: ["folha"], dados: { institution: "Instituto Federal de Minas Gerais", course: "Educação", authors: ["Ana Beatriz de Oliveira-Santos"], title: "Desafios e perspectivas da educação básica no Brasil contemporâneo", subtitle: "uma análise crítica dos últimos vinte anos de políticas públicas", city: "Belo Horizonte", year: "2026", font: "Times New Roman", titleSize: "16", workType: "dissertacao", degree: "Mestre em Educação", area: "Políticas Públicas e Gestão", advisorLabel: "1", advisor: "Profa. Dra. Helena Costa", estilo: { title: [false, true], author: [false, false], orientador: [true, true] } } },
  { id: "F3-folha-natureza-manual-esquerda", rota: "folha", paginas: ["folha"], dados: { ...BASE_TCC, volume: "", titleSize: "14", workType: "outro", nature: "Trabalho de Conclusão de Curso apresentado à Faculdade de Ciências Sociais Aplicadas, como requisito parcial para a obtenção do grau de Bacharel em Administração com habilitação em Gestão Pública e Políticas Sociais, sob a orientação do corpo docente do departamento.", natureJust: false, advisor: "Prof. Dr. Carlos Almeida" } },
  { id: "F4-folha-escolar", rota: "folha", paginas: ["folha"], dados: { institution: "Escola Estadual Santos Dumont", course: "", authors: ["Lucas Andrade", "Beatriz Costa", "Pedro Henrique Lima"], title: "Energia solar na escola", subtitle: "", city: "Juiz de Fora", year: "2026", font: "Arial", escolar: true, discipline: "Física", teacher: "Ana Lima", teacherLabel: "1" } },
  { id: "J1-capa-mas-folha-logo-png", rota: "capa", paginas: ["capa", "folha"], dados: { ...BASE_TCC, workType: "tcc", degree: "Bacharel em Administração", advisor: "Prof. Dr. Carlos Almeida", juntas: true, logoArquivo: LOGO_PNG, logoTamanho: "medio" } },
  { id: "J2-folha-mas-capa-times-logo-jpg-ambas", rota: "folha", paginas: ["capa", "folha"], dados: { ...BASE_TCC, font: "Times New Roman", titleSize: "14", workType: "tcc", degree: "Licenciado em Pedagogia", advisor: "Profa. Dra. Maria Souza", advisorLabel: "1", juntas: true, logoArquivo: LOGO_JPG, logoTamanho: "grande", logoCapa: true, logoFolha: true } },
  { id: "L1-capa-logo-pequeno-escolar", rota: "capa", paginas: ["capa"], dados: { institution: "Colégio Dom Bosco", course: "Ensino Médio", authors: ["Maria Silva"], title: "Revolução Industrial", subtitle: "causas e consequências", city: "Recife", year: "2026", font: "Arial", escolar: true, discipline: "História", teacher: "João Pereira", logoArquivo: LOGO_PNG, logoTamanho: "pequeno" } },
];

const browser = await lanza();
const resumo = [];
const falhas = [];
const falha = (id, msg) => { falhas.push(`${id}: ${msg}`); };

for (const c of CENARIOS) {
  if (SOLO && !c.id.startsWith(SOLO)) continue;
  console.log("» " + c.id); const page = await abre(browser, URL_PAGINA[c.rota]);
  await preenche(page, c.dados);
  const fonte = c.dados.font;
  const prev = {}, spans = [], imgPrev = {};
  for (const p of c.paginas) {
    prev[p] = await linhasPrevia(page, SHEET[p]);
    spans.push(await palavrasPrevia(page, SHEET[p]));
    imgPrev[p] = await imagemPrevia(page, SHEET[p]);
  }
  const info = { cenario: c.id, paginas: c.paginas.join("+"), errosPagina: page.__erros };
  if (await page.$eval("#avisoPagina", (e) => !e.hidden)) falha(c.id, "la vista previa avisa que el texto no cabe");
  if (page.__erros.length) falha(c.id, "errores de consola: " + page.__erros.join(" | "));
  const esperadas = spans.flat();

  for (const tipo of ["pdf", "docx"]) {
    const { nome, buf } = await baixaArquivo(page, tipo === "pdf" ? "#btnPdf" : "#btnDocx", tipo === "pdf" ? 0 : 1);
    const arquivo = `${OUT}/${c.id}.${tipo}`; fs.writeFileSync(arquivo, buf);
    info[tipo] = { nome, bytes: buf.length };
    const esperadoNome = (c.paginas.length > 1 ? "capa-e-folha-de-rosto-abnt" : c.paginas[0] === "capa" ? "capa-abnt" : "folha-de-rosto-abnt") + "-";
    if (!nome.startsWith(esperadoNome)) falha(c.id, `nombre de archivo inesperado: ${nome}`);

    if (tipo === "pdf") {
      const paginasPdf = [];
      for (const [i, p] of c.paginas.entries()) {
        const r = await lePdf(buf, i + 1, fonte);
        const cmp = compara(prev[p], r.linhas);
        const ph = r.linhas.flatMap((l) => achaPlaceholders(l.texto));
        const dImg = difImagem(imgPrev[p], r.imagens[0]);
        paginasPdf.push({ pagina: p, ...cmp, placeholders: ph, imagen: imgPrev[p] ? { prev: imgPrev[p], pdf: r.imagens[0], dif: dImg } : undefined, size: `${r.w.toFixed(2)}x${r.h.toFixed(2)}` });
        if (cmp.erro || cmp.dVert > 1.5 || cmp.dEsq > 1.5 || cmp.dDir > 1.5 || cmp.dTam > 0.1) falha(c.id, `PDF ${p}: ${JSON.stringify(cmp)}`);
        if (ph.length) falha(c.id, `PDF ${p}: texto de ejemplo en el archivo ${ph}`);
        if (imgPrev[p] && (dImg === null || dImg > 1.5)) falha(c.id, `PDF ${p}: imagen fuera de lugar (${dImg})`);
        if (!imgPrev[p] && r.imagens.length) falha(c.id, `PDF ${p}: aparece una imagen que no debería`);
        const total = (await pdfInfo(buf)).paginas;
        if (total !== c.paginas.length) falha(c.id, `PDF tiene ${total} páginas, se esperaban ${c.paginas.length}`);
      }
      info.pdf.paginasDetalle = paginasPdf;
      const dp = difPalavras(esperadas, palavrasDoPdf(buf).flat());
      info.pdf.estilo = dp.length ? dp.slice(0, 5) : "idéntico a la prévia";
      if (dp.length) falha(c.id, "PDF estilo: " + dp.slice(0, 3).join("; "));
    } else {
      const d = await leDocx(buf);
      info.docx.secoes = d.secoes; info.docx.jc = d.jc; info.docx.recuos = d.recuos; info.docx.linhas = d.linhas; info.docx.pgMar = d.pgMar; info.docx.imagenes = d.imagens;
      const dd = difPalavras(esperadas, d.palavras);
      info.docx.estilo = dd.length ? dd.slice(0, 5) : "idéntico a la prévia";
      if (dd.length) falha(c.id, "DOCX estilo: " + dd.slice(0, 3).join("; "));
      if (d.secoes !== c.paginas.length) falha(c.id, `DOCX tiene ${d.secoes} secciones`);
      if (!/w:top="1701"[^>]*w:right="1134"[^>]*w:bottom="1134"[^>]*w:left="1701"/.test(d.pgMar)) falha(c.id, "márgenes del DOCX: " + d.pgMar);
      const comLogo = c.paginas.some((p) => imgPrev[p]);
      if (comLogo !== d.imagens.length > 0) falha(c.id, `imágenes en el DOCX: ${d.imagens.length}`);
      if (USAR_WORD) {
        const pdfWord = `${OUT}/${c.id}.word.pdf`;
        info.docx.paginasNoWord = wordParaPdf(arquivo, pdfWord);
        if (info.docx.paginasNoWord !== c.paginas.length) falha(c.id, `Word real: ${info.docx.paginasNoWord} páginas (se esperaban ${c.paginas.length})`);
        const wbuf = fs.readFileSync(pdfWord);
        info.docx.word = [];
        for (const [i, p] of c.paginas.entries()) {
          const r = await lePdf(wbuf, i + 1, fonte);
          const cmp = compara(prev[p], r.linhas);
          const dImg = difImagem(imgPrev[p], r.imagens[0]);
          info.docx.word.push({ pagina: p, ...cmp, imagenDif: dImg });
          if (cmp.erro || cmp.dVert > 1.5 || cmp.dEsq > 1.5 || cmp.dDir > 1.5 || cmp.dTam > 0.1) falha(c.id, `Word real ${p}: ${JSON.stringify(cmp)}`);
          if (imgPrev[p] && (dImg === null || dImg > 2)) falha(c.id, `Word real ${p}: imagen fuera de lugar (${dImg})`);
        }
      }
    }
  }
  resumo.push(info);
  await page.close();
}

// Casos bloqueados
{
  // 1) Folha sin institución y sin texto de natureza: no descarga y avisa
  const page = await abre(browser, URL_PAGINA.folha);
  await preenche(page, { institution: "", course: "", authors: ["Maria"], title: "Teste", city: "Recife", year: "2026", font: "Arial", workType: "tcc" });
  await page.$eval("#btnPdf", (e) => e.click()); await new Promise((r) => setTimeout(r, 800));
  const r = { descargas: await page.evaluate(() => window.__arquivos.length), mensaje: await page.$eval("#toast", (e) => e.textContent), enfocado: await page.evaluate(() => document.activeElement.id) };
  resumo.push({ cenario: "B1-folha-sin-institucion", ...r });
  if (r.descargas !== 0 || !/instituição/.test(r.mensaje) || r.enfocado !== "institution") falha("B1", JSON.stringify(r));
  await page.close();
}
{
  // 2) Texto demasiado largo: la vista previa avisa y no descarga
  const page = await abre(browser, URL_PAGINA.folha);
  await preenche(page, { ...BASE_TCC, workType: "outro", nature: "Texto muito longo. ".repeat(200), advisor: "Prof. Dr. Carlos Almeida" });
  const aviso = await page.$eval("#avisoPagina", (e) => ({ visivel: !e.hidden, texto: e.textContent }));
  await page.$eval("#btnPdf", (e) => e.click()); await new Promise((r) => setTimeout(r, 800));
  const r = { aviso, descargas: await page.evaluate(() => window.__arquivos.length), mensaje: await page.$eval("#toast", (e) => e.textContent) };
  resumo.push({ cenario: "B2-folha-texto-largo", ...r });
  if (!aviso.visivel || r.descargas !== 0) falha("B2", JSON.stringify(r));
  await page.close();
}
{
  // 3) Capa + folha juntas con la folha incompleta (falta la natureza): avisa y abre los datos de la folha
  const page = await abre(browser, URL_PAGINA.capa);
  await preenche(page, { ...BASE_TCC, institution: "", workType: "tcc", juntas: true });
  await page.$eval("#btnDocx", (e) => e.click()); await new Promise((r) => setTimeout(r, 800));
  const r = { descargas: await page.evaluate(() => window.__arquivos.length), mensaje: await page.$eval("#toast", (e) => e.textContent), enfocado: await page.evaluate(() => document.activeElement.id) };
  resumo.push({ cenario: "B3-juntas-sin-institucion", ...r });
  if (r.descargas !== 0 || !/instituição/.test(r.mensaje)) falha("B3", JSON.stringify(r));
  await page.close();
}
await browser.close();

async function pdfInfo(buf) { const { pdfjs } = await import("./lib-archivos.mjs"); const d = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise; return { paginas: d.numPages }; }

fs.writeFileSync(OUT + "/resumen.json", JSON.stringify(resumo, null, 1));
for (const r of resumo) {
  console.log("\n== " + r.cenario + (r.paginas ? "  [" + r.paginas + "]" : ""));
  if (r.pdf) {
    for (const p of r.pdf.paginasDetalle) console.log(`  PDF ${p.pagina}: líneas ${p.linhasPrevia}/${p.linhasArquivo} | Δvert ${p.dVert} Δesq ${p.dEsq} Δdir ${p.dDir} Δtam ${p.dTam}${p.imagen ? " | imagen Δ " + p.imagen.dif : ""} | gris: [${p.placeholders}]`);
    console.log("      estilo (palabra a palabra):", Array.isArray(r.pdf.estilo) ? r.pdf.estilo : r.pdf.estilo);
  }
  if (r.docx) {
    console.log(`  DOCX: secciones ${r.docx.secoes} | jc ${JSON.stringify(r.docx.jc)} | recuos ${JSON.stringify(r.docx.recuos)} | interlineado ${JSON.stringify(r.docx.linhas)} | imágenes ${r.docx.imagenes.length}`);
    console.log("      estilo (palabra a palabra):", r.docx.estilo);
    for (const w of r.docx.word || []) console.log(`  Word REAL ${w.pagina}: páginas=${r.docx.paginasNoWord} | líneas ${w.linhasPrevia}/${w.linhasArquivo} | Δvert ${w.dVert} Δesq ${w.dEsq} Δdir ${w.dDir}${w.imagenDif != null ? " | imagen Δ " + w.imagenDif : ""}`);
  }
  if (r.mensaje !== undefined) console.log("  ", JSON.stringify({ descargas: r.descargas, mensaje: r.mensaje, enfocado: r.enfocado, aviso: r.aviso }));
}
console.log(falhas.length ? `\n${falhas.length} FALLAS:\n- ` + falhas.join("\n- ") : "\nTODO OK: archivos iguales a la vista previa");
process.exit(falhas.length ? 1 : 0);
