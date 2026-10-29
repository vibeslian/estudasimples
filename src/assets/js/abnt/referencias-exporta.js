// PDF e Word (.docx) da página REFERÊNCIAS, feitos no navegador com o mesmo cálculo de linhas da prévia (referencias-layout.js).
// Nenhum dado sai do aparelho; as bibliotecas são as mesmas das outras ferramentas (exporta.js) e ficam no próprio site.
import { carrega, paraWinAnsi, estiloPdf, medidorCanvas, garanteFontes } from "./exporta.js";
import { calculaReferencias } from "./referencias-layout.js";
import { linhaBase } from "./layout.js";
import { fundeRuns } from "./referencias-modelo.js";

const NOME_ARQUIVO = "referencias-abnt";
const TITULO = "REFERÊNCIAS";

// o PDF usa as fontes padrão (só Windows-1252): o que ficar de fora vira "?" e é avisado antes de baixar
export const caracteresForaDoPdf = (refs) => {
  const fora = new Set();
  for (const ref of refs) for (const run of ref.runs) for (const ch of run.text) if (paraWinAnsi(ch) === "?" && ch !== "?") fora.add(ch);
  return [...fora];
};

const paraPdf = (refs) => refs.map((ref) => ({ ...ref, runs: fundeRuns(ref.runs.map((x) => ({ ...x, text: paraWinAnsi(x.text) }))) }));
const contaEspacos = (s) => (s.match(/ /g) || []).length;

function layout(refs, fonte, medir) {
  return calculaReferencias({ font: fonte, titulo: { text: TITULO, bold: true }, refs }, medir);
}

export async function geraPdfReferencias(refs, fonte = "Arial") {
  const jsPDF = await carrega("jspdf");
  await garanteFontes(fonte);
  const medir = medidorCanvas(fonte);
  const limpas = paraPdf(refs);
  const lay = layout(limpas, fonte, medir);
  const familia = fonte === "Arial" ? "helvetica" : "times";
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  const x0 = lay.g.margemEsquerda;
  lay.paginas.forEach((pg, k) => {
    if (k) doc.addPage("a4", "portrait");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(lay.size);
    if (k === 0) {
      doc.setFont(familia, estiloPdf({ bold: true, italic: false }));
      const w = medir(TITULO, true, lay.size, false);
      doc.text(TITULO, x0 + (lay.areaW - w) / 2, linhaBase(lay.tituloTopo, lay.size, fonte, lay.lhTitulo / lay.size) - lay.sobe);
    }
    for (const it of pg.itens) {
      it.linhas.forEach((linha, i) => {
        const baseY = linhaBase(it.topo + i * lay.lh, lay.size, fonte, lay.lh / lay.size);
        let x = x0;
        // junta partes vizinhas com o mesmo estilo (o texto do PDF sai em trechos inteiros: copiar/colar e leitores de tela)
        const trechos = [];
        for (const p of linha.parts) {
          const u = trechos[trechos.length - 1];
          if (u && u.bold === p.bold) u.text += p.text; else trechos.push({ text: p.text, bold: p.bold });
        }
        for (const t of trechos) {
          if (t.text.trim()) { doc.setFont(familia, t.bold ? "bold" : "normal"); doc.text(t.text, x, baseY); }
          x += medir(t.text, t.bold, lay.size, false);
        }
      });
    }
  });
  doc.setProperties({ title: "Referências ABNT", subject: "Lista de referências (ABNT NBR 6023:2025)", author: "", creator: "Estuda Simples" });
  try { doc.setLanguage("pt-BR"); } catch (e) { /* versões antigas não têm */ }
  return { blob: doc.output("blob"), nome: NOME_ARQUIVO + ".pdf" };
}

export async function geraDocxReferencias(refs, fonte = "Arial") {
  const docx = await carrega("docx");
  const { Document, Packer, Paragraph, TextRun, AlignmentType, LineRuleType } = docx;
  await garanteFontes(fonte);
  const lay = layout(refs, fonte, medidorCanvas(fonte));
  const tw = (pt) => Math.round(pt * 20);
  const cmTw = (cm) => Math.round((cm / 2.54) * 1440);
  const run = (texto, bold) => new TextRun({ text: texto, bold, font: fonte, size: 24, color: "000000" });
  const paragrafos = [new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: tw(lay.lhTitulo), line: 360, lineRule: LineRuleType.AUTO }, // título e uma linha em branco, em espaçamento 1,5
    keepNext: true,
    children: [run(TITULO, true)],
  })];
  for (const ref of refs) {
    paragrafos.push(new Paragraph({
      alignment: AlignmentType.LEFT, // sem recuo, alinhada à margem esquerda
      spacing: { before: 0, after: tw(lay.lh), line: 240, lineRule: LineRuleType.AUTO }, // espaço simples e uma linha em branco simples depois
      keepLines: true, // uma referência não é cortada entre duas páginas
      widowControl: false,
      children: ref.runs.map((x) => run(x.text, x.bold)),
    }));
  }
  const documento = new Document({
    creator: "Estuda Simples",
    title: "Referências ABNT",
    description: "Lista de referências (ABNT NBR 6023:2025)",
    styles: { default: { document: { run: { font: fonte, size: 24, color: "000000", language: { value: "pt-BR" } }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO } } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: cmTw(3), left: cmTw(3), right: cmTw(2), bottom: cmTw(2), header: 709, footer: 709, gutter: 0 } } },
      children: paragrafos,
    }],
  });
  return { blob: await Packer.toBlob(documento), nome: NOME_ARQUIVO + ".docx" };
}
