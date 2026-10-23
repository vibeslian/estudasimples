// Contas das ferramentas do ENEM. Sem DOM: dá para testar no Node (pruebas/probar-enem-calculos.mjs).

export const LIMITE_LINHAS = 30; // a folha do ENEM tem 30 linhas
export const MAX_SEM_ZERO = 7; // Cartilha do Participante (Inep): até 7 linhas escritas = «texto insuficiente», nota zero
export const MIN_LINHAS = MAX_SEM_ZERO + 1; // então o mínimo para não zerar por tamanho é 8 linhas próprias
export const RECUO_PARAGRAFO = 4; // um parágrafo começa com um pequeno recuo: conta como 4 caracteres
export const CARACTERES_PADRAO = 70; // ponto de partida, NÃO é regra do Inep: cada letra é diferente

// ---------- Contador de linhas ----------

// Quebra um parágrafo em linhas de no máximo `largura` caracteres, sem cortar palavras (palavra maior que a linha é partida).
// Devolve quantos caracteres cada linha usa.
function quebraParagrafo(paragrafo, largura, recuo) {
  const linhas = [];
  let usados = recuo;
  let temPalavra = false;
  for (let palavra of paragrafo.split(/\s+/).filter(Boolean)) {
    while (palavra) {
      const espaco = temPalavra ? 1 : 0;
      if (usados + espaco + palavra.length <= largura) {
        usados += espaco + palavra.length;
        temPalavra = true;
        break;
      }
      if (temPalavra) { // a palavra não cabe: fecha esta linha e tenta de novo na próxima
        linhas.push(usados);
        usados = 0;
        temPalavra = false;
        continue;
      }
      const cabe = largura - usados; // linha vazia e a palavra é maior que ela: parte a palavra
      linhas.push(usados + cabe);
      palavra = palavra.slice(cabe);
      usados = 0;
    }
  }
  if (temPalavra) linhas.push(usados);
  return linhas;
}

// texto + caracteres por linha -> { linhas, palavras, caracteres, preenchimento: [0..1 por linha] }
export function estimaLinhas(texto, caracteresPorLinha) {
  const largura = Math.max(10, Math.min(200, Math.floor(Number(caracteresPorLinha)) || CARACTERES_PADRAO));
  const limpo = String(texto || "").replace(/\r/g, "");
  const paragrafos = limpo.split("\n").map((p) => p.trim()).filter(Boolean); // linhas em branco não contam: só os parágrafos
  const todas = [];
  for (const p of paragrafos) todas.push(...quebraParagrafo(p, largura, Math.min(RECUO_PARAGRAFO, largura - 1)));
  const palavras = (limpo.match(/\S+/g) || []).length;
  const caracteres = limpo.replace(/\n/g, "").length; // com os espaços entre as palavras, como no Word
  return { linhas: todas.length, palavras, caracteres, largura, preenchimento: todas.map((u) => Math.min(1, u / largura)) };
}

// Estado da redação conforme o número de linhas
export function estadoDasLinhas(linhas) {
  if (linhas === 0) return { id: "vazio", rotulo: "Escreva ou cole o texto", explica: "A contagem aparece enquanto você escreve." };
  if (linhas <= MAX_SEM_ZERO)
    return { id: "insuficiente", rotulo: "Abaixo do mínimo (texto insuficiente)", explica: `Pela Cartilha do Participante do Inep, a redação com até ${MAX_SEM_ZERO} linhas escritas recebe nota zero. Escreva pelo menos ${MIN_LINHAS} linhas.` };
  if (linhas <= LIMITE_LINHAS) {
    const sobram = LIMITE_LINHAS - linhas;
    return { id: "ok", rotulo: "Dentro do limite", explica: sobram === 0 ? "Você usou as 30 linhas da folha." : `Ainda cabem ${sobram} ${sobram === 1 ? "linha" : "linhas"} na folha de 30.` };
  }
  const passam = linhas - LIMITE_LINHAS;
  return { id: "passou", rotulo: "Passou de 30 linhas", explica: `A folha tem 30 linhas. Faltaria espaço para ${passam} ${passam === 1 ? "linha" : "linhas"}: corte o texto ou escreva com a letra menor.` };
}

// ---------- Calculadora de média ----------

// "7,5" ou "7.5" -> 7.5; vazio ou inválido -> null
export function lerNota(valor) {
  const s = String(valor ?? "").trim().replace(",", ".");
  if (s === "" || !/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const arredondaCima = (x) => Math.ceil(Math.round(x * 1000) / 100) / 10; // sobe para 1 casa decimal; o round(x*1000) absorve o ruído de ponto flutuante (5,0000000001 não vira 5,1) e, de quebra, perdoa menos de 0,0005

/**
 * Quanto falta tirar na última etapa para chegar à média.
 * notas: notas já tiradas (uma por etapa, menos a última); pesos: um por etapa (inclui a última);
 * media: média para passar; maxima: nota máxima da escola (10).
 * Devolve { estado: "ja-passou" | "precisa" | "impossivel", precisa, soma... } ou { estado: "invalido", motivo }.
 */
export function calculaUltimaNota(notas, pesos, media, maxima = 10) {
  if (!Array.isArray(notas) || notas.length < 1) return { estado: "invalido", motivo: "Coloque ao menos uma nota." };
  if (pesos.length !== notas.length + 1) return { estado: "invalido", motivo: "Pesos e etapas não batem." };
  if (!(media > 0) || media > maxima) return { estado: "invalido", motivo: `A média precisa estar entre 0 e ${maxima}.` };
  if (notas.some((n) => n === null || n < 0 || n > maxima)) return { estado: "invalido", motivo: `As notas precisam estar entre 0 e ${maxima}.` };
  if (pesos.some((p) => !(p > 0))) return { estado: "invalido", motivo: "Os pesos precisam ser maiores que zero." };
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const pesoUltima = pesos[pesos.length - 1];
  const jaTem = notas.reduce((acc, n, i) => acc + n * pesos[i], 0);
  const bruta = (media * somaPesos - jaTem) / pesoUltima;
  const base = { bruta, somaPesos, jaTem };
  if (bruta <= 0) return { estado: "ja-passou", precisa: 0, ...base };
  const precisa = arredondaCima(bruta);
  if (precisa > maxima) return { estado: "impossivel", precisa, ...base };
  return { estado: "precisa", precisa, ...base };
}

// média final se a última nota fosse `ultima`
export function mediaFinal(notas, pesos, ultima) {
  const todas = [...notas, ultima];
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  return todas.reduce((acc, n, i) => acc + n * pesos[i], 0) / somaPesos;
}

// ---------- Cronograma ----------

export const AREAS = [
  { id: "lin", nome: "Linguagens", nomeLongo: "Linguagens" },
  { id: "hum", nome: "Humanas", nomeLongo: "Ciências Humanas" },
  { id: "nat", nome: "Natureza", nomeLongo: "Ciências da Natureza" },
  { id: "mat", nome: "Matemática", nomeLongo: "Matemática" },
  { id: "red", nome: "Redação", nomeLongo: "Redação" },
];
export const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIA_MS = 86400000;

// "2026-11-08" -> Date em UTC (sem problemas de fuso/horário de verão)
export function lerDataISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCMonth() === Number(m[2]) - 1 ? d : null;
}
const diaSemanaSegunda0 = (d) => (d.getUTCDay() + 6) % 7; // segunda = 0 ... domingo = 6
const addDias = (d, n) => new Date(d.getTime() + n * DIA_MS);

// Escolhe a área de cada bloco com um rodízio ponderado: a cada bloco todas as áreas ganham créditos (peso 2 no reforço, 1 nas outras),
// vence quem tem mais créditos entre as que ainda não foram usadas hoje, e quem vence paga o total. Os créditos passam de um dia para o outro,
// então a proporção se mantém ao longo das semanas. Limite: uma área só aparece uma vez por dia, então com 3 ou 4 h por dia o reforço
// não chega a «o dobro» (aparece o máximo que esse limite permite).
function criaSorteador(areas, reforco) {
  const peso = new Map(areas.map((a) => [a, reforco.includes(a) ? 2 : 1]));
  const total = [...peso.values()].reduce((a, b) => a + b, 0);
  const creditos = new Map(areas.map((a) => [a, 0]));
  return function escolhe(usadasHoje) {
    for (const a of areas) creditos.set(a, creditos.get(a) + peso.get(a));
    const livres = areas.filter((a) => !usadasHoje.has(a));
    const candidatas = livres.length ? livres : areas; // só uma área marcada: repete
    let vencedora = candidatas[0];
    for (const a of candidatas) if (creditos.get(a) > creditos.get(vencedora)) vencedora = a;
    creditos.set(vencedora, creditos.get(vencedora) - total);
    return vencedora;
  };
}

/**
 * Monta o plano.
 * opcoes: { hoje: "YYYY-MM-DD", prova: "YYYY-MM-DD", horas: 1..4, dias: [0..6] (0 = segunda), areas: [ids], reforco: [ids] }
 * Devolve { erro } ou { semanas: [{ numero, dias: [{ data, rotulo, tipo: "estudo"|"livre"|"fora"|"prova", blocos: [{ area, nome, horas }] }] }], totalSemanas, diasDeEstudo }
 */
export function montaCronograma(opcoes) {
  const hoje = lerDataISO(opcoes.hoje);
  const prova = lerDataISO(opcoes.prova);
  if (!prova) return { erro: "Escolha a data da prova." };
  if (!hoje) return { erro: "Não consegui ler a data de hoje." };
  if (prova.getTime() <= hoje.getTime()) return { erro: "A data da prova já passou ou é hoje. Escolha uma data futura." };
  const totalDias = Math.round((prova.getTime() - hoje.getTime()) / DIA_MS);
  if (totalDias > 400) return { erro: "A prova está a mais de 400 dias. Escolha uma data mais próxima." };
  const horas = Math.max(1, Math.min(4, Number(opcoes.horas) || 1));
  const dias = [...new Set(opcoes.dias || [])].filter((d) => d >= 0 && d <= 6).sort();
  if (!dias.length) return { erro: "Marque pelo menos um dia da semana em que você estuda." };
  const areas = AREAS.map((a) => a.id).filter((id) => (opcoes.areas || AREAS.map((a) => a.id)).includes(id));
  if (!areas.length) return { erro: "Marque pelo menos uma área para estudar." };
  const reforco = (opcoes.reforco || []).filter((id) => areas.includes(id));
  // um dia livre por semana é regra do plano: se marcou os 7 dias, o último marcado vira dia livre
  const diasDeEstudo = dias.length === 7 ? dias.slice(0, 6) : dias;
  const escolhe = criaSorteador(areas, reforco);
  const nomeDe = Object.fromEntries(AREAS.map((a) => [a.id, a.nome]));
  const nomeLongoDe = Object.fromEntries(AREAS.map((a) => [a.id, a.nomeLongo]));
  const semanas = [];
  let segunda = addDias(hoje, -diaSemanaSegunda0(hoje));
  let n = 1;
  let diasEstudados = 0;
  while (segunda.getTime() <= prova.getTime()) {
    const semana = { numero: n++, dias: [] };
    for (let i = 0; i < 7; i++) {
      const data = addDias(segunda, i);
      const rotulo = `${String(data.getUTCDate()).padStart(2, "0")}/${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
      let dia;
      if (data.getTime() < hoje.getTime() || data.getTime() > prova.getTime()) dia = { tipo: "fora", blocos: [] };
      else if (data.getTime() === prova.getTime()) dia = { tipo: "prova", blocos: [] };
      else if (!diasDeEstudo.includes(i)) dia = { tipo: "livre", blocos: [] };
      else {
        const blocos = [];
        const usadasHoje = new Set();
        for (let h = 0; h < horas; h++) {
          const area = escolhe(usadasHoje);
          usadasHoje.add(area);
          blocos.push({ area, nome: nomeDe[area], nomeLongo: nomeLongoDe[area], horas: 1 });
        }
        dia = { tipo: "estudo", blocos };
        diasEstudados++;
      }
      semana.dias.push({ data: data.toISOString().slice(0, 10), rotulo, nomeCurto: DIAS_CURTOS[i], ...dia });
    }
    semanas.push(semana);
    segunda = addDias(segunda, 7);
  }
  return { semanas, totalSemanas: semanas.length, diasDeEstudo: diasEstudados, diasPorSemana: diasDeEstudo.length, horas, totalDias };
}
