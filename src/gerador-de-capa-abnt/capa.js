// Interface do gerador de capa: lê o formulário, monta o modelo, desenha a prévia ao vivo e gera PDF/Word.
import { montaCapa, ESTILO_PADRAO, TAMANHO_TITULO_PADRAO } from "./capa-model.js";
import { camposFaltando, geraPdf, geraDocx, baixa, precarrega } from "./capa-export.js";

const $ = (id) => document.getElementById(id);
const clone = (o) => JSON.parse(JSON.stringify(o));

const ELEMENTOS = [
  ["institution", "Instituição"],
  ["course", "Curso / departamento"],
  ["author", "Autor(es)"],
  ["title", "Título"],
  ["subtitle", "Subtítulo"],
  ["city", "Cidade"],
  ["year", "Ano"],
];
// Arial/Times do aparelho; se não houver, Arimo/Tinos (mesmas medidas). Ver capa.css.
const FONTES = {
  Arial: '"CapaArial", "ArimoWeb", Arial, Helvetica, sans-serif',
  "Times New Roman": '"CapaTimes", "TinosWeb", "Times New Roman", Times, serif',
};

let estilo = clone(ESTILO_PADRAO);

/* ---------- Autores (lista dinâmica) ---------- */
function addAutor(valor = "") {
  const linha = document.createElement("div");
  linha.className = "autor-linha";
  const input = document.createElement("input");
  input.type = "text";
  input.value = valor;
  input.placeholder = "Nome completo";
  const remover = document.createElement("button");
  remover.type = "button";
  remover.className = "btn btn-remover";
  remover.textContent = "Remover";
  remover.addEventListener("click", () => {
    linha.remove();
    atualizaAutores();
    render();
  });
  linha.append(input, remover);
  $("autores").append(linha);
  atualizaAutores();
  return input;
}
function atualizaAutores() {
  const linhas = [...$("autores").children];
  linhas.forEach((l, i) => {
    l.querySelector("input").setAttribute("aria-label", `Autor ${i + 1}`);
    l.querySelector("button").hidden = linhas.length === 1; // sempre fica ao menos um autor
  });
}

/* ---------- Tabela "Personalizar estilo" ---------- */
function montaTabelaEstilo() {
  const corpo = $("tabelaEstilo");
  corpo.innerHTML = "";
  for (const [chave, rotulo] of ELEMENTOS) {
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
      cb.addEventListener("change", () => {
        estilo[chave][prop] = cb.checked;
        render();
      });
      td.append(cb);
      tr.append(td);
    }
    corpo.append(tr);
  }
}

/* ---------- Dados do formulário ---------- */
function lerDados() {
  return {
    institution: $("institution").value,
    course: $("course").value,
    authors: [...$("autores").querySelectorAll("input")].map((i) => i.value),
    title: $("title").value,
    subtitle: $("subtitle").value,
    volume: $("volume").value,
    city: $("city").value,
    year: $("year").value,
    font: $("font").value,
    titleSize: $("titleSize").value,
    style: estilo,
  };
}

/* ---------- Prévia ---------- */
// Desenha a capa dentro de um elemento .sheet (usado na prévia normal e na ampliada). Retorna o contêiner interno.
function desenhaFolha(sheet, modelo) {
  sheet.style.fontFamily = FONTES[modelo.font];
  sheet.textContent = "";
  const inner = document.createElement("div");
  inner.className = "sheet-inner";
  const zonas = { top: "zona-topo", author: "zona-autor", title: "zona-titulo", bottom: "zona-base" };
  const divs = {};
  for (const z of ["top", "author", "title", "bottom"]) {
    divs[z] = document.createElement("div");
    divs[z].className = zonas[z];
  }
  for (const b of modelo.blocks) {
    const p = document.createElement("p");
    p.style.fontSize = b.size + "pt";
    if (b.placeholder) p.classList.add("fantasma");
    for (const r of b.runs) {
      const s = document.createElement("span");
      s.textContent = r.text;
      s.style.fontWeight = r.bold ? "700" : "400";
      p.append(s);
    }
    divs[b.zone].append(p);
  }
  for (const z of ["top", "author", "title", "bottom"]) if (divs[z].childNodes.length) inner.append(divs[z]);
  sheet.append(inner);
  return inner;
}

function render() {
  const inner = desenhaFolha($("sheet"), montaCapa(lerDados(), { previa: true }));
  ajustaEscala();
  // aviso se o conteúdo passa da área útil da página
  $("avisoPagina").hidden = !(inner.scrollHeight > inner.clientHeight + 2);
}

// A folha tem tamanho real de A4; aqui ela é reduzida para caber na largura disponível.
function ajustaEscala() {
  const wrap = $("sheetWrap");
  const sheet = $("sheet");
  const largura = wrap.clientWidth;
  if (!largura) return; // painel escondido (aba do celular)
  const escala = largura / sheet.offsetWidth;
  sheet.style.transform = `scale(${escala})`;
  wrap.style.height = sheet.offsetHeight * escala + "px";
}

/* ---------- Ampliar prévia (celular) ---------- */
const NIVEIS_ZOOM = [1, 1.5, 2, 3]; // 1 = página inteira na largura da tela
let nivelZoom = 0;
function aplicaZoom() {
  const area = $("zoomArea");
  const sheet = $("sheetZoom");
  const base = (area.clientWidth - 24) / sheet.offsetWidth;
  const escala = base * NIVEIS_ZOOM[nivelZoom];
  sheet.style.transform = `scale(${escala})`;
  $("zoomWrap").style.width = sheet.offsetWidth * escala + "px";
  $("zoomWrap").style.height = sheet.offsetHeight * escala + "px";
  $("zoomMenos").disabled = nivelZoom === 0;
  $("zoomMais").disabled = nivelZoom === NIVEIS_ZOOM.length - 1;
}
function abreZoom() {
  desenhaFolha($("sheetZoom"), montaCapa(lerDados(), { previa: true }));
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
async function exporta(tipo) {
  if (gerando) return;
  const dados = lerDados();
  const falta = camposFaltando(dados);
  if (falta.length) {
    const lista = falta.map((f) => f.rotulo);
    mensagem(`Para baixar, preencha ${lista.length > 1 ? lista.slice(0, -1).join(", ") + " e " + lista.slice(-1) : lista[0]}.`, true, 10);
    mostraAba("dados");
    const alvo = falta[0].id === "autor" ? $("autores").querySelector("input") : $(falta[0].id);
    alvo.focus();
    return;
  }
  if (!$("avisoPagina").hidden) {
    mensagem("O texto passa da página. Diminua o tamanho do título ou encurte os textos antes de baixar.", true, 10);
    return;
  }
  gerando = true;
  const botoes = [$("btnPdf"), $("btnDocx")];
  botoes.forEach((b) => (b.disabled = true));
  mensagem("Gerando o arquivo…", false, 0);
  try {
    const { blob, nome } = tipo === "pdf" ? await geraPdf(dados) : await geraDocx(dados);
    baixa(blob, nome);
    mensagem(`Pronto! O arquivo ${nome} foi baixado.`);
  } catch (e) {
    mensagem(
      e && e.message === "excede"
        ? "O texto passa da página. Diminua o tamanho do título ou encurte os textos antes de baixar."
        : "Não foi possível gerar o arquivo. Verifique sua conexão com a internet e tente de novo.",
      true,
      10
    );
  } finally {
    botoes.forEach((b) => (b.disabled = false));
    gerando = false;
  }
}

/* ---------- Início ---------- */
function restaurarPadrao() {
  estilo = clone(ESTILO_PADRAO);
  $("titleSize").value = String(TAMANHO_TITULO_PADRAO);
  montaTabelaEstilo();
  render();
}

function novaCapa() {
  // Mantém instituição, curso, autores, cidade, ano, fonte e estilo; limpa só o que muda de um trabalho para outro.
  $("title").value = "";
  $("subtitle").value = "";
  $("volume").value = "";
  render();
  mensagem("Pronto! Os dados foram mantidos. Digite o título da nova capa.");
  mostraAba("dados");
  $("title").focus();
}

$("year").value = new Date().getFullYear();
addAutor();
montaTabelaEstilo();
$("form").addEventListener("input", render);
$("form").addEventListener("submit", (e) => e.preventDefault());
$("addAutor").addEventListener("click", () => addAutor().focus());
$("restaurar").addEventListener("click", restaurarPadrao);
$("btnNova").addEventListener("click", novaCapa);
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
new ResizeObserver(ajustaEscala).observe($("sheetWrap"));
render();
