// Prueba del motor de referencias ABNT (sin navegador): los exemplos dos manuais (ejemplos-referencias.mjs), el negrito, las citaciones
// en el texto, el orden alfabético, las letras a/b/c, los casos sin datos y los avisos. Ejecutar desde la carpeta pruebas/.
import { formataReferencia, montaLista, textoEdicao, numeroDeLei, anoTexto, tituloSemAutor, dataAcesso, dataExtenso } from "../src/assets/js/abnt/referencias-modelo.js";
import { TIPOS } from "../src/assets/js/abnt/referencias-campos.js";
import { CASOS, CITACOES } from "./ejemplos-referencias.mjs";

let falhas = 0;
const marca = (ok, msg) => { console.log(`${ok ? "OK   " : "FALHA"} ${msg}`); if (!ok) falhas++; };
const igual = (obtido, esperado, msg) => {
  const ok = obtido === esperado;
  marca(ok, msg);
  if (!ok) console.log(`      esperado: ${esperado}\n      obtido:   ${obtido}`);
};

console.log("== A) Exemplos dos manuais (letra por letra)");
const porTipo = {};
for (const c of CASOS) {
  porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1;
  const ref = formataReferencia(c.dados);
  igual(ref.texto, c.esperado, `${c.tipo} · ${c.fonte}${c.ajuste ? "  [ajuste: " + c.ajuste.slice(0, 50) + "…]" : ""}`);
  marca(ref.faltando.length === 0, `   sem campos faltando (${ref.faltando.map((f) => f.rotulo).join(", ") || "nenhum"})`);
  if (c.negrito) {
    const negro = ref.runs.filter((x) => x.bold).map((x) => x.text);
    marca(JSON.stringify(negro) === JSON.stringify(c.negrito), `   negrito só em ${JSON.stringify(c.negrito)} (${JSON.stringify(negro)})`);
  }
}
console.log("\n== B) Pelo menos 3 exemplos de cada tipo");
for (const t of TIPOS) marca((porTipo[t.id] || 0) >= 3, `${t.nome}: ${porTipo[t.id] || 0} exemplos de manual`);

console.log("\n== C) Citação no texto (NBR 10520:2023, conferida com o manual da UFV)");
for (const c of CITACOES) {
  const ref = formataReferencia(c.dados, { estilo: c.estilo || "novo" });
  igual(`${ref.citacao.par} | ${ref.citacao.nar}`, `${c.par} | ${c.nar}`, c.fonte);
}

console.log("\n== D) Regras gerais");
const base = (o) => ({ tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Silva", nome: "Maria" }], papel: "autor", quatro: "todos" }, titulo: "Título", local: "São Paulo", editora: "Editora X", pub: { ano: "2020" }, ...o });
igual(formataReferencia(base({ local: "", editora: "" })).texto, "SILVA, Maria. Título. [S. l.: s. n.], 2020.", "sem cidade e sem editora: [S. l.: s. n.]");
igual(formataReferencia(base({ editora: "" })).texto, "SILVA, Maria. Título. São Paulo: [s. n.], 2020.", "sem editora: [s. n.]");
igual(formataReferencia(base({ editora: "Atlas Ltda." })).texto, "SILVA, Maria. Título. São Paulo: Atlas, 2020.", "tira Ltda. da editora");
igual(formataReferencia(base({ editora: "Saraiva S.A." })).texto, "SILVA, Maria. Título. São Paulo: Saraiva, 2020.", "tira S.A. da editora");
igual(formataReferencia(base({ edicao: "2ª" })).texto, "SILVA, Maria. Título. 2. ed. São Paulo: Editora X, 2020.", "edição \"2ª\" vira \"2. ed.\"");
igual(textoEdicao("2. ed. rev. e ampl."), "2. ed. rev. e ampl.", "edição com texto fica como digitada");
igual(formataReferencia(base({ anoTipo: "provavel" })).texto, "SILVA, Maria. Título. São Paulo: Editora X, [2020?].", "ano provável [2020?]");
igual(anoTexto("2015", "aproximado"), "[ca. 2015]", "ano aproximado [ca. 2015]");
igual(anoTexto("2005", "decada"), "[200-]", "década certa [200-]");
igual(anoTexto("2015", "decadaProvavel"), "[201-?]", "década provável [201-?]");
igual(anoTexto("2017", "certo"), "[2017]", "ano certo fora do documento [2017]");
igual(numeroDeLei("9610"), "9.610", "número da lei com ponto de milhar");
igual(numeroDeLei("2558/2016"), "2558/2016", "número da lei com barra fica como digitado");
igual(dataAcesso("2026-10-05"), "5 out. 2026", "data de acesso: dia sem zero e mês abreviado");
igual(dataExtenso("1998-02-19"), "19 de fevereiro de 1998", "data da lei por extenso");
for (const [n, abrev] of [[1, "jan."], [2, "fev."], [3, "mar."], [4, "abr."], [5, "maio"], [6, "jun."], [7, "jul."], [8, "ago."], [9, "set."], [10, "out."], [11, "nov."], [12, "dez."]]) {
  igual(dataAcesso(`2026-${String(n).padStart(2, "0")}-15`), `15 ${abrev} 2026`, `mês ${n} → ${abrev}`);
}
igual(tituloSemAutor("O que é positivismo").texto, "O QUE é positivismo", "sem autor: artigo + palavra seguinte em maiúsculas");
igual(tituloSemAutor("Em busca de um sonho").texto, "EM BUSCA de um sonho", "sem autor: monossílabo + palavra seguinte");
igual(tituloSemAutor("37 graus podcast").texto, "37 GRAUS podcast", "sem autor: número + palavra seguinte");
igual(tituloSemAutor("Plataforma de força").texto, "PLATAFORMA de força", "sem autor: só a primeira palavra");
igual(formataReferencia(base({ link: "x", online: { link: "", acesso: "2026-10-15" } })).texto, "SILVA, Maria. Título. São Paulo: Editora X, 2020.", "sem link não escreve \"Acesso em\"");
igual(formataReferencia(base({ online: { link: "https://exemplo.com.br/a", acesso: "" } })).texto, "SILVA, Maria. Título. São Paulo: Editora X, 2020. Disponível em: https://exemplo.com.br/a.", "com link e sem data de acesso: só \"Disponível em\"");
// periódico sem cidade: [s. l.] com minúsculas (depois da vírgula)
igual(formataReferencia({ tipo: "artigo", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Lima", nome: "Ana" }] }, titulo: "Tema", periodico: "Revista X", volume: "3", numero: "1", pub: { ano: "2021", mesIni: "3" } }).texto, "LIMA, Ana. Tema. Revista X, [s. l.], v. 3, n. 1, mar. 2021.", "periódico sem cidade: [s. l.]");
// o título do livro termina em ? e não leva ponto a mais
igual(formataReferencia(base({ titulo: "Quem somos?", subtitulo: "" })).texto, "SILVA, Maria. Quem somos? São Paulo: Editora X, 2020.", "título que termina em ? não recebe ponto");
// 4 ou mais autores: a opção escolhida
const quatro = (q) => base({ autoria: { modo: "pessoa", pessoas: ["A", "B", "C", "D"].map((s) => ({ sobrenome: s + "a", nome: s })), papel: "autor", quatro: q } });
igual(formataReferencia(quatro("todos")).texto, "AA, A; BA, B; CA, C; DA, D. Título. São Paulo: Editora X, 2020.", "4 autores: todos");
igual(formataReferencia(quatro("primeiro")).texto, "AA, A et al. Título. São Paulo: Editora X, 2020.", "4 autores: primeiro + et al.");
igual(formataReferencia(base({ autoria: { modo: "pessoa", pessoas: [{ sobrenome: "A", nome: "A" }, { sobrenome: "B", nome: "B" }, { sobrenome: "C", nome: "C" }], quatro: "primeiro" } })).texto, "A, A; B, B; C, C. Título. São Paulo: Editora X, 2020.", "3 autores: sempre todos, mesmo com a opção \"primeiro\"");
// o texto digitado em minúsculas ou maiúsculas dá a mesma referência
igual(formataReferencia(base({ autoria: { modo: "pessoa", pessoas: [{ sobrenome: "SILVA", nome: "  Maria   " }] } })).texto, formataReferencia(base({ autoria: { modo: "pessoa", pessoas: [{ sobrenome: "silva", nome: "Maria" }] } })).texto, "sobrenome em maiúsculas ou minúsculas dá o mesmo resultado; espaços sobrando são limpos");
// campos obrigatórios
const falta = formataReferencia({ tipo: "livro", autoria: { modo: "pessoa", pessoas: [] }, titulo: "", pub: { ano: "" } }).faltando.map((f) => f.rotulo);
marca(falta.length === 3 && falta.some((f) => /sobrenome/.test(f)) && falta.some((f) => /título/.test(f)) && falta.includes("o ano"), `livro vazio pede sobrenome, título e ano (${falta.join(" | ")})`);
marca(formataReferencia({ tipo: "livro", autoria: { modo: "nenhum", pessoas: [] }, titulo: "Guia", pub: { ano: "2020" } }).faltando.length === 0, "sem autor (modo \"nenhum\") não pede sobrenome");
// avisos
marca(formataReferencia(base({ editora: "" })).avisos.some((a) => /sem editora/i.test(a)), "avisa quando usa [s. n.]");

console.log("\n== E) Lista: ordem alfabética, repetição do autor e letras a/b");
const item = (id, sob, nome, titulo, ano) => ({ id, dados: base({ autoria: { modo: "pessoa", pessoas: [{ sobrenome: sob, nome }] }, titulo, pub: { ano: String(ano) } }) });
let l = montaLista([item(1, "Silva", "Maria", "Zeta", 2020), item(2, "Álvares", "João", "Alfa", 2019), item(3, "Costa Val", "M.", "Beta", 2018), item(4, "Costa", "Rita", "Gama", 2017), item(5, "d’Oliveira", "A.", "Delta", 2010), item(6, "Dias", "B.", "Épsilon", 2011)]);
igual(l.map((x) => x.ref.texto.split(".")[0]).join(" | "), "ÁLVARES, João | COSTA, Rita | COSTA VAL, M | DIAS, B | D’OLIVEIRA, A | SILVA, Maria", "ordem alfabética (acentos, sobrenome composto e apóstrofo ignorado)");
l = montaLista([item(1, "Silva", "Maria", "Beta", 2020), item(2, "Silva", "Maria", "Alfa", 2020), item(3, "Silva", "Maria", "Gama", 2019)]);
igual(l.map((x) => x.ref.texto.match(/\d{4}[a-z]?\.$/)[0]).join(" "), "2020a. 2020b. 2019.", "mesmo autor e mesmo ano: 2020a e 2020b (na ordem dos títulos)");
igual(l[0].ref.citacao.par + " " + l[1].ref.citacao.par + " " + l[2].ref.citacao.par, "(Silva, 2020a) (Silva, 2020b) (Silva, 2019)", "citação com a mesma letra da referência");
l = montaLista([item(1, "Silva", "Maria", "Alfa", 2020), item(2, "Silva", "Maria", "Beta", 2021)]);
marca(l.every((x) => !/\d[ab]\./.test(x.ref.texto)), "anos diferentes: sem letras");
marca(montaLista([{ id: 1, dados: base({ titulo: "" }) }]).length === 0, "referência incompleta não entra na lista");

console.log(falhas ? `\n${falhas} falha(s)` : "\nTodo OK");
process.exit(falhas ? 1 : 0);
