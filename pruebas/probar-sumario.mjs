// Prueba de la Etapa 7: sumário (y capa + folha + sumário en un solo archivo).
// Genera PDF y Word desde la página real y los compara con la vista previa (posiciones, fuente, negrita, mayúsculas, tamaño),
// incluido el Word REAL (oculto, sin ventanas; SEM_WORD=1 lo salta). Los archivos van a ejemplos/_pruebas/sumario/ y no se abren.
// Requiere el sitio en http://localhost:3000.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { lanza, abre, preenche, linhasPrevia, palavrasPrevia, imagemPrevia, lePdf, palavrasDoPdf, leDocx, wordParaPdf, compara, difPalavras, difImagem, baixaArquivo, achaPlaceholders, URL_PAGINA, BASE, SHEET, hojasSumario, fs, pdfjs } from "./lib-archivos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
const OUT = path.resolve(AQUI, "../ejemplos/_pruebas/sumario").split("\\").join("/");
const USAR_WORD = !process.env.SEM_WORD;
const SOLO = process.env.SOLO;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const c = createCanvas(400, 400); const g = c.getContext("2d");
g.fillStyle = "#1f4e8c"; g.beginPath(); g.arc(200, 200, 170, 0, Math.PI * 2); g.fill();
g.fillStyle = "#fff"; g.font = "bold 150px sans-serif"; g.textAlign = "center"; g.fillText("UF", 200, 250);
fs.writeFileSync(OUT + "/logo.png", c.toBuffer("image/png"));
const LOGO = OUT + "/logo.png";

// lista de ejemplo → texto para pegar (una línea por ítem, con recuo por nivel y la página separada por puntos)
const aTexto = (es) => es.map((e) => (e.tipo === "num" ? "  ".repeat(e.nivel - 1) + e.titulo : e.tipo === "sem" ? e.titulo : (e.tipo === "apendice" ? "APÊNDICE A – " : "ANEXO A – ") + e.titulo) + (e.pagina ? " ..... " + e.pagina : "")).join("\n");
const largo = "Comportamento informacional de cirurgiões-dentistas: compartilhamento da informação em ambientes digitais e presenciais de trabalho";
const LARGA = [];
let pg = 7;
for (let i = 1; i <= 6; i++) {
  LARGA.push({ tipo: "num", nivel: 1, titulo: `Capítulo de exemplo número ${i}`, pagina: String((pg += 3)) });
  LARGA.push({ tipo: "num", nivel: 2, titulo: `Seção secundária ${i}.1 com um título bem mais comprido para forçar a quebra de linha na página`, pagina: String((pg += 1)) });
  LARGA.push({ tipo: "num", nivel: 3, titulo: largo, pagina: String((pg += 2)) });
  LARGA.push({ tipo: "num", nivel: 4, titulo: `Subseção quaternária ${i}`, pagina: String((pg += 1)) });
  LARGA.push({ tipo: "num", nivel: 5, titulo: `Subseção quinária ${i}`, pagina: String((pg += 1)) });
}
LARGA.push({ tipo: "sem", titulo: "Referências", pagina: "120" }, { tipo: "apendice", titulo: "Questionário aplicado aos participantes da pesquisa", pagina: "125" }, { tipo: "anexo", titulo: "Parecer do comitê de ética", pagina: "130" });
const CURTA = [{ tipo: "num", nivel: 1, titulo: "Introdução", pagina: "7" }, { tipo: "num", nivel: 1, titulo: "Desenvolvimento", pagina: "9" }, { tipo: "num", nivel: 2, titulo: "Primeiro tema", pagina: "9" }, { tipo: "num", nivel: 2, titulo: "Segundo tema", pagina: "12" }, { tipo: "num", nivel: 1, titulo: "Conclusão", pagina: "20" }, { tipo: "sem", titulo: "Referências", pagina: "22" }];
const BASE_TCC = { institution: "Universidade Federal de Viçosa", course: "Administração", authors: ["Maria Silva", "João Pereira"], title: "A influência das redes sociais no aprendizado", subtitle: "um estudo com alunos do ensino médio", city: "Viçosa - MG", year: "2026", workType: "tcc", degree: "Bacharel em Administração", advisor: "Prof. Dr. Carlos Almeida" };
const COLADA = `RESUMO
SUMÁRIO
1 INTRODUÇÃO ........ 7
2 REFERENCIAL TEÓRICO ..... 9
2.1 Conceitos básicos ..... 9
2.1.1 Termos usados no estudo	10
2.2 Estudos anteriores   12
3 METODOLOGIA ..... 15
Considerações finais ..... 22
REFERÊNCIAS ..... 24
APÊNDICE A – Questionário ..... 25
ANEXO A: Parecer de ética ..... 30
Lista de ilustrações`;

const CASOS = [
  { id: "S1-arial-curto-padrao", rota: "sumario", dados: { font: "Arial", colar: aTexto(CURTA) } },
  { id: "S2-times-5-niveles-cursiva", rota: "sumario", dados: { font: "Times New Roman", colar: aTexto(LARGA), niveis: { 2: [true, true, false], 3: [false, false, true], 4: [false, true, true], 5: [true, false, true] } } },
  { id: "S3-arial-un-espacio-simple-sin-puntos", rota: "sumario", dados: { font: "Arial", colar: aTexto(LARGA), sumAlinha: "espaco", sumAlinhaPos: false, sumEspaco: "1", sumPontilhado: false } },
  { id: "S4-times-lista-pegada-mezclada", rota: "sumario", dados: { font: "Times New Roman", colar: COLADA } },
  { id: "S5-capa-folha-sumario-logo", rota: "sumario", dados: { ...BASE_TCC, font: "Arial", colar: aTexto(CURTA), incCapa: true, incFolha: true, logoArquivo: LOGO, logoTamanho: "medio" } },
  { id: "S6-sumario-sin-paginas", rota: "sumario", dados: { font: "Arial", colar: aTexto(CURTA.map((e) => ({ ...e, pagina: "" }))) } },
];

const browser = await lanza();
const resumo = [];
const falhas = [];
const falha = (id, m) => falhas.push(`${id}: ${m}`);

for (const caso of CASOS) {
  if (SOLO && !caso.id.startsWith(SOLO)) continue;
  console.log("» " + caso.id);
  const page = await abre(browser, URL_PAGINA[caso.rota]);
  await preenche(page, caso.dados);
  await new Promise((r) => setTimeout(r, 300));
  const fonte = caso.dados.font;
  // páginas que la vista previa muestra, en orden
  const folhas = await page.evaluate(() => [...(document.getElementById("pagCapa").hidden ? [] : ["capa"]), ...(document.getElementById("pagFolha").hidden ? [] : ["folha"]), ...[...document.querySelectorAll("#pagsSumario .sheet")].map((s) => s.id)]);
  const idDe = (p) => (p === "capa" ? SHEET.capa : p === "folha" ? SHEET.folha : p);
  const prev = [], spans = [], imgs = [];
  for (const p of folhas) { prev.push(await linhasPrevia(page, idDe(p))); spans.push(await palavrasPrevia(page, idDe(p))); imgs.push(await imagemPrevia(page, idDe(p))); }
  const esperadas = spans.flat();
  const info = { cenario: caso.id, paginas: folhas.length, errosPagina: page.__erros, entradas: await page.evaluate(() => document.querySelectorAll(".sum-item").length) };
  if (page.__erros.length) falha(caso.id, "errores de consola: " + page.__erros.join(" | "));

  for (const tipo of ["pdf", "docx"]) {
    const { nome, buf } = await baixaArquivo(page, tipo === "pdf" ? "#btnPdf" : "#btnDocx", tipo === "pdf" ? 0 : 1);
    const arquivo = `${OUT}/${caso.id}.${tipo}`; fs.writeFileSync(arquivo, buf);
    info[tipo] = { nome, bytes: buf.length };
    if (tipo === "pdf") {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
      if (doc.numPages !== folhas.length) falha(caso.id, `PDF tiene ${doc.numPages} páginas, la prévia ${folhas.length}`);
      info.pdf.paginas = doc.numPages;
      info.pdf.detalle = [];
      for (const [i, p] of folhas.entries()) {
        const r = await lePdf(buf, i + 1, fonte);
        const cmp = compara(prev[i], r.linhas);
        const ph = r.linhas.flatMap((l) => achaPlaceholders(l.texto));
        const dImg = difImagem(imgs[i], r.imagens[0]);
        info.pdf.detalle.push({ p, ...cmp, ph, dImg });
        if (cmp.erro || cmp.dVert > 1.5 || cmp.dEsq > 1.5 || cmp.dDir > 1.5 || cmp.dTam > 0.1) falha(caso.id, `PDF ${p}: ${JSON.stringify(cmp)}`);
        if (ph.length) falha(caso.id, `PDF ${p}: texto de ejemplo en el archivo ${ph}`);
        if (imgs[i] && (dImg === null || dImg > 1.5)) falha(caso.id, `PDF ${p}: imagen fuera de lugar`);
      }
      const dp = difPalavras(esperadas, palavrasDoPdf(buf).flat());
      info.pdf.estilo = dp.length ? dp.slice(0, 4) : "idéntico";
      if (dp.length) falha(caso.id, "PDF estilo: " + dp.slice(0, 3).join("; "));
      info.pdf.fuentes = [...new Set([...buf.toString("latin1").matchAll(/\/BaseFont\s*\/([A-Za-z\-]+)/g)].map((m) => m[1]))];
    } else {
      const d = await leDocx(buf);
      info.docx.secciones = d.secoes; info.docx.recuos = d.recuos; info.docx.interlineado = d.linhas;
      const dd = difPalavras(esperadas, d.palavras);
      info.docx.estilo = dd.length ? dd.slice(0, 4) : "idéntico";
      if (dd.length) falha(caso.id, "DOCX estilo: " + dd.slice(0, 3).join("; "));
      const nSecoes = (folhas.includes("capa") ? 1 : 0) + (folhas.includes("folha") ? 1 : 0) + 1;
      if (d.secoes !== nSecoes) falha(caso.id, `DOCX tiene ${d.secoes} secciones (se esperaban ${nSecoes})`);
      if (USAR_WORD) {
        const pdfWord = `${OUT}/${caso.id}.word.pdf`;
        info.docx.paginasWord = wordParaPdf(arquivo, pdfWord);
        if (info.docx.paginasWord !== folhas.length) falha(caso.id, `Word real: ${info.docx.paginasWord} páginas (la prévia ${folhas.length})`);
        const wbuf = fs.readFileSync(pdfWord);
        info.docx.word = [];
        for (const [i, p] of folhas.entries()) {
          if (i + 1 > info.docx.paginasWord) break;
          const r = await lePdf(wbuf, i + 1, fonte);
          const cmp = compara(prev[i], r.linhas);
          const dImg = difImagem(imgs[i], r.imagens[0]);
          info.docx.word.push({ p, ...cmp, dImg });
          if (cmp.erro || cmp.dVert > 1.5 || cmp.dEsq > 1.5 || cmp.dDir > 1.5 || cmp.dTam > 0.1) falha(caso.id, `Word real ${p}: ${JSON.stringify(cmp)}`);
          if (imgs[i] && (dImg === null || dImg > 2)) falha(caso.id, `Word real ${p}: imagen fuera de lugar (${dImg})`);
        }
      }
    }
  }
  resumo.push(info);
  await page.close();
}

// El estado pasa de la herramienta del sumário a la capa: capa + folha + sumário desde la capa
if (!SOLO || SOLO === "S7") {
  console.log("» S7-via-capa");
  const page = await abre(browser, URL_PAGINA.sumario);
  await preenche(page, { ...BASE_TCC, font: "Arial", colar: aTexto(CURTA) });
  await page.goto(BASE + URL_PAGINA.capa, { waitUntil: "networkidle0" });
  await preenche(page, { incFolha: true, incSumario: true });
  const folhas = await page.evaluate(() => [...(document.getElementById("pagCapa").hidden ? [] : ["capa"]), ...(document.getElementById("pagFolha").hidden ? [] : ["folha"]), ...[...document.querySelectorAll("#pagsSumario .sheet")].map((s) => s.id)]);
  const { nome, buf } = await baixaArquivo(page, "#btnPdf", 0);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const okNome = nome.startsWith("capa-folha-de-rosto-e-sumario-abnt-");
  resumo.push({ cenario: "S7-via-capa", paginas: doc.numPages, folhas, nome });
  if (!okNome || doc.numPages !== 3 || folhas.length !== 3) falha("S7", `nombre ${nome}, páginas ${doc.numPages}, prévia ${folhas.join(",")}`);
  await page.close();
}

// Casos bloqueados / avisos
async function bloqueado(id, rota, dados, comprueba) {
  const page = await abre(browser, URL_PAGINA[rota]);
  await preenche(page, dados);
  await page.$eval("#btnPdf", (e) => e.click()); await new Promise((r) => setTimeout(r, 900));
  const r = { descargas: await page.evaluate(() => window.__arquivos.length), mensaje: await page.$eval("#toast", (e) => e.textContent), enfocado: await page.evaluate(() => document.activeElement.id) };
  resumo.push({ cenario: id, ...r });
  const erro = comprueba(r);
  if (erro) falha(id, erro + " " + JSON.stringify(r));
  await page.close();
}
if (!SOLO) {
  await bloqueado("B1-sumario-vacio", "sumario", { font: "Arial" }, (r) => (r.descargas !== 0 || !/pelo menos um item/.test(r.mensaje) ? "debía bloquear" : ""));
  await bloqueado("B2-item-sin-titulo", "sumario", { font: "Arial", colar: "1 Introdução ..... 7" }, (r) => (r.descargas !== 1 ? "con título debía bajar" : ""));
  await bloqueado("B3-sumario-desde-capa-vacio", "capa", { ...BASE_TCC, incSumario: true }, (r) => (r.descargas !== 0 || !/sumário/.test(r.mensaje) ? "debía bloquear" : ""));
  await bloqueado("B4-paginas-en-blanco-avisa", "sumario", { font: "Arial", colar: aTexto(CURTA.map((e) => ({ ...e, pagina: "" }))) }, (r) => (r.descargas !== 1 || !/sem número de página/.test(r.mensaje) ? "debía bajar con aviso" : ""));
  // item vacío: se agrega con el botón y se intenta bajar
  const page = await abre(browser, URL_PAGINA.sumario);
  await page.$eval("#addSecao", (e) => e.click());
  await page.$eval("#btnPdf", (e) => e.click()); await new Promise((r) => setTimeout(r, 700));
  const r = { descargas: await page.evaluate(() => window.__arquivos.length), mensaje: await page.$eval("#toast", (e) => e.textContent), enfocado: await page.evaluate(() => document.activeElement.id) };
  resumo.push({ cenario: "B5-item-sin-titulo", ...r });
  if (r.descargas !== 0 || !/título do item 1/.test(r.mensaje) || r.enfocado !== "sumTitulo-0") falha("B5", JSON.stringify(r));
  await page.close();
}
await browser.close();

fs.writeFileSync(OUT + "/resumen.json", JSON.stringify(resumo, null, 1));
for (const r of resumo) {
  console.log("\n== " + r.cenario + (r.paginas ? "  [" + r.paginas + " pág.]" : ""));
  if (r.pdf) {
    for (const p of r.pdf.detalle) console.log(`  PDF ${p.p}: líneas ${p.linhasPrevia}/${p.linhasArquivo} | Δvert ${p.dVert} Δesq ${p.dEsq} Δdir ${p.dDir} Δtam ${p.dTam}${p.dImg != null ? " | imagen Δ " + p.dImg : ""} | gris: [${p.ph}]`);
    console.log("      estilo PDF:", r.pdf.estilo, "| fuentes:", r.pdf.fuentes.join(", "));
  }
  if (r.docx) {
    console.log(`  DOCX: secciones ${r.docx.secciones} | recuos ${JSON.stringify(r.docx.recuos)} | estilo: ${JSON.stringify(r.docx.estilo)}`);
    for (const w of r.docx.word || []) console.log(`  Word REAL ${w.p}: páginas=${r.docx.paginasWord} | líneas ${w.linhasPrevia}/${w.linhasArquivo} | Δvert ${w.dVert} Δesq ${w.dEsq} Δdir ${w.dDir}${w.dImg != null ? " | imagen Δ " + w.dImg : ""}`);
  }
  if (r.mensaje !== undefined) console.log("  ", JSON.stringify({ descargas: r.descargas, mensaje: r.mensaje, enfocado: r.enfocado }));
  if (r.nome) console.log("  ", r.nome, r.paginas);
}
console.log(falhas.length ? `\n${falhas.length} FALLAS:\n- ` + falhas.join("\n- ") : "\nTODO OK: archivos iguales a la vista previa");
process.exit(falhas.length ? 1 : 0);
