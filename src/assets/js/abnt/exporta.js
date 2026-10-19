// Gera os arquivos PDF e Word da capa, da folha de rosto e/ou do sumário, no navegador. Nenhum dado é enviado a servidor algum.
// As bibliotecas (jsPDF e docx) ficam no próprio site, em /assets/js/vendor/: nenhum dado nem pedido sai para terceiros.
// Só são baixadas quando o usuário se aproxima do botão ou pede o arquivo.
import { montaCapa, montaFolha, montaSumario, textoDaNatureza, FATOR_LINHA } from "./modelo.js";
import { calculaLayout, linhaBase } from "./layout.js";
import { calculaSumario } from "./sumario.js";

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

const NOME_PAGINA = { capa: "capa", folha: "folha de rosto", sumario: "sumário" };
const MONTA = { capa: montaCapa, folha: montaFolha };
const limpa = (s) => (s || "").replace(/\s+/g, " ").trim();

/* ---------- Validação ---------- */
export function camposFaltando(dados, paginas = ["capa"]) {
  const falta = [];
  if (paginas.includes("capa") || paginas.includes("folha")) {
    if (!(dados.authors || []).some((a) => (a || "").trim())) falta.push({ id: "autor", rotulo: "o nome do autor" });
    if (!(dados.title || "").trim()) falta.push({ id: "title", rotulo: "o título" });
    if (!(dados.city || "").trim()) falta.push({ id: "city", rotulo: "a cidade" });
    if (!String(dados.year || "").trim()) falta.push({ id: "year", rotulo: "o ano" });
  }
  if (paginas.includes("folha")) {
    if (!dados.natureManual && !(dados.institution || "").trim() && dados.workType !== "outro") {
      falta.push({ id: "institution", rotulo: "a instituição (ela entra no texto da natureza do trabalho)" });
    }
    if (!textoDaNatureza(dados)) falta.push({ id: "nature", rotulo: "o texto da natureza do trabalho" });
  }
  if (paginas.includes("sumario")) {
    const es = (dados.sumario && dados.sumario.entradas) || [];
    if (!es.length) falta.push({ id: "addSecao", rotulo: "pelo menos um item do sumário (use o gerador de sumário)" });
    else {
      const i = es.findIndex((e) => !limpa(e.titulo));
      if (i >= 0) falta.push({ id: "sumTitulo-" + i, rotulo: `o título do item ${i + 1} do sumário` });
    }
  }
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

const PREFIXO = { capa: "capa", folha: "folha-de-rosto", sumario: "sumario" };
function nomeArquivo(dados, ext, paginas) {
  const slug = (dados.title || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  const partes = paginas.map((p) => PREFIXO[p]);
  const base = partes.length === 1 ? partes[0] : partes.slice(0, -1).join("-") + "-e-" + partes[partes.length - 1];
  return `${base}-abnt${slug ? "-" + slug : ""}.${ext}`;
}
const juntaNomes = (paginas) => {
  const n = paginas.map((p) => NOME_PAGINA[p]);
  const texto = n.length === 1 ? n[0] : n.slice(0, -1).join(", ") + " e " + n[n.length - 1];
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
function tituloDoc(dados, paginas) {
  const t = (dados.title || "").trim();
  return juntaNomes(paginas) + " ABNT" + (t ? " – " + t : "");
}
const assuntoDoc = (paginas) => juntaNomes(paginas) + " de trabalho acadêmico (ABNT NBR 14724" + (paginas.includes("sumario") ? ", NBR 6027 e NBR 6024" : "") + ")";

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
const contaEspacos = (s) => (s.match(/ /g) || []).length;
const estiloPdf = (e) => (e.bold && e.italic ? "bolditalic" : e.bold ? "bold" : e.italic ? "italic" : "normal");

// O sumário vai ao PDF e ao Word sem os textos de exemplo e só com caracteres que a fonte padrão do PDF tem
function sumarioLimpo(dados) {
  const modelo = montaSumario(dados);
  modelo.entradas = modelo.entradas.map((e) => ({ ...e, texto: paraWinAnsi(e.texto), numero: paraWinAnsi(e.numero), pagina: paraWinAnsi(e.pagina) }));
  return modelo;
}

/* ---------- PDF ---------- */
export async function geraPdf(dados, paginas = ["capa"]) {
  const jsPDF = await carrega("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  let primeira = true;
  const novaPagina = () => { if (!primeira) doc.addPage("a4", "portrait"); primeira = false; };

  for (const pagina of paginas) {
    if (pagina === "sumario") {
      const modelo = sumarioLimpo(dados);
      const fonte = modelo.font;
      const familia = fonte === "Arial" ? "helvetica" : "times";
      await garanteFontes(fonte);
      const medir = medidorCanvas(fonte);
      const lay = calculaSumario(modelo, medir);
      const x0 = lay.g.margemEsquerda;
      lay.paginas.forEach((pg, k) => {
        novaPagina();
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(lay.size);
        if (k === 0) {
          const est = { bold: modelo.titulo.bold, italic: false };
          doc.setFont(familia, estiloPdf(est));
          const w = medir(modelo.titulo.text, est.bold, lay.size, false);
          doc.text(modelo.titulo.text, x0 + (lay.areaW - w) / 2, linhaBase(lay.tituloTopo, lay.size, fonte, lay.fator) - lay.sobe);
        }
        for (const it of pg.itens) {
          const { e } = it;
          it.linhas.forEach((linha, i) => {
            const baseY = linhaBase(it.topo + i * lay.lh, lay.size, fonte, lay.fator) - lay.sobe;
            doc.setFont(familia, estiloPdf(e));
            if (i === 0 && e.numero) doc.text(e.numero, x0, baseY);
            const textoLinha = linha.parts.map((p) => p.text).join("");
            if (textoLinha.trim()) doc.text(textoLinha, x0 + it.xt, baseY);
            if (i === it.linhas.length - 1 && e.pagina) {
              if (it.pontos) { doc.setFont(familia, "normal"); doc.text(".".repeat(it.pontos.n), x0 + it.pontos.x, baseY); doc.setFont(familia, estiloPdf(e)); }
              doc.text(e.pagina, x0 + it.pagX, baseY);
            }
          });
        }
      });
      continue;
    }

    const modelo = MONTA[pagina](dados); // sem textos de exemplo
    modelo.blocks = modelo.blocks.map((b) => (b.kind === "imagem" ? b : { ...b, runs: b.runs.map((r) => ({ ...r, text: paraWinAnsi(r.text) })) }));
    const fonte = modelo.font;
    const familia = fonte === "Arial" ? "helvetica" : "times";
    // Medimos com o canvas (Arial/Times reais ou Arimo/Tinos), igual à prévia e ao Word. O getStringUnitWidth do jsPDF arredonda a largura
    // de cada letra para baixo (0,556 vira 0,55) e deixava as linhas ~0,5 % mais curtas: o PDF quebrava linhas em outro ponto que a prévia.
    await garanteFontes(fonte);
    const medir = medidorCanvas(fonte);
    const lay = calculaLayout(modelo, medir);
    if (lay.excede) throw new Error("excede:" + pagina);
    novaPagina();

    for (const b of lay.blocos) {
      if (b.kind === "imagem") {
        doc.addImage(b.src, b.tipo === "image/png" ? "PNG" : "JPEG", b.x0, b.topo, b.largura, b.altura, undefined, "FAST");
        continue;
      }
      b.linhas.forEach((linha, i) => {
        const baseY = linhaBase(b.topo + i * b.size * b.fator, b.size, fonte, b.fator);
        const ultima = i === b.linhas.length - 1;
        const nEsp = linha.parts.reduce((s, p) => s + contaEspacos(p.text), 0);
        // texto justificado: a sobra da linha é repartida entre os espaços (como o Word faz); a última linha não é esticada,
        // mas, se o Word a apertou para caber (linha mais larga que o bloco), também é apertada
        const extra = b.align === "justify" && nEsp && (!ultima || linha.largura > b.larguraBloco) ? (b.larguraBloco - linha.largura) / nEsp : 0;
        let x = b.align === "center" ? b.x0 + (b.larguraBloco - linha.largura) / 2 : b.x0;
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
            if (extra) doc.internal.write(extra.toFixed(4) + " Tw"); // espaço extra entre palavras
            doc.text(trecho.text, x, baseY);
            if (extra) doc.internal.write("0 Tw");
          }
          x += medir(trecho.text, trecho.bold, b.size) + extra * contaEspacos(trecho.text);
        }
      });
    }
  }

  doc.setProperties({
    title: tituloDoc(dados, paginas),
    subject: assuntoDoc(paginas),
    author: autoresDe(dados).join(", "),
    creator: "Estuda Simples",
  });
  try { doc.setLanguage("pt-BR"); } catch (e) { /* versões antigas não têm */ }
  return { blob: doc.output("blob"), nome: nomeArquivo(dados, "pdf", paginas) };
}

/* ---------- Word (.docx) ---------- */
export function medidorCanvas(fonte) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fontKerning = "none";
  // mesmas famílias da prévia (ferramenta.js): Arial/Times do aparelho ou, se não houver, Arimo/Tinos (mesmas medidas)
  const familia = fonte === "Arial" ? '"CapaArial", "ArimoWeb", Arial, Helvetica, sans-serif' : '"CapaTimes", "TinosWeb", "Times New Roman", Times, serif';
  return (texto, bold, tamanho, italic) => {
    ctx.font = `${italic ? "italic " : ""}${bold ? 700 : 400} 100px ${familia}`;
    return (ctx.measureText(texto).width * tamanho) / 100; // em pt
  };
}

// Garante que as fontes da medição estejam carregadas: as do aparelho (Arial/Times) ou, se não houver, Arimo/Tinos.
export async function garanteFontes(fonte) {
  if (!document.fonts) return;
  const [local, web] = fonte === "Arial" ? ["CapaArial", "ArimoWeb"] : ["CapaTimes", "TinosWeb"];
  for (const estilo of ["", "italic "]) for (const peso of [400, 700]) {
    let ok = false;
    try { ok = (await document.fonts.load(`${estilo}${peso} 12pt "${local}"`)).length > 0; } catch (e) { /* sem a fonte local */ }
    if (!ok) { try { await document.fonts.load(`${estilo}${peso} 12pt "${web}"`); } catch (e) { /* usa o que houver */ } }
  }
}

// O Word coloca a sobra do espaçamento 1,5 abaixo do texto; a prévia e o PDF repartem acima e abaixo.
// Medido no Word real: o texto de um parágrafo com espaçamento 1,5 fica ~3,3 pt mais alto que na prévia (com espaço simples, não).
// Se a página estiver quase cheia, o ajuste é reduzido para a última linha não pular para outra página.
const AJUSTE_WORD = 3.3;

const dataUrlParaBytes = (src) => Uint8Array.from(atob(src.split(",")[1]), (c) => c.charCodeAt(0));

export async function geraDocx(dados, paginas = ["capa"]) {
  const docx = await carrega("docx");
  const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, LineRuleType, SectionType, Tab, TabStopType, LeaderType } = docx;
  const tw = (pt) => Math.round(pt * 20); // pontos -> twips
  const cmTw = (cm) => Math.round((cm / 2.54) * 1440);
  const ALINHA = { center: AlignmentType.CENTER, left: AlignmentType.LEFT, justify: AlignmentType.JUSTIFIED };

  const secoes = [];
  let fonteDoc = "Arial";
  for (const [indice, pagina] of paginas.entries()) {
    let paragrafos;
    if (pagina === "sumario") {
      const modelo = sumarioLimpo(dados);
      const fonte = modelo.font;
      fonteDoc = fonte;
      await garanteFontes(fonte);
      const lay = calculaSumario(modelo, medidorCanvas(fonte));
      const linhaWord = lay.fator > 1.4 ? 360 : 240;
      const run = (texto, e) => new TextRun({ text: texto, bold: e.bold, italics: e.italic, font: fonte, size: 24, color: "000000" });
      const tab = () => new TextRun({ children: [new Tab()], font: fonte, size: 24 });
      // Título "SUMÁRIO": centralizado, com uma linha em branco depois. Sem "espaço antes": o texto já fica onde a prévia o desenha.
      paragrafos = [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: tw(lay.lh), line: linhaWord, lineRule: LineRuleType.AUTO },
        keepNext: true,
        children: [run(modelo.titulo.text, { bold: modelo.titulo.bold, italic: false })],
      })];
      for (const pg of lay.paginas) {
        for (const it of pg.itens) {
          const { e } = it;
          const filhos = [];
          if (e.numero) filhos.push(run(e.numero, e), tab());
          else if (it.xt > 0) filhos.push(tab());
          filhos.push(run(e.texto, e));
          if (e.pagina) filhos.push(tab(), run(e.pagina, e));
          paragrafos.push(new Paragraph({
            alignment: AlignmentType.LEFT,
            // sangria francesa: a 1ª linha começa na margem e as seguintes ficam sob a 1ª letra do título; o número da página fica numa tabulação
            // à direita (com pontos), depois da faixa reservada no recuo direito
            indent: { left: tw(it.xt), hanging: tw(it.xt), right: tw(it.pad) },
            tabStops: e.pagina ? [{ type: TabStopType.RIGHT, position: tw(lay.areaW), leader: modelo.opcoes.pontilhado ? LeaderType.DOT : LeaderType.NONE }] : [],
            spacing: { before: 0, after: 0, line: linhaWord, lineRule: LineRuleType.AUTO },
            keepLines: true, // um item não é cortado entre duas páginas
            widowControl: false,
            children: filhos,
          }));
        }
      }
    } else {
      const modelo = MONTA[pagina](dados);
      const fonte = modelo.font;
      fonteDoc = fonte;
      await garanteFontes(fonte);
      const lay = calculaLayout(modelo, medidorCanvas(fonte));
      if (lay.excede) throw new Error("excede:" + pagina);

      const ajuste = AJUSTE_WORD * Math.max(0, Math.min(1, lay.livre / AJUSTE_WORD));
      let fimAnterior = lay.g.margemSuperior; // fim do bloco anterior, como o Word o posiciona
      paragrafos = lay.blocos.map((b) => {
        const off = b.kind === "texto" && b.fator > 1.4 ? ajuste : 0;
        const antes = Math.max(0, b.topo + off - fimAnterior);
        fimAnterior += antes + b.altura;
        if (b.kind === "imagem") {
          return new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: tw(antes), after: 0, line: 240, lineRule: LineRuleType.AUTO },
            run: { size: 2 },
            children: [new ImageRun({ type: b.tipo === "image/png" ? "png" : "jpg", data: dataUrlParaBytes(b.src), transformation: { width: (b.largura * 96) / 72, height: (b.altura * 96) / 72 } })],
          });
        }
        return new Paragraph({
          alignment: ALINHA[b.align] || AlignmentType.CENTER,
          indent: b.recuo ? { left: tw(b.recuo) } : undefined,
          // espaçamento 1,5 linhas (o mesmo que o usuário vê no Word em Parágrafo > Espaçamento entre linhas); a natureza usa espaço simples
          spacing: { before: tw(antes), after: 0, line: b.fator > 1.4 ? 360 : 240, lineRule: LineRuleType.AUTO },
          children: b.runs.map((r) => new TextRun({ text: r.text, bold: r.bold, font: fonte, size: Math.round(b.size * 2), color: "000000" })),
        });
      });
    }
    secoes.push({
      properties: {
        ...(indice > 0 ? { type: SectionType.NEXT_PAGE } : {}),
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: cmTw(3), left: cmTw(3), right: cmTw(2), bottom: cmTw(2), header: 709, footer: 709, gutter: 0 },
        },
      },
      children: paragrafos,
    });
  }

  const documento = new Document({
    creator: "Estuda Simples",
    title: tituloDoc(dados, paginas),
    description: assuntoDoc(paginas),
    styles: {
      default: {
        document: {
          run: { font: fonteDoc, size: 24, color: "000000", language: { value: "pt-BR" } },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 360, lineRule: LineRuleType.AUTO } },
        },
      },
    },
    sections: secoes,
  });
  return { blob: await Packer.toBlob(documento), nome: nomeArquivo(dados, "docx", paginas) };
}

export { NOME_PAGINA, FATOR_LINHA, carrega, paraWinAnsi, estiloPdf };
