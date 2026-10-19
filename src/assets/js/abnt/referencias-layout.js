// Posição de cada linha da página REFERÊNCIAS (NBR 6023:2018 e NBR 14724:2024), em pontos, em uma ou mais páginas A4.
// Usado pela prévia, pelo PDF e pelo Word (que usa os mesmos espaços). Regras da página:
//   - o título REFERÊNCIAS, centralizado e em negrito, sem número, com uma linha em branco (espaçamento 1,5) depois;
//   - cada referência em ESPAÇO SIMPLES, alinhada à margem esquerda (sem recuo), separada da próxima por uma linha em branco simples;
//   - uma referência não é cortada entre duas páginas.
import { TAMANHO_BASE, FATOR_LINHA, FATOR_SIMPLES } from "./modelo.js";
import { geometria, quebraLinhas } from "./layout.js";
import { SOBE_TEXTO_1_5 } from "./sumario.js";

/**
 * modelo: { font, titulo: { text, bold }, refs: [{ runs: [{ text, bold }], placeholder? }] }
 * medir(texto, bold, tamanhoPt, italic) -> largura em pt
 * Retorna { g, size, lh, lhTitulo, sobe, tituloTopo, areaW, paginas: [{ itens: [{ ref, topo, linhas, altura }] }] }
 */
export function calculaReferencias(modelo, medir) {
  const g = geometria();
  const size = TAMANHO_BASE;
  const lh = size * FATOR_SIMPLES; // espaço simples (13,8 pt): entre as linhas e para a linha em branco entre as referências
  const lhTitulo = size * FATOR_LINHA; // o título e a linha em branco depois dele ficam em espaçamento 1,5
  const itens = modelo.refs.map((ref) => {
    const linhas = quebraLinhas(ref.runs, g.larguraArea, (t, b, i) => medir(t, b, size, i));
    return { ref, linhas, altura: linhas.length * lh, topo: 0 };
  });
  const fundo = g.margemSuperior + g.alturaArea;
  const paginas = [{ itens: [] }];
  let y = g.margemSuperior + 2 * lhTitulo;
  for (const it of itens) {
    if (y + it.altura > fundo + 0.01 && paginas[paginas.length - 1].itens.length) {
      paginas.push({ itens: [] });
      y = g.margemSuperior;
    }
    it.topo = y;
    y += it.altura + lh;
    paginas[paginas.length - 1].itens.push(it);
  }
  return { g, size, lh, lhTitulo, areaW: g.larguraArea, paginas, sobe: SOBE_TEXTO_1_5, tituloTopo: g.margemSuperior };
}
