// Cronograma de estudos do ENEM: as respostas ficam só no aparelho (localStorage) e nada é enviado.
import { montaCronograma, AREAS } from "./calculos.js";

const $ = (id) => document.getElementById(id);
const CHAVE = "es-enem-cronograma";
const form = $("form");
let plano = null;
let semanaAtual = 0;

const dois = (n) => String(n).padStart(2, "0");
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}
const DIAS_LONGOS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function lerForm() {
  const marcados = (nome) => [...form.querySelectorAll(`input[name="${nome}"]:checked`)].map((i) => i.value);
  return {
    prova: $("data").value,
    horas: Number(form.querySelector('input[name="horas"]:checked')?.value || 2),
    dias: marcados("dias").map(Number),
    reforco: marcados("reforco"),
  };
}
function aplicaForm(v) {
  if (!v) return;
  if (typeof v.prova === "string") $("data").value = v.prova;
  const r = form.querySelector(`input[name="horas"][value="${v.horas}"]`);
  if (r) r.checked = true;
  if (Array.isArray(v.dias)) form.querySelectorAll('input[name="dias"]').forEach((i) => { i.checked = v.dias.includes(Number(i.value)); });
  if (Array.isArray(v.reforco)) form.querySelectorAll('input[name="reforco"]').forEach((i) => { i.checked = v.reforco.includes(i.value); });
}
function guarda() {
  try { localStorage.setItem(CHAVE, JSON.stringify(lerForm())); } catch (e) { /* sem armazenamento: tudo bem */ }
}

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function desenhaDia(dia, indice) {
  const li = elemento("li", "sem-dia" + (dia.tipo === "livre" || dia.tipo === "fora" ? " livre" : ""));
  const cab = elemento("span", "dia");
  cab.append(DIAS_LONGOS[indice].slice(0, 3), elemento("small", "", dia.rotulo));
  const corpo = elemento("span", "blocos");
  if (dia.tipo === "estudo") {
    dia.blocos.forEach((b) => {
      const el = elemento("span", `bloco bloco--${b.area}`, b.nome);
      el.append(elemento("small", "", `${b.horas} h`));
      corpo.append(el);
    });
  } else if (dia.tipo === "livre") {
    corpo.append(elemento("span", "bloco-livre", "Dia livre"));
  } else if (dia.tipo === "prova") {
    corpo.append(elemento("span", "bloco bloco--prova", "Dia da prova"));
  } else {
    corpo.append(elemento("span", "bloco-fora", "Fora do plano"));
  }
  li.append(cab, corpo);
  return li;
}

function desenha() {
  const container = $("semanas");
  container.replaceChildren();
  plano.semanas.forEach((s, i) => {
    const bloco = elemento("div", "semana-bloco");
    bloco.hidden = i !== semanaAtual;
    const ini = s.dias.find((d) => d.tipo !== "fora") || s.dias[0];
    const fim = [...s.dias].reverse().find((d) => d.tipo !== "fora") || s.dias[6];
    bloco.append(elemento("h4", "titulo-semana-imp", `Semana ${s.numero} (${ini.rotulo} a ${fim.rotulo})`));
    const ol = elemento("ol", "semana");
    s.dias.forEach((d, idx) => ol.append(desenhaDia(d, idx)));
    bloco.append(ol);
    container.append(bloco);
  });
  mostraSemana();
}

function mostraSemana() {
  [...$("semanas").children].forEach((el, i) => { el.hidden = i !== semanaAtual; });
  const s = plano.semanas[semanaAtual];
  const ini = s.dias.find((d) => d.tipo !== "fora") || s.dias[0];
  const fim = [...s.dias].reverse().find((d) => d.tipo !== "fora") || s.dias[6];
  $("semanaTitulo").textContent = `Semana ${s.numero} de ${plano.totalSemanas} · ${ini.rotulo} a ${fim.rotulo}`;
  // aria-disabled (e não disabled): o foco do teclado não se perde quando se chega à primeira ou à última semana
  $("anterior").setAttribute("aria-disabled", String(semanaAtual === 0));
  $("proxima").setAttribute("aria-disabled", String(semanaAtual === plano.semanas.length - 1));
}

function monta(focar) {
  const v = lerForm();
  // o campo de data dispara «change» a cada dígito do ano (0002, 0020, 0202…): só vale a partir de 4 dígitos com ano razoável
  if (!focar && v.prova && Number(v.prova.slice(0, 4)) < 2000) return;
  const r = montaCronograma({ hoje: hojeISO(), prova: v.prova, horas: v.horas, dias: v.dias, areas: AREAS.map((a) => a.id), reforco: v.reforco });
  const erro = $("erro");
  if (r.erro) {
    plano = null;
    erro.textContent = r.erro;
    erro.setAttribute("role", focar ? "alert" : "status"); // só «grita» quando a pessoa clicou em Montar
    erro.hidden = !focar && !v.prova; // sem data ainda e sem clique: não mostra erro a quem acabou de chegar
    $("plano").hidden = true;
    $("vazio").hidden = false;
    return;
  }
  erro.hidden = true;
  plano = r;
  semanaAtual = focar ? 0 : Math.min(semanaAtual, r.semanas.length - 1); // mudar uma resposta não volta para a semana 1
  $("vazio").hidden = true;
  $("plano").hidden = false;
  const sem = r.totalSemanas;
  $("planoTitulo").textContent = `Faltam ${r.totalDias} ${r.totalDias === 1 ? "dia" : "dias"} para a prova`;
  $("planoResumo").textContent = `${sem} ${sem === 1 ? "semana" : "semanas"} no plano · ${r.diasPorSemana} ${r.diasPorSemana === 1 ? "dia" : "dias"} de estudo por semana · ${r.horas} h por dia`;
  desenha();
  guarda();
  if (focar) $("planoTitulo").focus({ preventScroll: false });
}

// a data mínima é amanhã
{
  const d = new Date();
  d.setDate(d.getDate() + 1);
  $("data").min = `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}
try { aplicaForm(JSON.parse(localStorage.getItem(CHAVE) || "null")); } catch (e) { /* sem respostas guardadas */ }

form.addEventListener("submit", (e) => { e.preventDefault(); monta(true); });
// depois da primeira vez, mudar qualquer resposta refaz o plano na hora
form.addEventListener("change", () => { guarda(); if (plano || $("data").value) monta(false); });
$("anterior").addEventListener("click", () => { if (plano && semanaAtual > 0) { semanaAtual--; mostraSemana(); } });
$("proxima").addEventListener("click", () => { if (plano && semanaAtual < plano.semanas.length - 1) { semanaAtual++; mostraSemana(); } });
$("imprimir").addEventListener("click", () => window.print());

if ($("data").value) monta(false);
