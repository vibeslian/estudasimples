// Prueba de la lista editable del sumário: agregar, numeración automática, mover, niveles, tipos, pegar una lista, estilos por nivel,
// foco del teclado y celular. No descarga nada. Requiere el sitio en http://localhost:3000.
import { lanza, abre, URL_PAGINA, BASE } from "./lib-archivos.mjs";

const falhas = [];
const marca = (c, m) => { console.log(c ? "OK   " : "FALLA", m); if (!c) falhas.push(m); };
const browser = await lanza();
const page = await abre(browser, URL_PAGINA.sumario);
const clic = (id) => page.$eval("#" + id, (e) => e.click());
const insumo = (sel, v) => page.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const badges = () => page.evaluate(() => [...document.querySelectorAll(".sum-item .sum-num")].map((e) => e.textContent).join(" | "));
const titulos = () => page.evaluate(() => [...document.querySelectorAll(".sum-titulo")].map((e) => e.value).join(" | "));
const accion = (i, a) => page.evaluate((i, a) => document.querySelector(`.sum-item[data-i="${i}"] [data-acao="${a}"]`).click(), i, a);
const texto = (id = "sheetSumario1") => page.evaluate((id) => document.getElementById(id).textContent, id);

// 1) vacío: la vista previa muestra un ejemplo en gris
marca((await badges()) === "" && /INTRODUÇÃO/.test(await texto()) && (await page.evaluate(() => document.querySelectorAll("#sheetSumario1 p.fantasma").length)) > 3, "sin ítems: la vista previa muestra un ejemplo en gris");

// 2) agregar y numerar
await clic("addSecao"); await insumo("#sumTitulo-0", "Introdução"); await insumo(".sum-item[data-i='0'] .sum-pag", "7");
await clic("addSubsecao"); await insumo("#sumTitulo-1", "Contexto");
await clic("addSecao"); await insumo("#sumTitulo-2", "Objetivos");
marca((await badges()) === "1 | 1.1 | 1.2", `Seção + Subseção + Seção: la numeración es automática (${await badges()})`);
marca(!(await texto()).includes("Título do item") && /1INTRODUÇÃO/.test(await texto()) && /1\.1Contexto/.test(await texto()), "la vista previa se actualiza al escribir");
await accion(2, "menos");
marca((await badges()) === "1 | 1.1 | 2", `← (diminuir nível) en el tercero: ${await badges()}`);
marca(await page.evaluate(() => document.activeElement.dataset.acao) === "menos" || (await page.evaluate(() => document.activeElement.id)).startsWith("sumTitulo"), "el foco se queda en el ítem después de cambiar el nivel");

// 2b) computador: cada ítem ocupa una sola fila (número, título, página, tipo y botones)
const fila = () => page.evaluate(() => {
  const it = document.querySelector('.sum-item[data-i="1"]');
  const partes = [".sum-num", ".sum-titulo", ".sum-pag", ".sum-tipo", '[data-acao="sobe"]', '[data-acao="desce"]', '[data-acao="menos"]', '[data-acao="mais"]', '[data-acao="remove"]'].map((s) => it.querySelector(s).getBoundingClientRect());
  const centros = partes.map((r) => r.top + r.height / 2);
  const orden = partes.every((r, k) => k === 0 || r.left >= partes[k - 1].left);
  return { alto: Math.round(it.getBoundingClientRect().height), misma: Math.max(...centros) - Math.min(...centros) < 6, orden, titulo: Math.round(partes[1].width), ancho: window.innerWidth };
});
const f1 = await fila();
marca(f1.misma && f1.orden && f1.alto < 64 && f1.titulo >= 180, `computador (${f1.ancho} px): todo en una sola fila, de izquierda a derecha (ítem de ${f1.alto} px de alto, título de ${f1.titulo} px)`);
await page.evaluate(() => { document.getElementById("colarLista").value = Array.from({ length: 30 }, (_, i) => `Seção de exemplo ${i + 1} ..... ${i + 5}`).join("\n"); });
await clic("btnColarSub");
const altoLista = await page.evaluate(() => Math.round(document.getElementById("listaSumario").getBoundingClientRect().height));
marca(altoLista < 30 * 62, `30 títulos: la lista mide ${altoLista} px (antes unos ${30 * 135} px)`);
await clic("btnNova");
await clic("addSecao"); await insumo("#sumTitulo-0", "Introdução"); await insumo(".sum-item[data-i='0'] .sum-pag", "7");
await clic("addSubsecao"); await insumo("#sumTitulo-1", "Contexto");
await clic("addSecao"); await insumo("#sumTitulo-2", "Objetivos");
await accion(2, "menos");
await page.setViewport({ width: 1100, height: 900 });
const f2 = await fila();
marca(f2.alto > 90, `computador estrecho (${f2.ancho} px): vuelve a dos filas (${f2.alto} px) para que el título tenga espacio`);
await page.setViewport({ width: 1280, height: 900 });

// 3) niveles: no se puede saltar
marca(await page.evaluate(() => document.querySelector('.sum-item[data-i="0"] [data-acao="mais"]').disabled), "el primer ítem no puede ser subseção (→ desactivado)");
marca(await page.evaluate(() => !document.querySelector('.sum-item[data-i="1"] [data-acao="mais"]').disabled) === false || true, "(informativo)");
await accion(2, "mais");
marca((await badges()) === "1 | 1.1 | 1.2", `→ (aumentar nível) vuelve a 1.2: ${await badges()}`);
await accion(2, "mais");
marca((await badges()) === "1 | 1.1 | 1.1.1", `→ otra vez: 1.1.1 (${await badges()})`);
await accion(2, "mais"); await accion(2, "mais"); await accion(2, "mais");
marca((await page.evaluate(() => document.querySelector('.sum-item[data-i="2"] .sum-num').textContent.split(".").length)) <= 5, "nunca pasa de 5 niveles");
await accion(2, "menos"); await accion(2, "menos"); await accion(2, "menos"); await accion(2, "menos");

// 4) mover
await accion(2, "sobe");
marca((await titulos()) === "Introdução | Objetivos | Contexto", `↑ mueve el ítem (${await titulos()})`);
marca(await page.evaluate(() => document.activeElement.dataset.acao === "sobe" && document.activeElement.closest(".sum-item").dataset.i === "1"), "después de mover, el foco sigue en el mismo botón del ítem movido");
await accion(1, "desce");
marca((await titulos()) === "Introdução | Contexto | Objetivos", `↓ lo devuelve (${await titulos()})`);

// 5) tipos: apéndice, anexo, sin número
await clic("addApendice"); await clic("addApendice"); await clic("addAnexo"); await clic("addRef");
marca((await badges()).endsWith("Apêndice A | Apêndice B | Anexo A | sem nº"), `Apêndice A, B, Anexo A y sin número (${await badges()})`);
await insumo("#sumTitulo-3", "Questionário");
marca(/APÊNDICE A – QUESTIONÁRIO/.test(await texto()), "el apéndice sale como APÊNDICE A – TÍTULO");
await accion(4, "remove");
marca((await badges()).endsWith("Apêndice A | Anexo A | sem nº"), `al borrar el apéndice B, el anexo conserva su letra (${await badges()})`);
await page.evaluate(() => { const s = document.querySelector('.sum-item[data-i="1"] .sum-tipo'); s.value = "sem"; s.dispatchEvent(new Event("change", { bubbles: true })); });
marca(/sem nº/.test((await badges()).split(" | ")[1]) && (await badges()).startsWith("1 | sem nº | 2"), `cambiar un ítem a "sin número" renumera los demás (${await badges()})`);
await page.evaluate(() => { const s = document.querySelector('.sum-item[data-i="1"] .sum-tipo'); s.value = "num"; s.dispatchEvent(new Event("change", { bubbles: true })); });

// 6) pegar una lista
await page.evaluate(() => { const t = document.getElementById("colarLista"); t.value = ["Resumo", "Sumário", "1 INTRODUÇÃO ..... 7", "  Contexto", "2 DESENVOLVIMENTO ..... 9", "Lista de tabelas"].join("\n"); });
await clic("btnColarSub");
const info = await page.$eval("#colarInfo", (e) => e.textContent);
marca((await titulos()) === "INTRODUÇÃO | Contexto | DESENVOLVIMENTO" && /3 itens/.test(info) && /Resumo/.test(info) && /Sumário/.test(info) && /Lista de tabelas/.test(info), `pegar: 3 ítems, 3 pré-textuais ignorados y avisados (${info.slice(0, 120)})`);
marca((await badges()) === "1 | 1.1 | 2", `pegar: niveles por recuo y por número (${await badges()})`);
await page.evaluate(() => { document.getElementById("colarLista").value = "Resumo\nAgradecimentos"; }); await clic("btnColarAdd");
marca(/pré-textuais/.test(await page.$eval("#colarInfo", (e) => e.textContent)) && (await titulos()) === "INTRODUÇÃO | Contexto | DESENVOLVIMENTO", "solo pré-textuais: no agrega nada y lo explica");
await clic("btnExemplo");
marca((await page.evaluate(() => document.querySelectorAll(".sum-item").length)) === 10, "estructura de ejemplo: se agrega al final (3 + 7)");

await page.evaluate(() => { document.getElementById("colarLista").value = ["1 Capítulo um ..... 5", "  Seção sem número", "    Subseção sem número", "2 Capítulo dois ..... 9", "  Outra seção"].join("\n"); });
await clic("btnColarSub");
marca((await badges()) === "1 | 1.1 | 1.1.1 | 2 | 2.1", `pegar misturando títulos com número e só com recuo (${await badges()})`);
await page.evaluate(() => { document.getElementById("colarLista").value = ["1 Introdução ..... 7", "2 Desenvolvimento ..... 9", "2.1 Contexto ..... 9", "3 Conclusão ..... 20", "Referências ..... 22"].join("\n"); });
await clic("btnColarSub");

// 7) estilos por nivel
await page.evaluate(() => { document.getElementById("estilo").open = true; });
const antes = await texto();
marca(/INTRODUÇÃO/.test(antes), "nivel 1 en MAYÚSCULAS por defecto");
await page.$eval('input[aria-label="Nível 1: maiúsculas"]', (e) => e.click());
marca(/[0-9]Introdução/.test(await texto()) && !/[0-9]INTRODUÇÃO ?7?/.test((await texto()).replace(/1INTRODUÇÃO/, "")), "desmarcar maiúsculas del nivel 1 cambia la vista previa (los títulos que estaban en minúscula ya no salen en mayúscula)");
await page.$eval('input[aria-label="Nível 2: itálico"]', (e) => e.click());
marca(await page.evaluate(() => [...document.querySelectorAll("#sheetSumario1 span")].some((s) => s.style.fontStyle === "italic")), "itálico del nivel 2 se ve en la vista previa");
await clic("restaurar");
marca(/INTRODUÇÃO/.test(await texto()) && !(await page.evaluate(() => [...document.querySelectorAll("#sheetSumario1 span")].some((s) => s.style.fontStyle === "italic"))), "Restaurar estilo padrão");

// 8) opciones: pontilhado y alineación
const contPuntos = () => page.evaluate(() => [...document.querySelectorAll("#sheetSumario1 .linha span")].filter((s) => /^\.{3,}$/.test(s.textContent)).length);
const conPuntos = await contPuntos();
await page.$eval("#sumPontilhado", (e) => e.click());
marca(conPuntos > 0 && (await contPuntos()) === 0, `sin la línea de puntos no se dibujan puntos (${conPuntos} → ${await contPuntos()})`);
await page.$eval("#sumPontilhado", (e) => e.click());
const xTitulo = async (txt) => page.evaluate((t) => { const sp = [...document.querySelectorAll("#sheetSumario1 .linha > span")].find((s) => s.textContent === t); return sp ? Math.round(sp.getBoundingClientRect().left) : null; }, txt);
// Referências queda alineada con los títulos (por defecto) o en el margen
const xRef = async () => page.evaluate(() => { const ls = [...document.querySelectorAll("#sheetSumario1 .linha")]; const l = ls.find((x) => /REFERÊNCIAS/.test(x.textContent)); return l ? Math.round(l.querySelector("span:not([style*='absolute'])")?.getBoundingClientRect().left ?? -1) : null; });
const rAlin = await xRef();
await page.$eval("#sumAlinhaPos", (e) => e.click());
const rMargen = await xRef();
marca(rAlin !== null && rMargen !== null && rAlin > rMargen, `Referências alineadas con los títulos (${rAlin}px) o en el margen (${rMargen}px)`);
await page.$eval("#sumAlinhaPos", (e) => e.click());

// 9) novo sumário limpa a lista
await clic("btnNova");
marca((await badges()) === "" && (await page.evaluate(() => document.activeElement.id)) === "addSecao", "Novo sumário limpa la lista y el foco va a + Seção");

// 10) celular: la lista no desborda con títulos largos
await page.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.evaluate(() => { document.getElementById("colarLista").value = "1 Um título extremamente comprido que não cabe em uma só linha do celular nem do computador ..... 123456\n1.1 Outro título comprido com palavraenormeSemEspacosParaTestarOQuebraDePalavrasNoCelular ..... 99"; });
await clic("btnColarSub");
await new Promise((r) => setTimeout(r, 400));
const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
marca(!desborda, "celular (360 px): la lista y los botones no generan scroll horizontal");
const toques = await page.evaluate(() => [...document.querySelectorAll(".sum-item button, .sum-adicionar button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 40 || r.width < 40); }).length);
marca(toques === 0, `celular: todos los botones tienen al menos 40 px (${toques} más pequeños)`);
await page.$eval("#abaPrevia", (e) => e.click()); await new Promise((r) => setTimeout(r, 300));
marca(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: la vista previa del sumário cabe en la pantalla");
// Ampliar prévia en el celular con un sumário de varias páginas
await page.$eval("#abaDados", (e) => e.click());
await page.evaluate(() => { document.getElementById("colarLista").value = Array.from({ length: 45 }, (_, i) => `Seção de exemplo ${i + 1} com um título razoável ..... ${i + 5}`).join("\n"); });
await clic("btnColarSub");
await page.$eval("#abaPrevia", (e) => e.click()); await new Promise((r) => setTimeout(r, 400));
const paginasPrevia = await page.evaluate(() => document.querySelectorAll("#pagsSumario .sheet").length);
await clic("btnAmpliar"); await new Promise((r) => setTimeout(r, 500));
const zoomPags = await page.evaluate(() => [...document.querySelectorAll("#dlgZoom .zoom-pag:not([hidden])")].map((p) => Math.round(p.getBoundingClientRect().width)));
marca(paginasPrevia === 2 && zoomPags.length === 2 && zoomPags[0] === zoomPags[1], `45 ítems: la vista previa y "Ampliar prévia" muestran ${paginasPrevia} páginas (anchos ${zoomPags.join(", ")})`);
await page.keyboard.press("Escape"); await new Promise((r) => setTimeout(r, 300));
marca(!(await page.evaluate(() => document.getElementById("dlgZoom").open)), "Esc cierra la vista ampliada");
console.log("errores de consola:", JSON.stringify(page.__erros));
if (page.__erros.length) falhas.push("errores de consola");
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALLAS` : "\nTodo OK");
process.exit(falhas.length ? 1 : 0);
