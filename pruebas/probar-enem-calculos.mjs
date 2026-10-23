// Pruebas de las cuentas del ENEM (sin navegador): node pruebas/probar-enem-calculos.mjs
import { estimaLinhas, estadoDasLinhas, lerNota, calculaUltimaNota, mediaFinal, montaCronograma, lerDataISO, MIN_LINHAS, LIMITE_LINHAS, MAX_SEM_ZERO } from "../src/assets/js/enem/calculos.js";
let ok = 0, fallos = 0;
const t = (cond, msg, extra = "") => { if (cond) ok++; else { fallos++; console.log("FALLA", msg, extra); } };
const eq = (a, b, msg) => t(JSON.stringify(a) === JSON.stringify(b), msg, `obtenido ${JSON.stringify(a)} esperado ${JSON.stringify(b)}`);

// reglas oficiales (Cartilha do Participante do Inep: hasta 7 líneas escritas = texto insuficiente, nota cero; la hoja tiene 30)
eq([MAX_SEM_ZERO, MIN_LINHAS, LIMITE_LINHAS], [7, 8, 30], "Inep: hasta 7 líneas = cero; mínimo 8; máximo 30");

// contador
eq(estimaLinhas("", 70).linhas, 0, "texto vacío = 0 líneas");
eq(estimaLinhas("   \n \n", 70).linhas, 0, "solo espacios = 0 líneas");
eq(estimaLinhas("Olá mundo", 70).linhas, 1, "una frase corta = 1 línea");
eq(estimaLinhas("a b c", 70).palavras, 3, "cuenta palabras");
eq(estimaLinhas("um\n\n\ndois\ntres", 70).linhas, 3, "cada párrafo empieza en línea nueva y las líneas en blanco no cuentan");
const diez = Array(10).fill("palavrinha").join(" ");
const r = estimaLinhas(diez, 40);
t(r.linhas >= 3 && r.linhas <= 4, "texto largo se parte en varias líneas", String(r.linhas));
t(r.preenchimento.every((x) => x > 0 && x <= 1), "el relleno de cada línea está entre 0 y 1");
eq(estimaLinhas("x".repeat(100), 30).linhas, 4, "palabra más larga que la línea se parte (100 caracteres, líneas de 30, recuo 4 = 4 líneas)");
t(estimaLinhas("a ".repeat(500), 70).linhas > estimaLinhas("a ".repeat(500), 90).linhas, "más caracteres por línea = menos líneas");
t(estimaLinhas("a", 0).largura === 70, "ancho inválido usa el valor de partida");
t(estimaLinhas("a", 500).largura === 200, "ancho máximo 200");
t(estimaLinhas("a", 3).largura === 10, "ancho mínimo 10");
t(estimaLinhas(diez + "\n" + diez, 40).linhas > r.linhas, "dos párrafos ocupan más líneas que uno");
eq(estimaLinhas("a".repeat(70), 70).linhas, 2, "con recuo, 70 letras seguidas no caben en una línea de 70 (se parten)");
eq(estimaLinhas(Array(15).fill("abcd").join(" "), 100).linhas, 1, "15 palabras de 4 letras (74 caracteres) con recuo caben en una línea de 100");
eq(estimaLinhas("palavra ".repeat(9).trim(), 70).linhas, 2, "9 palabras de 7 letras (4 de recuo + 63 + 8 espacios = 75) no caben en una línea de 70");

// estado
eq(estadoDasLinhas(0).id, "vazio", "estado vacío");
eq(estadoDasLinhas(1).id, "insuficiente", "1 línea = insuficiente");
eq(estadoDasLinhas(7).id, "insuficiente", "7 líneas = insuficiente (hasta 7 = cero)");
eq(estadoDasLinhas(8).id, "ok", "8 líneas = ok");
eq(estadoDasLinhas(30).id, "ok", "30 líneas = ok");
eq(estadoDasLinhas(31).id, "passou", "31 líneas = pasó");
t(/pelo menos 8/.test(estadoDasLinhas(3).explica), "explica el mínimo de 8");
t(/Ainda cabem 6 linhas/.test(estadoDasLinhas(24).explica), "24 líneas: caben 6");
t(/1 linha:/.test(estadoDasLinhas(31).explica), "singular: 1 linha");

// leer notas
eq(lerNota("7,5"), 7.5, "coma decimal");
eq(lerNota("7.5"), 7.5, "punto decimal");
eq(lerNota(" 10 "), 10, "entero con espacios");
eq(lerNota(""), null, "vacío = null");
eq(lerNota("abc"), null, "texto = null");
eq(lerNota("-1"), null, "negativo = null");
eq(lerNota("7,5,2"), null, "dos comas = null");

// media: ejemplo del diseño (7,5; 6,0; 5,5; media 6,0 => 5,0)
let c = calculaUltimaNota([7.5, 6, 5.5], [1, 1, 1, 1], 6);
eq([c.estado, c.precisa], ["precisa", 5], "ejemplo: necesita 5,0");
eq(mediaFinal([7.5, 6, 5.5], [1, 1, 1, 1], 5), 6, "con 5,0 la media final es 6,0");
eq(calculaUltimaNota([9, 9, 9], [1, 1, 1, 1], 6).estado, "ja-passou", "ya aprobó con 9,9,9");
c = calculaUltimaNota([2, 2, 2], [1, 1, 1, 1], 7);
eq(c.estado, "impossivel", "2,2,2 con media 7 es imposible");
t(c.precisa > 10, "imposible: muestra cuánto haría falta", String(c.precisa));
c = calculaUltimaNota([6, 6, 6], [1, 1, 1, 1], 6);
eq([c.estado, c.precisa], ["precisa", 6], "6,6,6: necesita 6,0");
c = calculaUltimaNota([5, 5, 5], [1, 1, 1, 3], 6); // (15 + 3x) / 6 = 6 => x = 7
eq([c.estado, c.precisa], ["precisa", 7], "con pesos: necesita 7,0");
eq(calculaUltimaNota([7.3, 6.1, 5.2], [1, 1, 1, 1], 6).precisa, 5.4, "redondea hacia arriba a 1 decimal: 5,4");
eq(calculaUltimaNota([7, 6, 5.55], [1, 1, 1, 1], 6).precisa, 5.5, "5,45 sube a 5,5");
eq(calculaUltimaNota([null, 6], [1, 1, 1], 6).estado, "invalido", "nota vacía = inválido");
eq(calculaUltimaNota([11, 6], [1, 1, 1], 6).estado, "invalido", "nota 11 = inválido");
eq(calculaUltimaNota([5, 6], [1, 1, 1], 0).estado, "invalido", "media 0 = inválido");
eq(calculaUltimaNota([5, 6], [1, 0, 1], 6).estado, "invalido", "peso 0 = inválido");
eq(calculaUltimaNota([5, 6], [1, 1], 6).estado, "invalido", "pesos que no coinciden = inválido");
c = calculaUltimaNota([4, 4, 4], [1, 1, 1, 1], 4);
eq([c.estado, c.precisa], ["precisa", 4], "4,4,4 con media 4 necesita exactamente 4,0");

// cronograma
const base = { hoje: "2026-10-22", prova: "2026-11-08", horas: 2, dias: [0, 1, 2, 3, 4, 5], areas: ["lin", "hum", "nat", "mat", "red"], reforco: ["mat"] };
let p = montaCronograma(base);
t(!p.erro, "plan básico se arma", p.erro);
eq(p.semanas.length, 3, "22/10 (jueves) a 08/11 (domingo): semanas de lunes 19/10, 26/10 y 02/11");
const dias = p.semanas.flatMap((s) => s.dias);
eq(dias.length, 21, "semanas completas de 7 días");
eq(dias.filter((d) => d.tipo === "prova").length, 1, "un solo día de prueba");
eq(dias.find((d) => d.tipo === "prova").data, "2026-11-08", "el día de prueba es el elegido");
t(dias.filter((d) => d.data < "2026-10-22").every((d) => d.tipo === "fora"), "días anteriores a hoy quedan fuera");
t(dias.filter((d) => d.data > "2026-11-08").every((d) => d.tipo === "fora"), "días posteriores a la prueba quedan fuera");
t(dias.filter((d) => d.tipo === "estudo").every((d) => d.blocos.length === 2), "2 h por día = 2 bloques");
t(dias.filter((d) => d.tipo === "estudo").every((d) => new Set(d.blocos.map((b) => b.area)).size === 2), "no repite el área en el mismo día");
t(dias.some((d) => d.tipo === "livre"), "hay días libres (domingo)");
const cuenta = {}; dias.forEach((d) => d.blocos.forEach((b) => { cuenta[b.area] = (cuenta[b.area] || 0) + 1; }));
t(cuenta.mat > cuenta.lin, "el área de refuerzo (Matemática) tiene más bloques", JSON.stringify(cuenta));
t(Object.keys(cuenta).length === 5, "las 5 áreas aparecen", JSON.stringify(cuenta));
eq(p.diasPorSemana, 6, "6 días de estudio por semana");
// 7 días marcados: uno queda libre
p = montaCronograma({ ...base, dias: [0, 1, 2, 3, 4, 5, 6] });
t(p.semanas.slice(1, -1).every((s) => s.dias.filter((d) => d.tipo === "livre").length === 1), "con 7 días marcados, queda 1 día libre por semana");
eq(p.diasPorSemana, 6, "con 7 días marcados se estudia 6");
// un solo día, una sola área
p = montaCronograma({ ...base, dias: [2], areas: ["red"], horas: 1 });
t(!p.erro && p.semanas.flatMap((s) => s.dias).filter((d) => d.tipo === "estudo").every((d) => d.blocos.length === 1 && d.blocos[0].area === "red"), "un día y un área");
// errores
t(/Escolha a data/.test(montaCronograma({ ...base, prova: "" }).erro), "sin fecha");
t(/já passou/.test(montaCronograma({ ...base, prova: "2026-10-22" }).erro), "fecha igual a hoy");
t(/já passou/.test(montaCronograma({ ...base, prova: "2026-01-01" }).erro), "fecha pasada");
t(/400 dias/.test(montaCronograma({ ...base, prova: "2028-01-01" }).erro), "demasiado lejos");
t(/pelo menos um dia/.test(montaCronograma({ ...base, dias: [] }).erro), "sin días");
t(/pelo menos uma área/.test(montaCronograma({ ...base, areas: [] }).erro), "sin áreas");
eq(lerDataISO("2026-02-30"), null, "fecha inexistente");
eq(lerDataISO("26-1-1"), null, "formato inválido");
p = montaCronograma({ ...base, hoje: "2026-10-26", prova: "2026-11-01" }); // hoy lunes, prueba el domingo
eq([p.semanas.length, p.semanas[0].dias[0].tipo], [1, "estudo"], "hoy lunes y prueba el domingo = 1 semana, empieza estudiando");
p = montaCronograma({ ...base, hoje: "2026-10-31", prova: "2026-11-01" }); // mañana es la prueba
t(!p.erro && p.semanas.flatMap((s) => s.dias).filter((d) => d.tipo === "estudo").length === 1, "a un día de la prueba hay un solo día de estudio (sábado)");

// reparto del refuerzo en un plan largo (394 días, 6 días por semana) con 1 a 4 h por día
const largo = { hoje: "2026-10-22", prova: "2027-11-20", areas: ["lin", "hum", "nat", "mat", "red"], dias: [0, 1, 2, 3, 4, 5] };
const cuentaAreas = (pl) => { const c = { lin: 0, hum: 0, nat: 0, mat: 0, red: 0 }; pl.semanas.forEach((w) => w.dias.forEach((d) => d.blocos.forEach((b) => { c[b.area]++; }))); return c; };
for (const horas of [1, 2, 3, 4]) {
  for (const reforco of [["mat"], ["lin", "hum"]]) {
    const c = cuentaAreas(montaCronograma({ ...largo, horas, reforco }));
    const refs = reforco.map((a) => c[a]);
    const otras = ["lin", "hum", "nat", "mat", "red"].filter((a) => !reforco.includes(a)).map((a) => c[a]);
    t(Math.min(...refs) > Math.max(...otras), `${horas} h/día, refuerzo ${reforco}: las áreas marcadas aparecen más que las otras`, JSON.stringify(c));
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    t(Math.max(...Object.values(c)) - Math.min(...Object.values(c)) < total, "(sanidad) todas las áreas aparecen", JSON.stringify(c));
    t(Object.values(c).every((n) => n > 0), `${horas} h/día: ninguna área desaparece`, JSON.stringify(c));
  }
}
{ // con 1 y 2 h por día el refuerzo sí llega casi al doble
  for (const horas of [1, 2]) {
    const c = cuentaAreas(montaCronograma({ ...largo, horas, reforco: ["mat"] }));
    const ratio = c.mat / ((c.lin + c.hum + c.nat + c.red) / 4);
    t(ratio > 1.8 && ratio < 2.2, `${horas} h/día: el refuerzo aparece ~2 veces más (${ratio.toFixed(2)}x)`);
  }
}
// con 4 h/día y una sola área marcada, nunca dos bloques de la misma área en un día
{
  const pl = montaCronograma({ ...largo, horas: 4, reforco: ["mat"] });
  t(pl.semanas.flatMap((w) => w.dias).filter((d) => d.tipo === "estudo").every((d) => new Set(d.blocos.map((b) => b.area)).size === 4), "4 h/día: 4 áreas distintas cada día");
}

console.log(fallos ? `${fallos} fallos de ${ok + fallos}` : `Todo OK: ${ok}/${ok} comprobaciones de las cuentas del ENEM`);
process.exit(fallos ? 1 : 0);
