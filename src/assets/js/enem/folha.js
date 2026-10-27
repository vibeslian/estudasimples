// Folha de redação do ENEM para imprimir: a pré-visualização, o PDF e a impressão acontecem no navegador. Nada é enviado nem guardado.
// As medidas (em milímetros) seguem o desenho em CSS (folha.css): se mudar uma, mude a outra e confira o PDF ao lado da pré-visualização.
const $ = (id) => document.getElementById(id);

export const MEDIDAS = {
  margemEsq: 19, margemDir: 15, margemTopo: 15, margemBase: 12, // mm
  alturaTopo: 8, alturaIdent: 12, alturaLinha: 8, linhas: 30,
  largura: 210, altura: 297,
};
export const QUANTIDADES = [1, 3, 5, 10];

const JSPDF = "/assets/js/vendor/jspdf-4.2.1.umd.min.js";
let promessa = null;
function carregaJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (promessa) return promessa;
  promessa = new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = JSPDF;
    s.onload = () => (window.jspdf && window.jspdf.jsPDF ? ok(window.jspdf.jsPDF) : (promessa = null, erro(new Error("biblioteca inválida"))));
    s.onerror = () => { promessa = null; s.remove(); erro(new Error("não foi possível carregar a biblioteca")); };
    document.head.append(s);
  });
  return promessa;
}

const folha = $("folha"), status = $("status");
const opcoes = () => ({
  folhas: Math.max(1, Number((document.querySelector('input[name="qtd"]:checked') || {}).value) || 1),
  numeros: $("optNumeros").checked,
  cabecalho: $("optCabecalho").checked,
  clara: $("optClara").checked,
});

function textoFolha(i, total) { return total > 1 ? `Folha ${i} de ${total}` : ""; }

function atualizaPrevia() {
  const o = opcoes();
  folha.classList.toggle("fo--sem-numeros", !o.numeros);
  folha.classList.toggle("fo--sem-cabecalho", !o.cabecalho);
  folha.classList.toggle("fo--clara", o.clara);
  folha.querySelector(".fo-num").textContent = textoFolha(1, o.folhas);
}

function aviso(texto, erro) {
  status.textContent = texto;
  if (erro) status.dataset.estado = "erro"; else delete status.dataset.estado;
}

/* ---------- PDF ---------- */
function desenhaFolha(doc, o, i, total) {
  const M = MEDIDAS;
  const xLinha = M.margemEsq, xFim = M.largura - M.margemDir;
  const yTopo = M.margemTopo, yLinhas = yTopo + M.alturaTopo + M.alturaIdent;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(59, 93, 76);
  doc.text("Folha de treino · Redação ENEM", xLinha - 1, yTopo + 5.4);
  if (total > 1) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(74, 87, 80);
    doc.text(textoFolha(i, total), xFim, yTopo + 5.4, { align: "right" });
  }
  if (o.cabecalho) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(74, 87, 80);
    const yId = yLinhas - 3, meio = xLinha + (xFim - xLinha - 6) * 0.4; // duas colunas 1 : 1,5 com 6 mm de espaço (como o .fo-ident do CSS)
    doc.text("Nome:", xLinha, yId - 1);
    doc.text("Tema:", meio + 6, yId - 1);
    doc.setDrawColor(111, 130, 119); doc.setLineWidth(0.25);
    doc.line(xLinha, yId, meio, yId);
    doc.line(meio + 6, yId, xFim, yId);
  }
  const cLinha = o.clara ? [205, 217, 207] : [157, 181, 163];
  const cMargem = o.clara ? [245, 196, 182] : [240, 160, 140];
  doc.setDrawColor(...cLinha); doc.setLineWidth(0.25);
  for (let k = 1; k <= M.linhas; k++) doc.line(xLinha, yLinhas + k * M.alturaLinha, xFim, yLinhas + k * M.alturaLinha);
  doc.setDrawColor(...cMargem); doc.setLineWidth(0.6);
  doc.line(xLinha, yLinhas, xLinha, yLinhas + M.linhas * M.alturaLinha);
  if (o.numeros) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(102, 115, 107);
    for (let k = 1; k <= M.linhas; k++) doc.text(String(k), xLinha - 2, yLinhas + k * M.alturaLinha - 1.6, { align: "right" });
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(102, 115, 107);
  const yRodape = M.altura - M.margemBase - 1;
  doc.text("estudasimples.com.br · folha de treino", xLinha - 1, yRodape);
  doc.text("Não é a folha oficial do Inep", xFim, yRodape, { align: "right" });
}

async function baixar() {
  const o = opcoes();
  aviso("Preparando o PDF...");
  try {
    const JsPdf = await carregaJsPdf();
    const doc = new JsPdf({ unit: "mm", format: "a4", orientation: "portrait" });
    for (let i = 1; i <= o.folhas; i++) {
      if (i > 1) doc.addPage();
      desenhaFolha(doc, o, i, o.folhas);
    }
    doc.setProperties({ title: "Folha de treino para a redação do ENEM", creator: "Estuda Simples" });
    doc.save("folha-de-treino-redacao-enem.pdf");
    aviso(o.folhas === 1 ? "PDF pronto: 1 folha. Imprima em tamanho real (100 %)." : `PDF pronto: ${o.folhas} folhas. Imprima em tamanho real (100 %).`);
  } catch (e) {
    aviso("Não foi possível gerar o PDF agora. Confira a conexão e tente de novo, ou use o botão Imprimir.", true);
  }
}

/* ---------- Impressão ---------- */
function montaImpressao() {
  const o = opcoes(), alvo = $("folhasImpressas");
  alvo.textContent = "";
  for (let i = 1; i <= o.folhas; i++) {
    const c = folha.cloneNode(true);
    c.removeAttribute("id");
    c.querySelector(".fo-num").textContent = textoFolha(i, o.folhas);
    alvo.append(c);
  }
}
function imprimir() {
  atualizaPrevia();
  montaImpressao();
  aviso("Na janela de impressão, escolha tamanho real (100 %) e papel A4.");
  window.print();
}
window.addEventListener("beforeprint", () => { atualizaPrevia(); montaImpressao(); }); // vale também para Ctrl+P, sem apertar o botão
window.addEventListener("afterprint", () => { $("folhasImpressas").textContent = ""; });

$("form").addEventListener("change", () => { atualizaPrevia(); aviso(""); });
$("form").addEventListener("submit", (e) => e.preventDefault());
$("baixar").addEventListener("click", baixar);
$("imprimir").addEventListener("click", imprimir);
// carrega a biblioteca do PDF quando a pessoa se aproxima do botão, para o download ser rápido
for (const ev of ["pointerenter", "focus", "touchstart"]) $("baixar").addEventListener(ev, () => carregaJsPdf().catch(() => {}), { once: true, passive: true });
atualizaPrevia();
