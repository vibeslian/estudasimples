// Prueba de datos compartidos entre la capa y la folha de rosto (sessionStorage), "Limpar dados" y privacidad.
// Requiere el sitio en http://localhost:3000 (npm run dev). No descarga ni abre ningún archivo.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lanza, abre, preenche, URL_PAGINA, BASE, fs } from "./lib-archivos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
import { createCanvas } from "@napi-rs/canvas";
const LOGO = path.resolve(AQUI, "../ejemplos/_pruebas/logo-compartir.png"); // se crea aquí; no se publica
fs.mkdirSync(path.dirname(LOGO), { recursive: true });
{ const c = createCanvas(300, 300); const g = c.getContext("2d"); g.fillStyle = "#1f4e8c"; g.beginPath(); g.arc(150, 150, 130, 0, Math.PI * 2); g.fill(); fs.writeFileSync(LOGO, c.toBuffer("image/png")); }
const falhas = [];
const marca = (c, m) => { console.log(c ? "OK   " : "FALLA", m); if (!c) falhas.push(m); };

const browser = await lanza();
const page = await abre(browser, URL_PAGINA.capa);
const peticiones = [];
page.on("request", (r) => peticiones.push({ m: r.method(), u: r.url() }));

await preenche(page, {
  institution: "Universidade Federal de Viçosa", course: "Administração", authors: ["Maria Silva", "João Pereira"], title: "Redes sociais", subtitle: "um estudo", volume: "2",
  city: "Viçosa - MG", year: "2025", font: "Times New Roman", titleSize: "14", workType: "monografia", degree: "Licenciado em Pedagogia", area: "Educação",
  advisorLabel: "1", advisor: "Profa. Dra. Maria Souza", coLabel: "2", coadvisors: ["Prof. Dr. Pedro Lima"], escolar: true, discipline: "Física", teacher: "Ana Lima", teacherLabel: "2",
  juntas: true, logoArquivo: LOGO, logoTamanho: "grande", logoFolha: true, estilo: { author: [false, false] },
});
await new Promise((r) => setTimeout(r, 300));

// 1) ir a la folha de rosto en la misma pestaña
await page.goto(BASE + URL_PAGINA.folha, { waitUntil: "networkidle0" });
const est = await page.evaluate(() => {
  const v = (id) => document.getElementById(id).value, c = (id) => document.getElementById(id).checked;
  return {
    institution: v("institution"), course: v("course"), autores: [...document.querySelectorAll("#autores input")].map((i) => i.value), title: v("title"), subtitle: v("subtitle"), volume: v("volume"),
    city: v("city"), year: v("year"), font: v("font"), titleSize: v("titleSize"), workType: v("workType"), degree: v("degree"), area: v("area"), advisor: v("advisor"), advisorLabel: v("advisorLabel"),
    co: [...document.querySelectorAll("#coorientadores input")].map((i) => i.value), coLabel: v("coLabel"), escolar: c("escolar"), discipline: v("discipline"), disciplineNat: v("disciplineNat"), teacher: v("teacher"),
    incCapa: c("incCapa"), logoVisivel: !document.getElementById("logoOpcoes").hidden, logoSrc: document.getElementById("logoMini").src.slice(0, 22), logoTam: v("logoTamanho"), logoFolha: c("logoFolha"),
    estiloAutor: document.querySelector('input[aria-label="Autor(es): maiúsculas"]').checked, paginasVisiveis: [!document.getElementById("pagCapa").hidden, !document.getElementById("pagFolha").hidden],
    texto: document.getElementById("sheetFolha").textContent.slice(0, 60), natureza: v("nature").slice(0, 60),
  };
});
marca(est.institution === "Universidade Federal de Viçosa" && est.course === "Administração" && est.title === "Redes sociais" && est.subtitle === "um estudo" && est.volume === "2" && est.city === "Viçosa - MG" && est.year === "2025", "campos comunes pasan de la capa a la folha de rosto");
marca(JSON.stringify(est.autores) === JSON.stringify(["Maria Silva", "João Pereira"]), "los dos autores pasan");
marca(est.font === "Times New Roman" && est.titleSize === "14" && est.estiloAutor === false, "fuente, tamaño del título y estilo personalizado pasan");
marca(est.workType === "monografia" && est.degree === "Licenciado em Pedagogia" && est.area === "Educação" && est.advisor === "Profa. Dra. Maria Souza" && est.advisorLabel === "1" && est.coLabel === "2" && JSON.stringify(est.co) === JSON.stringify(["Prof. Dr. Pedro Lima"]), "datos de la folha (tipo, título pretendido, área, orientador y coorientador) pasan");
marca(est.escolar === true && est.discipline === "Física" && est.disciplineNat === "Física" && est.teacher === "Ana Lima", "modelo escolar y disciplina (en los dos campos) pasan");
marca(est.incCapa === false && JSON.stringify(est.paginasVisiveis) === "[false,true]", "las casillas de \"baixar junto\" son independientes: en la folha de rosto, sin marcar, solo se ve su página");
marca(est.logoVisivel && est.logoSrc.startsWith("data:image/") && est.logoTam === "grande" && est.logoFolha === true, "el logo (y su tamaño y opciones) pasan");
marca(await page.evaluate(() => document.querySelectorAll("#sheetFolha img.logo-bloco").length === 1), "el logo (marcado para la folha de rosto) aparece en su vista previa");

// 2) cambiar algo en la folha y volver a la capa
await page.evaluate(() => { const e = document.getElementById("city"); e.value = "Recife"; e.dispatchEvent(new Event("input", { bubbles: true })); });
await page.goto(BASE + URL_PAGINA.capa, { waitUntil: "networkidle0" });
marca((await page.$eval("#city", (e) => e.value)) === "Recife", "un cambio hecho en la folha de rosto vuelve a la capa");

// 2b) el sumário: la lista pasa a la capa y a la folha cuando se marca "baixar o sumário junto"
await page.goto(BASE + "/gerador-de-sumario-abnt/", { waitUntil: "networkidle0" });
const sumDatos = await page.evaluate(() => ({ title: document.getElementById("title").value, entradas: document.querySelectorAll(".sum-item").length, font: document.getElementById("font").value }));
marca(sumDatos.title === "Redes sociais" && sumDatos.font === "Times New Roman" && sumDatos.entradas === 0, "los datos comunes llegan al sumário (título y fuente) y su lista empieza vacía");
await page.evaluate(() => { const t = document.getElementById("colarLista"); t.value = ["1 Introdução ..... 7", "2 Desenvolvimento ..... 9", "2.1 Primeiro tema ..... 9", "Referências ..... 20"].join("\n"); document.getElementById("btnColarSub").click(); });
await page.goto(BASE + URL_PAGINA.folha, { waitUntil: "networkidle0" });
await page.evaluate(() => { const e = document.getElementById("incSumario"); e.checked = true; e.dispatchEvent(new Event("input", { bubbles: true })); });
const conSum = await page.evaluate(() => ({ hojas: [...document.querySelectorAll("#pagsSumario .sheet")].map((s) => s.textContent.slice(0, 90)), info: document.getElementById("incluirInfo").textContent }));
marca(conSum.hojas.length === 1 && /INTRODUÇÃO/.test(conSum.hojas[0]) && /sumário/.test(conSum.info), `la lista del sumário pasa a la folha de rosto y se baja junto (${conSum.info})`);
await page.goto(BASE + "/gerador-de-sumario-abnt/", { waitUntil: "networkidle0" });
marca((await page.evaluate(() => document.querySelectorAll(".sum-item").length)) === 4, "volver al sumário conserva los 4 ítems");
await page.goto(BASE + URL_PAGINA.capa, { waitUntil: "networkidle0" });

// 3) recargar mantiene; privacidad: nada enviado, sin cookies
await page.reload({ waitUntil: "networkidle0" });
marca((await page.$eval("#title", (e) => e.value)) === "Redes sociais", "recargar la página mantiene los datos (sessionStorage)");
const cookies = await page.cookies();
marca(cookies.length === 0, `el sitio no define cookies (${cookies.length})`);
const esCloudflare = (u) => /static\.cloudflareinsights\.com|\/cdn-cgi\/rum/.test(u); // estadísticas anónimas de Cloudflare, declaradas en la política (solo en el sitio publicado)
const nuevos = peticiones.filter((p) => /^https?:/.test(p.u) && !esCloudflare(p.u) && (p.m !== "GET" || !p.u.startsWith(BASE)));
marca(nuevos.length === 0, `ninguna petición que no sea GET al propio sitio (${nuevos.map((p) => p.m + " " + p.u).join(", ") || "ninguna"})`);
const claves = await page.evaluate(() => Object.keys(sessionStorage).concat(Object.keys(localStorage).map((k) => "LOCAL:" + k)));
marca(claves.every((k) => k.startsWith("es-abnt")) && !claves.some((k) => k.startsWith("LOCAL:")), `solo sessionStorage con claves propias (${claves.join(", ")}); nada en localStorage`);

// 4) otra pestaña empieza vacía (el almacenamiento es por pestaña)
const otra = await abre(browser, URL_PAGINA.folha);
marca((await otra.$eval("#title", (e) => e.value)) === "" && (await otra.$eval("#institution", (e) => e.value)) === "", "una pestaña nueva empieza vacía: los datos no se comparten entre pestañas");
await otra.close();

// 5) Limpar dados: pide un segundo clic y apaga todo
await page.$eval("#btnLimpar", (e) => e.click());
const intermedio = await page.$eval("#btnLimpar", (e) => e.textContent);
marca(/de novo/.test(intermedio) && (await page.$eval("#title", (e) => e.value)) === "Redes sociais", `el primer clic solo pide confirmar ("${intermedio}") y no borra nada`);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.$eval("#btnLimpar", (e) => e.click())]);
const vacio = await page.evaluate(() => ({ title: document.getElementById("title").value, inst: document.getElementById("institution").value, autores: [...document.querySelectorAll("#autores input")].map((i) => i.value), logo: !document.getElementById("logoOpcoes").hidden, escolar: document.getElementById("escolar").checked, toast: document.getElementById("toast").textContent, claves: Object.keys(sessionStorage), year: document.getElementById("year").value }));
marca(vacio.title === "" && vacio.inst === "" && JSON.stringify(vacio.autores) === '[""]' && !vacio.logo && !vacio.escolar, "después de Limpar dados el formulario, el logo y las opciones quedan como nuevos");
marca(/apagados/.test(vacio.toast) && vacio.year === String(new Date().getFullYear()), `aviso "${vacio.toast}" y el año vuelve al actual`);
marca(vacio.claves.length === 0 || vacio.claves.every((k) => k === "es-abnt-v1"), `sessionStorage queda vacío o con el estado recién creado (${vacio.claves.join(", ") || "vacío"})`);
await page.close();

// 6) con el almacenamiento bloqueado (modo privado, ajustes del navegador) la herramienta sigue funcionando
{
  const p = await browser.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  await p.evaluateOnNewDocument(() => { Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("bloqueado", "SecurityError"); } }); });
  await p.goto(BASE + URL_PAGINA.folha, { waitUntil: "networkidle0" });
  await preenche(p, { institution: "UFV", authors: ["Ana"], title: "Teste", city: "Recife", year: "2026", workType: "tcc" });
  const ok = await p.evaluate(() => document.getElementById("sheetFolha").textContent.includes("TESTE"));
  marca(ok && errores.length === 0, `con sessionStorage bloqueado la herramienta funciona sin errores (${errores.join("; ") || "sin errores"})`);
  await p.close();
}
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALLAS` : "\nTodo OK");
process.exit(falhas.length ? 1 : 0);
