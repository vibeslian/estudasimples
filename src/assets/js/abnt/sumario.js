// Calcula a posição de cada linha do SUMÁRIO (em pontos), em uma ou várias páginas A4, a partir do modelo (montaSumario).
// Usado pela prévia, pelo PDF e pelo Word (que usa os mesmos recuos). Ver docs/norma-abnt-sumario.md.
//   [indicativo] [título ... com mais linhas alinhadas sob a 1ª letra do título] ..........[página]
import { TAMANHO_BASE, FATOR_LINHA, FATOR_SIMPLES } from "./modelo.js";
import { geometria, quebraLinhas } from "./layout.js";

export const FOLGA_PAGINA = 8; // pt entre o fim do título e o número da página (o título quebra antes dessa faixa)
// Word coloca a sobra do espaçamento 1,5 abaixo do texto: o texto fica ~3,3 pt mais alto que no cálculo centrado da prévia e do PDF.
// No sumário não usamos "espaço antes" no Word (as páginas seguintes o ignorariam); em vez disso o PDF e a prévia sobem o texto esse tanto.
export const SOBE_TEXTO_1_5 = 3.3;

/**
 * medir(texto, bold, tamanhoPt, italic) -> largura em pt
 * Retorna { g, fator, lh, paginas: [{ itens: [{ e, topo, xt, linhas, pad, numeroW, pagW, pontos, pagX }], tituloTopo? }], sobe }
 *   topo   = alto do bloco do item na página (pt, desde o alto da folha)
 *   xt     = onde começa o título, desde a margem esquerda
 *   pontos = { x, n } posição (desde a margem esquerda) e quantidade de pontos, ou null
 */
export function calculaSumario(modelo, medir) {
  const g = geometria();
  const op = modelo.opcoes;
  const size = TAMANHO_BASE;
  const fator = op.espaco === "1" ? FATOR_SIMPLES : FATOR_LINHA;
  const lh = size * fator;
  const areaW = g.larguraArea;
  const m = (t, e) => medir(t, e.bold, size, e.italic);
  const wEsp = medir(" ", false, size, false);

  const itens = modelo.entradas.map((e) => ({ e, numeroW: e.numero ? m(e.numero, e) : 0, pagW: e.pagina ? m(e.pagina, e) : 0 }));
  const maxNum = itens.reduce((mx, i) => Math.max(mx, i.numeroW), 0);
  const alinhado = op.alinha === "indicativo" && maxNum > 0;

  for (const it of itens) {
    const { e } = it;
    if (e.numero) it.xt = (alinhado ? maxNum : it.numeroW) + wEsp;
    else it.xt = alinhado && op.alinhaPos ? maxNum + wEsp : 0; // Referências, Apêndices e Anexos (6027, 5.2)
    it.pad = e.pagina ? it.pagW + FOLGA_PAGINA : 0; // faixa reservada à direita, para o número da página
    it.linhas = quebraLinhas([{ text: e.texto, bold: e.bold, italic: e.italic }], Math.max(40, areaW - it.xt - it.pad), (t, b, i) => medir(t, b, size, i));
    it.altura = it.linhas.length * lh;
    const ultima = it.linhas[it.linhas.length - 1];
    it.pontos = null;
    if (e.pagina) {
      it.pagX = areaW - it.pagW;
      if (op.pontilhado) {
        // pontos alinhados em uma grade ancorada na margem direita (como o Word), do fim do texto até antes do número
        const pw = medir(".", false, size, false);
        const kMin = Math.ceil(1 + it.pagW / pw - 1e-9);
        const fimTexto = it.xt + ultima.largura;
        const kMax = Math.floor((areaW - fimTexto) / pw + 1e-9);
        if (kMax >= kMin) it.pontos = { x: areaW - kMax * pw, n: kMax - kMin + 1 };
      }
    }
  }

  // Paginação: o título "SUMÁRIO" (1 linha + 1 linha em branco) só na primeira página; um item nunca é cortado entre duas páginas.
  // O Word deixa o espaço extra do interlineado 1,5 (abaixo do texto de cada linha) passar da margem inferior; a linha cabe se o texto cabe.
  const folgaFundo = fator > 1.4 ? lh - size * FATOR_SIMPLES : 0;
  const fundo = g.margemSuperior + g.alturaArea + folgaFundo;
  const paginas = [{ itens: [] }];
  let y = g.margemSuperior + 2 * lh;
  for (const it of itens) {
    if (y + it.altura > fundo + 0.01 && paginas[paginas.length - 1].itens.length) {
      paginas.push({ itens: [] });
      y = g.margemSuperior;
    }
    it.topo = y;
    y += it.altura;
    paginas[paginas.length - 1].itens.push(it);
  }
  const sobe = fator > 1.4 ? SOBE_TEXTO_1_5 : 0;
  return { g, fator, lh, size, areaW, paginas, sobe, tituloTopo: g.margemSuperior, maxNum, alinhado };
}
