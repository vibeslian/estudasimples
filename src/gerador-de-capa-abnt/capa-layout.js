// Calcula a posição de cada linha da capa (em pontos, 1 pt = 1/72 pol), a partir do modelo.
// Usado pelo PDF (que desenha cada linha) e pelo Word (que precisa dos espaços verticais).
// A prévia usa CSS com as mesmas regras:
//   topo (instituição, curso) | autor(es), 3 linhas abaixo do topo | título centralizado no espaço que sobra | cidade e ano na base
import { PAGINA_CM, MARGENS_CM, TAMANHO_BASE, FATOR_LINHA } from "./capa-model.js";

export const PT_POR_CM = 72 / 2.54;
export const METRICAS = {
  Arial: { asc: 0.905, desc: 0.212 },
  "Times New Roman": { asc: 0.891, desc: 0.216 },
};
export const UNIDADE = TAMANHO_BASE * FATOR_LINHA; // "uma linha em branco" (20,7 pt)
export const LINHAS_ENTRE_TOPO_E_AUTOR = 3;

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

export function quebraLinhas(runs, larguraMax, medir) {
  const larg = (parts) => parts.reduce((s, p) => s + medir(p.text, p.bold), 0);
  const linhas = [];
  let linha = null;
  const nova = () => { linha = { parts: [], largura: 0 }; linhas.push(linha); };
  nova();
  for (const u of unidades(runs)) {
    const wU = larg(u.parts);
    const wEsp = u.espaco && linha.parts.length ? medir(" ", u.espaco.bold) : 0;
    if (linha.parts.length && linha.largura + wEsp + wU > larguraMax + 0.01) nova();
    else if (wEsp) { linha.parts.push({ text: " ", bold: u.espaco.bold }); linha.largura += wEsp; }
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
 * Retorna { g, blocos: [{ id, zone, size, linhas, altura, topo, antes }], excede }
 *   topo   = posição do alto do bloco na página (pt, a partir do alto da folha)
 *   antes  = espaço vertical entre este bloco e o anterior (o que o Word usa como "espaçamento antes")
 */
export function calculaLayout(modelo, medir) {
  const g = geometria();
  const U = UNIDADE;
  const blocos = modelo.blocks.map((b) => {
    const linhas = quebraLinhas(b.runs, g.larguraArea, (t, bold) => medir(t, bold, b.size));
    return { id: b.id, zone: b.zone, size: b.size, runs: b.runs, linhas, altura: linhas.length * b.size * FATOR_LINHA, topo: 0, antes: 0 };
  });
  const zona = (z) => blocos.filter((b) => b.zone === z);
  const alturaZona = (bs, lacuna) => bs.reduce((s, b, i) => s + b.altura + (i ? lacuna : 0), 0);
  const top = zona("top"), autor = zona("author"), titulo = zona("title"), base = zona("bottom");

  const hTop = alturaZona(top, 0);
  const lacunaAutor = top.length && autor.length ? LINHAS_ENTRE_TOPO_E_AUTOR * U : 0;
  const hAutor = alturaZona(autor, 0);
  const hTitulo = titulo.length ? alturaZona(titulo, U) + 2 * U : 0; // 1 linha de respiro acima e abaixo
  const hBase = alturaZona(base, U);
  const livre = g.alturaArea - (hTop + lacunaAutor + hAutor + hTitulo + hBase);
  const margem = titulo.length ? Math.max(0, livre / 2) : 0;

  const empilha = (bs, lacuna, y0) => {
    let y = y0;
    bs.forEach((b, i) => { b.topo = y; y += b.altura + (i < bs.length - 1 ? lacuna : 0); });
  };
  const yAutor = g.margemSuperior + hTop + lacunaAutor;
  const yTitulo = yAutor + hAutor + margem; // topo da zona do título (com o respiro de 1 linha)
  const yBase = titulo.length ? yTitulo + hTitulo + margem : yAutor + hAutor;
  empilha(top, 0, g.margemSuperior);
  empilha(autor, 0, yAutor);
  empilha(titulo, U, yTitulo + U);
  empilha(base, U, yBase);

  // espaço vertical antes de cada bloco (para o Word): distância do fim do bloco anterior
  const ordem = ["top", "author", "title", "bottom"].flatMap(zona);
  let fimAnterior = g.margemSuperior;
  for (const b of ordem) { b.antes = Math.max(0, b.topo - fimAnterior); fimAnterior = b.topo + b.altura; }

  return { g, blocos: ordem, excede: livre < -0.5, livre };
}

// Posição da linha de base do texto dentro de uma linha de altura (tamanho x FATOR_LINHA), igual ao CSS:
// sobra repartida igualmente acima e abaixo da área do texto (ascendente + descendente).
export function linhaBase(topoDaLinha, tamanho, fonte) {
  const m = METRICAS[fonte] || METRICAS.Arial;
  const altura = tamanho * FATOR_LINHA;
  return topoDaLinha + (altura - (m.asc + m.desc) * tamanho) / 2 + m.asc * tamanho;
}
