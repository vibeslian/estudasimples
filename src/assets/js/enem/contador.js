// Contador de linhas da redação do ENEM: tudo acontece no navegador, o texto nunca é enviado nem guardado.
import { estimaLinhas, estadoDasLinhas, CARACTERES_PADRAO, LIMITE_LINHAS } from "./calculos.js";

const $ = (id) => document.getElementById(id);
const CHAVE_CAR = "es-enem-caracteres";
const CAR_MIN = 30, CAR_MAX = 120;
const nf = new Intl.NumberFormat("pt-BR");

const texto = $("texto"), car = $("car"), folha = $("folha"), faixa = $("faixa");
// a folha e a faixa já vêm prontas no HTML (30 linhas): nada cresce quando o JavaScript chega
const linhasFolha = [...folha.children];
const barrinhas = [...faixa.children];

function lerCar() {
  const n = Math.floor(Number(String(car.value).replace(/\D/g, "")));
  return Number.isFinite(n) && n > 0 ? Math.min(CAR_MAX, Math.max(CAR_MIN, n)) : CARACTERES_PADRAO;
}
function guardaCar(n) {
  try { localStorage.setItem(CHAVE_CAR, String(n)); } catch (e) { /* sem armazenamento: o número só vale nesta visita */ }
}
try {
  const salvo = Number(localStorage.getItem(CHAVE_CAR));
  if (salvo >= CAR_MIN && salvo <= CAR_MAX) car.value = String(salvo);
} catch (e) { /* tudo bem */ }

let timerVivo;
function atualiza() {
  const largura = lerCar();
  const r = estimaLinhas(texto.value, largura);
  const estado = estadoDasLinhas(r.linhas);

  $("numLinhas").textContent = String(r.linhas);
  $("contagens").textContent = `${nf.format(r.palavras)} ${r.palavras === 1 ? "palavra" : "palavras"} · ${nf.format(r.caracteres)} ${r.caracteres === 1 ? "caractere" : "caracteres"} (com espaços)`;
  $("rotuloEstado").textContent = estado.rotulo;
  $("explicaEstado").textContent = estado.explica;
  $("resultado").dataset.estado = estado.id === "ok" ? "ok" : estado.id === "vazio" ? "neutro" : estado.id === "insuficiente" ? "aviso" : "erro";
  $("explicaMovel").textContent = estado.explica;

  const passou = r.linhas > LIMITE_LINHAS;
  const usadas = Math.min(r.linhas, LIMITE_LINHAS);
  linhasFolha.forEach((el, i) => {
    const usada = i < usadas;
    el.classList.toggle("usada", usada);
    el.classList.toggle("fora", usada && passou);
    el.firstElementChild.nextElementSibling.style.width = usada ? Math.max(4, Math.round(r.preenchimento[i] * 100)) + "%" : "0%";
  });
  barrinhas.forEach((b, i) => {
    b.classList.toggle("on", i < usadas && !passou);
    b.classList.toggle("fora", i < usadas && passou);
  });
  $("excesso").textContent = passou ? `+ ${r.linhas - LIMITE_LINHAS} ${r.linhas - LIMITE_LINHAS === 1 ? "linha" : "linhas"} além da folha` : "";

  // com a letra um pouco maior ou menor o resultado muda: mostra a faixa para ninguém confiar num número só
  const amp = $("amplitude");
  if (r.linhas > 0) {
    const maior = estimaLinhas(texto.value, Math.round(largura * 0.85)).linhas;
    const menor = estimaLinhas(texto.value, Math.round(largura * 1.15)).linhas;
    amp.textContent = `Com a letra 15% maior daria cerca de ${maior} linhas; com a letra 15% menor, cerca de ${menor}.`;
  } else {
    amp.textContent = "";
  }

  // o leitor de tela recebe a frase só depois de uma pausa na digitação (senão ele leria a cada letra)
  clearTimeout(timerVivo);
  timerVivo = setTimeout(() => {
    $("vivo").textContent = r.linhas === 0 ? "" : `${r.linhas} ${r.linhas === 1 ? "linha" : "linhas"} de 30. ${estado.rotulo}. ${estado.explica}`;
  }, 800);
}

texto.addEventListener("input", atualiza);
function avisaCar(msg) { $("carAviso").textContent = msg; car.setAttribute("aria-invalid", msg ? "true" : "false"); }
car.addEventListener("input", () => {
  const bruto = car.value.trim();
  if (bruto !== "" && !/^\d+$/.test(bruto)) avisaCar("Digite só números, por exemplo 70.");
  else if (/^\d{2,}$/.test(bruto) && (Number(bruto) < CAR_MIN || Number(bruto) > CAR_MAX)) avisaCar(`Use um número entre ${CAR_MIN} e ${CAR_MAX}.`);
  else avisaCar("");
  if (/\d/.test(bruto)) atualiza();
});
car.addEventListener("change", () => {
  const bruto = car.value.trim();
  const n = lerCar();
  const mudou = !/^\d+$/.test(bruto) || Number(bruto) !== n;
  car.value = String(n);
  guardaCar(n);
  avisaCar(mudou ? `Ajustei para ${n} (o valor vai de ${CAR_MIN} a ${CAR_MAX}).` : "");
  atualiza();
});
car.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  e.preventDefault();
  const n = Math.min(CAR_MAX, Math.max(CAR_MIN, lerCar() + (e.key === "ArrowUp" ? 5 : -5)));
  car.value = String(n); guardaCar(n); avisaCar(""); atualiza();
});
$("menos").addEventListener("click", () => { avisaCar(""); const n = Math.max(CAR_MIN, lerCar() - 5); car.value = String(n); guardaCar(n); atualiza(); });
$("mais").addEventListener("click", () => { avisaCar(""); const n = Math.min(CAR_MAX, lerCar() + 5); car.value = String(n); guardaCar(n); atualiza(); });
$("padrao").addEventListener("click", () => { avisaCar(""); car.value = String(CARACTERES_PADRAO); guardaCar(CARACTERES_PADRAO); atualiza(); });
$("limpar").addEventListener("click", () => { texto.value = ""; atualiza(); texto.focus(); });

atualiza();
