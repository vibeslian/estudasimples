// Calculadora de média: as notas ficam só no navegador (nada é enviado nem guardado).
import { lerNota, calculaUltimaNota } from "./calculos.js";

const $ = (id) => document.getElementById(id);
const NOMES = { 4: "bimestre", 3: "trimestre", 2: "semestre" };
const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtNota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }); // 7,25 aparece como 7,25 (a conta usa 7,25)
let interagiu = false; // o leitor de tela só ouve o resultado depois que a pessoa mexe em algo
let timerVivo;

const etapas = () => Number($("etapas").value);

function elemento(tag, props = {}, texto) {
  const el = document.createElement(tag);
  Object.assign(el, props);
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// (re)monta as linhas de notas e de pesos conforme o número de etapas, guardando o que já foi digitado
function montaLinhas() {
  const n = etapas();
  const nome = NOMES[n];
  const antigasNotas = [...document.querySelectorAll("#notas input")].map((i) => i.value);
  const antigosPesos = [...document.querySelectorAll("#pesos input")].map((i) => i.value);
  const notas = $("notas");
  notas.replaceChildren();
  for (let i = 1; i < n; i++) {
    const linha = elemento("div", { className: "linha-nota" });
    linha.append(elemento("label", { htmlFor: "nota" + i }, `${i}º ${nome}`));
    linha.append(elemento("input", { id: "nota" + i, type: "text", inputMode: "decimal", placeholder: "0 a 10", value: antigasNotas[i - 1] || "" }));
    notas.append(linha);
  }
  const ultima = elemento("div", { className: "linha-nota" });
  ultima.append(elemento("span", { className: "rotulo" }, `${n}º ${nome}`));
  ultima.firstChild.style.cssText = "margin:0;flex:1 1 auto;color:var(--texto-suave)";
  ultima.append(elemento("span", { className: "a-calcular" }, "a calcular"));
  notas.append(ultima);

  const pesos = $("pesos");
  pesos.replaceChildren();
  for (let i = 1; i <= n; i++) {
    const linha = elemento("div", { className: "linha-nota" });
    linha.append(elemento("label", { htmlFor: "peso" + i }, `Peso do ${i}º ${nome}`));
    linha.append(elemento("input", { id: "peso" + i, type: "text", inputMode: "decimal", className: "peso", value: antigosPesos[i - 1] || "1" }));
    pesos.append(linha);
  }
}

function anuncia(texto) {
  clearTimeout(timerVivo);
  if (!interagiu) return;
  timerVivo = setTimeout(() => { $("vivo").textContent = texto; }, 700);
}

function mostra(estado, pergunta, numero, conta, barra, vivo) {
  $("resultado").dataset.estado = estado;
  $("pergunta").textContent = pergunta;
  $("numNota").textContent = numero;
  $("conta").textContent = conta;
  $("barra").style.width = barra + "%";
  anuncia(vivo || [pergunta, numero, conta].filter(Boolean).join(" "));
}

function calcula() {
  const n = etapas();
  const media = lerNota($("media").value);
  const maximaTexto = $("maxima").value.trim();
  const maxLida = maximaTexto === "" ? 10 : lerNota(maximaTexto);
  if (maxLida === null || maxLida <= 0) {
    mostra("erro", "A nota máxima precisa ser um número maior que zero (por exemplo, 10).", "–", "", 0);
    return;
  }
  const maxima = maxLida;
  $("escalaMax").textContent = String(maxima).replace(".", ",");
  const notasTexto = [...document.querySelectorAll("#notas input")].map((i) => i.value.trim());
  const notas = notasTexto.map(lerNota);
  const pesos = [...document.querySelectorAll("#pesos input")].map((i) => lerNota(i.value));
  const nome = NOMES[n];

  if ($("media").value.trim() !== "" && media === null) {
    mostra("erro", "Não entendi a média da escola: use um número como 6 ou 6,5.", "–", "", 0);
    return;
  }
  if (media === null || notasTexto.every((t) => t === "")) {
    mostra("neutro", "Preencha a média da escola e as notas que você já tem.", "–", "", 0);
    return;
  }
  const faltando = notasTexto.findIndex((t) => t === "");
  if (faltando !== -1) {
    mostra("neutro", `Falta a nota do ${faltando + 1}º ${nome}.`, "–", "", 0);
    return;
  }
  const invalida = notas.findIndex((x) => x === null || x > maxima);
  if (invalida !== -1) {
    mostra("erro", `A nota do ${invalida + 1}º ${nome} não está certa: use um número de 0 a ${String(maxima).replace(".", ",")}, como 7,5.`, "–", "", 0);
    return;
  }
  if (pesos.some((p) => p === null || p <= 0)) {
    mostra("erro", "Os pesos precisam ser números maiores que zero (use 1 se todas as etapas valem igual).", "–", "", 0);
    return;
  }
  if (!(media > 0) || media > maxima) {
    mostra("erro", `A média precisa ser maior que 0 e no máximo ${String(maxima).replace(".", ",")}.`, "–", "", 0);
    return;
  }

  const r = calculaUltimaNota(notas, pesos, media, maxima);
  const comPesos = pesos.some((p) => p !== 1);
  const mediaTxt = fmt.format(media);
  const detalhe = comPesos ? "Média ponderada, com os pesos que você colocou." : "Média aritmética simples.";
  if (r.estado === "ja-passou") {
    mostra("ok", `Com média ${mediaTxt}, você já garantiu essa média: mesmo tirando 0 no ${n}º ${nome}, ela não cai abaixo disso (confira também as outras regras da sua escola).`, "0,0", detalhe, 0);
  } else if (r.estado === "impossivel") {
    mostra("erro", `Para fechar com média ${mediaTxt} você precisaria de ${fmt.format(r.precisa)} no ${n}º ${nome}, mas a nota máxima é ${String(maxima).replace(".", ",")}.`, fmt.format(r.precisa), `Só com a última etapa não dá. Veja no regimento da escola se existe recuperação. ${detalhe}`, 100);
  } else {
    const numeros = notas.map((x) => fmtNota.format(x));
    const somaPesos = Math.round(pesos.reduce((a, b) => a + b, 0) * 100) / 100;
    const conta = comPesos
      ? `Média ponderada: soma dos pesos = ${String(somaPesos).replace(".", ",")}.`
      : `A conta: (${numeros.join(" + ")} + ${fmt.format(r.precisa)}) ÷ ${n} = ${fmt.format((r.jaTem + r.precisa) / n)}.`;
    mostra("ok", `Para fechar o ano com média ${mediaTxt}, você precisa tirar no ${n}º ${nome}:`, fmt.format(r.precisa), conta + " " + (comPesos ? "" : detalhe), Math.min(100, (r.precisa / maxima) * 100));
  }
}

$("form").addEventListener("submit", (e) => e.preventDefault());
$("form").addEventListener("input", () => { interagiu = true; calcula(); });
$("etapas").addEventListener("change", () => { interagiu = true; montaLinhas(); calcula(); });
montaLinhas();
calcula();
