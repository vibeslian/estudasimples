// Interface das ferramentas de capa, de folha de rosto e de sumário: lê o formulário, monta o modelo, desenha a prévia ao vivo e gera PDF/Word.
// As três páginas usam este mesmo arquivo; <body data-modo="capa|folha|sumario"> diz qual está aberta.
import {
  montaCapa, montaFolha, montaSumario, textoNatureza, ESTILO_PADRAO, TAMANHO_TITULO_PADRAO, TIPOS_TRABALHO,
  ESTILO_NIVEL_PADRAO, NIVEIS_SUMARIO, TIPOS_ITEM, numeraSumario, interpretaLista, sumarioDeExemplo,
} from "./modelo.js";
import { calculaLayout } from "./layout.js";
import { calculaSumario } from "./sumario.js";
import { camposFaltando, geraPdf, geraDocx, baixa, precarrega, medidorCanvas } from "./exporta.js";
import { lerEstado, gravaEstado, lerLogo, gravaLogo, apagaTudo, pegaAviso, processaLogo } from "./estado.js";
import { registraDownload, mostraProximo, limpaProgresso } from "../progresso.js";

const $ = (id) => document.getElementById(id);
const clone = (o) => JSON.parse(JSON.stringify(o));
const MODO = ["folha", "sumario"].includes(document.body.dataset.modo) ? document.body.dataset.modo : "capa";
const NOME_PAGINA = { capa: "capa", folha: "folha de rosto", sumario: "sumário" };
const COM_ARTIGO = { capa: "a capa", folha: "a folha de rosto", sumario: "o sumário" };
const ORDEM = ["capa", "folha", "sumario"];

// Linhas da tabela "Personalizar estilo" da capa e da folha: [chave, rótulo, páginas em que o elemento aparece]
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
  "advisorLabel", "advisor", "coLabel", "discipline", "teacher", "teacherLabel", "logoTamanho", "sumAlinha", "sumEspaco"];
const MARCAS = ["escolar", "incCapa", "incFolha", "incSumario", "logoCapa", "logoFolha", "natureJust", "sumAlinhaPos", "sumPontilhado"];
const PADRAO_MARCAS = { escolar: false, incCapa: false, incFolha: false, incSumario: false, logoCapa: true, logoFolha: false, natureJust: true, sumAlinhaPos: true, sumPontilhado: true };

let estilo = clone(ESTILO_PADRAO);
let natureManual = false;
let logo = null; // { src, tipo, w, h, nome }
let assinaturaTabela = "";
let sumarioEstado = { entradas: [], estiloNivel: clone(ESTILO_NIVEL_PADRAO) };
let guardado = { texto: {}, marcas: {} }; // o que a aba já tinha guardado: vale para os campos que não existem nesta página

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
// Se o campo não existe nesta página (por exemplo, o tamanho do título na página do sumário), vale o que a aba já tinha guardado.
const valor = (id) => ($(id) ? $(id).value : guardado.texto[id] ?? "");
const marcado = (id) => ($(id) ? $(id).checked : guardado.marcas[id] ?? PADRAO_MARCAS[id]);

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
    sumario: {
      entradas: sumarioEstado.entradas,
      estiloNivel: sumarioEstado.estiloNivel,
      opcoes: { alinha: valor("sumAlinha") || "indicativo", alinhaPos: marcado("sumAlinhaPos"), pontilhado: marcado("sumPontilhado"), espaco: valor("sumEspaco") || "1.5" },
    },
  };
}

// Páginas do arquivo, sempre na ordem capa, folha de rosto, sumário: a desta página e as que o estudante marcou para baixar juntas
function ativas() {
  const quer = { capa: MODO === "capa" || marcado("incCapa"), folha: MODO === "folha" || marcado("incFolha"), sumario: MODO === "sumario" || marcado("incSumario") };
  return ORDEM.filter((p) => quer[p]);
}

/* ---------- Guardar na aba e restaurar ---------- */
function guarda() {
  const ant = lerEstado() || {};
  const texto = { ...(ant.texto || {}) };
  for (const id of CAMPOS) if ($(id)) texto[id] = $(id).value;
  const marcas = { ...(ant.marcas || {}) };
  for (const id of MARCAS) if ($(id)) marcas[id] = $(id).checked;
  guardado = { texto, marcas };
  gravaEstado({ texto, marcas, autores: autores.valores(), co: coorientadores.valores(), estilo, manual: natureManual, sumario: sumarioEstado });
}
function restaura() {
  const est = lerEstado();
  logo = lerLogo();
  if (!est) { autores.define([]); coorientadores.define([]); return; }
  guardado = { texto: est.texto || {}, marcas: est.marcas || {} };
  for (const id of CAMPOS) if ($(id) && est.texto && est.texto[id] !== undefined) $(id).value = est.texto[id];
  for (const id of MARCAS) if ($(id) && est.marcas && typeof est.marcas[id] === "boolean") $(id).checked = est.marcas[id];
  autores.define(Array.isArray(est.autores) ? est.autores : []);
  coorientadores.define(Array.isArray(est.co) ? est.co : []);
  if (est.estilo) estilo = { ...clone(ESTILO_PADRAO), ...est.estilo };
  natureManual = !!est.manual;
  if (est.sumario) {
    const es = Array.isArray(est.sumario.entradas) ? est.sumario.entradas : [];
    sumarioEstado.entradas = es.map((e) => ({ tipo: e.tipo, nivel: e.nivel, titulo: String(e.titulo ?? ""), pagina: String(e.pagina ?? "") }));
    for (let n = 1; n <= NIVEIS_SUMARIO; n++) sumarioEstado.estiloNivel[n] = { ...ESTILO_NIVEL_PADRAO[n], ...((est.sumario.estiloNivel || {})[n] || {}) };
  }
}

/* ---------- Tabelas "Personalizar estilo" ---------- */
function linhasEstilo() {
  const pags = ativas();
  return ELEMENTOS.filter(([chave, , onde]) => {
    if (chave === "orientador") return pags.includes("folha") || (pags.includes("capa") && marcado("escolar"));
    return onde.some((p) => pags.includes(p));
  });
}
function montaTabelaEstilo(forca = false) {
  if (!$("tabelaEstilo")) return; // na página do sumário a tabela é a dos níveis
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
function montaTabelaNiveis() {
  const corpo = $("tabelaNiveis");
  if (!corpo) return;
  corpo.innerHTML = "";
  for (let n = 1; n <= NIVEIS_SUMARIO; n++) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = `Nível ${n}`;
    th.style.fontWeight = "400";
    tr.append(th);
    for (const [prop, nome] of [["caps", "maiúsculas"], ["bold", "negrito"], ["italic", "itálico"]]) {
      const td = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!sumarioEstado.estiloNivel[n][prop];
      cb.setAttribute("aria-label", `Nível ${n}: ${nome}`);
      cb.addEventListener("change", () => { sumarioEstado.estiloNivel[n][prop] = cb.checked; render(); });
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

/* ---------- Itens do sumário ---------- */
const nomeTipo = Object.fromEntries(TIPOS_ITEM.map((t) => [t.id, t.nome]));
function rotuloItem(e, n) {
  if (n.tipo === "num") return n.numero;
  if (n.tipo === "sem") return "sem nº";
  return (n.tipo === "apendice" ? "Apêndice " : "Anexo ") + n.letra;
}
// nível mais alto que o item i pode ter (um a mais que o do último item numerado antes dele)
function nivelMaximo(nums, i) {
  let anterior = 0;
  for (let k = 0; k < i; k++) if (nums[k].tipo === "num") anterior = nums[k].nivel;
  return Math.min(NIVEIS_SUMARIO, anterior + 1);
}

function renderLista(foco) {
  const cont = $("listaSumario");
  if (!cont) return;
  cont.textContent = "";
  cont.setAttribute("role", sumarioEstado.entradas.length ? "list" : "group"); // uma lista vazia não pode ter role=list sem itens
  const nums = numeraSumario(sumarioEstado.entradas);
  sumarioEstado.entradas.forEach((e, i) => {
    const n = nums[i];
    const item = document.createElement("div");
    item.className = "sum-item";
    item.setAttribute("role", "listitem");
    item.dataset.i = String(i);
    const l1 = document.createElement("div");
    l1.className = "sum-linha1";
    const badge = document.createElement("span");
    badge.className = "sum-num";
    badge.setAttribute("aria-hidden", "true");
    const titulo = document.createElement("input");
    titulo.type = "text";
    titulo.className = "sum-titulo";
    titulo.id = "sumTitulo-" + i;
    titulo.value = e.titulo;
    titulo.placeholder = n.tipo === "num" ? "Título da seção" : n.tipo === "sem" ? "Ex.: Referências" : "Título (opcional)";
    titulo.setAttribute("aria-label", `Título do item ${i + 1}`);
    const pag = document.createElement("input");
    pag.type = "text";
    pag.className = "sum-pag";
    pag.value = e.pagina;
    pag.placeholder = "Pág.";
    pag.setAttribute("inputmode", "numeric");
    pag.setAttribute("aria-label", `Página do item ${i + 1}`);
    l1.append(badge, titulo, pag);
    const l2 = document.createElement("div");
    l2.className = "sum-linha2";
    const tipo = document.createElement("select");
    tipo.className = "sum-tipo";
    tipo.setAttribute("aria-label", `Tipo do item ${i + 1}`);
    tipo.title = "Seção numerada, sem número (Referências, Glossário, Índice), Apêndice ou Anexo";
    for (const t of TIPOS_ITEM) { const o = document.createElement("option"); o.value = t.id; o.textContent = t.nome; if (t.id === n.tipo) o.selected = true; tipo.append(o); }
    l2.append(tipo);
    const botao = (acao, texto, rotulo, desativado) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-pequeno btn-icone";
      b.dataset.acao = acao;
      b.textContent = texto;
      b.setAttribute("aria-label", `${rotulo} (item ${i + 1})`);
      b.disabled = !!desativado;
      return b;
    };
    const max = nivelMaximo(nums, i);
    l2.append(
      botao("sobe", "↑", "Subir", i === 0),
      botao("desce", "↓", "Descer", i === sumarioEstado.entradas.length - 1),
      botao("menos", "←", "Diminuir o nível (deixar de ser subseção)", n.tipo !== "num" || n.nivel <= 1),
      botao("mais", "→", "Aumentar o nível (tornar subseção)", n.tipo !== "num" || n.nivel >= max),
      botao("remove", "✕", "Remover", false)
    );
    item.append(l1, l2);
    cont.append(item);
    badge.textContent = rotuloItem(e, n);
    item.style.marginLeft = n.tipo === "num" ? (n.nivel - 1) * 14 + "px" : "0";
  });
  if (!sumarioEstado.entradas.length) {
    const vazio = document.createElement("p");
    vazio.className = "dica-campo";
    vazio.textContent = "Nenhum item ainda. Adicione uma seção ou cole uma lista de títulos.";
    cont.append(vazio);
  }
  if (foco) {
    const alvo = cont.querySelector(foco.acao === "titulo" ? `#sumTitulo-${foco.i}` : `[data-i="${foco.i}"] [data-acao="${foco.acao}"]:not(:disabled)`) || cont.querySelector(`[data-i="${foco.i}"] .sum-titulo`);
    if (alvo) alvo.focus();
  }
}
// só a numeração e o recuo (a cada tecla, sem refazer os campos)
function atualizaListaNumeros() {
  const cont = $("listaSumario");
  if (!cont) return;
  const nums = numeraSumario(sumarioEstado.entradas);
  cont.querySelectorAll(".sum-item").forEach((item) => {
    const i = Number(item.dataset.i);
    const n = nums[i];
    if (!n) return;
    item.querySelector(".sum-num").textContent = rotuloItem(sumarioEstado.entradas[i], n);
    item.style.marginLeft = n.tipo === "num" ? (n.nivel - 1) * 14 + "px" : "0";
  });
}
function adicionaItem(entrada, posicao) {
  const es = sumarioEstado.entradas;
  const i = posicao === undefined ? es.length : posicao;
  es.splice(i, 0, entrada);
  renderLista({ i, acao: "titulo" });
  render();
}
function posicaoDepoisDaUltimaSecao() {
  const es = sumarioEstado.entradas;
  let ultimo = -1;
  es.forEach((e, i) => { if (numeraSumario(es)[i].tipo === "num") ultimo = i; });
  return ultimo + 1;
}
function nivelDaUltimaSecao() {
  const nums = numeraSumario(sumarioEstado.entradas);
  for (let i = nums.length - 1; i >= 0; i--) if (nums[i].tipo === "num") return nums[i].nivel;
  return 0;
}
function aoClicarNaLista(ev) {
  const b = ev.target.closest("button[data-acao]");
  if (!b) return;
  const item = b.closest(".sum-item");
  const i = Number(item.dataset.i);
  const es = sumarioEstado.entradas;
  const acao = b.dataset.acao;
  const nums = numeraSumario(es);
  if (acao === "remove") {
    es.splice(i, 1);
    renderLista(es.length ? { i: Math.min(i, es.length - 1), acao: "titulo" } : null);
    if (!es.length) $("addSecao").focus();
  } else if (acao === "sobe" && i > 0) {
    [es[i - 1], es[i]] = [es[i], es[i - 1]];
    renderLista({ i: i - 1, acao: "sobe" });
  } else if (acao === "desce" && i < es.length - 1) {
    [es[i + 1], es[i]] = [es[i], es[i + 1]];
    renderLista({ i: i + 1, acao: "desce" });
  } else if (acao === "menos") {
    es[i].nivel = Math.max(1, nums[i].nivel - 1);
    renderLista({ i, acao: "menos" });
  } else if (acao === "mais") {
    es[i].nivel = Math.min(nivelMaximo(nums, i), nums[i].nivel + 1);
    renderLista({ i, acao: "mais" });
  }
  render();
}
function aoDigitarNaLista(ev) {
  const item = ev.target.closest(".sum-item");
  if (!item) return;
  const e = sumarioEstado.entradas[Number(item.dataset.i)];
  if (!e) return;
  if (ev.target.classList.contains("sum-titulo")) e.titulo = ev.target.value;
  else if (ev.target.classList.contains("sum-pag")) e.pagina = ev.target.value;
}
function aoMudarTipo(ev) {
  if (!ev.target.classList.contains("sum-tipo")) return;
  const i = Number(ev.target.closest(".sum-item").dataset.i);
  const e = sumarioEstado.entradas[i];
  e.tipo = ev.target.value;
  if (e.tipo === "num" && !e.nivel) e.nivel = 1;
  renderLista({ i, acao: "titulo" });
  render();
}
function colar(substitui) {
  const { entradas, ignorados } = interpretaLista($("colarLista").value);
  const info = $("colarInfo");
  if (!entradas.length) {
    info.textContent = ignorados.length ? "Esses títulos são elementos pré-textuais e não entram no sumário. Cole os títulos a partir da Introdução." : "Não encontrei nenhum título. Cole um título por linha.";
    return;
  }
  sumarioEstado.entradas = substitui ? entradas : sumarioEstado.entradas.concat(entradas);
  renderLista(null);
  $("colarLista").value = "";
  info.textContent = `${entradas.length} ${entradas.length === 1 ? "item adicionado" : "itens adicionados"}.` + (ignorados.length ? ` Não entraram, por serem elementos pré-textuais: ${ignorados.join(", ")}.` : "") + " Confira os níveis e as páginas.";
  render();
}
function inserirExemplo() {
  const novos = sumarioDeExemplo();
  sumarioEstado.entradas = sumarioEstado.entradas.concat(novos);
  renderLista({ i: sumarioEstado.entradas.length - novos.length, acao: "titulo" });
  $("colarInfo").textContent = "Estrutura de exemplo adicionada. Troque os títulos e as páginas pelos do seu trabalho.";
  render();
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

// Uma página do sumário: título (na 1ª página) e os itens, cada linha onde o motor de layout a calculou (sumario.js)
function desenhaSumario(sheet, lay, modelo, k) {
  sheet.style.fontFamily = FONTES[modelo.font];
  sheet.textContent = "";
  const x0 = lay.g.margemEsquerda;
  const cria = (topo, extra) => {
    const p = document.createElement("p");
    Object.assign(p.style, { left: x0 + "pt", top: topo - lay.sobe + "pt", width: lay.areaW + "pt", fontSize: lay.size + "pt", lineHeight: String(lay.fator) });
    if (extra) p.classList.add("fantasma");
    return p;
  };
  const peca = (texto, e, css) => {
    const s = document.createElement("span");
    s.textContent = texto;
    s.style.fontWeight = e.bold ? "700" : "400";
    s.style.fontStyle = e.italic ? "italic" : "normal";
    if (css) Object.assign(s.style, css);
    return s;
  };
  if (k === 0) {
    const p = cria(lay.tituloTopo, false);
    const ld = document.createElement("span");
    ld.className = "linha";
    ld.style.textAlign = "center";
    ld.append(peca(modelo.titulo.text, { bold: modelo.titulo.bold, italic: false }));
    p.append(ld);
    sheet.append(p);
  }
  for (const it of lay.paginas[k].itens) {
    const { e } = it;
    const p = cria(it.topo, e.placeholder);
    it.linhas.forEach((linha, i) => {
      const ld = document.createElement("span");
      ld.className = "linha linha-sumario";
      ld.style.paddingLeft = it.xt + "pt";
      if (i === 0 && e.numero) ld.append(peca(e.numero, e, { position: "absolute", left: "0" }));
      ld.append(peca(linha.parts.map((q) => q.text).join(""), e));
      if (i === it.linhas.length - 1 && e.pagina) {
        if (it.pontos) ld.append(peca(".".repeat(it.pontos.n), { bold: false, italic: false }, { position: "absolute", left: it.pontos.x + "pt" }));
        ld.append(peca(e.pagina, e, { position: "absolute", right: "0" }));
      }
      p.append(ld);
    });
    sheet.append(p);
  }
}

const MONTA = { capa: montaCapa, folha: montaFolha };
const IDS = { capa: { pag: "pagCapa", wrap: "sheetWrap", sheet: "sheet", zoomPag: "zoomPagCapa", zoomSheet: "sheetZoom" },
  folha: { pag: "pagFolha", wrap: "sheetWrapFolha", sheet: "sheetFolha", zoomPag: "zoomPagFolha", zoomSheet: "sheetZoomFolha" } };

// layout do sumário para a prévia (com a lista de exemplo em cinza se ainda não há itens)
function layoutDoSumario(dados) {
  const modelo = montaSumario(dados, { previa: true });
  return { modelo, lay: calculaSumario(modelo, medidorCanvas(modelo.font)) };
}

function render() {
  atualizaNatureza();
  const dados = lerDados();
  const pags = ativas();
  const cheias = [];
  const legendas = [];
  let n = 0;
  for (const p of ["capa", "folha"]) {
    const ativa = pags.includes(p);
    $(IDS[p].pag).hidden = !ativa;
    if (!ativa) continue;
    const cheia = desenhaFolha($(IDS[p].sheet), MONTA[p](dados, { previa: true }));
    escalaWrap($(IDS[p].wrap));
    if (cheia) cheias.push(p);
    n++;
    legendas.push([$(IDS[p].pag), `Página ${n}: ${NOME_PAGINA[p]}`]);
  }
  const cont = $("pagsSumario");
  cont.textContent = "";
  if (pags.includes("sumario")) {
    const { modelo, lay } = layoutDoSumario(dados);
    const total = lay.paginas.length;
    lay.paginas.forEach((pg, k) => {
      const fig = document.createElement("figure");
      fig.className = "pagina-previa";
      const cap = document.createElement("figcaption");
      n++;
      cap.textContent = `Página ${n}: sumário` + (total > 1 ? ` (parte ${k + 1} de ${total})` : "");
      const wrap = document.createElement("div");
      wrap.className = "sheet-wrap";
      wrap.id = "sheetWrapSumario" + (k + 1);
      const sheet = document.createElement("div");
      sheet.className = "sheet";
      sheet.id = "sheetSumario" + (k + 1);
      wrap.append(sheet);
      fig.append(cap, wrap);
      cont.append(fig);
      desenhaSumario(sheet, lay, modelo, k);
      escalaWrap(wrap);
    });
  }
  for (const [fig, texto] of legendas) fig.querySelector("figcaption").textContent = texto;
  document.body.classList.toggle("duas-paginas", n > 1);
  const aviso = $("avisoPagina");
  aviso.hidden = !cheias.length;
  if (cheias.length) aviso.textContent = `O texto da ${cheias.map((p) => NOME_PAGINA[p]).join(" e da ")} está grande demais e passa da área da página. Diminua o tamanho do título ou encurte os textos.`;
  atualizaInterface(dados, pags, n);
  atualizaListaNumeros();
  guarda();
}

// A folha tem tamanho real de A4; aqui ela é reduzida para caber na largura disponível.
function escalaWrap(wrap) {
  const sheet = wrap.querySelector(".sheet");
  const largura = wrap.clientWidth;
  if (!largura) return; // painel escondido (aba do celular) ou página não usada
  const escala = largura / sheet.offsetWidth;
  sheet.style.transform = `scale(${escala})`;
  wrap.style.height = sheet.offsetHeight * escala + "px";
}
const ajustaEscala = () => document.querySelectorAll("#painelPrevia .sheet-wrap").forEach(escalaWrap);

/* ---------- Partes da interface que dependem das escolhas ---------- */
function atualizaInterface(dados, pags, nPaginas) {
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
  const nomes = pags.map((p) => COM_ARTIGO[p]);
  $("incluirInfo").textContent = pags.length > 1
    ? `O arquivo vai ter ${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}, nessa ordem.`
    : `Sem marcar nada, o arquivo tem só ${COM_ARTIGO[MODO]}.`;
  $("previaTitulo").textContent = nPaginas > 1 ? `Prévia (A4, ${nPaginas} páginas)` : "Prévia (A4)";
  montaTabelaEstilo();
}

/* ---------- Ampliar prévia (celular) ---------- */
const NIVEIS_ZOOM = [1, 1.5, 2, 3]; // 1 = página inteira na largura da tela
let nivelZoom = 0;
function aplicaZoom() {
  const area = $("zoomArea");
  let larguraMax = 0;
  document.querySelectorAll("#dlgZoom .zoom-pag:not([hidden])").forEach((pag) => {
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
  const dados = lerDados();
  const pags = ativas();
  for (const p of ["capa", "folha"]) {
    $(IDS[p].zoomPag).hidden = !pags.includes(p);
    if (pags.includes(p)) desenhaFolha($(IDS[p].zoomSheet), MONTA[p](dados, { previa: true }));
  }
  const cont = $("zoomPagsSumario");
  cont.textContent = "";
  if (pags.includes("sumario")) {
    const { modelo, lay } = layoutDoSumario(dados);
    lay.paginas.forEach((pg, k) => {
      const pag = document.createElement("div");
      pag.className = "zoom-pag";
      const sheet = document.createElement("div");
      sheet.className = "sheet";
      sheet.id = "sheetZoomSumario" + (k + 1);
      pag.append(sheet);
      cont.append(pag);
      desenhaSumario(sheet, lay, modelo, k);
    });
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
    if (alvo) {
      for (let caixa = alvo.closest("details"); caixa; caixa = caixa.parentElement && caixa.parentElement.closest("details")) caixa.open = true;
      alvo.focus();
    }
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
    try { registraDownload(pags); mostraProximo(MODO); } catch (e) { /* o "Monte seu TCC" e o "Próximo passo" são extras: nunca podem atrapalhar o download */ }
    const semPagina = pags.includes("sumario") && dados.sumario.entradas.some((e) => !String(e.pagina || "").trim());
    mensagem(`Pronto! O arquivo ${nome} foi baixado.` + (semPagina ? " Atenção: há itens do sumário sem número de página; complete no arquivo." : ""));
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
  if (MODO === "sumario") {
    sumarioEstado.estiloNivel = clone(ESTILO_NIVEL_PADRAO);
    $("sumAlinha").value = "indicativo";
    $("sumEspaco").value = "1.5";
    $("sumAlinhaPos").checked = true;
    $("sumPontilhado").checked = true;
    montaTabelaNiveis();
  } else {
    estilo = clone(ESTILO_PADRAO);
    $("titleSize").value = String(TAMANHO_TITULO_PADRAO);
    $("natureJust").checked = true;
    montaTabelaEstilo(true);
  }
  render();
}

function novaCapa() {
  if (MODO === "sumario") {
    // limpa só a lista de itens: os dados, o estilo e o logo ficam
    sumarioEstado.entradas = [];
    renderLista(null);
    render();
    mensagem("Pronto! A lista do sumário foi limpa. Adicione os itens do novo trabalho.");
    mostraAba("dados");
    $("addSecao").focus();
    return;
  }
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
    limpaProgresso();
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
montaTabelaNiveis();
renderLista(null);
const lista = $("listaSumario");
if (lista) {
  lista.addEventListener("click", aoClicarNaLista);
  lista.addEventListener("input", aoDigitarNaLista); // antes do ouvinte do formulário: o modelo já está atualizado quando a prévia é refeita
  lista.addEventListener("change", aoMudarTipo);
  $("addSecao").addEventListener("click", () => adicionaItem({ tipo: "num", nivel: Math.max(1, nivelDaUltimaSecao()), titulo: "", pagina: "" }, posicaoDepoisDaUltimaSecao()));
  $("addSubsecao").addEventListener("click", () => adicionaItem({ tipo: "num", nivel: Math.min(NIVEIS_SUMARIO, nivelDaUltimaSecao() + 1), titulo: "", pagina: "" }, posicaoDepoisDaUltimaSecao()));
  $("addRef").addEventListener("click", () => adicionaItem({ tipo: "sem", titulo: "Referências", pagina: "" }));
  $("addApendice").addEventListener("click", () => adicionaItem({ tipo: "apendice", titulo: "", pagina: "" }));
  $("addAnexo").addEventListener("click", () => adicionaItem({ tipo: "anexo", titulo: "", pagina: "" }));
  $("btnColarSub").addEventListener("click", () => colar(true));
  $("btnColarAdd").addEventListener("click", () => colar(false));
  $("btnExemplo").addEventListener("click", inserirExemplo);
}
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
observador.observe($("painelPrevia"));
render();
document.body.classList.add("pronto"); // a partir daqui valem os atributos hidden que o render() definiu
// Se as fontes Arimo/Tinos (usadas quando o aparelho não tem Arial/Times) chegarem depois, refaz o cálculo com as medidas certas
if (document.fonts) { document.fonts.ready.then(render); document.fonts.addEventListener("loadingdone", render); }
if (pegaAviso()) mensagem("Pronto! Os dados foram apagados deste navegador.");
