// Interface do gerador de referências ABNT: lê o formulário do tipo escolhido, monta a referência e a citação ao vivo, guarda a lista na aba,
// desenha a prévia da página REFERÊNCIAS e gera PDF/Word. Os formulários são escritos no HTML pelo build (build-referencias.mjs).
import { TIPOS, TIPO_POR_ID, idCampo } from "./referencias-campos.js";
import { formataReferencia, montaLista, limpa } from "./referencias-modelo.js";
import { calculaReferencias } from "./referencias-layout.js";
import { geraPdfReferencias, geraDocxReferencias, caracteresForaDoPdf } from "./referencias-exporta.js";
import { precarrega, medidorCanvas, baixa } from "./exporta.js";
import { lerEstado, gravaEstado, apagaTudo, pegaAviso } from "./estado.js";
import { registraDownload, mostraProximo, limpaProgresso } from "../progresso.js";

const $ = (id) => document.getElementById(id);
const CHAVE = "es-abnt-refs-v1";
const MAX_ITENS = 300;
const FONTES = {
  Arial: '"CapaArial", "ArimoWeb", Arial, Helvetica, sans-serif',
  "Times New Roman": '"CapaTimes", "TinosWeb", "Times New Roman", Times, serif',
};
const tenta = (fn, padrao = null) => { try { return fn(); } catch (e) { return padrao; } };

let itens = []; // [{ id, dados }]
let proximoId = 1;
let editandoId = null;
let tocado = false; // o estudante já escreveu algo no formulário atual
let gerando = false;

/* ---------- guardar na aba ---------- */
const lerGuardado = () => tenta(() => JSON.parse(sessionStorage.getItem(CHAVE)));
function guarda() {
  tenta(() => sessionStorage.setItem(CHAVE, JSON.stringify({ itens, proximoId, tipo: $("tipo").value, estilo: $("estiloCita").value })));
}
const fonteGuardada = () => ((lerEstado() || {}).texto || {}).font;
function guardaFonte(fonte) {
  const ant = lerEstado() || {};
  gravaEstado({ ...ant, texto: { ...(ant.texto || {}), font: fonte } }); // a mesma fonte vale nas outras ferramentas
}

/* ---------- ler e escrever o formulário ---------- */
const valorDe = (id) => { const el = $(id); return el ? el.value : ""; };
function lerAutoria(tipo, b) {
  const base = idCampo(tipo, b.id);
  return {
    modo: valorDe(base + "-modo") || "pessoa",
    pessoas: [...$(base + "-lista").querySelectorAll(".ref-pessoa")].map((l) => ({ sobrenome: l.querySelector(".ref-sobrenome").value, nome: l.querySelector(".ref-nome").value })),
    entidade: valorDe(base + "-entidade"), orgao: valorDe(base + "-orgao"),
    papel: valorDe(base + "-papel") || "autor", quatro: valorDe(base + "-quatro") || "todos",
  };
}
function lerBlocos(tipo, blocos, out) {
  for (const b of blocos) {
    const id = idCampo(tipo, b.id || "");
    if (b.k === "mais" || b.k === "linha") lerBlocos(tipo, b.campos, out);
    else if (b.k === "autoria") out[b.id] = lerAutoria(tipo, b);
    else if (b.k === "check") out[b.id] = $(id).checked;
    else if (b.k === "data") { out[b.id] = {}; for (const p of b.partes) out[b.id][p] = valorDe(`${id}-${p}`); }
    else if (b.k === "online") out.online = { link: valorDe(id + "-link"), acesso: valorDe(id + "-acesso"), doi: valorDe(id + "-doi") };
    else if (b.k !== "titulo2") out[b.id] = valorDe(id);
  }
  return out;
}
const lerForm = (tipo) => lerBlocos(tipo, TIPO_POR_ID[tipo].blocos, { tipo });

function defineAutoria(tipo, b, a) {
  const base = idCampo(tipo, b.id);
  const lista = $(base + "-lista");
  const pessoas = a.pessoas && a.pessoas.length ? a.pessoas : [{ sobrenome: "", nome: "" }];
  while (lista.children.length < pessoas.length) adicionaPessoa(tipo, b);
  while (lista.children.length > pessoas.length) lista.lastElementChild.remove();
  [...lista.children].forEach((l, i) => { l.querySelector(".ref-sobrenome").value = pessoas[i].sobrenome || ""; l.querySelector(".ref-nome").value = pessoas[i].nome || ""; });
  const set = (sufixo, v) => { const el = $(base + sufixo); if (el) el.value = v; };
  set("-modo", a.modo || "pessoa"); set("-entidade", a.entidade || ""); set("-orgao", a.orgao || ""); set("-papel", a.papel || "autor"); set("-quatro", a.quatro || "todos");
  atualizaAutoria(tipo, b);
}
function escreveBlocos(tipo, blocos, d) {
  for (const b of blocos) {
    const id = idCampo(tipo, b.id || "");
    if (b.k === "mais" || b.k === "linha") escreveBlocos(tipo, b.campos, d);
    else if (b.k === "autoria") defineAutoria(tipo, b, d[b.id] || {});
    else if (b.k === "check") $(id).checked = !!d[b.id];
    else if (b.k === "data") for (const p of b.partes) $(`${id}-${p}`).value = (d[b.id] || {})[p] || "";
    else if (b.k === "online") { const o = d.online || {}; $(id + "-link").value = o.link || ""; $(id + "-acesso").value = o.acesso || ""; if ($(id + "-doi")) $(id + "-doi").value = o.doi || ""; }
    else if (b.k !== "titulo2") { const el = $(id); el.value = d[b.id] ?? b.valor ?? (b.k === "select" ? b.opcoes[0][0] : ""); }
  }
}
function limpaForm(tipo) {
  const vazio = {};
  const zera = (blocos) => {
    for (const b of blocos) {
      if (b.k === "mais" || b.k === "linha") zera(b.campos);
      else if (b.k === "autoria") vazio[b.id] = { modo: "pessoa", pessoas: [] };
      else if (b.k === "data" || b.k === "online") vazio[b.k === "online" ? "online" : b.id] = {};
    }
  };
  zera(TIPO_POR_ID[tipo].blocos);
  escreveBlocos(tipo, TIPO_POR_ID[tipo].blocos, vazio);
  tocado = false;
}

/* ---------- autores: adicionar, remover, mostrar o que cabe ---------- */
function adicionaPessoa(tipo, b) {
  const lista = $(idCampo(tipo, b.id) + "-lista");
  const linha = lista.firstElementChild.cloneNode(true);
  linha.querySelectorAll("input").forEach((i) => { i.value = ""; });
  lista.append(linha);
  atualizaAutoria(tipo, b);
  return linha;
}
function atualizaAutoria(tipo, b) {
  const base = idCampo(tipo, b.id);
  const modo = valorDe(base + "-modo") || "pessoa";
  const bloco = document.querySelector(`#form-${tipo} [data-autoria="${b.id}"]`);
  bloco.querySelectorAll("[data-modo-bloco]").forEach((el) => { el.hidden = el.dataset.modoBloco !== modo; });
  const papel = bloco.querySelector("[data-papel]");
  if (papel) papel.hidden = modo !== "pessoa";
  const linhas = [...$(base + "-lista").children];
  linhas.forEach((l, i) => {
    l.querySelector(".ref-sobrenome").setAttribute("aria-label", `Sobrenome do autor ${i + 1}`);
    l.querySelector(".ref-nome").setAttribute("aria-label", `Nome do autor ${i + 1}`);
    l.querySelector("button").hidden = linhas.length <= 1;
  });
  const q = bloco.querySelector("[data-quatro]");
  if (q) q.hidden = !(modo === "pessoa" && linhas.length >= 4);
}
function configuraAutoria(tipo, b) {
  const base = idCampo(tipo, b.id);
  $(base + "-add").addEventListener("click", () => { adicionaPessoa(tipo, b).querySelector(".ref-sobrenome").focus(); atualiza(); });
  $(base + "-lista").addEventListener("click", (e) => {
    const bt = e.target.closest("button");
    if (!bt) return;
    bt.closest(".ref-pessoa").remove();
    atualizaAutoria(tipo, b);
    atualiza();
  });
  $(base + "-modo").addEventListener("change", () => atualizaAutoria(tipo, b));
}
const blocosDeAutoria = (blocos) => blocos.flatMap((b) => (b.k === "autoria" ? [b] : b.campos ? blocosDeAutoria(b.campos) : []));

/* ---------- tipo de fonte ---------- */
function mostraTipo(tipo) {
  document.querySelectorAll(".ref-form").forEach((f) => { f.hidden = f.dataset.tipo !== tipo; });
  $("tipo").value = tipo;
  $("tipoExemplo").textContent = "Exemplo: " + TIPO_POR_ID[tipo].exemplo;
}
const tipoAtual = () => $("tipo").value;
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/* ---------- texto da referência na tela, na área de transferência e no arquivo ---------- */
function runsParaDom(runs, pai) {
  for (const r of runs) {
    if (r.bold) { const s = document.createElement("strong"); s.textContent = r.text; pai.append(s); }
    else pai.append(document.createTextNode(r.text));
  }
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paraHtml = (refs, fonte) => refs.map((r) => `<p style="font-family:${fonte === "Times New Roman" ? "'Times New Roman',serif" : "Arial,sans-serif"};font-size:12pt;margin:0 0 12pt">${r.runs.map((x) => (x.bold ? `<b>${esc(x.text)}</b>` : esc(x.text))).join("")}</p>`).join("");
async function copiaRico(refs) {
  const html = paraHtml(refs, $("font").value);
  const texto = refs.map((r) => r.runs.map((x) => x.text).join("")).join("\n\n");
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([texto], { type: "text/plain" }) })]);
      return true;
    }
  } catch (e) { /* cai no plano B */ }
  // plano B: seleciona um trecho escondido e copia (mantém o negrito)
  const caixa = document.createElement("div");
  caixa.innerHTML = html;
  // estilo explícito: o navegador copia o estilo calculado, e sem isto levaria a cor de fundo e o tamanho de letra do site para o Word
  Object.assign(caixa.style, { position: "fixed", left: "-9999px", top: "0", whiteSpace: "pre-wrap", background: "#fff", color: "#000", fontSize: "12pt", lineHeight: "1.15" });
  document.body.append(caixa);
  const sel = window.getSelection(), faixa = document.createRange();
  faixa.selectNodeContents(caixa);
  sel.removeAllRanges(); sel.addRange(faixa);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  sel.removeAllRanges(); caixa.remove();
  return ok;
}
async function copiaTexto(texto) {
  try { if (navigator.clipboard) { await navigator.clipboard.writeText(texto); return true; } } catch (e) { /* plano B */ }
  const t = document.createElement("textarea");
  t.value = texto;
  Object.assign(t.style, { position: "fixed", left: "-9999px" });
  document.body.append(t);
  t.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  t.remove();
  return ok;
}

/* ---------- mensagens ---------- */
let timerMsg;
function mensagem(texto, erro = false, segundos = 6) {
  const t = $("toast");
  t.textContent = texto;
  t.classList.toggle("erro", erro);
  clearTimeout(timerMsg);
  if (texto && segundos) timerMsg = setTimeout(() => (t.textContent = ""), segundos * 1000);
}

/* ---------- a referência do formulário (ao vivo) ---------- */
let atual = null; // resultado de formataReferencia do formulário
function atualiza() {
  const tipo = tipoAtual();
  const dados = lerForm(tipo);
  // com um endereço e sem data de acesso, já põe a data de hoje (o estudante muda se quiser)
  const on = idCampo(tipo, "online");
  if ($(on + "-link") && limpa($(on + "-link").value) && !$(on + "-acesso").value) { $(on + "-acesso").value = hojeISO(); dados.online.acesso = hojeISO(); }
  atual = formataReferencia(dados, { estilo: $("estiloCita").value });
  const temTexto = atual.runs.length > 0 && tocado;
  $("refVazio").hidden = temTexto;
  $("refConteudo").hidden = !temTexto;
  const texto = $("refTexto");
  texto.textContent = "";
  if (temTexto) {
    runsParaDom(atual.runs, texto);
    $("citPar").textContent = atual.citacao.par;
    $("citNar").textContent = atual.citacao.nar;
    $("citPagina").textContent = atual.citacao.par ? atual.citacao.par.replace(/, ([^,]+)\)$/, ", $1, p. 15)") : "";
    const av = $("refAvisos");
    av.hidden = !atual.avisos.length;
    av.textContent = atual.avisos.length ? atual.avisos.join(" ") + " Se esses dados constam no documento, preencha-os." : "";
  }
  const falta = $("refFalta");
  falta.hidden = !(tocado && atual.faltando.length);
  falta.textContent = atual.faltando.length ? "Para adicionar à lista, falta: " + atual.faltando.map((f) => f.rotulo).join(", ") + "." : "";
  $("btnAdicionar").disabled = !atual.completa || (itens.length >= MAX_ITENS && editandoId === null);
  $("btnCopiarRef").disabled = !atual.completa;
  $("btnCopiarPar").disabled = $("btnCopiarNar").disabled = !atual.completa;
  $("btnAdicionar").textContent = editandoId !== null ? "Salvar alterações" : "Adicionar à lista";
  $("btnCancelarEdicao").hidden = editandoId === null;
  renderPrevia();
  guarda();
}

/* ---------- lista ---------- */
const NOME_TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t.nome]));
function montaListaAtual() { return montaLista(itens, { estilo: $("estiloCita").value }); }

const listaVazia = $("listaVazia");
function renderLista() {
  const cont = $("lista");
  const lista = montaListaAtual();
  cont.textContent = "";
  if (!lista.length) cont.append(listaVazia);
  lista.forEach((it) => {
    const item = document.createElement("div");
    item.className = "ref-item" + (it.id === editandoId ? " editando" : "");
    item.setAttribute("role", "listitem");
    item.dataset.id = String(it.id);
    const tipo = document.createElement("span");
    tipo.className = "ref-item-tipo";
    tipo.textContent = NOME_TIPO[it.dados.tipo];
    const p = document.createElement("p");
    p.className = "ref-item-texto";
    runsParaDom(it.ref.runs, p);
    const c = document.createElement("p");
    c.className = "ref-item-cita";
    c.textContent = `No texto: ${it.ref.citacao.par} ou ${it.ref.citacao.nar}`;
    const bts = document.createElement("div");
    bts.className = "ref-item-botoes";
    for (const [acao, rotulo] of [["copiar", "Copiar"], ["editar", "Editar"], ["remover", "Remover"]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-mini" + (acao === "remover" ? " btn-perigo" : "");
      b.dataset.acao = acao;
      b.textContent = rotulo;
      b.setAttribute("aria-label", `${rotulo} a referência: ${it.ref.texto.slice(0, 40)}…`);
      bts.append(b);
    }
    item.append(tipo, p, c, bts);
    cont.append(item);
  });
  // referências guardadas que ficaram incompletas (não devem existir) não aparecem; o contador mostra as que contam
  $("contaLista").textContent = lista.length ? `(${lista.length})` : "";
  $("btnCopiarLista").hidden = lista.length < 2;
}

async function aoClicarNaLista(ev) {
  const b = ev.target.closest("button[data-acao]");
  if (!b) return;
  const id = Number(b.closest(".ref-item").dataset.id);
  const it = itens.find((x) => x.id === id);
  if (!it) return;
  if (b.dataset.acao === "remover") {
    itens = itens.filter((x) => x.id !== id);
    if (editandoId === id) cancelaEdicao();
    renderLista(); renderPrevia(); atualiza();
    mensagem("Referência removida.");
    $("tipo").focus();
  } else if (b.dataset.acao === "copiar") {
    const ref = montaListaAtual().find((x) => x.id === id).ref;
    mensagem((await copiaRico([ref])) ? "Referência copiada. Cole no Word ou no Google Docs: o negrito vem junto." : "Não foi possível copiar. Selecione o texto e copie à mão.", false);
  } else if (b.dataset.acao === "editar") {
    editandoId = id;
    mostraTipo(it.dados.tipo);
    escreveBlocos(it.dados.tipo, TIPO_POR_ID[it.dados.tipo].blocos, it.dados);
    tocado = true;
    renderLista();
    atualiza();
    $("form").scrollIntoView({ block: "start" });
    const primeiro = document.querySelector(`#form-${it.dados.tipo} input[type="text"]`);
    if (primeiro) primeiro.focus();
    mensagem("Editando a referência. Mude o que precisar e clique em \"Salvar alterações\".", false, 8);
  }
}

function adicionaOuSalva() {
  if (!atual || !atual.completa) return;
  const tipo = tipoAtual();
  const dados = lerForm(tipo);
  if (editandoId !== null) {
    itens = itens.map((x) => (x.id === editandoId ? { id: x.id, dados } : x));
    mensagem("Alterações salvas. A lista continua em ordem alfabética.");
    editandoId = null;
  } else {
    itens = itens.concat({ id: proximoId++, dados });
    mensagem(`Referência adicionada (${itens.length} na lista), em ordem alfabética. Monte a próxima.`);
  }
  limpaForm(tipo);
  renderLista(); renderPrevia(); atualiza();
  const primeiro = document.querySelector(`#form-${tipo} input[type="text"]`);
  if (primeiro) primeiro.focus();
}
function cancelaEdicao() {
  editandoId = null;
  limpaForm(tipoAtual());
  renderLista(); atualiza();
}

/* ---------- prévia ---------- */
const EXEMPLOS_PREVIA = [
  { tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Alves", nome: "Beatriz" }] }, titulo: "Leitura e escrita no ensino superior", local: "Belo Horizonte", editora: "Editora Exemplo", pub: { ano: "2019" } },
  { tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Silva", nome: "Maria Helena" }] }, titulo: "Escrita acadêmica na prática", subtitulo: "do projeto ao TCC", edicao: "2", local: "São Paulo", editora: "Editora Exemplo", pub: { ano: "2022" } },
  { tipo: "artigo", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Pereira", nome: "Carla" }] }, titulo: "Redes sociais e aprendizagem", periodico: "Revista Exemplo de Educação", local: "São Paulo", volume: "12", numero: "2", pagIni: "33", pagFim: "48", pub: { ano: "2021", mesIni: "7", mesFim: "12" } },
];

// A referência que o estudante está montando (completa, mas ainda fora da lista) aparece na prévia, em coral, no lugar alfabético dela:
// assim, no computador, ele vê o resultado ao lado do formulário enquanto digita.
function modeloDaPrevia() {
  const estilo = $("estiloCita").value;
  const rascunho = !!(atual && atual.completa && tocado);
  const base = itens.filter((x) => x.id !== editandoId);
  const lista = montaLista(rascunho ? base.concat({ id: "rascunho", dados: lerForm(tipoAtual()) }) : base, { estilo });
  const exemplo = !lista.length;
  const refs = exemplo ? montaLista(EXEMPLOS_PREVIA.map((dados, i) => ({ id: i, dados })), { estilo }) : lista;
  return { exemplo, rascunho, font: $("font").value, refs: refs.map((x) => ({ runs: x.ref.runs, placeholder: exemplo, rascunho: x.id === "rascunho" })) };
}

function desenhaPagina(sheet, lay, k, modelo) {
  sheet.style.fontFamily = FONTES[modelo.font];
  sheet.textContent = "";
  const x0 = lay.g.margemEsquerda;
  const cria = (topo, fator, fantasma) => {
    const p = document.createElement("p");
    Object.assign(p.style, { left: x0 + "pt", top: topo + "pt", width: lay.areaW + "pt", fontSize: lay.size + "pt", lineHeight: String(fator) });
    if (fantasma) p.classList.add("fantasma");
    return p;
  };
  if (k === 0) {
    const p = cria(lay.tituloTopo - lay.sobe, lay.lhTitulo / lay.size, modelo.exemplo);
    const ld = document.createElement("span");
    ld.className = "linha";
    ld.style.textAlign = "center";
    const s = document.createElement("span");
    s.textContent = "REFERÊNCIAS";
    s.style.fontWeight = "700";
    ld.append(s);
    p.append(ld);
    sheet.append(p);
  }
  for (const it of lay.paginas[k].itens) {
    const p = cria(it.topo, lay.lh / lay.size, it.ref.placeholder);
    if (it.ref.rascunho) p.classList.add("rascunho");
    it.linhas.forEach((linha) => {
      const ld = document.createElement("span");
      ld.className = "linha";
      for (const parte of linha.parts) {
        const s = document.createElement("span");
        s.textContent = parte.text;
        s.style.fontWeight = parte.bold ? "700" : "400";
        ld.append(s);
      }
      p.append(ld);
    });
    sheet.append(p);
  }
}

function escalaWrap(wrap) {
  const sheet = wrap.querySelector(".sheet");
  const largura = wrap.clientWidth;
  if (!largura) return; // painel escondido (aba do celular)
  const escala = largura / sheet.offsetWidth;
  sheet.style.transform = `scale(${escala})`;
  wrap.style.height = sheet.offsetHeight * escala + "px";
}
const ajustaEscala = () => document.querySelectorAll("#pagsRef .sheet-wrap").forEach(escalaWrap);

function criaFigura(n, total) {
  const fig = document.createElement("figure");
  fig.className = "pagina-previa";
  const cap = document.createElement("figcaption");
  cap.textContent = `Página ${n}: referências` + (total > 1 ? ` (parte ${n} de ${total})` : "");
  const wrap = document.createElement("div");
  wrap.className = "sheet-wrap";
  wrap.id = "sheetWrapRef" + n;
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.id = "sheetRef" + n;
  wrap.append(sheet);
  fig.append(cap, wrap);
  return fig;
}

function renderPrevia() {
  const modelo = modeloDaPrevia();
  const lay = calculaReferencias({ font: modelo.font, refs: modelo.refs }, medidorCanvas(modelo.font));
  const cont = $("pagsRef");
  const total = lay.paginas.length;
  cont.textContent = "";
  lay.paginas.forEach((pg, k) => {
    const fig = criaFigura(k + 1, total);
    cont.append(fig);
    desenhaPagina(fig.querySelector(".sheet"), lay, k, modelo);
    escalaWrap(fig.querySelector(".sheet-wrap"));
  });
  document.body.classList.toggle("duas-paginas", total > 1);
  $("notaPrevia").hidden = !modelo.exemplo;
  $("notaRascunho").hidden = !modelo.rascunho;
  $("previaTitulo").textContent = total > 1 ? `Prévia (A4, ${total} páginas)` : "Prévia (A4)";
}

/* ---------- ampliar a prévia (celular) ---------- */
const NIVEIS_ZOOM = [1, 1.5, 2, 3];
let nivelZoom = 0;
function aplicaZoom() {
  const area = $("zoomArea");
  let larguraMax = 0;
  document.querySelectorAll("#zoomPagsRef .zoom-pag").forEach((pag) => {
    const sheet = pag.querySelector(".sheet");
    const escala = ((area.clientWidth - 24) / sheet.offsetWidth) * NIVEIS_ZOOM[nivelZoom];
    sheet.style.transform = `scale(${escala})`;
    pag.style.width = sheet.offsetWidth * escala + "px";
    pag.style.height = sheet.offsetHeight * escala + "px";
    larguraMax = Math.max(larguraMax, sheet.offsetWidth * escala);
  });
  $("zoomWrap").style.width = larguraMax + "px";
  $("zoomMenos").disabled = nivelZoom === 0;
  $("zoomMais").disabled = nivelZoom === NIVEIS_ZOOM.length - 1;
}
function abreZoom() {
  const modelo = modeloDaPrevia();
  const lay = calculaReferencias({ font: modelo.font, refs: modelo.refs }, medidorCanvas(modelo.font));
  const cont = $("zoomPagsRef");
  cont.textContent = "";
  lay.paginas.forEach((pg, k) => {
    const pag = document.createElement("div");
    pag.className = "zoom-pag";
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.id = "sheetZoomRef" + (k + 1);
    pag.append(sheet);
    cont.append(pag);
    desenhaPagina(sheet, lay, k, modelo);
  });
  nivelZoom = 0;
  $("dlgZoom").showModal();
  aplicaZoom();
}

/* ---------- abas do celular ---------- */
function mostraAba(qual) {
  const dados = qual === "dados";
  $("abaDados").setAttribute("aria-selected", dados);
  $("abaPrevia").setAttribute("aria-selected", !dados);
  $("painelForm").classList.toggle("ativo", dados);
  $("painelPrevia").classList.toggle("ativo", !dados);
  if (!dados) { renderPrevia(); window.scrollTo({ top: 0 }); }
}

/* ---------- baixar PDF / Word ---------- */
async function exporta(tipo) {
  if (gerando) return;
  const lista = montaListaAtual();
  if (!lista.length) {
    mensagem("Para baixar, adicione pelo menos uma referência à lista.", true, 10);
    mostraAba("dados");
    return;
  }
  const refs = lista.map((x) => ({ runs: x.ref.runs }));
  const fonte = $("font").value;
  const fora = tipo === "pdf" ? caracteresForaDoPdf(refs) : [];
  gerando = true;
  const botoes = [$("btnPdf"), $("btnDocx")];
  botoes.forEach((b) => (b.disabled = true));
  mensagem("Gerando o arquivo…", false, 0);
  try {
    const { blob, nome } = tipo === "pdf" ? await geraPdfReferencias(refs, fonte) : await geraDocxReferencias(refs, fonte);
    baixa(blob, nome);
    try { registraDownload(["referencias"]); mostraProximo("referencias"); } catch (e) { /* o "Monte seu TCC" e o "Próximo passo" são extras: nunca atrapalham o download */ }
    let aviso = "";
    if (fora.length) aviso += ` Atenção: o PDF não tem estes caracteres (${fora.slice(0, 8).join(" ")}) e eles saíram como "?". Use o Word para esses casos.`;
    if (atual && atual.completa && tocado) aviso += " A referência que está no formulário ainda não foi adicionada à lista, então não está no arquivo.";
    mensagem(`Pronto! O arquivo ${nome} foi baixado.${aviso}`, false, aviso ? 14 : 6);
  } catch (e) {
    mensagem("Não foi possível gerar o arquivo. Verifique sua conexão com a internet e tente de novo.", true, 10);
  } finally {
    botoes.forEach((b) => (b.disabled = false));
    gerando = false;
  }
}

/* ---------- limpar ---------- */
function novaLista() {
  itens = [];
  editandoId = null;
  limpaForm(tipoAtual());
  renderLista(); renderPrevia(); atualiza();
  mensagem("Pronto! A lista foi limpa. Monte as referências do novo trabalho.");
  mostraAba("dados");
  $("tipo").focus();
}
let timerLimpar;
function limpar() {
  const b = $("btnLimpar");
  if (b.dataset.confirma === "1") {
    limpaProgresso();
    apagaTudo();
    location.reload();
    return;
  }
  b.dataset.confirma = "1";
  b.textContent = "Clique de novo para apagar tudo";
  timerLimpar = setTimeout(() => { b.dataset.confirma = ""; b.textContent = "Limpar dados"; }, 5000);
}

/* ---------- início ---------- */
const guardado = lerGuardado();
if (guardado && Array.isArray(guardado.itens)) {
  itens = guardado.itens.filter((x) => x && x.dados && TIPO_POR_ID[x.dados.tipo]).slice(0, MAX_ITENS);
  proximoId = Math.max(Number(guardado.proximoId) || 1, ...itens.map((x) => x.id + 1), 1);
  if (guardado.estilo) $("estiloCita").value = guardado.estilo;
}
const fonteSalva = fonteGuardada();
if (fonteSalva && ["Arial", "Times New Roman"].includes(fonteSalva)) $("font").value = fonteSalva;
for (const t of TIPOS) for (const b of blocosDeAutoria(t.blocos)) { configuraAutoria(t.id, b); atualizaAutoria(t.id, b); }
for (const t of TIPOS) limpaForm(t.id);
mostraTipo(guardado && TIPO_POR_ID[guardado.tipo] ? guardado.tipo : "livro");
tocado = false;

$("tipo").addEventListener("change", () => {
  if (editandoId !== null) { editandoId = null; renderLista(); }
  mostraTipo(tipoAtual());
  tocado = false;
  atualiza();
});
$("form").addEventListener("input", (e) => {
  if (e.target.closest(".ref-form")) tocado = true;
  if (e.target.id === "font") { guardaFonte(e.target.value); renderPrevia(); }
  if (e.target.id === "estiloCita") { renderLista(); }
  atualiza();
});
$("form").addEventListener("submit", (e) => e.preventDefault());
$("lista").addEventListener("click", aoClicarNaLista);
$("btnAdicionar").addEventListener("click", adicionaOuSalva);
$("btnCancelarEdicao").addEventListener("click", cancelaEdicao);
$("btnCopiarRef").addEventListener("click", async () => {
  if (!atual || !atual.completa) return;
  mensagem((await copiaRico([atual])) ? "Referência copiada. Cole no Word ou no Google Docs: o negrito vem junto." : "Não foi possível copiar. Selecione o texto e copie à mão.", false);
});
$("btnCopiarPar").addEventListener("click", async () => mensagem((await copiaTexto(atual.citacao.par)) ? `Citação ${atual.citacao.par} copiada.` : "Não foi possível copiar.", false));
$("btnCopiarNar").addEventListener("click", async () => mensagem((await copiaTexto(atual.citacao.nar)) ? `Citação ${atual.citacao.nar} copiada.` : "Não foi possível copiar.", false));
$("btnCopiarLista").addEventListener("click", async () => mensagem((await copiaRico(montaListaAtual().map((x) => x.ref))) ? "Lista copiada, em ordem alfabética. Cole no Word ou no Google Docs." : "Não foi possível copiar.", false));
$("btnNova").addEventListener("click", novaLista);
$("btnLimpar").addEventListener("click", limpar);
$("abaDados").addEventListener("click", () => mostraAba("dados"));
$("abaPrevia").addEventListener("click", () => mostraAba("previa"));
$("btnPdf").addEventListener("click", () => exporta("pdf"));
$("btnDocx").addEventListener("click", () => exporta("docx"));
for (const [id, lib] of [["btnPdf", "jspdf"], ["btnDocx", "docx"]]) {
  for (const ev of ["pointerenter", "focus", "touchstart"]) $(id).addEventListener(ev, () => precarrega(lib), { once: true, passive: true });
}
$("btnAmpliar").addEventListener("click", abreZoom);
$("zoomFechar").addEventListener("click", () => $("dlgZoom").close());
$("zoomMais").addEventListener("click", () => { nivelZoom = Math.min(NIVEIS_ZOOM.length - 1, nivelZoom + 1); aplicaZoom(); });
$("zoomMenos").addEventListener("click", () => { nivelZoom = Math.max(0, nivelZoom - 1); aplicaZoom(); });
window.addEventListener("resize", () => { if ($("dlgZoom").open) aplicaZoom(); });
new ResizeObserver(ajustaEscala).observe($("painelPrevia"));

renderLista();
renderPrevia();
atualiza();
document.body.classList.add("pronto");
// se as fontes Arimo/Tinos (usadas quando o aparelho não tem Arial/Times) chegarem depois, refaz o cálculo com as medidas certas
if (document.fonts) { document.fonts.ready.then(() => { renderLista(); renderPrevia(); }); document.fonts.addEventListener("loadingdone", renderPrevia); }
if (pegaAviso()) mensagem("Pronto! Os dados foram apagados deste navegador.");
