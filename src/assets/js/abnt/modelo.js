// Modelo da capa e da folha de rosto ABNT: recebe os dados do formulário e devolve a lista de blocos de texto
// (ou de imagem, para o logo), já com maiúsculas, negrito, tamanhos, alinhamento e recuo aplicados.
// A prévia, o PDF e o Word usam ESTE mesmo modelo, para saírem iguais.
// Sem DOM: dá para testar em Node.

export const PAGINA_CM = { largura: 21, altura: 29.7 }; // A4
export const MARGENS_CM = { superior: 3, esquerda: 3, direita: 2, inferior: 2 }; // ABNT NBR 14724, 5.1
export const PT_POR_CM = 72 / 2.54;
export const TAMANHO_BASE = 12; // pt
// "Espaçamento 1,5" do Word = 1,5 x a altura simples da linha (1,15 x o tamanho da fonte em Arial e Times New Roman).
// Usamos o mesmo passo na prévia, no PDF e no Word para que os três saiam iguais.
export const FATOR_SIMPLES = 1.15; // espaço simples (usado na natureza do trabalho, NBR 14724, 5.2)
export const FATOR_LINHA = 1.5 * FATOR_SIMPLES; // 1,725 x tamanho da fonte
// A natureza do trabalho começa no meio da mancha gráfica (NBR 14724, 5.2): 16 cm de largura útil / 2 = 8 cm da margem esquerda.
export const RECUO_CM = (PAGINA_CM.largura - MARGENS_CM.esquerda - MARGENS_CM.direita) / 2;
export const RECUO_PT = RECUO_CM * PT_POR_CM;

// Estilo padrão (o aplicado ao abrir a ferramenta)
export const ESTILO_PADRAO = {
  institution: { caps: true, bold: true },
  course: { caps: true, bold: true },
  author: { caps: true, bold: true },
  title: { caps: true, bold: true },
  subtitle: { caps: false, bold: false },
  city: { caps: true, bold: true },
  year: { caps: false, bold: true },
  orientador: { caps: false, bold: false }, // orientador, coorientador, professor e disciplina
};
export const TAMANHO_TITULO_PADRAO = 12;

export const ROTULOS = {
  orientador: ["Orientador", "Orientadora", "Orientador(a)"],
  coorientador: ["Coorientador", "Coorientadora", "Coorientador(a)"],
  professor: ["Professor", "Professora", "Professor(a)"],
};
export const ALTURA_LOGO_CM = { pequeno: 1.5, medio: 2.5, grande: 3.5 };

// Tipos de trabalho da natureza (NBR 14724, 4.2.1.1.1 e): o texto é montado a partir destes modelos e pode ser editado.
export const TIPOS_TRABALHO = [
  { id: "tcc", nome: "Trabalho de Conclusão de Curso (TCC)", titulo: true, exemplo: "Bacharel em Administração" },
  { id: "monografia", nome: "Monografia (graduação)", titulo: true, exemplo: "Licenciado em Pedagogia" },
  { id: "especializacao", nome: "Especialização ou MBA", titulo: true, exemplo: "Especialista em Gestão de Pessoas" },
  { id: "dissertacao", nome: "Dissertação (mestrado)", titulo: true, exemplo: "Mestre em Educação" },
  { id: "tese", nome: "Tese (doutorado)", titulo: true, exemplo: "Doutor em Educação" },
  { id: "disciplina", nome: "Trabalho de disciplina", titulo: false, exemplo: "" },
  { id: "projeto", nome: "Projeto de pesquisa", titulo: false, exemplo: "aprovação na disciplina de Metodologia da Pesquisa" },
  { id: "relatorio", nome: "Relatório de estágio", titulo: false, exemplo: "aprovação na disciplina de Estágio Supervisionado" },
  { id: "outro", nome: "Outro (escrevo o texto)", titulo: false, exemplo: "" },
];

const limpa = (s) => (s || "").replace(/\s+/g, " ").trim();
const aplica = (texto, est) => (est.caps ? texto.toLocaleUpperCase("pt-BR") : texto);

// "2" -> "v. 2"; qualquer outro texto é mantido como o usuário digitou
export function formataVolume(v) {
  v = limpa(v);
  if (!v) return "";
  return /^\d+$/.test(v) ? `v. ${v}` : v;
}

/* ---------- Texto da natureza do trabalho ---------- */
// Instituições masculinas (do/ao) x femininas (da/à). Na dúvida, feminino (Universidade, Faculdade, Escola, Fundação).
const MASC_INST = /^(instituto|centro|colégio|colegio|departamento|núcleo|nucleo|conservatório|seminário|campus|complexo|polo|pólo|if[a-z]{0,4}|senai|senac|cefet[\w-]*|ita|ime)(?![a-zà-ú])/i;
const instDe = (i) => (i ? `${MASC_INST.test(i) ? "do" : "da"} ${i}` : "");
const instA = (i) => (i ? `${MASC_INST.test(i) ? "ao" : "à"} ${i}` : "");

// "Administração" -> { art: "ao", nome: "Curso de Administração" }
function cursoFrase(curso) {
  const c = limpa(curso);
  if (!c) return null;
  if (/^(curso|programa|departamento|bacharelado|mestrado|doutorado|instituto|centro|núcleo)(?![a-zà-ú])/i.test(c)) return { art: "ao", nome: c };
  if (/^(licenciatura|faculdade|escola|graduação|pós-graduação|especialização|coordenação|área)(?![a-zà-ú])/i.test(c)) return { art: "à", nome: c };
  return { art: "ao", nome: "Curso de " + c };
}
const doCurso = (cf) => (cf.art === "ao" ? "do " : "da ") + cf.nome;

/**
 * Monta o texto da natureza (tipo do trabalho, objetivo, instituição, área de concentração) a partir dos campos.
 * Para o tipo "outro" devolve "" (o usuário escreve o texto).
 */
export function textoNatureza(d) {
  const tipo = d.workType || "tcc";
  const inst = limpa(d.institution);
  const grau = limpa(d.degree);
  const area = limpa(d.area);
  const disc = limpa(d.discipline);
  const escolar = !!d.escolar;
  const cf = escolar ? null : cursoFrase(d.course);
  const destino = cf ? `${cf.art} ${cf.nome}${inst ? " " + instDe(inst) : ""}` : instA(inst);
  const comTitulo = (nome, prep = "apresentado") => {
    const req = grau ? `, como requisito parcial para obtenção do título de ${grau}` : "";
    return `${nome} ${prep}${destino ? " " + destino : ""}${req}`;
  };
  let t = "";
  switch (tipo) {
    case "tcc": t = comTitulo("Trabalho de Conclusão de Curso"); break;
    case "monografia": t = comTitulo("Monografia", "apresentada"); break;
    case "especializacao": {
      const alvo = cf ? `ao Curso de Pós-Graduação Lato Sensu em ${limpa(d.course).replace(/^(curso( de)?|pós-graduação( lato sensu)?( em)?)\s+/i, "")}${inst ? " " + instDe(inst) : ""}` : destino;
      const req = grau ? `, como requisito parcial para obtenção do título de ${grau}` : "";
      t = `Trabalho de Conclusão de Curso apresentado${alvo ? " " + alvo : ""}${req}`;
      break;
    }
    case "dissertacao":
    case "tese": {
      const nome = tipo === "tese" ? "Tese" : "Dissertação";
      const c = limpa(d.course);
      const prog = c ? (/^programa/i.test(c) ? `ao ${c}` : `ao Programa de Pós-Graduação em ${c.replace(/^(curso( de)?|pós-graduação( em)?)\s+/i, "")}`) : "";
      const alvo = prog ? `${prog}${inst ? " " + instDe(inst) : ""}` : instA(inst);
      const req = grau ? `, como requisito parcial para obtenção do título de ${grau}` : "";
      t = `${nome} apresentada${alvo ? " " + alvo : ""}${req}`;
      break;
    }
    case "disciplina": {
      const onde = cf ? ` ${doCurso(cf)}${inst ? " " + instDe(inst) : ""}` : inst ? ` ${instDe(inst)}` : "";
      const req = escolar ? ", como requisito parcial de avaliação" : ", como requisito parcial para aprovação na disciplina";
      t = `Trabalho apresentado à disciplina${disc ? " de " + disc : ""}${onde}${req}`;
      break;
    }
    case "projeto":
    case "relatorio": {
      const nome = tipo === "projeto" ? "Projeto de pesquisa apresentado" : "Relatório de estágio apresentado";
      const req = grau ? `, como requisito parcial para ${grau}` : "";
      t = `${nome}${destino ? " " + destino : ""}${req}`;
      break;
    }
    default: return "";
  }
  t = t.replace(/\s+/g, " ").trim() + ".";
  if (area) t += ` Área de concentração: ${area.replace(/[.\s]+$/, "")}.`;
  return t;
}

// Texto final da natureza: o digitado à mão ou o montado sozinho
export const textoDaNatureza = (d) => (d.natureManual ? limpa(d.nature) : limpa(textoNatureza(d)));

/* ---------- Construção dos blocos ---------- */
// bloco de texto: size (pt), fator (altura da linha / tamanho), align ("center" | "left" | "justify"), recuo (pt a partir da margem esquerda),
// gap (linhas em branco entre este bloco e o anterior da mesma zona)
const GAP_PADRAO = { top: 0, author: 0, title: 1, side: 1, bottom: 1 };
function criaAdd(blocks) {
  return (id, zone, runs, opc = {}) =>
    blocks.push({
      id, zone, kind: "texto", runs,
      size: opc.size ?? TAMANHO_BASE,
      fator: opc.fator ?? FATOR_LINHA,
      align: opc.align ?? "center",
      recuo: opc.recuo ?? 0,
      gap: opc.gap ?? GAP_PADRAO[zone],
      placeholder: !!opc.placeholder,
    });
}

function blocoLogo(dados, pagina) {
  const l = dados.logo;
  if (!l || !l.src || !(l.w > 0) || !(l.h > 0)) return null;
  if (!(pagina === "capa" ? l.naCapa : l.naFolha)) return null;
  const alturaCm = ALTURA_LOGO_CM[l.tamanho] || ALTURA_LOGO_CM.medio;
  let h = alturaCm * PT_POR_CM;
  let w = (h * l.w) / l.h;
  const wMax = RECUO_PT; // no máximo metade da largura útil
  if (w > wMax) { w = wMax; h = (w * l.h) / l.w; }
  return { id: "logo", zone: "top", kind: "imagem", src: l.src, tipo: l.tipo, largura: w, altura: h, size: 0, fator: 1, align: "center", recuo: 0, gap: 0, runs: [], placeholder: false };
}

// Depois do logo, o próximo bloco do topo fica uma linha mais abaixo
function ajustaGapLogo(blocks) {
  const top = blocks.filter((b) => b.zone === "top");
  top.forEach((b, i) => { if (i > 0) b.gap = top[i - 1].kind === "imagem" ? 1 : 0; });
}

// autores + título/subtítulo + volume: iguais na capa e na folha de rosto
function autoresETitulo(dados, est, previa, add) {
  const autores = (dados.authors || []).map(limpa).filter(Boolean);
  if (autores.length) autores.forEach((a, i) => add("author-" + i, "author", [{ text: aplica(a, est.author), bold: est.author.bold }]));
  else if (previa) add("author-0", "author", [{ text: aplica("Nome do autor", est.author), bold: est.author.bold }], { placeholder: true });

  const tamTitulo = Number(dados.titleSize) || TAMANHO_TITULO_PADRAO;
  const titulo = limpa(dados.title);
  const subtitulo = limpa(dados.subtitle).replace(/^:\s*/, "");
  if (titulo || previa) {
    const base = titulo || "Título do trabalho";
    // o subtítulo vem precedido de dois-pontos (NBR 14724, 4.1.1 d)
    const tituloTexto = subtitulo && !/:$/.test(base) ? base + ":" : base;
    const runs = [{ text: aplica(tituloTexto, est.title), bold: est.title.bold }];
    if (subtitulo) runs.push({ text: " " + aplica(subtitulo, est.subtitle), bold: est.subtitle.bold });
    add("title", "title", runs, { size: tamTitulo, placeholder: !titulo });
  }
  const vol = formataVolume(dados.volume);
  if (vol) add("volume", "title", [{ text: aplica(vol, est.subtitle), bold: est.subtitle.bold }]);
}

const fonteDe = (dados) => (dados.font === "Times New Roman" ? "Times New Roman" : "Arial");
const rotulo = (lista, i) => lista[Number(i)] || lista[0];

/**
 * dados: { institution, course, authors[], title, subtitle, volume, city, year, font ("Arial" | "Times New Roman"), titleSize (12|14|16),
 *          style, logo, escolar, discipline, teacher, teacherLabel }
 * opcoes.previa: se true, campos obrigatórios vazios aparecem como exemplo (placeholder: true).
 *                Nunca use previa:true para gerar PDF/Word.
 * Retorna { font, blocks }; zone: "top" | "author" | "title" | "side" | "bottom"
 */
export function montaCapa(dados, { previa = false } = {}) {
  const est = { ...ESTILO_PADRAO, ...(dados.style || {}) };
  const blocks = [];
  const add = criaAdd(blocks);
  const um = (id, zone, valor, chave, exemplo) => {
    const texto = limpa(valor);
    if (texto) add(id, zone, [{ text: aplica(texto, est[chave]), bold: est[chave].bold }]);
    else if (previa && exemplo) add(id, zone, [{ text: aplica(exemplo, est[chave]), bold: est[chave].bold }], { placeholder: true });
  };

  // Ordem da NBR 14724:2024 (4.1.1): instituição, autor, título, subtítulo, volume, cidade, ano.
  // O curso/departamento não está na norma, mas os manuais o colocam logo abaixo da instituição.
  const logo = blocoLogo(dados, "capa");
  if (logo) blocks.push(logo);
  um("institution", "top", dados.institution, "institution");
  um("course", "top", dados.course, "course");
  ajustaGapLogo(blocks);
  autoresETitulo(dados, est, previa, add);

  // Modelo escolar (fora da norma): disciplina e professor(a), no bloco da direita, entre o título e a cidade
  if (dados.escolar) {
    const lado = { recuo: RECUO_PT, align: "left", gap: 0 };
    const pega = (id, rot, valor, exemplo) => {
      const v = limpa(valor);
      if (v) add(id, "side", [{ text: aplica(`${rot}: ${v}`, est.orientador), bold: est.orientador.bold }], lado);
      else if (previa) add(id, "side", [{ text: `${rot}: ${exemplo}`, bold: est.orientador.bold }], { ...lado, placeholder: true });
    };
    pega("disciplina", "Disciplina", dados.discipline, "Nome da disciplina");
    pega("professor", rotulo(ROTULOS.professor, dados.teacherLabel), dados.teacher, "Nome do professor");
  }

  um("city", "bottom", dados.city, "city", "Cidade");
  um("year", "bottom", String(dados.year ?? ""), "year", "Ano");
  return { font: fonteDe(dados), blocks };
}

/**
 * Folha de rosto (NBR 14724:2024, 4.2.1.1.1): autor, título, subtítulo, volume, natureza, orientador e coorientador, cidade, ano.
 * A instituição aparece só dentro da natureza. A natureza fica do meio da mancha gráfica até a margem direita, em espaço simples.
 */
export function montaFolha(dados, { previa = false } = {}) {
  const est = { ...ESTILO_PADRAO, ...(dados.style || {}) };
  const blocks = [];
  const add = criaAdd(blocks);
  const um = (id, zone, valor, chave, exemplo) => {
    const texto = limpa(valor);
    if (texto) add(id, zone, [{ text: aplica(texto, est[chave]), bold: est[chave].bold }]);
    else if (previa && exemplo) add(id, zone, [{ text: aplica(exemplo, est[chave]), bold: est[chave].bold }], { placeholder: true });
  };

  const logo = blocoLogo(dados, "folha");
  if (logo) blocks.push(logo);
  autoresETitulo(dados, est, previa, add);

  // bloco da direita: natureza (espaço simples, justificada) e, logo abaixo, orientador/coorientador (ou professor)
  const lado = { recuo: RECUO_PT };
  const texto = textoDaNatureza(dados);
  const semDados = !dados.natureManual && !limpa(dados.institution) && !limpa(dados.course) && !limpa(dados.degree) && !limpa(dados.area);
  const alinhamento = dados.natureJustificada === false ? "left" : "justify";
  if (texto && !(previa && semDados)) {
    add("natureza", "side", [{ text: texto, bold: false }], { ...lado, fator: FATOR_SIMPLES, align: alinhamento, gap: 0 });
  } else if (previa) {
    add("natureza", "side", [{ text: "Trabalho de Conclusão de Curso apresentado ao Curso de Administração da Universidade Exemplo, como requisito parcial para obtenção do título de Bacharel em Administração.", bold: false }], { ...lado, fator: FATOR_SIMPLES, align: alinhamento, gap: 0, placeholder: true });
  }

  const pessoa = (id, rot, valor, exemplo, primeiro) => {
    const v = limpa(valor);
    const gap = primeiro ? 1 : 0;
    if (v) add(id, "side", [{ text: aplica(`${rot}: ${v}`, est.orientador), bold: est.orientador.bold }], { ...lado, align: "left", gap });
    else if (previa && exemplo) add(id, "side", [{ text: `${rot}: ${exemplo}`, bold: est.orientador.bold }], { ...lado, align: "left", gap, placeholder: true });
  };
  if (dados.escolar) {
    pessoa("professor", rotulo(ROTULOS.professor, dados.teacherLabel), dados.teacher, "Nome do professor", true);
  } else {
    pessoa("orientador", rotulo(ROTULOS.orientador, dados.advisorLabel), dados.advisor, "Prof. Dr. Nome do orientador", true);
    (dados.coadvisors || []).map(limpa).filter(Boolean).forEach((c, i) => pessoa("coorientador-" + i, rotulo(ROTULOS.coorientador, dados.coLabel), c, "", false));
  }

  um("city", "bottom", dados.city, "city", "Cidade");
  um("year", "bottom", String(dados.year ?? ""), "year", "Ano");
  return { font: fonteDe(dados), blocks };
}

/* ---------- Sumário (NBR 6027:2012 e NBR 6024:2012) ---------- */
export const NIVEIS_SUMARIO = 5; // até a seção quinária (NBR 6024, 4.1 b)
// Destaque padrão por nível, como no manual da UERN (a norma só pede hierarquia, sem fixar o recurso de cada nível):
// 1 = MAIÚSCULAS e negrito; 2 = só a 1ª letra maiúscula e negrito; 3, 4 e 5 = só a 1ª letra maiúscula, sem negrito.
export const ESTILO_NIVEL_PADRAO = {
  1: { caps: true, bold: true, italic: false },
  2: { caps: false, bold: true, italic: false },
  3: { caps: false, bold: false, italic: false },
  4: { caps: false, bold: false, italic: false },
  5: { caps: false, bold: false, italic: false },
};
export const OPCOES_SUMARIO_PADRAO = {
  alinha: "indicativo", // "indicativo": títulos alinhados pela margem do indicativo mais extenso (NBR 6027, 5.2); "espaco": um espaço depois do número
  alinhaPos: true, // alinhar também Referências, Apêndices e Anexos (6027, 5.2: "inclusive os elementos pós-textuais")
  pontilhado: true,
  espaco: "1.5", // "1.5" (padrão da NBR 14724, 5.2) ou "1" (espaço simples)
};
export const TIPOS_ITEM = [
  { id: "num", nome: "Seção" },
  { id: "sem", nome: "Sem número" },
  { id: "apendice", nome: "Apêndice" },
  { id: "anexo", nome: "Anexo" },
];

// A, B, C… e, esgotado o alfabeto, letras dobradas (AA, BB…): NBR 14724, apêndices e anexos
export const letraDeItem = (n) => String.fromCharCode(65 + (n % 26)).repeat(Math.floor(n / 26) + 1);

/**
 * Calcula, para cada item da lista, o nível efetivo e o número (1, 1.1, 1.1.1…).
 * Um nível nunca pode pular (uma subseção só existe depois de uma seção do nível anterior): é corrigido para o máximo permitido.
 * Retorna [{ tipo, nivel, numero, letra }] na mesma ordem da lista.
 */
export function numeraSumario(entradas) {
  const cont = [0, 0, 0, 0, 0, 0];
  let anterior = 0;
  let ap = 0, an = 0;
  return (entradas || []).map((e) => {
    const tipo = TIPOS_ITEM.some((t) => t.id === e.tipo) ? e.tipo : "num";
    if (tipo === "apendice") return { tipo, nivel: 1, numero: "", letra: letraDeItem(ap++) };
    if (tipo === "anexo") return { tipo, nivel: 1, numero: "", letra: letraDeItem(an++) };
    if (tipo === "sem") return { tipo, nivel: 1, numero: "", letra: "" };
    const pedido = Math.min(NIVEIS_SUMARIO, Math.max(1, Math.round(Number(e.nivel)) || 1));
    const nivel = Math.min(pedido, anterior + 1);
    cont[nivel]++;
    for (let i = nivel + 1; i <= NIVEIS_SUMARIO; i++) cont[i] = 0;
    anterior = nivel;
    return { tipo, nivel, numero: cont.slice(1, nivel + 1).join("."), letra: "" };
  });
}

const EXEMPLO_SUMARIO = [
  { tipo: "num", nivel: 1, titulo: "Introdução", pagina: "7" },
  { tipo: "num", nivel: 1, titulo: "Referencial teórico", pagina: "9" },
  { tipo: "num", nivel: 2, titulo: "Conceitos básicos", pagina: "9" },
  { tipo: "num", nivel: 2, titulo: "Estudos anteriores", pagina: "12" },
  { tipo: "num", nivel: 1, titulo: "Metodologia", pagina: "15" },
  { tipo: "num", nivel: 1, titulo: "Considerações finais", pagina: "22" },
  { tipo: "sem", titulo: "Referências", pagina: "24" },
];

/**
 * dados.sumario = { entradas: [{ tipo, nivel, titulo, pagina }], opcoes, estiloNivel }
 * Retorna { font, titulo: { text, bold }, entradas: [{ id, tipo, nivel, numero, texto, bold, italic, pagina, placeholder }], opcoes }
 * Em prévia, sem itens, mostra uma lista de exemplo (placeholder: true); nunca use previa:true para gerar PDF/Word.
 */
export function montaSumario(dados, { previa = false } = {}) {
  const sum = dados.sumario || {};
  const opcoes = { ...OPCOES_SUMARIO_PADRAO, ...(sum.opcoes || {}) };
  const est = {};
  for (let n = 1; n <= NIVEIS_SUMARIO; n++) est[n] = { ...ESTILO_NIVEL_PADRAO[n], ...((sum.estiloNivel || {})[n] || {}) };
  let brutas = (sum.entradas || []).map((e) => ({ ...e }));
  const exemplo = previa && !brutas.length;
  if (exemplo) brutas = EXEMPLO_SUMARIO.map((e) => ({ ...e }));
  const nums = numeraSumario(brutas);
  const entradas = brutas.map((e, i) => {
    const n = nums[i];
    const s = est[n.tipo === "num" ? n.nivel : 1];
    const titulo = limpa(e.titulo);
    let texto;
    if (n.tipo === "apendice" || n.tipo === "anexo") {
      const rot = (n.tipo === "apendice" ? "APÊNDICE " : "ANEXO ") + n.letra;
      texto = titulo ? `${rot} – ${aplica(titulo, s)}` : rot;
    } else texto = titulo ? aplica(titulo, s) : "";
    const vazio = !texto;
    return { id: "item-" + i, tipo: n.tipo, nivel: n.nivel, numero: n.numero, texto: vazio && previa ? "Título do item" : texto, bold: s.bold, italic: s.italic, pagina: limpa(e.pagina), placeholder: exemplo || (vazio && previa) };
  });
  return { font: fonteDe(dados), titulo: { text: "SUMÁRIO", bold: est[1].bold }, entradas, opcoes };
}

/**
 * Interpreta uma lista de títulos colada de uma vez (uma linha por item) e devolve { entradas, ignorados }.
 * Aceita: com número ("1 Introdução", "2.1 Conceitos": o nível vem dos pontos), só com recuo (espaços ou tabulações), com página no fim
 * (separada por pontos, tabulação ou 2+ espaços). Referências, Glossário, Índice, Apêndice e Anexo viram itens sem número.
 * Elementos pré-textuais (resumo, agradecimentos, listas, sumário...) não entram no sumário (NBR 6027, 6.3) e vêm em "ignorados".
 */
const PRE_TEXTUAL = /^(resumo( em l[íi]ngua estrangeira)?|abstract|resumen|r[ée]sum[ée]|agradecimentos?|dedicat[óo]ria|ep[íi]grafe|lista de [^,]+|sum[áa]rio|folha de (rosto|aprova[çc][ãa]o)|capa|errata|ficha catalogr[áa]fica)$/i;
const SEM_NUMERO = /^(refer[êe]ncias?|gloss[áa]rio|[íi]ndice|bibliografia|ap[êe]ndices?|anexos?)$/i;
export function interpretaLista(texto) {
  const brutas = [];
  for (const linha0 of String(texto || "").split(/\r?\n/)) {
    if (!linha0.trim()) continue;
    const espacos = (linha0.match(/^[ \t]*/)[0] || "").replace(/\t/g, "    ").length;
    let t = linha0.trim();
    let pagina = "";
    const mp = t.match(/^(.*?\S)(?:\s*[.…·]{2,}\s*|\s*…\s*|\t+|\s{2,})(\d+(?:\s*[-–,]\s*\d+)*)$/);
    if (mp) { t = mp[1].trim(); pagina = mp[2].replace(/\s+/g, ""); }
    t = t.replace(/^[-–•*·]\s+/, "").trim();
    if (t) brutas.push({ t, pagina, espacos });
  }
  // o nível de uma linha sem número vem da posição do seu recuo entre os recuos de todas as linhas (as numeradas ancoram o nível 1)
  const recuos = [...new Set(brutas.map((b) => b.espacos))].sort((a, b) => a - b);
  const entradas = [], ignorados = [];
  for (const { t, pagina, espacos } of brutas) {
    const mn = t.match(/^(\d+(?:\.\d+){0,4})\.?(?:\s+|[-–—)]\s*)(\S.*)$/);
    if (mn) { entradas.push({ tipo: "num", nivel: mn[1].split(".").length, titulo: mn[2].trim(), pagina }); continue; }
    const ma = t.match(/^(ap[êe]ndice|anexo)s?\b\s*([A-Za-z]{1,2})?\s*(?:[-–—:]\s*|\s+)?(.*)$/i);
    if (ma && (ma[2] || ma[3] || /^(ap[êe]ndice|anexo)$/i.test(t))) {
      const titulo = (ma[2] && !ma[3] && ma[2].length > 1 && !/^[A-Z]{1,2}$/.test(ma[2]) ? ma[2] : ma[3]) || "";
      if (/^(ap[êe]ndices|anexos)$/i.test(t)) { entradas.push({ tipo: "sem", titulo: t, pagina }); continue; }
      entradas.push({ tipo: /^ap/i.test(t) ? "apendice" : "anexo", titulo: titulo.trim(), pagina });
      continue;
    }
    if (SEM_NUMERO.test(t)) { entradas.push({ tipo: "sem", titulo: t, pagina }); continue; }
    if (PRE_TEXTUAL.test(t.replace(/:$/, ""))) { ignorados.push(t); continue; }
    entradas.push({ tipo: "num", nivel: Math.min(NIVEIS_SUMARIO, Math.max(1, recuos.indexOf(espacos) + 1)), titulo: t, pagina });
  }
  return { entradas: entradas.slice(0, 300), ignorados };
}

// Estrutura de exemplo (um TCC típico) para o estudante só trocar os títulos e as páginas
export const sumarioDeExemplo = () => EXEMPLO_SUMARIO.map((e) => ({ ...e }));
