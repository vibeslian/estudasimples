// Interface das ferramentas de capa e de folha de rosto: lê o formulário, monta o modelo, desenha a prévia ao vivo e gera PDF/Word.
// As duas páginas usam este mesmo arquivo; <body data-modo="capa"> ou <body data-modo="folha"> diz qual está aberta.
import { montaCapa, montaFolha, textoNatureza, ESTILO_PADRAO, TAMANHO_TITULO_PADRAO, TIPOS_TRABALHO } from "./modelo.js";
import { calculaLayout } from "./layout.js";
import { camposFaltando, geraPdf, geraDocx, baixa, precarrega, medidorCanvas } from "./exporta.js";
import { lerEstado, gravaEstado, lerLogo, gravaLogo, apagaTudo, pegaAviso, processaLogo } from "./estado.js";

const $ = (id) => document.getElementById(id);
const clone = (o) => JSON.parse(JSON.stringify(o));
const MODO = document.body.dataset.modo === "folha" ? "folha" : "capa";
const NOME_PAGINA = { capa: "capa", folha: "folha de rosto" };

// Linhas da tabela "Personalizar estilo": [chave, rótulo, páginas em que o elemento aparece]
const ELEMENTOS = [
  ["institution", "Instituição", ["capa"]],
  ["course", "Curso / departamento", ["capa"]],
  ["author", "Autor(es)", ["capa", "folha"]],
  ["title", "Título", ["capa", "folha"]],
  ["subtitle", "Subtítulo", ["capa", "folha"]],
  ["city", "Cidade", ["capa", "folha"]],
  ["year", "Ano", ["capa", "folha"]],
  ["orientador", "Orientador e professor", ["folha"]],
];
// Arial/Times do aparelho; se não houver, Arimo/Tinos (mesmas medidas). Ver ferramenta.css.
const FONTES = {
  Arial: '"CapaArial", "ArimoWeb", Arial, Helvetica, sans-serif',
  "Times New Roman": '"CapaTimes", "TinosWeb", "Times New Roman", Times, serif',
};
// campos de texto/seleção e caixas que são guardados na aba (ver estado.js)
const CAMPOS = ["institution", "course", "title", "subtitle", "volume", "city", "year", "font", "titleSize", "workType", "degree", "area", "nature",
  "advisorLabel", "advisor", "coLabel", "discipline", "teacher", "teacherLabel", "logoTamanho"];
const MARCAS = ["escolar", "juntas", "logoCapa", "logoFolha", "natureJust"];
const PADRAO_MARCAS = { escolar: false, juntas: false, logoCapa: true, logoFolha: false, natureJust: true };

let estilo = clone(ESTILO_PADRAO);
let natureManual = false;
let logo = null; // { src, tipo, w, h, nome }
let assinaturaTabela = "";

/* ---------- Listas dinâmicas (autores, coorientadores) ---------- */
function criaLista({ recipiente, botao, rotulo, placeholder, minimo }) {
  const el = $(recipiente);
  const atualiza = () => {
    const linhas = [...el.children];
    linhas.forEach((l, i) => {
      l.querySelector("input").setAttribute("aria-label", `${rotulo} ${i + 1}`);
      l.querySelector("button").hidden = linhas.length <= minimo;
    });
  };
  const adiciona = (valor = "") => {
    const linha = document.createElement("div");
    linha.className = "autor-linha";
    const input = document.createElement("input");
    input.type = "text";
    input.value = valor;
    input.placeholder = placeholder;
    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn btn-remover";
    remover.textContent = "Remover";
    remover.addEventListener("click", () => { linha.remove(); atualiza(); render(); });
    linha.append(input, remover);
    el.append(linha);
    atualiza();
    return input;
  };
  const valores = () => [...el.querySelectorAll("input")].map((i) => i.value);
  const define = (lista) => { el.textContent = ""; (lista.length ? lista : minimo ? [""] : []).forEach((v) => adiciona(v)); atualiza(); };
  $(botao).addEventListener("click", () => { adiciona().focus(); });
  return { adiciona, valores, define };
}
const autores = criaLista({ recipiente: "autores", botao: "addAutor", rotulo: "Autor", placeholder: "Nome completo", minimo: 1 });
const coorientadores = criaLista({ recipiente: "coorientadores", botao: "addCoorientador", rotulo: "Coorientador", placeholder: "Ex.: Profa. Dra. Maria Souza", minimo: 0 });

/* ---------- Dados do formulário ---------- */
const valor = (id) => ($(id) ? $(id).value : "");
const marcado = (id) => ($(id) ? $(id).checked : PADRAO_MARCAS[id]);

function lerDados() {
  return {
    institution: valor("institution"),
    course: valor("course"),
    authors: autores.valores(),
    title: valor("title"),
    subtitle: valor("subtitle"),
    volume: valor("volume"),
    city: valor("city"),
    year: valor("year"),
    font: valor("font"),
    titleSize: valor("titleSize"),
    style: estilo,
    logo: logo ? { ...logo, tamanho: valor("logoTamanho") || "medio", naCapa: marcado("logoCapa"), naFolha: marcado("logoFolha") } : null,
    escolar: marcado("escolar"),
    discipline: valor("discipline"),
    teacher: valor("teacher"),
    teacherLabel: valor("teacherLabel"),
    workType: valor("workType") || "tcc",
    degree: valor("degree"),
    area: valor("area"),
    nature: valor("nature"),
    natureManual,
    natureJustificada: marcado("natureJust"),
    advisor: valor("advisor"),
    advisorLabel: valor("advisorLabel"),
    coadvisors: coorientadores.valores(),
    coLabel: valor("coLabel"),
  };
}

function ativas() {
  const juntas = marcado("juntas");
  return juntas ? ["capa", "folha"] : [MODO];
}

/* ---------- Guardar na aba e restaurar ---------- */
function guarda() {
  const texto = {};
  for (const id of CAMPOS) if ($(id)) texto[id] = $(id).value;
  const marcas = {};
  for (const id of MARCAS) if ($(id)) marcas[id] = $(id).checked;
  gravaEstado({ texto, marcas, autores: autores.valores(), co: coorientadores.valores(), estilo, manual: natureManual });
}
function restaura() {
  const est = lerEstado();
  logo = lerLogo();
  if (!est) { autores.define([]); coorientadores.define([]); return; }
  for (const id of CAMPOS) if ($(id) && est.texto && est.texto[id] !== undefined) $(id).value = est.texto[id];
  for (const id of MARCAS) if ($(id) && est.marcas && typeof est.marcas[id] === "boolean") $(id).checked = est.marcas[id];
  autores.define(Array.isArray(est.autores) ? est.autores : []);
  coorientadores.define(Array.isArray(est.co) ? est.co : []);
  if (est.estilo) estilo = { ...clone(ESTILO_PADRAO), ...est.estilo };
  natureManual = !!est.manual;
}

/* ---------- Tabela "Personalizar estilo" ---------- */
function linhasEstilo() {
  const pags = ativas();
  return ELEMENTOS.filter(([chave, , onde]) => {
    if (chave === "orientador") return pags.includes("folha") || (pags.includes("capa") && marcado("escolar"));
    return onde.some((p) => pags.includes(p));
  });
}
function montaTabelaEstilo(forca = false) {
  const linhas = linhasEstilo();
  const assinatura = linhas.map((l) => l[0]).join(",");
  if (!forca && assinatura === assinaturaTabela) return;
  assinaturaTabela = assinatura;
  const corpo = $("tabelaEstilo");
  corpo.innerHTML = "";
  for (const [chave, rotulo] of linhas) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = rotulo;
    th.style.fontWeight = "400";
    tr.append(th);
    for (const [prop, nome] of [["caps", "maiúsculas"], ["bold", "negrito"]]) {
      const td = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = estilo[chave][prop];
      cb.setAttribute("aria-label", `${rotulo}: ${nome}`);
      cb.addEventListener("change", () => { estilo[chave][prop] = cb.checked; render(); });
      td.append(cb);
      tr.append(td);
    }
    corpo.append(tr);
  }
}

/* ---------- Natureza do trabalho (texto montado sozinho) ---------- */
function atualizaNatureza() {
  if (natureManual) return;
  const t = textoNatureza(lerDados());
  if ($("nature").value !== t) $("nature").value = t;
}

/* ---------- Prévia ---------- */
// Desenha uma página dentro de um elemento .sheet (usado na prévia normal e na ampliada).
// Cada linha é colocada onde o motor de layout (layout.js) a calculou, a mesma posição que o PDF usa: assim a prévia e o PDF saem iguais.
// Retorna true se o conteúdo não cabe na página.
function desenhaFolha(sheet, modelo) {
  sheet.style.fontFamily = FONTES[modelo.font];
  sheet.textContent = "";
  const lay = calculaLayout(modelo, medidorCanvas(modelo.font));
  for (const b of lay.blocos) {
    if (b.kind === "imagem") {
      const img = document.createElement("img");
      img.alt = "";
      img.src = b.src;
      img.className = "logo-bloco";
      Object.assign(img.style, { left: b.x0 + "pt", top: b.topo + "pt", width: b.largura + "pt", height: b.altura + "pt" });
      sheet.append(img);
      continue;
    }
    const p = document.createElement("p");
    Object.assign(p.style, { left: b.x0 + "pt", top: b.topo + "pt", width: b.larguraBloco + "pt", fontSize: b.size + "pt", lineHeight: String(b.fator) });
    if (b.placeholder) p.classList.add("fantasma");
    b.linhas.forEach((linha, i) => {
      const ld = document.createElement("span");
      ld.className = "linha";
      if (b.align === "center") ld.style.textAlign = "center";
      // justificado: a sobra (ou, se o Word apertou os espaços, a falta) é repartida entre os espaços; a última linha não é esticada,
      // a menos que tenha sido apertada para caber
      const nEsp = linha.parts.reduce((s, q) => s + (q.text.match(/ /g) || []).length, 0);
      if (b.align === "justify" && nEsp && (i < b.linhas.length - 1 || linha.largura > b.larguraBloco)) ld.style.wordSpacing = (b.larguraBloco - linha.largura) / nEsp + "pt";
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
  return lay.excede;
}

const MONTA = { capa: montaCapa, folha: montaFolha };
const IDS = { capa: { pag: "pagCapa", wrap: "sheetWrap", sheet: "sheet", zoomPag: "zoomPagCapa", zoomSheet: "sheetZoom" },
  folha: { pag: "pagFolha", wrap: "sheetWrapFolha", sheet: "sheetFolha", zoomPag: "zoomPagFolha", zoomSheet: "sheetZoomFolha" } };

function render() {
  atualizaNatureza();
  const dados = lerDados();
  const pags = ativas();
  const cheias = [];
  for (const p of ["capa", "folha"]) {
    const ativa = pags.includes(p);
    $(IDS[p].pag).hidden = !ativa;
    if (!ativa) continue;
    const cheia = desenhaFolha($(IDS[p].sheet), MONTA[p](dados, { previa: true }));
    ajustaEscalaDe(p);
    if (cheia) cheias.push(p);
  }
  document.body.classList.toggle("duas-paginas", pags.length > 1);
  const aviso = $("avisoPagina");
  aviso.hidden = !cheias.length;
  if (cheias.length) aviso.textContent = `O texto da ${cheias.map((p) => NOME_PAGINA[p]).join(" e da ")} está grande demais e passa da área da página. Diminua o tamanho do título ou encurte os textos.`;
  atualizaInterface(dados, pags);
  guarda();
}

// A folha tem tamanho real de A4; aqui ela é reduzida para caber na largura disponível.
function ajustaEscalaDe(p) {
  const wrap = $(IDS[p].wrap);
  const sheet = $(IDS[p].sheet);
  const largura = wrap.clientWidth;
  if (!largura) return; // painel escondido (aba do celular) ou página não usada
  const escala = largura / sheet.offsetWidth;
  sheet.style.transform = `scale(${escala})`;
  wrap.style.height = sheet.offsetHeight * escala + "px";
}
const ajustaEscala = () => ativas().forEach(ajustaEscalaDe);

/* ---------- Partes da interface que dependem das escolhas ---------- */
function atualizaInterface(dados, pags) {
  const escolar = dados.escolar;
  $("camposEscolar").hidden = !escolar;
  $("blocoOrientador").hidden = escolar;
  const tipo = TIPOS_TRABALHO.find((t) => t.id === dados.workType) || TIPOS_TRABALHO[0];
  $("campoGrau").hidden = tipo.id === "disciplina" || tipo.id === "outro";
  $("campoDisciplinaNat").hidden = tipo.id !== "disciplina";
  $("rotuloDegree").firstChild.textContent = tipo.titulo ? "Título pretendido " : "Objetivo ";
  $("degree").placeholder = tipo.exemplo ? "Ex.: " + tipo.exemplo : "";
  $("refazNature").hidden = !(natureManual && tipo.id !== "outro");
  $("logoOpcoes").hidden = !logo;
  if (logo) { $("logoMini").src = logo.src; $("logoNome").textContent = logo.nome; }
  const duas = pags.length > 1;
  $("juntasInfo").textContent = duas
    ? "O arquivo vai ter 2 páginas: a capa e, depois, a folha de rosto."
    : MODO === "capa" ? "Sem marcar, o arquivo tem só a capa." : "Sem marcar, o arquivo tem só a folha de rosto.";
  $("previaTitulo").textContent = duas ? "Prévia (A4, 2 páginas)" : "Prévia (A4)";
  montaTabelaEstilo();
}

/* ---------- Ampliar prévia (celular) ---------- */
const NIVEIS_ZOOM = [1, 1.5, 2, 3]; // 1 = página inteira na largura da tela
let nivelZoom = 0;
function aplicaZoom() {
  const area = $("zoomArea");
  let larguraMax = 0;
  for (const p of ativas()) {
    const sheet = $(IDS[p].zoomSheet);
    const escala = ((area.clientWidth - 24) / sheet.offsetWidth) * NIVEIS_ZOOM[nivelZoom];
    sheet.style.transform = `scale(${escala})`;
    const pag = $(IDS[p].zoomPag);
    pag.style.width = sheet.offsetWidth * escala + "px";
    pag.style.height = sheet.offsetHeight * escala + "px";
    larguraMax = Math.max(larguraMax, sheet.offsetWidth * escala);
  }
  $("zoomWrap").style.width = larguraMax + "px";
  $("zoomMenos").disabled = nivelZoom === 0;
  $("zoomMais").disabled = nivelZoom === NIVEIS_ZOOM.length - 1;
}
function abreZoom() {
  const dados = lerDados();
  const pags = ativas();
  for (const p of ["capa", "folha"]) {
    $(IDS[p].zoomPag).hidden = !pags.includes(p);
    if (pags.includes(p)) desenhaFolha($(IDS[p].zoomSheet), MONTA[p](dados, { previa: true }));
  }
  nivelZoom = 0;
  $("dlgZoom").showModal();
  aplicaZoom();
}

/* ---------- Abas do celular ---------- */
function mostraAba(qual) {
  const dados = qual === "dados";
  $("abaDados").setAttribute("aria-selected", dados);
  $("abaPrevia").setAttribute("aria-selected", !dados);
  $("painelForm").classList.toggle("ativo", dados);
  $("painelPrevia").classList.toggle("ativo", !dados);
  if (!dados) {
    ajustaEscala();
    render();
    window.scrollTo({ top: 0 });
  }
}

/* ---------- Mensagens ---------- */
let timerMsg;
function mensagem(texto, erro = false, segundos = 6) {
  const t = $("toast");
  t.textContent = texto;
  t.classList.toggle("erro", erro);
  clearTimeout(timerMsg);
  if (texto && segundos) timerMsg = setTimeout(() => (t.textContent = ""), segundos * 1000);
}

/* ---------- Baixar PDF / Word ---------- */
let gerando = false;
const TEXTO_EXCEDE = (p) => `O texto da ${NOME_PAGINA[p] || "página"} passa da página. Diminua o tamanho do título ou encurte os textos antes de baixar.`;
async function exporta(tipo) {
  if (gerando) return;
  const dados = lerDados();
  const pags = ativas();
  const falta = camposFaltando(dados, pags);
  if (falta.length) {
    const lista = falta.map((f) => f.rotulo);
    mensagem(`Para baixar, preencha ${lista.length > 1 ? lista.slice(0, -1).join(", ") + " e " + lista.slice(-1) : lista[0]}.`, true, 10);
    mostraAba("dados");
    const alvo = falta[0].id === "autor" ? $("autores").querySelector("input") : $(falta[0].id);
    const caixa = alvo.closest("details");
    if (caixa) caixa.open = true;
    alvo.focus();
    return;
  }
  if (!$("avisoPagina").hidden) {
    mensagem(TEXTO_EXCEDE(), true, 10);
    return;
  }
  gerando = true;
  const botoes = [$("btnPdf"), $("btnDocx")];
  botoes.forEach((b) => (b.disabled = true));
  mensagem("Gerando o arquivo…", false, 0);
  try {
    const { blob, nome } = tipo === "pdf" ? await geraPdf(dados, pags) : await geraDocx(dados, pags);
    baixa(blob, nome);
    mensagem(`Pronto! O arquivo ${nome} foi baixado.`);
  } catch (e) {
    mensagem(
      e && /^excede/.test(e.message || "")
        ? TEXTO_EXCEDE(e.message.split(":")[1])
        : "Não foi possível gerar o arquivo. Verifique sua conexão com a internet e tente de novo.",
      true,
      10
    );
  } finally {
    botoes.forEach((b) => (b.disabled = false));
    gerando = false;
  }
}

/* ---------- Logo ---------- */
const ERROS_LOGO = {
  tipo: "Use uma imagem PNG, JPG ou WebP.",
  grande: "A imagem é grande demais (máximo de 10 MB). Escolha uma menor.",
  invalida: "Não foi possível ler essa imagem. Tente outro arquivo.",
};
async function aoEscolherLogo(e) {
  const arquivo = e.target.files && e.target.files[0];
  if (!arquivo) return;
  try {
    logo = await processaLogo(arquivo);
    gravaLogo(logo);
    mensagem("Logo adicionado. Ele fica só no seu navegador.");
    render();
  } catch (err) {
    mensagem(ERROS_LOGO[err.message] || ERROS_LOGO.invalida, true, 10);
  } finally {
    e.target.value = "";
  }
}
function removeLogo() {
  logo = null;
  gravaLogo(null);
  render();
  mensagem("Logo removido.");
  $("logoArquivo").focus();
}

/* ---------- Início ---------- */
function restaurarPadrao() {
  estilo = clone(ESTILO_PADRAO);
  $("titleSize").value = String(TAMANHO_TITULO_PADRAO);
  $("natureJust").checked = true;
  montaTabelaEstilo(true);
  render();
}

function novaCapa() {
  // Mantém instituição, curso, autores, cidade, ano, fonte, estilo e logo; limpa só o que muda de um trabalho para outro.
  $("title").value = "";
  $("subtitle").value = "";
  $("volume").value = "";
  render();
  mensagem(MODO === "capa" ? "Pronto! Os dados foram mantidos. Digite o título da nova capa." : "Pronto! Os dados foram mantidos. Digite o título do novo trabalho.");
  mostraAba("dados");
  $("title").focus();
}

// "Limpar dados": pede um segundo clique para evitar apagar sem querer; depois recarrega a página já vazia
let timerLimpar;
function limpar() {
  const b = $("btnLimpar");
  if (b.dataset.confirma === "1") {
    apagaTudo();
    location.reload();
    return;
  }
  b.dataset.confirma = "1";
  b.textContent = "Clique de novo para apagar tudo";
  timerLimpar = setTimeout(() => { b.dataset.confirma = ""; b.textContent = "Limpar dados"; }, 5000);
}

restaura();
if (!$("year").value) $("year").value = new Date().getFullYear();
// campos com o mesmo dado em dois lugares (a disciplina aparece no modelo escolar e na natureza do trabalho)
const espelhos = [...document.querySelectorAll("[data-campo]")];
if (valor("discipline")) espelhos.forEach((el) => { el.value = valor("discipline"); });
montaTabelaEstilo(true);
$("form").addEventListener("input", (e) => {
  const alvo = e.target;
  if (alvo.id === "nature") natureManual = true;
  if (alvo.id === "workType") natureManual = false;
  if (alvo.id === "escolar" && alvo.checked && valor("workType") === "tcc") $("workType").value = "disciplina";
  if (alvo.dataset && alvo.dataset.campo) espelhos.forEach((el) => { if (el !== alvo && el.dataset.campo === alvo.dataset.campo) el.value = alvo.value; });
  render();
});
$("form").addEventListener("submit", (e) => e.preventDefault());
$("restaurar").addEventListener("click", restaurarPadrao);
$("refazNature").addEventListener("click", () => { natureManual = false; render(); $("nature").focus(); });
$("btnNova").addEventListener("click", novaCapa);
$("btnLimpar").addEventListener("click", limpar);
$("logoArquivo").addEventListener("change", aoEscolherLogo);
$("logoRemover").addEventListener("click", removeLogo);
$("abaDados").addEventListener("click", () => mostraAba("dados"));
$("abaPrevia").addEventListener("click", () => mostraAba("previa"));
$("btnPdf").addEventListener("click", () => exporta("pdf"));
$("btnDocx").addEventListener("click", () => exporta("docx"));
// começa a baixar a biblioteca assim que o usuário se aproxima do botão
for (const [id, lib] of [["btnPdf", "jspdf"], ["btnDocx", "docx"]]) {
  for (const ev of ["pointerenter", "focus", "touchstart"]) $(id).addEventListener(ev, () => precarrega(lib), { once: true, passive: true });
}
$("btnAmpliar").addEventListener("click", abreZoom);
$("zoomFechar").addEventListener("click", () => $("dlgZoom").close());
$("zoomMais").addEventListener("click", () => { nivelZoom = Math.min(NIVEIS_ZOOM.length - 1, nivelZoom + 1); aplicaZoom(); });
$("zoomMenos").addEventListener("click", () => { nivelZoom = Math.max(0, nivelZoom - 1); aplicaZoom(); });
window.addEventListener("resize", () => { if ($("dlgZoom").open) aplicaZoom(); });
const observador = new ResizeObserver(ajustaEscala);
observador.observe($("sheetWrap"));
observador.observe($("sheetWrapFolha"));
render();
// Se as fontes Arimo/Tinos (usadas quando o aparelho não tem Arial/Times) chegarem depois, refaz o cálculo com as medidas certas
if (document.fonts) { document.fonts.ready.then(render); document.fonts.addEventListener("loadingdone", render); }
if (pegaAviso()) mensagem("Pronto! Os dados foram apagados deste navegador.");
