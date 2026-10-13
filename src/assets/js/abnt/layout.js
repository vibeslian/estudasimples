// Calcula a posição de cada linha da capa e da folha de rosto (em pontos, 1 pt = 1/72 pol), a partir do modelo.
// Usado pelo PDF (que desenha cada linha) e pelo Word (que precisa dos espaços verticais).
// A prévia usa CSS com as mesmas regras:
//   topo (logo, instituição, curso) | autor(es), 3 linhas abaixo do topo | título centralizado no espaço que sobra |
//   bloco da direita (natureza, orientador; ou disciplina e professor) | cidade e ano na base
import { PAGINA_CM, MARGENS_CM, TAMANHO_BASE, FATOR_LINHA, PT_POR_CM } from "./modelo.js";

export { PT_POR_CM };
export const METRICAS = {
  Arial: { asc: 0.905, desc: 0.212 },
  "Times New Roman": { asc: 0.891, desc: 0.216 },
};
export const UNIDADE = TAMANHO_BASE * FATOR_LINHA; // "uma linha em branco" (20,7 pt)
export const LINHAS_ENTRE_TOPO_E_AUTOR = 3;
export const LINHAS_ENTRE_LADO_E_BASE = 2;
// Em texto justificado, o Word aperta os espaços (até ~25 % da largura de cada um) para caber mais uma palavra na linha.
// Medido contra o Word real com o .docx gerado pelo site: com 0,25 as quebras de linha coincidem em 34 de 35 parágrafos (sem isso, em 14).
export const COMPRESSAO_JUSTIFICADO = 0.25;

export function geometria() {
  const cm = (v) => v * PT_POR_CM;
  return {
    largura: cm(PAGINA_CM.largura),
    altura: cm(PAGINA_CM.altura),
    margemSuperior: cm(MARGENS_CM.superior),
    margemEsquerda: cm(MARGENS_CM.esquerda),
    margemDireita: cm(MARGENS_CM.direita),
    margemInferior: cm(MARGENS_CM.inferior),
    larguraArea: cm(PAGINA_CM.largura - MARGENS_CM.esquerda - MARGENS_CM.direita),
    alturaArea: cm(PAGINA_CM.altura - MARGENS_CM.superior - MARGENS_CM.inferior),
  };
}

/* ---------- Quebra de linhas ---------- */
// Divide as "runs" ({text, bold}) em unidades que podem quebrar: palavras (separadas por espaço) e partes depois de hífen.
function unidades(runs) {
  const us = [];
  let espacoPendente = null; // {bold} se há espaço antes da próxima unidade
  let atual = null; // unidade em construção (pode juntar partes de runs diferentes sem espaço)
  const fecha = () => { if (atual) { us.push(atual); atual = null; } };
  for (const run of runs) {
    for (const parte of run.text.split(/(\s+)/)) {
      if (parte === "") continue;
      if (/^\s+$/.test(parte)) { fecha(); espacoPendente = { bold: run.bold }; continue; }
      // depois de cada hífen, é possível quebrar
      const pedacos = parte.split(/(?<=-)(?=[^-])/);
      pedacos.forEach((p, i) => {
        if (i === 0 && atual) { atual.parts.push({ text: p, bold: run.bold }); }
        else {
          fecha();
          atual = { parts: [{ text: p, bold: run.bold }], espaco: i === 0 ? espacoPendente : null };
          espacoPendente = null;
        }
        if (i < pedacos.length - 1) fecha();
      });
    }
  }
  fecha();
  return us;
}

// compressao (só texto justificado): o Word aperta os espaços da linha até essa fração da largura de cada espaço para caber mais uma palavra.
export function quebraLinhas(runs, larguraMax, medir, { compressao = 0 } = {}) {
  const larg = (parts) => parts.reduce((s, p) => s + medir(p.text, p.bold), 0);
  const linhas = [];
  let linha = null;
  const nova = () => { linha = { parts: [], largura: 0, espacos: 0 }; linhas.push(linha); };
  nova();
  for (const u of unidades(runs)) {
    const wU = larg(u.parts);
    const wEsp = u.espaco && linha.parts.length ? medir(" ", u.espaco.bold) : 0;
    const folga = compressao ? (linha.espacos + (wEsp ? 1 : 0)) * compressao * medir(" ", false) : 0;
    if (linha.parts.length && linha.largura + wEsp + wU - folga > larguraMax + 0.01) nova();
    else if (wEsp) { linha.parts.push({ text: " ", bold: u.espaco.bold }); linha.largura += wEsp; linha.espacos++; }
    if (wU > larguraMax && u.parts.length === 1) {
      // palavra maior que a linha inteira: quebra por letras (como overflow-wrap: break-word)
      let resto = u.parts[0].text;
      while (resto) {
        let n = resto.length;
        while (n > 1 && medir(resto.slice(0, n), u.parts[0].bold) > larguraMax - linha.largura) n--;
        const pedaco = resto.slice(0, n);
        linha.parts.push({ text: pedaco, bold: u.parts[0].bold });
        linha.largura += medir(pedaco, u.parts[0].bold);
        resto = resto.slice(n);
        if (resto) nova();
      }
    } else {
      for (const p of u.parts) linha.parts.push({ ...p });
      linha.largura += wU;
    }
  }
  return linhas;
}

/* ---------- Posições ---------- */
/**
 * medir(texto, bold, tamanhoPt) -> largura em pt
 * Retorna { g, blocos, excede, livre }; cada bloco traz:
 *   topo   = posição do alto do bloco na página (pt, a partir do alto da folha)
 *   antes  = espaço vertical entre este bloco e o anterior (o que o Word usa como "espaçamento antes")
 *   x0, larguraBloco = onde o texto começa e a largura disponível (menor que a área útil quando há recuo)
 */
export function calculaLayout(modelo, medir) {
  const g = geometria();
  const U = UNIDADE;
  const blocos = modelo.blocks.map((b) => {
    if (b.kind === "imagem") {
      return { ...b, linhas: [], altura: b.altura, larguraBloco: b.largura, x0: g.margemEsquerda + (g.larguraArea - b.largura) / 2, topo: 0, antes: 0 };
    }
    const recuo = b.recuo || 0;
    const larguraBloco = g.larguraArea - recuo;
    const linhas = quebraLinhas(b.runs, larguraBloco, (t, bold) => medir(t, bold, b.size), { compressao: b.align === "justify" ? COMPRESSAO_JUSTIFICADO : 0 });
    return { ...b, linhas, larguraBloco, x0: g.margemEsquerda + recuo, altura: linhas.length * b.size * b.fator, topo: 0, antes: 0 };
  });
  const zona = (z) => blocos.filter((b) => b.zone === z);
  const alturaZona = (bs) => bs.reduce((s, b, i) => s + b.altura + (i ? b.gap * U : 0), 0);
  const top = zona("top"), autor = zona("author"), titulo = zona("title"), lado = zona("side"), base = zona("bottom");

  const hTop = alturaZona(top);
  const lacunaAutor = top.length && autor.length ? LINHAS_ENTRE_TOPO_E_AUTOR * U : 0;
  const hAutor = alturaZona(autor);
  const hTitulo = titulo.length ? alturaZona(titulo) + 2 * U : 0; // 1 linha de respiro acima e abaixo
  const hLado = alturaZona(lado);
  const lacunaLado = lado.length ? LINHAS_ENTRE_LADO_E_BASE * U : 0;
  const hBase = alturaZona(base);
  const livre = g.alturaArea - (hTop + lacunaAutor + hAutor + hTitulo + hLado + lacunaLado + hBase);
  const margem = titulo.length ? Math.max(0, livre / 2) : 0;

  const empilha = (bs, y0) => {
    let y = y0;
    bs.forEach((b, i) => { if (i) y += b.gap * U; b.topo = y; y += b.altura; });
  };
  const yAutor = g.margemSuperior + hTop + lacunaAutor;
  const yTitulo = yAutor + hAutor + margem; // topo da zona do título (com o respiro de 1 linha)
  const yLado = titulo.length ? yTitulo + hTitulo + margem : yAutor + hAutor;
  const yBase = yLado + hLado + lacunaLado;
  empilha(top, g.margemSuperior);
  empilha(autor, yAutor);
  empilha(titulo, yTitulo + U);
  empilha(lado, yLado);
  empilha(base, yBase);

  // espaço vertical antes de cada bloco (para o Word): distância do fim do bloco anterior
  const ordem = ["top", "author", "title", "side", "bottom"].flatMap(zona);
  let fimAnterior = g.margemSuperior;
  for (const b of ordem) { b.antes = Math.max(0, b.topo - fimAnterior); fimAnterior = b.topo + b.altura; }

  return { g, blocos: ordem, excede: livre < -0.5, livre };
}

// Posição da linha de base do texto dentro de uma linha de altura (tamanho x fator), igual ao CSS:
// sobra repartida igualmente acima e abaixo da área do texto (ascendente + descendente).
export function linhaBase(topoDaLinha, tamanho, fonte, fator = FATOR_LINHA) {
  const m = METRICAS[fonte] || METRICAS.Arial;
  const altura = tamanho * fator;
  return topoDaLinha + (altura - (m.asc + m.desc) * tamanho) / 2 + m.asc * tamanho;
}
