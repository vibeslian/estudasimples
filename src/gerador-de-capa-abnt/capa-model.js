// Modelo da capa ABNT: recebe os dados do formulário e devolve a lista de parágrafos da capa,
// já com maiúsculas, negrito e tamanhos aplicados.
// A prévia, o PDF e o Word usam ESTE mesmo modelo, para saírem iguais.

export const PAGINA_CM = { largura: 21, altura: 29.7 }; // A4
export const MARGENS_CM = { superior: 3, esquerda: 3, direita: 2, inferior: 2 }; // ABNT NBR 14724, 5.1
export const TAMANHO_BASE = 12; // pt
// "Espaçamento 1,5" do Word = 1,5 x a altura simples da linha (1,15 x o tamanho da fonte em Arial e Times New Roman).
// Usamos o mesmo passo na prévia, no PDF e no Word para que os três saiam iguais.
export const FATOR_LINHA = 1.5 * 1.15; // 1,725 x tamanho da fonte

// Estilo padrão (o aplicado ao abrir a ferramenta)
export const ESTILO_PADRAO = {
  institution: { caps: true, bold: true },
  course: { caps: true, bold: true },
  author: { caps: true, bold: true },
  title: { caps: true, bold: true },
  subtitle: { caps: false, bold: false },
  city: { caps: true, bold: true },
  year: { caps: false, bold: true },
};
export const TAMANHO_TITULO_PADRAO = 12;

const limpa = (s) => (s || "").replace(/\s+/g, " ").trim();
const aplica = (texto, est) => (est.caps ? texto.toLocaleUpperCase("pt-BR") : texto);

// "2" -> "v. 2"; qualquer outro texto é mantido como o usuário digitou
export function formataVolume(v) {
  v = limpa(v);
  if (!v) return "";
  return /^\d+$/.test(v) ? `v. ${v}` : v;
}

/**
 * dados: { institution, course, authors[], title, subtitle, volume, city, year,
 *          font ("Arial" | "Times New Roman"), titleSize (12|14|16), style }
 * opcoes.previa: se true, campos obrigatórios vazios aparecem como exemplo (placeholder: true).
 *                Nunca use previa:true para gerar PDF/Word.
 * Retorna { font, blocks: [{ id, zone, size, placeholder, runs: [{ text, bold }] }] }
 * zone: "top" | "author" | "title" | "bottom"
 */
export function montaCapa(dados, { previa = false } = {}) {
  const est = dados.style || ESTILO_PADRAO;
  const blocks = [];
  const add = (id, zone, runs, size = TAMANHO_BASE, placeholder = false) =>
    blocks.push({ id, zone, size, placeholder, runs });

  const um = (id, zone, valor, chave, exemplo) => {
    const texto = limpa(valor);
    if (texto) add(id, zone, [{ text: aplica(texto, est[chave]), bold: est[chave].bold }]);
    else if (previa && exemplo) add(id, zone, [{ text: aplica(exemplo, est[chave]), bold: est[chave].bold }], TAMANHO_BASE, true);
  };

  // Ordem da NBR 14724:2024 (4.1.1): instituição, autor, título, subtítulo, volume, cidade, ano.
  // O curso/departamento não está na norma, mas os manuais o colocam logo abaixo da instituição.
  um("institution", "top", dados.institution, "institution");
  um("course", "top", dados.course, "course");

  const autores = (dados.authors || []).map(limpa).filter(Boolean);
  if (autores.length) autores.forEach((a, i) => add("author-" + i, "author", [{ text: aplica(a, est.author), bold: est.author.bold }]));
  else if (previa) add("author-0", "author", [{ text: aplica("Nome do autor", est.author), bold: est.author.bold }], TAMANHO_BASE, true);

  const tamTitulo = Number(dados.titleSize) || TAMANHO_TITULO_PADRAO;
  const titulo = limpa(dados.title);
  const subtitulo = limpa(dados.subtitle).replace(/^:\s*/, "");
  if (titulo || previa) {
    const base = titulo || "Título do trabalho";
    const runs = [];
    // o subtítulo vem precedido de dois-pontos (NBR 14724, 4.1.1 d)
    const tituloTexto = subtitulo && !/:$/.test(base) ? base + ":" : base;
    runs.push({ text: aplica(tituloTexto, est.title), bold: est.title.bold });
    if (subtitulo) runs.push({ text: " " + aplica(subtitulo, est.subtitle), bold: est.subtitle.bold });
    add("title", "title", runs, tamTitulo, !titulo);
  }

  const vol = formataVolume(dados.volume);
  if (vol) add("volume", "title", [{ text: aplica(vol, est.subtitle), bold: est.subtitle.bold }]);

  um("city", "bottom", dados.city, "city", "Cidade");
  um("year", "bottom", String(dados.year ?? ""), "year", "Ano");

  return { font: dados.font === "Times New Roman" ? "Times New Roman" : "Arial", blocks };
}
