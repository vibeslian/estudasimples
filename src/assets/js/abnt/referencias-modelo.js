// Motor das referências ABNT (NBR 6023:2018) e das citações no texto (NBR 10520:2023).
// Recebe os dados do formulário e devolve a referência em "trechos" ({ text, bold }), já com a pontuação, as maiúsculas, o negrito,
// [S. l.] / [s. n.], mês abreviado e "Disponível em / Acesso em". A prévia, o PDF e o Word usam ESTES mesmos trechos.
// Sem DOM: dá para testar em Node (pruebas/probar-referencias.mjs).
import { MESES, MESES_EXTENSO, TIPO_POR_ID, TIPOS_TRABALHO } from "./referencias-campos.js";

export const limpa = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const ehMaiuscula = (s) => s === s.toLocaleUpperCase("pt-BR") && s !== s.toLocaleLowerCase("pt-BR");
// "SÃO PAULO (Estado)": o que está entre parênteses não vai para maiúsculas
const maiusSemParenteses = (s) => s.replace(/^[^(]*/, (p) => p.toLocaleUpperCase("pt-BR"));

const r = (text, bold = false) => ({ text, bold });
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "del", "di", "du", "von", "van", "la", "le", "y", "para", "em", "na", "no", "nas", "nos", "a", "o", "as", "os"]);
// "SILVA" ou "silva" -> "Silva"; o que já está com maiúsculas e minúsculas fica como foi digitado
export function capitaliza(s, { particulas = true } = {}) {
  s = limpa(s);
  if (!s || /[a-zà-ú]/.test(s) && /[A-ZÀ-Ú]/.test(s)) return s;
  return s.toLocaleLowerCase("pt-BR").split(" ").map((p, i) => (i && particulas && PARTICULAS.has(p) ? p : p.replace(/(^|[-'’])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase("pt-BR")))).join(" ");
}

// Nome de entidade na citação: uma sigla sozinha (STF, IBGE, ONU) continua em maiúsculas; "BRASIL" vira "Brasil".
// Países curtos que se escrevem em maiúsculas na entrada (PERU, CUBA...) não são siglas.
const PAISES_CURTOS = new Set(["PERU", "CUBA", "CHILE", "JAPÃO", "ÍNDIA", "GANA", "MALI", "TOGO", "IRÃ", "OMÃ", "ITÁLIA", "ÁFRICA", "CHINA", "RÚSSIA", "SÍRIA", "LÍBIA", "NEPAL", "QUÊNIA", "SUÍÇA"]);
const PALAVRAS_COMUNS = new Set(["UM", "UMA", "UNS", "DE", "DO", "DA", "DOS", "DAS", "NO", "NA", "NOS", "NAS", "AO", "OS", "AS", "COM", "SEM", "POR", "PARA", "MAIS", "COMO", "ENTRE", "ATÉ", "EM", "OU", "SE", "QUE", "NÃO", "ELE", "ELA", "ESTE", "ESTA", "ISSO", "TODO", "TODA", "CASA", "VIDA", "AMOR", "SER", "TER", "ONDE", "QUEM", "COISA", "RIO", "SOL", "MAR", "SAL", "PAZ", "FIM", "DIA", "ANO", "MÃE", "PAI", "VOZ", "LUZ", "REI", "TERRA", "CIDADE", "MUNDO"]);
export function nomeEntidadeCita(s) {
  const t = limpa(s);
  if (/^[A-ZÀ-Ú]{2,5}$/.test(t) && !PAISES_CURTOS.has(t)) return t;
  return capitaliza(t);
}

/* ---------- datas ---------- */
export const mesAbreviado = (m) => MESES[Number(m) - 1] || "";
export function dataExtenso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpa(iso));
  if (!m) return "";
  return `${Number(m[3])} de ${MESES_EXTENSO[Number(m[2]) - 1]} de ${m[1]}`;
}
export function dataAcesso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpa(iso));
  return m ? `${Number(m[3])} ${mesAbreviado(m[2])} ${m[1]}` : "";
}

// O ano que vai na referência: "2022", "[2018?]", "[2017]", "[ca. 2015]", "[200-]", "[201-?]"
export function anoTexto(ano, tipo = "documento", sufixo = "") {
  const a = limpa(ano);
  if (!a) return "";
  const d = a.replace(/\D/g, "");
  switch (tipo) {
    case "provavel": return `[${a}?]`;
    case "certo": return `[${a}]`;
    case "aproximado": return `[ca. ${a}]`;
    case "decada": return d.length >= 3 ? `[${d.slice(0, 3)}-]` : `[${a}]`;
    case "decadaProvavel": return d.length >= 3 ? `[${d.slice(0, 3)}-?]` : `[${a}?]`;
    default: return a + sufixo;
  }
}
const colchetes = (t) => /^\[/.test(t);

// "dia mês. ano" com o que existir; mesFim só nos artigos ("jan./abr. 2001")
function dataCompleta(pub = {}, tipo = "documento", sufixo = "") {
  const ano = anoTexto(pub.ano, tipo, sufixo);
  if (!ano) return "";
  if (colchetes(ano)) return ano; // data aproximada: sem dia nem mês
  const m1 = mesAbreviado(pub.mes || pub.mesIni), m2 = mesAbreviado(pub.mesFim);
  const mes = m1 && m2 && m2 !== m1 ? `${m1}/${m2}` : m1;
  const dia = mes && !pub.mesFim ? String(Number(limpa(pub.dia)) || "") : "";
  return [dia, mes, ano].filter(Boolean).join(" ");
}

/* ---------- pequenas peças ---------- */
export function textoEdicao(e) {
  e = limpa(e);
  if (!e) return "";
  const m = /^(\d+)\s*[ªaº°]?\s*(ed\.?|edi[çc][ãa]o)?$/i.exec(e);
  return m ? `${Number(m[1])}. ed.` : e;
}
// "9610" -> "9.610" (como nas leis federais); o que já tem ponto, barra ou letra fica como foi digitado
export const numeroDeLei = (n) => { n = limpa(n); return /^\d{4,}$/.test(n) ? n.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : n; };
const semNaturezaJuridica = (e) => limpa(e).replace(/[,\s]+(ltda|s\.?\s?a|s\/a|me|epp|eireli)\.?$/i, "");
const paginas = (ini, fim) => { ini = limpa(ini); fim = limpa(fim); return ini && fim && ini !== fim ? `p. ${ini}-${fim}` : ini ? `p. ${ini}` : ""; };

// termina o trecho com ponto (a não ser que já termine em . ? ou !)
function fecha(runs) {
  if (!runs.length) return runs;
  const ult = runs[runs.length - 1].text.trimEnd();
  return /[.?!]$/.test(ult) ? runs : [...runs, r(".")];
}
const junta = (segs) => segs.filter((s) => s && s.length).flatMap((s, i) => [...(i ? [r(" ")] : []), ...fecha(s)]);
// funde trechos vizinhos com o mesmo negrito
export const fundeRuns = (runs) => runs.reduce((acc, x) => { if (!x.text) return acc; const u = acc[acc.length - 1]; if (u && u.bold === x.bold) u.text += x.text; else acc.push({ ...x }); return acc; }, []);

/* ---------- título sem autor: primeira palavra em maiúsculas ---------- */
const ARTIGOS = new Set(["o", "a", "os", "as", "um", "uma", "uns", "umas", "the", "an"]);
const MONOSSILABOS = new Set(["em", "de", "da", "do", "no", "na", "nos", "nas", "ao", "aos", "à", "às", "por", "com", "sem", "sob", "que", "se", "e", "ou", "mas", "já", "só", "há", "me", "te", "lhe", "vos", "pra", "pro", "of", "in", "on", "to"]);
// Devolve { texto, n }: o título com a(s) palavra(s) iniciais em maiúsculas e quantas são. A norma pede a 1ª palavra, e o artigo ou
// monossílabo inicial (ou um número) junto com a palavra seguinte.
export function tituloSemAutor(titulo) {
  const pal = limpa(titulo).split(" ");
  if (!pal[0]) return { texto: "", n: 0 };
  const limpo = (p) => semAcento(p.toLocaleLowerCase("pt-BR")).replace(/[^\p{L}\p{N}]/gu, "");
  const bruta = pal[0].toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}à]/gu, "");
  const n = pal.length > 1 && (ARTIGOS.has(limpo(pal[0])) || MONOSSILABOS.has(bruta) || MONOSSILABOS.has(limpo(pal[0])) || /\d/.test(pal[0])) ? 2 : 1;
  const maiusc = pal.map((p, i) => (i < n ? p.toLocaleUpperCase("pt-BR") : p));
  return { texto: maiusc.join(" "), n };
}

/* ---------- autoria ---------- */
const ROTULO_PAPEL = { org: "(org.)", coord: "(coord.)", ed: "(ed.)", comp: "(comp.)" };

function pessoasValidas(aut) { return ((aut && aut.pessoas) || []).filter((p) => limpa(p.sobrenome)); }

// Devolve { texto, chave, cita: { sobrenomes[], et } } ou null se não há autor
function entradaAutoria(aut, { papel = false } = {}) {
  if (!aut || aut.modo === "nenhum") return null;
  if (aut.modo === "entidade") {
    const ent = limpa(aut.entidade);
    if (!ent) return null;
    const orgao = limpa(aut.orgao);
    return { texto: maiusSemParenteses(ent) + (orgao ? ". " + orgao : ""), chave: ent + "\u0001" + orgao, nomeCita: nomeEntidadeCita(ent.replace(/\s*\([^)]*\)\s*$/, "")), plural: false, pessoas: 0 };
  }
  const ps = pessoasValidas(aut);
  if (!ps.length) return null;
  const fmt = (p) => (limpa(p.nome) ? `${maiusSemParenteses(limpa(p.sobrenome))}, ${limpa(p.nome)}` : maiusSemParenteses(limpa(p.sobrenome)));
  let texto;
  if (ps.length >= 4 && aut.quatro === "primeiro") texto = `${fmt(ps[0])} et al.`;
  else texto = ps.map(fmt).join("; ");
  const rot = papel && ROTULO_PAPEL[aut.papel];
  if (rot) texto += " " + rot;
  return { texto, chave: ps.map((p) => limpa(p.sobrenome) + "\u0001" + limpa(p.nome)).join("\u0002"), sobrenomes: ps.map((p) => limpa(p.sobrenome)), pessoas: ps.length };
}

/* ---------- peças comuns ---------- */
const onlineSeg = (on = {}, { doi = false } = {}) => {
  const segs = [];
  if (doi && limpa(on.doi)) { const d = limpa(on.doi); segs.push([r("DOI: " + (/^10\./.test(d) ? "https://doi.org/" + d : d))]); }
  if (limpa(on.link)) {
    segs.push([r("Disponível em: " + limpa(on.link))]);
    const ac = dataAcesso(on.acesso);
    if (ac) segs.push([r("Acesso em: " + ac)]);
  }
  return segs;
};
const localEditora = (local, editora) => {
  const l = limpa(local), e = semNaturezaJuridica(editora);
  if (!l && !e) return "[S. l.: s. n.]";
  return `${l || "[S. l.]"}: ${e || "[s. n.]"}`;
};

// título (em negrito) e subtítulo (sem destaque): "Título: subtítulo"
function tituloComSub(titulo, sub, negrito = true) {
  titulo = limpa(titulo); sub = limpa(sub).replace(/^:\s*/, "");
  if (!titulo) return [];
  const i = titulo.indexOf(": ");
  if (!sub && i > 0) { sub = titulo.slice(i + 2); titulo = titulo.slice(0, i); }
  titulo = titulo.replace(/:$/, "");
  if (!sub) return [r(titulo, negrito)];
  // só o título leva o destaque: os dois-pontos e o subtítulo ficam sem negrito (como nos exemplos dos manuais de bibliotecas)
  return /[?!.]$/.test(titulo) ? [r(titulo, negrito), r(" " + sub)] : [r(titulo, negrito), r(": " + sub)];
}

/* ---------- uma referência ---------- */
// Cada tipo monta a lista de trechos; as funções devolvem { segs, entrada, autorCita, tituloEntrada }
// - entrada: { texto, ... } do autor (ou null quando a entrada é o título)
function montaLivro(d, ctx) {
  const ent = entradaAutoria(d.autoria, { papel: true });
  const sub = d.subtitulo;
  const segs = [];
  let titulo;
  if (ent) { segs.push([r(ent.texto)]); titulo = tituloComSub(d.titulo, sub); }
  else { const t = tituloSemAutor(limpa(d.titulo) + (limpa(sub) ? ": " + limpa(sub).replace(/^:\s*/, "") : "")); titulo = [r(t.texto)]; ctx.semAutor = { ...t, completo: limpa(d.titulo) }; }
  segs.push(titulo);
  if (limpa(d.tradutor)) segs.push([r("Tradução: " + limpa(d.tradutor))]);
  if (limpa(d.edicao)) segs.push([r(textoEdicao(d.edicao))]);
  const ano = anoTexto(d.pub && d.pub.ano, d.anoTipo, ctx.sufixo);
  segs.push([r(`${localEditora(d.local, d.editora)}, ${ano}`)]);
  if (limpa(d.volume)) segs.push([r("v. " + limpa(d.volume))]);
  if (d.ebook) segs.push([r("E-book")]);
  segs.push(...onlineSeg(d.online));
  ctx.avisos.push(...avisosLocal(d));
  return { segs, ent, ano };
}

function montaCapitulo(d, ctx) {
  const ent = entradaAutoria(d.autoria);
  const obraEnt = entradaAutoria(d.obraAutoria, { papel: true });
  const segs = [];
  if (ent) segs.push([r(ent.texto)]); // capítulo sem autor: entra pelo título
  const tituloCap = ent ? [r(limpa(d.titulo))] : [r(tituloSemAutor(d.titulo).texto)];
  if (!ent) ctx.semAutor = { ...tituloSemAutor(d.titulo), completo: limpa(d.titulo) };
  segs.push(tituloCap);
  const obra = [r("In: ")];
  if (obraEnt) { obra.push(r(obraEnt.texto + (/[.?!]$/.test(obraEnt.texto) ? " " : ". "))); obra.push(...tituloComSub(d.obraTitulo, d.obraSubtitulo)); }
  else { const t = tituloSemAutor(limpa(d.obraTitulo) + (limpa(d.obraSubtitulo) ? ": " + limpa(d.obraSubtitulo) : "")); obra.push(r(t.texto)); }
  segs.push(obra);
  if (limpa(d.edicao)) segs.push([r(textoEdicao(d.edicao))]);
  const ano = anoTexto(d.pub && d.pub.ano, d.anoTipo, ctx.sufixo);
  segs.push([r(`${localEditora(d.local, d.editora)}, ${ano}`)]);
  const fim = [limpa(d.volume) && "v. " + limpa(d.volume), limpa(d.capNum) && "cap. " + limpa(d.capNum), paginas(d.pagIni, d.pagFim)].filter(Boolean);
  if (fim.length) segs.push([r(fim.join(", "))]);
  segs.push(...onlineSeg(d.online));
  ctx.avisos.push(...avisosLocal(d));
  return { segs, ent, ano };
}

function montaArtigo(d, ctx) {
  const ent = entradaAutoria(d.autoria);
  const segs = [];
  if (ent) segs.push([r(ent.texto)]);
  const titulo = limpa(d.titulo) + (limpa(d.subtitulo) ? ": " + limpa(d.subtitulo).replace(/^:\s*/, "") : "");
  if (ent) segs.push([r(titulo)]);
  else { const t = tituloSemAutor(titulo); segs.push([r(t.texto)]); ctx.semAutor = { ...t, completo: limpa(d.titulo) }; }
  const ano = anoTexto(d.pub && d.pub.ano, d.anoTipo, ctx.sufixo);
  const partes = [limpa(d.local) || "[s. l.]", limpa(d.volume) && "v. " + limpa(d.volume), limpa(d.numero) && "n. " + limpa(d.numero), limpa(d.eloc), paginas(d.pagIni, d.pagFim), dataCompleta({ ...(d.pub || {}), ano: d.pub && d.pub.ano }, d.anoTipo, ctx.sufixo)].filter(Boolean);
  segs.push([r(limpa(d.periodico), true), r(", " + partes.join(", "))]);
  segs.push(...onlineSeg(d.online, { doi: true }));
  if (!limpa(d.local)) ctx.avisos.push("Sem cidade da revista: usei [s. l.].");
  return { segs, ent, ano };
}

function montaSite(d, ctx) {
  const ent = entradaAutoria(d.autoria);
  const segs = [];
  if (ent) { segs.push([r(ent.texto)]); segs.push(tituloComSub(d.titulo, "")); }
  else { const t = tituloSemAutor(d.titulo); segs.push([r(t.texto)]); ctx.semAutor = { ...t, completo: limpa(d.titulo) }; }
  const data = dataCompleta(d.pub, d.anoTipo, ctx.sufixo);
  segs.push([r(`${limpa(d.local) || "[S. l.]"}, ${data}`)]);
  if (limpa(d.nomeSite)) segs.push([r("Portal: " + limpa(d.nomeSite))]);
  segs.push(...onlineSeg(d.online));
  if (!limpa(d.local)) ctx.avisos.push("Sem cidade: usei [S. l.].");
  return { segs, ent, ano: anoTexto(d.pub && d.pub.ano, d.anoTipo, ctx.sufixo) };
}

function montaNoticia(d, ctx) {
  const ent = entradaAutoria(d.autoria);
  const segs = [];
  if (ent) { segs.push([r(ent.texto)]); segs.push([r(limpa(d.titulo))]); }
  else { const t = tituloSemAutor(d.titulo); segs.push([r(t.texto)]); ctx.semAutor = { ...t, completo: limpa(d.titulo) }; }
  const data = dataCompleta(d.pub, d.anoTipo, ctx.sufixo);
  const semSecao = !limpa(d.secao);
  const partes = [limpa(d.local) || "[s. l.]", limpa(d.edicao) && "ed. " + limpa(d.edicao), semSecao && paginas(d.pagina, ""), data].filter(Boolean);
  segs.push([r(limpa(d.jornal), true), r(", " + partes.join(", "))]);
  if (!semSecao) segs.push([r([limpa(d.secao), paginas(d.pagina, "")].filter(Boolean).join(", "))]);
  segs.push(...onlineSeg(d.online));
  if (!limpa(d.local)) ctx.avisos.push("Sem cidade do jornal: usei [s. l.].");
  return { segs, ent, ano: anoTexto(d.pub && d.pub.ano, d.anoTipo, ctx.sufixo) };
}

function montaConstituicao(d, ctx) {
  // BRASIL. [Constituição (1988)]. Constituição da República Federativa do Brasil de 1988. Brasília, DF: Presidência da República, [2016]. Disponível em: … Acesso em: …
  const jur = maiusSemParenteses(limpa(d.jurisdicao));
  const anoConst = (/^(\d{4})/.exec(limpa(d.dataNorma)) || [])[1] || "";
  const titulo = limpa(d.ementa) || (anoConst ? `Constituição da República Federativa do Brasil de ${anoConst}` : "Constituição");
  const segs = [[r(jur)], [r(`[Constituição${anoConst ? " (" + anoConst + ")" : ""}]`)], [r(titulo)]];
  const pub = [limpa(d.local), limpa(d.publicador)].filter(Boolean);
  const anoVersao = anoTexto(d.pub && d.pub.ano, "documento", ctx.sufixo);
  segs.push([r(`${pub.length === 2 ? pub[0] + ": " + pub[1] : pub[0] || "[S. l.]"}${anoVersao ? ", [" + anoVersao + "]" : ""}`)]);
  segs.push(...onlineSeg(d.online));
  const ent = { texto: jur, chave: jur + "\u0001", nomeCita: capitaliza(limpa(d.jurisdicao).replace(/\s*\([^)]*\)\s*$/, "")), plural: false, pessoas: 0 }; // jurisdição é um lugar (BAHIA, RIO, BRASIL): nunca vira sigla
  return { segs, ent, ano: anoConst || anoVersao }; // na citação vale o ano da Constituição: (Brasil, 1988)
}

function montaLei(d, ctx) {
  if (limpa(d.tipoNorma) === "Constituição Federal") return montaConstituicao(d, ctx);
  const jur = maiusSemParenteses(limpa(d.jurisdicao));
  const orgao = limpa(d.orgao);
  const numero = numeroDeLei(d.numero);
  const data = dataExtenso(d.dataNorma);
  const epigrafe = `${limpa(d.tipoNorma) || "Lei"}${numero ? " nº " + numero : ""}, de ${data}`;
  const segs = [[r(jur + (orgao ? ". " + orgao : ""))], [r(epigrafe)]];
  if (limpa(d.ementa)) segs.push([r(limpa(d.ementa))]);
  const pub = [limpa(d.local), limpa(d.publicador)].filter(Boolean);
  const ano = anoTexto(d.pub && d.pub.ano, "documento", ctx.sufixo);
  segs.push([r(`${pub.length === 2 ? pub[0] + ": " + pub[1] : pub[0] || "[S. l.]"}, ${ano}`)]);
  segs.push(...onlineSeg(d.online));
  const ent = { texto: jur + (orgao ? ". " + orgao : ""), chave: jur + "\u0001" + orgao, nomeCita: capitaliza(limpa(d.jurisdicao).replace(/\s*\([^)]*\)\s*$/, "")), plural: false, pessoas: 0 }; // jurisdição é um lugar (BAHIA, RIO, BRASIL): nunca vira sigla
  return { segs, ent, ano };
}

function montaVideo(d, ctx) {
  const ent = entradaAutoria(d.autoria);
  const segs = [];
  if (ent) { segs.push([r(ent.texto)]); segs.push(tituloComSub(d.titulo, "")); }
  else { const t = tituloSemAutor(d.titulo); segs.push([r(t.texto)]); ctx.semAutor = { ...t, completo: limpa(d.titulo) }; }
  const ano = anoTexto(d.pub && d.pub.ano, d.anoTipo, ctx.sufixo);
  segs.push([r(`${localEditora(d.local, d.produtora)}, ${dataCompleta(d.pub, d.anoTipo, ctx.sufixo)}`)]);
  const dur = limpa(d.duracao);
  segs.push([r(dur ? `1 vídeo (${/^\d+$/.test(dur) ? dur + " min" : dur})` : "1 vídeo")]);
  if (limpa(d.canal)) segs.push([r("Publicado pelo canal " + limpa(d.canal))]);
  segs.push(...onlineSeg(d.online));
  return { segs, ent, ano };
}

function montaTcc(d, ctx) {
  const ent = entradaAutoria(d.autoria);
  const t = TIPOS_TRABALHO.find((x) => x[0] === d.tipoTrabalho) || TIPOS_TRABALHO[0];
  const segs = [];
  if (ent) segs.push([r(ent.texto)]);
  segs.push(tituloComSub(d.titulo, d.subtitulo));
  if (limpa(d.orientador)) segs.push([r(`${limpa(d.orientadorRotulo) || "Orientador"}: ${limpa(d.orientador)}`)]);
  const depo = limpa(d.anoDeposito);
  segs.push([r(depo)]);
  if (limpa(d.folhas).replace(/\D/g, "")) segs.push([r(limpa(d.folhas).replace(/\D/g, "") + " f.")]);
  const defesa = limpa(d.anoDefesa) || depo;
  const vinc = [limpa(d.unidade), limpa(d.instituicao), limpa(d.local), defesa].filter(Boolean).join(", ");
  segs.push([r(`${t[1]} (${t[2]} em ${limpa(d.curso)}) – ${vinc}`)]);
  segs.push(...onlineSeg(d.online));
  return { segs, ent, ano: depo };
}

function avisosLocal(d) {
  const av = [];
  if (!limpa(d.local) && !limpa(d.editora)) av.push("Sem cidade e sem editora: usei [S. l.: s. n.].");
  else if (!limpa(d.local)) av.push("Sem cidade: usei [S. l.].");
  else if (!limpa(d.editora)) av.push("Sem editora: usei [s. n.].");
  return av;
}

const MONTA = { livro: montaLivro, capitulo: montaCapitulo, artigo: montaArtigo, site: montaSite, noticia: montaNoticia, lei: montaLei, video: montaVideo, tcc: montaTcc };

/* ---------- campos que faltam ---------- */
export function camposFaltando(d) {
  const tipo = TIPO_POR_ID[d.tipo];
  if (!tipo) return [{ id: "tipo", rotulo: "o tipo de fonte" }];
  const falta = [];
  const olha = (blocos) => {
    for (const b of blocos) {
      if (b.k === "mais" || b.k === "linha") olha(b.campos);
      else if (b.k === "autoria") {
        const a = d[b.id];
        if (b.id === "autoria" && a && a.modo === "pessoa" && !pessoasValidas(a).length) falta.push({ id: b.id, rotulo: "o sobrenome do autor (ou escolha \"Sem autor\")" });
        if (b.id === "autoria" && a && a.modo === "entidade" && !limpa(a.entidade)) falta.push({ id: b.id, rotulo: "o nome da instituição" });
        if (b.id === "obraAutoria" && a && a.modo === "pessoa" && !pessoasValidas(a).length) falta.push({ id: b.id, rotulo: "o sobrenome do autor do livro (ou escolha \"Sem autor\")" });
      } else if (b.k === "data") {
        if (b.obrig && !limpa(d[b.id] && d[b.id].ano)) falta.push({ id: b.id + "-ano", rotulo: "o ano" });
      } else if (b.obrig && ["texto", "num", "area"].includes(b.k) && !limpa(d[b.id]) && !(d.tipo === "lei" && b.id === "ementa" && limpa(d.tipoNorma) === "Constituição Federal")) falta.push({ id: b.id, rotulo: (b.rotulo || b.id).replace(/^./, (c) => c.toLowerCase()) });
    }
  };
  olha(tipo.blocos);
  return falta;
}

/* ---------- citação no texto ---------- */
// estilo "novo": (Silva, 2020) e Silva (2020), da NBR 10520:2023; "antigo": (SILVA, 2020), dos manuais da NBR 10520:2002
function citacao({ ent, ano, ctx, estilo }) {
  const antigo = estilo === "antigo";
  let par, nar;
  if (ent && ent.pessoas > 0) {
    const nomes = ent.sobrenomes.map((s) => capitaliza(s));
    const et = nomes.length >= 4;
    const cap = (s) => (antigo ? s.toLocaleUpperCase("pt-BR") : s);
    const parte = et ? `${cap(nomes[0])} et al.` : nomes.map(cap).join("; ");
    par = `(${parte}, ${ano})`;
    nar = `${et ? nomes[0] + " et al." : nomes.length === 1 ? nomes[0] : nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1]} (${ano})`;
  } else if (ent) {
    par = `(${antigo ? ent.nomeCita.toLocaleUpperCase("pt-BR") : ent.nomeCita}, ${ano})`;
    nar = `${ent.nomeCita} (${ano})`;
  } else if (ctx.semAutor && ctx.semAutor.texto) {
    const { n, completo } = ctx.semAutor;
    const palavras = limpa(completo).split(" ");
    const parteTitulo = palavras.slice(0, n).join(" ").replace(/[,.;:!?]+$/, "");
    const maisTexto = palavras.length > n;
    const marca = maisTexto ? (antigo ? "..." : " [...]") : "";
    // só a primeira letra em maiúscula ("Nos canaviais [...]"); o que o estudante digitou com maiúsculas e minúsculas fica como está
    // uma sigla no começo do título ("STF decide…") continua em maiúsculas
    const siglaNoInicio = /^\p{Lu}{2,5}$/u.test(parteTitulo) && /\p{Ll}/u.test(limpa(completo))
      && (!/[AEIOUÀ-Ú]/.test(parteTitulo) || (parteTitulo.length <= 4 && !PALAVRAS_COMUNS.has(parteTitulo))); // STF, ONU, IBGE sim; NOBEL, UMA, COMO não
    const frase = ehMaiuscula(parteTitulo) && !siglaNoInicio ? parteTitulo.toLocaleLowerCase("pt-BR") : parteTitulo;
    const t = frase.replace(/^(\p{L})/u, (m) => m.toLocaleUpperCase("pt-BR"));
    par = `(${antigo ? parteTitulo.toLocaleUpperCase("pt-BR") : t}${marca}, ${ano})`;
    nar = `${t}${marca} (${ano})`;
  } else { par = ""; nar = ""; }
  return { par, nar };
}

/**
 * dados: { tipo, ...campos } (ver referencias-campos.js). Opções: sufixo ("a", "b"... quando há duas obras do mesmo autor e ano),
 * estilo da citação ("novo" | "antigo").
 * Retorna { runs, texto, citacao: { par, nar }, chaveOrdem, autorCita, ano, faltando, avisos, completa }.
 */
export function formataReferencia(dados, { sufixo = "", estilo = "novo" } = {}) {
  const montador = MONTA[dados.tipo];
  const faltando = camposFaltando(dados);
  if (!montador) return { runs: [], texto: "", citacao: { par: "", nar: "" }, chaveOrdem: "", autorCita: "", ano: "", faltando, avisos: [], completa: false };
  const ctx = { sufixo, avisos: [], semAutor: null };
  const { segs, ent, ano } = montador(dados, ctx);
  const runs = fundeRuns(junta(segs));
  const texto = runs.map((x) => x.text).join("");
  const cit = citacao({ ent, ano, ctx, estilo });
  const norm = (s) => semAcento(String(s)).toLocaleLowerCase("pt-BR").replace(/['’\-.]/g, "");
  const titulo = limpa(dados.titulo || dados.obraTitulo || "");
  const chave = ent ? norm(ent.chave) : norm(tituloSemAutor(titulo).texto + " " + titulo);
  const autorCita = cit.par.replace(/,\s*[^,]*\)$/, "").replace(/^\(/, "");
  return {
    runs, texto, citacao: cit,
    chaveOrdem: `${chave}\u0003${norm(titulo)}\u0003${ano}`,
    autorCita: autorCita, ano: limpa(ano), anoBase: limpa(dados.pub && dados.pub.ano) || limpa(dados.anoDeposito),
    faltando, avisos: ctx.avisos, completa: faltando.length === 0,
  };
}

/**
 * Lista acumulada: ordena em ordem alfabética (pela entrada) e põe a, b, c depois do ano quando o mesmo autor tem
 * duas ou mais obras no mesmo ano (NBR 10520:2023). itens: [{ id, dados }] -> [{ id, ref }]
 */
export function montaLista(itens, { estilo = "novo" } = {}) {
  const prim = itens.map((it) => ({ ...it, ref: formataReferencia(it.dados, { estilo }) })).filter((it) => it.ref.completa);
  prim.sort((a, b) => (a.ref.chaveOrdem < b.ref.chaveOrdem ? -1 : a.ref.chaveOrdem > b.ref.chaveOrdem ? 1 : 0));
  const grupos = {};
  for (const it of prim) { const k = it.ref.autorCita + "|" + it.ref.ano; (grupos[k] ||= []).push(it); }
  const sufixoDe = new Map();
  for (const g of Object.values(grupos)) {
    if (g.length < 2 || colchetes(g[0].ref.ano) || !/^\d{4}$/.test(g[0].ref.ano)) continue;
    g.forEach((it, i) => sufixoDe.set(it.id, String.fromCharCode(97 + i)));
  }
  return prim.map((it) => (sufixoDe.has(it.id) ? { ...it, ref: formataReferencia(it.dados, { sufixo: sufixoDe.get(it.id), estilo }) } : it));
}
