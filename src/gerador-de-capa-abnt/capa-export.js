// Gera os arquivos PDF e Word da capa, no navegador. Nenhum dado é enviado a servidor algum.
// As bibliotecas (jsPDF e docx) ficam no próprio site, em /assets/js/vendor/: nenhum dado nem pedido sai para terceiros.
// Só são baixadas quando o usuário se aproxima do botão ou pede o arquivo.
import { montaCapa, FATOR_LINHA } from "./capa-model.js";
import { calculaLayout, linhaBase } from "./capa-layout.js";

const LIBS = {
  jspdf: { url: "/assets/js/vendor/jspdf-4.2.1.umd.min.js", global: () => window.jspdf && window.jspdf.jsPDF },
  docx: { url: "/assets/js/vendor/docx-9.10.0.iife.js", global: () => window.docx },
};
const promessas = {};

function carrega(nome) {
  const lib = LIBS[nome];
  if (lib.global()) return Promise.resolve(lib.global());
  if (promessas[nome]) return promessas[nome];
  promessas[nome] = new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = lib.url;
    s.onload = () => (lib.global() ? ok(lib.global()) : (promessas[nome] = null, erro(new Error("biblioteca inválida"))));
    s.onerror = () => { promessas[nome] = null; s.remove(); erro(new Error("não foi possível carregar a biblioteca")); };
    document.head.append(s);
  });
  return promessas[nome];
}
export const precarrega = (nome) => carrega(nome).catch(() => {});

/* ---------- Validação ---------- */
export function camposFaltando(dados) {
  const falta = [];
  if (!(dados.authors || []).some((a) => (a || "").trim())) falta.push({ id: "autor", rotulo: "o nome do autor" });
  if (!(dados.title || "").trim()) falta.push({ id: "title", rotulo: "o título" });
  if (!(dados.city || "").trim()) falta.push({ id: "city", rotulo: "a cidade" });
  if (!String(dados.year || "").trim()) falta.push({ id: "year", rotulo: "o ano" });
  return falta;
}

/* ---------- Utilidades ---------- */
// O PDF usa as fontes padrão (Helvetica = Arial, Times = Times New Roman), que só têm os caracteres do Windows-1252.
const WIN1252_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function paraWinAnsi(texto) {
  let r = "";
  for (const ch of texto) {
    if (ch.charCodeAt(0) <= 0xff || WIN1252_EXTRA.has(ch)) { r += ch; continue; }
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    r += base && base.charCodeAt(0) <= 0xff ? base : "?";
  }
  return r;
}

function nomeArquivo(dados, ext) {
  const slug = (dados.title || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  return `capa-abnt${slug ? "-" + slug : ""}.${ext}`;
}

export function baixa(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const autoresDe = (dados) => (dados.authors || []).map((a) => (a || "").trim()).filter(Boolean);

/* ---------- PDF ---------- */
export async function geraPdf(dados) {
  const jsPDF = await carrega("jspdf");
  const modelo = montaCapa(dados); // sem textos de exemplo
  modelo.blocks = modelo.blocks.map((b) => ({ ...b, runs: b.runs.map((r) => ({ ...r, text: paraWinAnsi(r.text) })) }));
  const fonte = modelo.font;
  const familia = fonte === "Arial" ? "helvetica" : "times";

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  const medir = (texto, bold, tamanho) => {
    doc.setFont(familia, bold ? "bold" : "normal");
    doc.setFontSize(tamanho);
    // sem "kerning": é assim que o jsPDF desenha o texto, e igual à prévia e ao Word (getTextWidth mediria com kerning)
    return doc.getStringUnitWidth(texto, { doKerning: false }) * tamanho;
  };
  const lay = calculaLayout(modelo, medir);
  if (lay.excede) throw new Error("excede");
  const { g } = lay;

  for (const b of lay.blocos) {
    b.linhas.forEach((linha, i) => {
      const baseY = linhaBase(b.topo + i * b.size * FATOR_LINHA, b.size, fonte);
      let x = g.margemEsquerda + (g.larguraArea - linha.largura) / 2;
      // junta partes vizinhas com o mesmo estilo: o texto do PDF sai em trechos inteiros (copiar/colar e leitores de tela)
      const trechos = [];
      for (const parte of linha.parts) {
        const ultimo = trechos[trechos.length - 1];
        if (ultimo && ultimo.bold === parte.bold) ultimo.text += parte.text;
        else trechos.push({ text: parte.text, bold: parte.bold });
      }
      for (const trecho of trechos) {
        if (trecho.text.trim()) {
          doc.setFont(familia, trecho.bold ? "bold" : "normal");
          doc.setFontSize(b.size);
          doc.setTextColor(0, 0, 0);
          doc.text(trecho.text, x, baseY);
        }
        x += medir(trecho.text, trecho.bold, b.size);
      }
    });
  }

  const titulo = (dados.title || "").trim();
  doc.setProperties({
    title: "Capa ABNT" + (titulo ? " – " + titulo : ""),
    subject: "Capa de trabalho acadêmico (ABNT NBR 14724)",
    author: autoresDe(dados).join(", "),
    creator: "Estuda Simples",
  });
  try { doc.setLanguage("pt-BR"); } catch (e) { /* versões antigas não têm */ }
  return { blob: doc.output("blob"), nome: nomeArquivo(dados, "pdf") };
}

/* ---------- Word (.docx) ---------- */
function medidorCanvas(fonte) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fontKerning = "none";
  const familia = fonte === "Arial" ? '"CapaArial", Arial, Arimo, Helvetica, sans-serif' : '"CapaTimes", "Times New Roman", Tinos, Times, serif';
  return (texto, bold, tamanho) => {
    ctx.font = `${bold ? 700 : 400} 100px ${familia}`;
    return (ctx.measureText(texto).width * tamanho) / 100; // em pt
  };
}

// Garante que as fontes da medição estejam carregadas: as do aparelho (Arial/Times) ou, se não houver, Arimo/Tinos.
async function garanteFontes(fonte) {
  if (!document.fonts) return;
  const [local, web] = fonte === "Arial" ? ["CapaArial", "ArimoWeb"] : ["CapaTimes", "TinosWeb"];
  for (const peso of [400, 700]) {
    let ok = false;
    try { ok = (await document.fonts.load(`${peso} 12pt "${local}"`)).length > 0; } catch (e) { /* sem a fonte local */ }
    if (!ok) { try { await document.fonts.load(`${peso} 12pt "${web}"`); } catch (e) { /* usa o que houver */ } }
  }
}

export async function geraDocx(dados) {
  const docx = await carrega("docx");
  const { Document, Packer, Paragraph, TextRun, AlignmentType, LineRuleType } = docx;
  const modelo = montaCapa(dados);
  const fonte = modelo.font;
  await garanteFontes(fonte);
  const lay = calculaLayout(modelo, medidorCanvas(fonte));
  if (lay.excede) throw new Error("excede");

  const tw = (pt) => Math.round(pt * 20); // pontos -> twips
  // O Word coloca a sobra do espaçamento 1,5 abaixo do texto; a prévia e o PDF repartem acima e abaixo.
  // Medido no Word real: o texto fica ~3,3 pt mais alto. Descemos tudo esse tanto (só o 1º parágrafo precisa de mais espaço antes).
  // Se a capa estiver quase cheia, o ajuste é reduzido para a última linha não pular para uma 2ª página.
  const AJUSTE_WORD = Math.max(0, Math.min(3.3, lay.livre));
  const cmTw = (cm) => Math.round((cm / 2.54) * 1440);
  const paragrafos = lay.blocos.map((b, i) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      // espaçamento 1,5 linhas (o mesmo que o usuário vê no Word em Parágrafo > Espaçamento entre linhas)
      spacing: { before: tw(b.antes + (i === 0 ? AJUSTE_WORD : 0)), after: 0, line: 360, lineRule: LineRuleType.AUTO },
      children: b.runs.map((r) => new TextRun({ text: r.text, bold: r.bold, font: fonte, size: Math.round(b.size * 2), color: "000000" })),
    })
  );

  const documento = new Document({
    creator: "Estuda Simples",
    title: "Capa ABNT" + ((dados.title || "").trim() ? " – " + dados.title.trim() : ""),
    description: "Capa de trabalho acadêmico (ABNT NBR 14724)",
    styles: {
      default: {
        document: {
          run: { font: fonte, size: 24, color: "000000", language: { value: "pt-BR" } },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 360, lineRule: LineRuleType.AUTO } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: cmTw(3), left: cmTw(3), right: cmTw(2), bottom: cmTw(2), header: 709, footer: 709, gutter: 0 },
          },
        },
        children: paragrafos,
      },
    ],
  });
  return { blob: await Packer.toBlob(documento), nome: nomeArquivo(dados, "docx") };
}
