// Prueba del gerador de referências ABNT en el navegador (Etapa 14). Necesita el sitio en http://localhost:3000.
//  A) los 38 ejemplos de manuales escritos en el FORMULARIO real dan la misma referencia que el motor (texto y negrita) y la citación
//  B) la lista: orden alfabético, letras a/b, editar, remover, copiar con negrita, guardar en la pestaña, compartir la fuente, "Limpar dados"
//  C) el diseño: sin scroll horizontal a 320/390/1280, sin errores de consola, anuncios apagados sin huecos
//  D) los archivos: PDF y Word de 4 referencias y de una lista larga (varias páginas) contra la vista previa, incluido el Word REAL oculto
//     (SEM_WORD=1 lo salta). Los archivos van a ejemplos/_pruebas/referencias/ y no se abren.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { lanza, abre, linhasPrevia, palavrasPrevia, lePdf, palavrasDoPdf, leDocx, wordParaPdf, compara, difPalavras, baixaArquivo, BASE, fs, pdfjs } from "./lib-archivos.mjs";
import { llena, leResultado, leLista } from "./lib-referencias.mjs";
import { CASOS } from "./ejemplos-referencias.mjs";
import { formataReferencia, montaLista } from "../src/assets/js/abnt/referencias-modelo.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
const OUT = path.resolve(AQUI, "../ejemplos/_pruebas/referencias").split("\\").join("/");
const USAR_WORD = !process.env.SEM_WORD;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const URL = "/gerador-de-referencias-abnt/";

let falhas = 0;
const marca = (ok, msg) => { console.log(`${ok ? "OK   " : "FALHA"} ${msg}`); if (!ok) falhas++; };
const esp = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await lanza();
await browser.defaultBrowserContext().overridePermissions(BASE, ["clipboard-read", "clipboard-write"]).catch(() => {});

/* ---------- A) ejemplos de manuales en el formulario ---------- */
console.log("== A) Los ejemplos de manuales escritos en el formulario real");
{
  const page = await abre(browser, URL);
  let malos = 0;
  for (const c of CASOS) {
    await llena(page, c.dados);
    const r = await leResultado(page);
    const motor = formataReferencia(c.dados);
    const ok = r.visivel && r.texto === c.esperado && r.podeAdicionar && r.par === motor.citacao.par && r.nar === motor.citacao.nar;
    const negro = c.negrito ? JSON.stringify(r.negrito) === JSON.stringify(c.negrito) : true;
    if (!ok || !negro) { malos++; marca(false, `${c.tipo} · ${c.fonte}`); console.log(`      esperado: ${c.esperado}\n      pantalla: ${r.texto}\n      negrito: ${JSON.stringify(r.negrito)} falta: ${r.falta}`); }
  }
  marca(malos === 0, `los ${CASOS.length} ejemplos dan, en la pantalla, la misma referencia, negrita y citación que el motor (${malos} diferencias)`);
  marca(page.__erros.length === 0, `sin errores de consola (${page.__erros.join(" | ")})`);
  // el tipo vacío pide lo que falta, no deja agregar y no inventa nada
  await page.evaluate(() => { const s = document.getElementById("tipo"); s.value = "livro"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await llena(page, { tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Silva", nome: "Ana" }] }, titulo: "", pub: { ano: "" } });
  const vacio = await leResultado(page);
  marca(!vacio.podeAdicionar && /título/.test(vacio.falta) && /ano/.test(vacio.falta), `formulario incompleto: no deja agregar y dice qué falta (${vacio.falta})`);
  await page.close();
}

/* ---------- B) la lista ---------- */
console.log("\n== B) La lista acumulada");
const caso = (inicio) => CASOS.find((c) => c.esperado.startsWith(inicio)).dados;
const CUATRO = [caso("PAES"), caso("MARTELETO"), caso("OLIVEIRA, Aloídes"), caso("BRASIL. Lei nº 14.681")];
{
  const page = await abre(browser, URL);
  for (const d of CUATRO) { await llena(page, d); await page.$eval("#btnAdicionar", (e) => e.click()); await esp(80); }
  let lista = await leLista(page);
  const esperadoOrden = montaLista(CUATRO.map((dados, id) => ({ id, dados }))).map((x) => x.ref.texto);
  marca(lista.length === 4 && JSON.stringify(lista.map((x) => x.texto)) === JSON.stringify(esperadoOrden), `4 referencias de tipos distintos, en orden alfabético (${lista.map((x) => x.texto.split(".")[0]).join(" | ")})`);
  marca(await page.$eval("#contaLista", (e) => e.textContent) === "(4)", "el contador de la lista dice (4)");
  marca(lista.every((x) => /^No texto: \(.+\) ou .+/.test(x.cita)), "cada referencia de la lista muestra su citación");
  marca(await page.$eval("#btnCopiarLista", (e) => !e.hidden), "aparece \"Copiar a lista toda\" con 2 o más");
  // después de agregar, el formulario queda vacío y listo para la siguiente
  const tras = await leResultado(page);
  marca(!tras.visivel && !tras.podeAdicionar, "tras agregar, el formulario queda vacío");

  // copiar con negrita (lo que Word y Google Docs reciben)
  await page.$eval(".ref-item:nth-child(2) [data-acao='copiar']", (e) => e.click()); // o artigo de Marteleto, que tem negrito (a lei não tem)
  await esp(250);
  const clip = await page.evaluate(async () => { try { const its = await navigator.clipboard.read(); const out = {}; for (const it of its) for (const t of it.types) out[t] = await (await it.getType(t)).text(); return out; } catch (e) { return { error: String(e) }; } });
  marca(!clip.error && /<(b|strong)\b|font-weight:\s*(700|bold)/.test(clip["text/html"] || "") && /^MARTELETO/.test(clip["text/plain"] || "") && !/250, 248, 243/.test(clip["text/html"] || ""), `"Copiar" deja HTML con negrita (sin el fondo crema del sitio) y texto plano en el portapapeles ${clip.error ? "(" + clip.error + ")" : "[" + Object.keys(clip).join(",") + "] " + (clip["text/plain"] || "").slice(0, 30)}`);

  // editar: carga el formulario, cambia el título, guarda
  await page.$eval(".ref-item:nth-child(2) [data-acao='editar']", (e) => e.click());
  await esp(100);
  const ed = await page.evaluate(() => ({ tipo: document.getElementById("tipo").value, titulo: document.getElementById("artigo__titulo") ? document.getElementById("artigo__titulo").value : "", boton: document.getElementById("btnAdicionar").textContent, cancelar: !document.getElementById("btnCancelarEdicao").hidden }));
  marca(ed.tipo === "artigo" && /redes sociais/.test(ed.titulo) && ed.boton === "Salvar alterações" && ed.cancelar, `"Editar" abre el artigo en el formulario con "Salvar alterações" (${ed.tipo}, ${ed.boton})`);
  await page.$eval("#artigo__titulo", (e) => { e.value = "Análise de redes e grafos"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.$eval("#btnAdicionar", (e) => e.click());
  await esp(100);
  lista = await leLista(page);
  marca(lista.length === 4 && lista.some((x) => /Análise de redes e grafos/.test(x.texto)) && !lista.some((x) => /redes sociais: aplicação/.test(x.texto)), "tras editar, la lista sigue con 4 y la referencia cambió (no se duplicó)");

  // remover
  await page.$eval(".ref-item:nth-child(1) [data-acao='remover']", (e) => e.click());
  await esp(100);
  lista = await leLista(page);
  marca(lista.length === 3 && !/^BRASIL/.test(lista[0].texto), "\"Remover\" quita la referencia");

  // letras a / b: mismo autor y mismo año
  const mismo = (t) => ({ tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Pires", nome: "Carlos" }] }, titulo: t, local: "Recife", editora: "Editora X", pub: { ano: "2020" } });
  for (const t of ["Segundo livro", "Primeiro livro"]) { await llena(page, mismo(t)); await page.$eval("#btnAdicionar", (e) => e.click()); await esp(80); }
  lista = await leLista(page);
  const pires = lista.filter((x) => /^PIRES/.test(x.texto));
  marca(pires.length === 2 && /2020a\.$/.test(pires[0].texto) && /2020b\.$/.test(pires[1].texto) && /2020a/.test(pires[0].cita) && /2020b/.test(pires[1].cita), `mismo autor y año: 2020a y 2020b en la referencia y en la citación (${pires.map((x) => x.texto.slice(-8)).join(" | ")})`);

  // estilo de la citación antiguo
  await page.$eval("#estiloCita", (e) => { e.value = "antigo"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  lista = await leLista(page);
  marca(lista.some((x) => /\(PIRES, 2020a\)/.test(x.cita)), "el estilo antiguo muestra (PIRES, 2020a) en mayúsculas");
  await page.$eval("#estiloCita", (e) => { e.value = "novo"; e.dispatchEvent(new Event("input", { bubbles: true })); });

  // pestaña: guarda la lista, y la fuente se comparte con las otras herramientas
  const antes = (await leLista(page)).map((x) => x.texto);
  await page.$eval("#font", (e) => { e.value = "Times New Roman"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.reload({ waitUntil: "networkidle0" });
  const despues = (await leLista(page)).map((x) => x.texto);
  marca(JSON.stringify(antes) === JSON.stringify(despues), `al recargar, la lista sigue igual (${despues.length} referencias)`);
  marca(await page.$eval("#font", (e) => e.value) === "Times New Roman", "la fuente elegida queda guardada");
  await page.goto(BASE + "/gerador-de-capa-abnt/", { waitUntil: "networkidle0" });
  marca(await page.$eval("#font", (e) => e.value) === "Times New Roman", "la capa usa la misma fuente (se comparte entre herramientas)");
  await page.goto(BASE + URL, { waitUntil: "networkidle0" });
  marca((await leLista(page)).length === despues.length, "volver desde otra herramienta mantiene la lista");
  const llaves = await page.evaluate(() => ({ cookies: document.cookie, local: Object.keys(localStorage), sesion: Object.keys(sessionStorage) }));
  marca(llaves.cookies === "" && llaves.local.length === 0 && llaves.sesion.includes("es-abnt-refs-v1"), `solo sessionStorage, sin cookies ni localStorage (${llaves.sesion.join(", ")})`);

  // "Nova lista" y "Limpar dados"
  await page.$eval("#btnNova", (e) => e.click());
  await esp(100);
  marca((await leLista(page)).length === 0, "\"Nova lista\" vacía la lista");
  await llena(page, CUATRO[0]); await page.$eval("#btnAdicionar", (e) => e.click());
  await page.$eval("#btnLimpar", (e) => e.click());
  marca(await page.$eval("#btnLimpar", (e) => /de novo/.test(e.textContent)), "\"Limpar dados\" pide un segundo clic");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.$eval("#btnLimpar", (e) => e.click())]);
  const limpio = await page.evaluate(() => ({ llaves: Object.keys(sessionStorage), toast: document.getElementById("toast").textContent }));
  const guardado = await page.evaluate(() => { const g = sessionStorage.getItem("es-abnt-refs-v1"); return g ? JSON.parse(g).itens.length : 0; });
  marca(guardado === 0 && (await leLista(page)).length === 0 && /apagados/.test(limpio.toast), `"Limpar dados" borra la lista (${limpio.toast})`);
  marca(page.__erros.length === 0, `sin errores de consola (${page.__erros.join(" | ")})`);
  await page.close();
}

/* ---------- C) diseño ---------- */
console.log("\n== C) Diseño");
for (const [nombre, vp] of [["320", { width: 320, height: 800 }], ["390", { width: 390, height: 844 }], ["1280", { width: 1280, height: 900 }]]) {
  const page = await abre(browser, URL, vp);
  for (const t of ["livro", "capitulo", "artigo", "site", "noticia", "lei", "video", "tcc"]) {
    await page.evaluate((tipo) => { const s = document.getElementById("tipo"); s.value = tipo; s.dispatchEvent(new Event("change", { bubbles: true })); }, t);
    await page.evaluate(() => document.querySelectorAll(".ref-form details").forEach((d) => (d.open = true)));
    const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (w.sw > w.cw + 1) marca(false, `${nombre} px · ${t}: scroll horizontal (${w.sw} > ${w.cw})`);
    else falhas += 0;
  }
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  marca(w.sw <= w.cw + 1, `${nombre} px: sin scroll horizontal en los 8 formularios`);
  const anuncios = await page.evaluate(() => [...document.querySelectorAll(".anuncio")].filter((a) => getComputedStyle(a).display !== "none").length);
  marca(anuncios === 0, `${nombre} px: con AdSense apagado ningún espacio de anuncio ocupa lugar`);
  marca(page.__erros.length === 0, `${nombre} px: sin errores de consola (${page.__erros.join(" | ")})`);
  await page.close();
}

/* ---------- D) archivos ---------- */
console.log("\n== D) PDF y Word contra la vista previa");
const refsLargas = [];
{
  const autores = ["Almeida", "Barbosa", "Cardoso", "Domingues", "Esteves", "Ferraz", "Guedes", "Henriques", "Ibrahim", "Junqueira", "Klein", "Lacerda", "Menezes", "Nogueira", "Oliveira", "Pacheco", "Queiroz", "Ribeiro", "Siqueira", "Teixeira", "Ulhoa", "Vasconcelos", "Werneck", "Ximenes", "Yamamoto", "Zanetti", "Amaral", "Borges", "Campos", "Duarte"];
  autores.forEach((a, i) => refsLargas.push(i % 3 === 0
    ? { tipo: "site", autoria: { modo: "pessoa", pessoas: [{ sobrenome: a, nome: "Maria Clara" }] }, titulo: `Como organizar o tempo de estudo durante a preparação para o exame número ${i + 1}: um roteiro para estudantes`, local: "Recife", pub: { ano: "2025", dia: String(i + 1), mes: String((i % 12) + 1) }, nomeSite: "Portal Exemplo de Educação e Ensino", online: { link: `https://www.exemplo-educacao.com.br/estudos/organizacao-do-tempo-de-estudo/roteiro-completo-numero-${i + 1}-para-estudantes`, acesso: "2026-10-15" } }
    : i % 3 === 1
      ? { tipo: "artigo", autoria: { modo: "pessoa", pessoas: [{ sobrenome: a, nome: "João Pedro" }, { sobrenome: "Souza", nome: "Ana" }] }, titulo: `Redes sociais e aprendizagem em contextos diversos, parte ${i + 1}`, periodico: "Revista Exemplo de Educação e Tecnologia", local: "São Paulo", volume: String(i + 2), numero: "2", pagIni: String(10 + i), pagFim: String(30 + i), pub: { ano: "2021", mesIni: "7", mesFim: "12" } }
      : { tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: a, nome: "Beatriz" }], quatro: "todos" }, titulo: `Leitura e escrita no ensino superior número ${i + 1}`, subtitulo: "um guia prático para quem está começando", edicao: "2", local: "Belo Horizonte", editora: "Editora Exemplo", pub: { ano: "2019" } }));
}
const CENARIOS = [
  { id: "R1-arial-4-referencias", fonte: "Arial", refs: CUATRO },
  { id: "R2-times-30-referencias-varias-paginas", fonte: "Times New Roman", refs: refsLargas },
  { id: "R3-arial-30-referencias-varias-paginas", fonte: "Arial", refs: refsLargas },
];
for (const cen of CENARIOS) {
  console.log("» " + cen.id);
  const page = await abre(browser, URL);
  await page.$eval("#font", (e, f) => { e.value = f; e.dispatchEvent(new Event("input", { bubbles: true })); }, cen.fonte);
  for (const d of cen.refs) { await llena(page, d); await page.$eval("#btnAdicionar", (e) => e.click()); }
  await esp(400);
  const hojas = await page.evaluate(() => [...document.querySelectorAll("#pagsRef .sheet")].map((s) => s.id));
  const prev = [], spans = [];
  for (const h of hojas) { prev.push(await linhasPrevia(page, h)); spans.push(await palavrasPrevia(page, h)); }
  const esperadas = spans.flat();
  marca(esperadas.length > 0 && (cen.refs.length < 20 || hojas.length >= 2), `${cen.id}: la vista previa tiene ${hojas.length} página(s) y ${esperadas.length} palabras`);
  for (const tipo of ["pdf", "docx"]) {
    const { buf } = await baixaArquivo(page, tipo === "pdf" ? "#btnPdf" : "#btnDocx", tipo === "pdf" ? 0 : 1);
    const arquivo = `${OUT}/${cen.id}.${tipo}`; fs.writeFileSync(arquivo, buf);
    if (tipo === "pdf") {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
      marca(doc.numPages === hojas.length, `${cen.id} PDF: ${doc.numPages} página(s) (la vista previa ${hojas.length})`);
      let peor = { dVert: 0, dEsq: 0, dDir: 0, dTam: 0 }, mal = 0;
      for (const [i] of hojas.entries()) {
        const r = await lePdf(buf, i + 1, cen.fonte);
        const cmp = compara(prev[i], r.linhas);
        if (cmp.erro) { mal++; console.log(`      página ${i + 1}: ${JSON.stringify(cmp)}`); continue; }
        for (const k of Object.keys(peor)) peor[k] = Math.max(peor[k], cmp[k]);
        if (cmp.dVert > 1.5 || cmp.dEsq > 1.5 || cmp.dDir > 1.5 || cmp.dTam > 0.1) mal++;
      }
      marca(mal === 0, `${cen.id} PDF contra la vista previa: líneas, posición y tamaño iguales (peor diferencia ${JSON.stringify(peor)})`);
      const dp = difPalavras(esperadas, palavrasDoPdf(buf).flat());
      marca(dp.length === 0, `${cen.id} PDF: texto y negrita iguales palabra por palabra ${dp.slice(0, 3).join("; ")}`);
    } else {
      const d = await leDocx(buf);
      const dd = difPalavras(esperadas, d.palavras);
      marca(dd.length === 0, `${cen.id} Word: texto, negrita y tamaño iguales palabra por palabra ${dd.slice(0, 3).join("; ")}`);
      marca(d.secoes === 1 && d.recuos.length === 0 && d.jc.every((j) => ["center", "left"].includes(j)) && /w:left="1701"/.test(d.pgMar) && /w:right="1134"/.test(d.pgMar) && /w:top="1701"/.test(d.pgMar) && /w:bottom="1134"/.test(d.pgMar), `${cen.id} Word: A4, margens 3/3/2/2 cm, sem recuo, alinhado à esquerda (${d.pgMar})`);
      marca(d.linhas.includes("240/auto") && d.linhas.includes("360/auto"), `${cen.id} Word: espaço simples nas referências e 1,5 no título (${d.linhas.join(", ")})`);
      if (USAR_WORD) {
        const pdfWord = `${OUT}/${cen.id}.word.pdf`;
        const nPag = wordParaPdf(arquivo, pdfWord);
        marca(nPag === hojas.length, `${cen.id} Word real: ${nPag} página(s) (la vista previa ${hojas.length})`);
        const wbuf = fs.readFileSync(pdfWord);
        let peor = { dVert: 0, dEsq: 0, dDir: 0, dTam: 0 }, mal = 0;
        for (const [i] of hojas.entries()) {
          if (i + 1 > nPag) break;
          const r = await lePdf(wbuf, i + 1, cen.fonte);
          const cmp = compara(prev[i], r.linhas);
          if (cmp.erro) { mal++; console.log(`      Word página ${i + 1}: ${JSON.stringify(cmp)}`); continue; }
          for (const k of Object.keys(peor)) peor[k] = Math.max(peor[k], cmp[k]);
          if (cmp.dVert > 1.5 || cmp.dEsq > 1.5 || cmp.dDir > 1.5 || cmp.dTam > 0.1) mal++;
        }
        marca(mal === 0, `${cen.id} Word real contra la vista previa: mismas líneas y posiciones (peor diferencia ${JSON.stringify(peor)})`);
      }
    }
  }
  await page.close();
}

// bloqueos
{
  const page = await abre(browser, URL);
  await page.$eval("#btnPdf", (e) => e.click()); await esp(500);
  const r = { n: await page.evaluate(() => window.__arquivos.length), msg: await page.$eval("#toast", (e) => e.textContent) };
  marca(r.n === 0 && /pelo menos uma referência/.test(r.msg), `con la lista vacía no baja nada y avisa (${r.msg})`);
  await llena(page, CUATRO[0]); await page.$eval("#btnAdicionar", (e) => e.click());
  await llena(page, CUATRO[1]);
  await page.$eval("#btnPdf", (e) => e.click()); await esp(1500);
  const r2 = { n: await page.evaluate(() => window.__arquivos.length), msg: await page.$eval("#toast", (e) => e.textContent), nombre: await page.evaluate(() => (window.__arquivos[0] || {}).nome) };
  marca(r2.n === 1 && r2.nombre === "referencias-abnt.pdf" && /ainda não foi adicionada/.test(r2.msg), `baja "referencias-abnt.pdf" y avisa que la referencia del formulario no está en la lista (${r2.msg})`);
  await page.close();
}

await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTodo OK");
process.exit(falhas ? 1 : 0);
