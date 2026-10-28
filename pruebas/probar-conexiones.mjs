// Etapa 8.5: conectar las herramientas. Panel "Próximo passo", indicador "Monte seu TCC passo a passo", ofertas propias en los
// espacios de anuncio, parámetro #origem en todos los enlaces nuevos y Política de Privacidade.
// Requiere el sitio en http://localhost:3000 (o BASE_URL). Los archivos se "descargan" en memoria: nada se abre ni queda en Descargas.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { lanza, abre, preenche, URL_PAGINA, BASE } from "./lib-archivos.mjs";
import { llena } from "./lib-referencias.mjs";

const cfg = JSON.parse(fs.readFileSync("../site.config.json", "utf8"));
const falhas = [];
const marca = (c, m) => { console.log(c ? "OK   " : "FALLA", m); if (!c) falhas.push(m); };
const PAGINAS = { capa: "/gerador-de-capa-abnt/", folha: "/gerador-de-folha-de-rosto-abnt/", sumario: "/gerador-de-sumario-abnt/", referencias: "/gerador-de-referencias-abnt/", inicio: "/" };
const SERVICO = "/formatacao-abnt-tcc/";
const DADOS = { institution: "Universidade Exemplo", authors: ["Ana Souza"], title: "Redes sociais e estudo", city: "Recife", year: "2026" };
const PASOS = cfg.percurso.passos.map((p) => p.id);
const norm = (t) => t.replace(/ /g, " ").replace(/\s+/g, " ").trim();

const browser = await lanza();

const estadoPanel = (p) => p.evaluate(() => {
  const el = document.getElementById("proximoPasso");
  const a = document.querySelector(".acoes").getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { visible: !el.hidden && r.height > 0, titulo: el.querySelector(".proximo-titulo").textContent, texto: el.querySelector(".proximo-texto").textContent, href: el.querySelector(".proximo-botao").getAttribute("href"), botonTxt: el.querySelector(".proximo-botao").textContent,
    debajo: r.top >= a.bottom - 1, sinTapar: r.bottom <= a.top || r.top >= a.bottom, ancho: Math.round(r.width), ov: document.documentElement.scrollWidth - innerWidth, cerrar: Math.round(el.querySelector(".proximo-fechar").getBoundingClientRect().height) };
});
async function descarga(p, tipo = "pdf") {
  const antes = await p.evaluate(() => window.__arquivos.length);
  await p.$eval(tipo === "pdf" ? "#btnPdf" : "#btnDocx", (e) => e.click());
  await p.waitForFunction((n) => window.__arquivos.length > n, { timeout: 30000 }, antes);
  await new Promise((r) => setTimeout(r, 250));
}
const feitos = (p) => p.evaluate(() => [...document.querySelectorAll(".percurso-passo.feito")].map((l) => l.dataset.passo));
const progreso = (p) => p.evaluate(() => JSON.parse(sessionStorage.getItem("es-progresso-v1") || "null"));
const ir = async (p, url) => { await p.goto(BASE + url, { waitUntil: "networkidle0" }); };

console.log("== 1) Indicador \"Monte seu TCC passo a passo\" (se arma desde site.config.json) ==");
for (const [id, url] of Object.entries(PAGINAS)) {
  const p = await abre(browser, url);
  const r = await p.evaluate(() => {
    const n = document.querySelector(".percurso"); if (!n) return null;
    const lis = [...n.querySelectorAll(".percurso-passo")];
    return { titulo: n.querySelector(".percurso-titulo").textContent, ids: lis.map((l) => l.dataset.passo), nombres: lis.map((l) => l.querySelector(".percurso-nome").textContent), hrefs: lis.map((l) => l.querySelector("a")?.getAttribute("href") || null), actual: lis.filter((l) => l.querySelector("[aria-current]")).map((l) => l.dataset.passo), feitos: lis.filter((l) => l.classList.contains("feito")).length, altos: lis.map((l) => Math.round(l.querySelector(".percurso-item").getBoundingClientRect().height)), nota: n.querySelector(".percurso-nota").textContent, ov: document.documentElement.scrollWidth - innerWidth };
  });
  const esperados = [...PASOS, cfg.percurso.final.id];
  marca(!!r && r.titulo === cfg.percurso.titulo && r.ids.join() === esperados.join() && r.nombres.join("|") === [...cfg.percurso.passos, cfg.percurso.final].map((x) => x.nome).join("|"), `${id}: el indicador muestra ${r?.ids.join(" → ")} en el orden y con los nombres de la configuración`);
  const origenOk = (r?.hrefs || []).every((h, i) => (r.ids[i] === id ? h === null : h === `${[...cfg.percurso.passos, cfg.percurso.final][i].url}#origem=${id}-percurso`));
  marca(!!r && origenOk, `${id}: los enlaces del indicador llevan #origem=${id}-percurso y la página actual no es enlace (${r?.actual.join() || "ninguna"} marcada como "Você está aqui")`);
  marca(!!r && r.feitos === 0 && r.altos.every((h) => h >= 44) && r.ov <= 0 && /só no seu navegador/.test(r.nota), `${id}: sin pasos marcados al empezar, botones de ≥ 44 px, sin scroll horizontal y con la aclaración de que queda solo en el navegador`);
  await p.close();
}
{
  const p = await abre(browser, SERVICO);
  marca(!(await p.$(".percurso")) && !(await p.$("#proximoPasso")), "la página del servicio no muestra el indicador ni el panel (no hace falta)");
  await p.close();
}

console.log("\n== 1b) Paso 4 \"Formatação do trabalho inteiro\": estilo tranquilo y etiqueta \"Opcional\" ==");
for (const [vpNombre, vp] of [["computador 1280", { width: 1280, height: 900 }], ["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["celular 320", { width: 320, height: 700, isMobile: true, hasTouch: true }]]) {
  for (const [id, url] of Object.entries(PAGINAS)) {
    const q = await abre(browser, url, vp);
    const r = await q.evaluate(() => {
      const li = document.querySelector(".percurso-final"); const it = li.querySelector(".percurso-item"); const cs = getComputedStyle(it);
      const otro = getComputedStyle(document.querySelector(".percurso-passo:not(.percurso-final) .percurso-item"));
      const et = li.querySelector(".percurso-etiqueta"); const nome = li.querySelector(".percurso-nome").getBoundingClientRect(); const e = et.getBoundingClientRect(); const ib = it.getBoundingClientRect();
      return { estilo: cs.borderTopStyle, ancho: cs.borderTopWidth, color: cs.borderTopColor, otroColor: otro.borderTopColor, etiqueta: et.textContent, sr: li.querySelector(".sr-only").textContent, dentro: e.left >= ib.left && e.right <= ib.right && nome.left >= ib.left && nome.right <= ib.right, alto: Math.round(ib.height), etAlto: Math.round(e.height), etFuente: parseFloat(getComputedStyle(et).fontSize), ov: document.documentElement.scrollWidth - innerWidth, rojoPunteado: [...document.querySelectorAll(".percurso-item")].some((x) => getComputedStyle(x).borderTopStyle === "dashed") };
    });
    const principal = "rgb(59, 93, 76)";
    marca(r.estilo === "solid" && !r.rojoPunteado && r.color === principal && r.color !== r.otroColor, `${vpNombre} ${id}: el paso 4 tiene borde continuo del color del sitio (${r.ancho} ${r.estilo} ${r.color}), sin pontilhado ni rojo`);
    marca(r.etiqueta === cfg.percurso.final.etiqueta && /pago, não é obrigatório/.test(r.sr), `${vpNombre} ${id}: lleva la etiqueta "${r.etiqueta}" (del site.config.json) y el lector de pantalla oye "serviço pago, não é obrigatório"`);
    marca(r.dentro && r.alto >= 44 && r.etFuente >= 11 && r.ov <= 0, `${vpNombre} ${id}: nombre y etiqueta caben dentro del botón (${r.alto}px de alto, etiqueta de ${r.etFuente}px), sin scroll horizontal`);
    await q.close();
  }
}

console.log("\n== 2) Panel \"Próximo passo\" después de descargar (PDF y Word), en una sola pestaña ==");
const p = await abre(browser, PAGINAS.capa);
{
  let e = await p.evaluate(() => document.getElementById("proximoPasso").hidden);
  marca(e, "antes de descargar el panel no se ve (no ocupa lugar)");
  await preenche(p, DADOS);
  await descarga(p, "pdf");
  const s = await estadoPanel(p);
  marca(s.visible && /Folha de rosto/.test(s.titulo) && /Seus dados já estão preenchidos/.test(s.texto), `capa → sugiere la folha de rosto: "${s.titulo}" / "${s.texto}"`);
  marca(s.href === "/gerador-de-folha-de-rosto-abnt/#origem=capa-proximo" && s.botonTxt === "Abrir a folha de rosto", `el botón lleva ${s.href}`);
  marca(s.debajo && s.sinTapar && s.ov <= 0, "el panel queda debajo de los botones de descarga (en la página, sin ventana emergente) y no los tapa");
  marca(s.cerrar >= 44, `el botón de cerrar mide ${s.cerrar}px de alto (fácil de tocar)`);
  marca(JSON.stringify(await progreso(p)) && (await progreso(p)).baixados.capa === 1, "se guardó en la pestaña que la capa se descargó: " + JSON.stringify(await progreso(p)));
  marca(JSON.stringify(await feitos(p)) === '["capa"]', "el indicador de esta misma página marca la capa como hecha (✓)");
  const marcaTxt = await p.evaluate(() => ({ num: document.querySelector('[data-passo="capa"] .percurso-num').textContent, sr: document.querySelector('[data-passo="capa"] .percurso-estado').textContent }));
  marca(marcaTxt.num === "✓" && /já baixado/.test(marcaTxt.sr), `el círculo pasa a "${marcaTxt.num}" y el lector de pantalla oye "${marcaTxt.sr.trim()}"`);
  // cerrar
  await p.$eval(".proximo-fechar", (b) => b.click());
  const cerrado = await p.evaluate(() => ({ oculto: document.getElementById("proximoPasso").hidden, foco: document.activeElement && document.activeElement.id }));
  marca(cerrado.oculto && cerrado.foco === "btnPdf", `al cerrar, el panel desaparece y el foco vuelve al botón de descarga (${cerrado.foco})`);
  await descarga(p, "docx");
  marca(await p.evaluate(() => document.getElementById("proximoPasso").hidden), "lo que el estudiante cerró no vuelve a aparecer en la misma pestaña (tampoco con el Word)");
  marca((await progreso(p)).dispensados["capa>folha"] === 1, "se recuerda solo la clave del aviso cerrado: " + JSON.stringify((await progreso(p)).dispensados));
  const guardado = await p.evaluate(() => sessionStorage.getItem("es-progresso-v1"));
  marca(!/Ana|Recife|Universidade|\.pdf|\.docx|Redes/.test(guardado), "el progreso no guarda nada de lo escrito ni el nombre del archivo: " + guardado);

  // ir a la portada: aparece marcada la capa
  await ir(p, "/");
  marca(JSON.stringify(await feitos(p)) === '["capa"]', "en la portada (misma pestaña) la capa sale marcada y los otros pasos son enlaces");

  // folha → sumário, con el Word
  await ir(p, PAGINAS.folha);
  await preenche(p, DADOS);
  await descarga(p, "docx");
  const f = await estadoPanel(p);
  marca(f.visible && /Sumário/.test(f.titulo) && f.href === "/gerador-de-sumario-abnt/#origem=folha-proximo", `folha de rosto → sugiere el sumário: "${f.titulo}" (${f.href})`);
  marca(JSON.stringify(await feitos(p)) === '["capa","folha"]', "indicador: capa y folha de rosto marcadas");

  // sumário → referências
  await ir(p, PAGINAS.sumario);
  await preenche(p, { ...DADOS, colar: "1 Introdução ..... 7\n2 Conclusão ..... 20" });
  await descarga(p, "pdf");
  const sr = await estadoPanel(p);
  marca(sr.visible && /Escolha o tipo de fonte/.test(sr.texto) && sr.href === "/gerador-de-referencias-abnt/#origem=sumario-proximo" && sr.botonTxt === "Abrir as referências", `sumário → sugiere las referências: "${sr.texto}" (${sr.href})`);
  const su = sr;
  marca(su.debajo && su.sinTapar, "en el sumário el panel no tapa los botones de descarga ni la lista");
  const lista = await p.evaluate(() => { const l = document.getElementById("listaSumario").getBoundingClientRect(), pn = document.getElementById("proximoPasso").getBoundingClientRect(); return { sinSolape: pn.top >= l.bottom }; });
  marca(lista.sinSolape, "el panel del sumário queda por debajo de la lista de ítems (no se mezcla con sus botones)");
  marca(JSON.stringify(await feitos(p)) === '["capa","folha","sumario"]', "indicador: las tres partes marcadas");
  // referências → servicio (una referencia agregada a la lista y el PDF)
  await ir(p, PAGINAS.referencias);
  await llena(p, { tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Silva", nome: "Ana" }] }, titulo: "Exemplo", local: "Recife", editora: "Editora X", pub: { ano: "2020" } });
  await p.$eval("#btnAdicionar", (e) => e.click());
  await descarga(p, "pdf");
  const rf = await estadoPanel(p);
  marca(rf.visible && /Prefere que eu formate o trabalho inteiro\?/.test(rf.texto) && rf.href === "/formatacao-abnt-tcc/#origem=referencias-proximo" && rf.botonTxt === "Conhecer o serviço", `referências → sugiere el servicio: "${rf.texto}" (${rf.href})`);
  marca(JSON.stringify(await feitos(p)) === '["capa","folha","sumario","referencias"]', "indicador: las cuatro partes marcadas");
  // el servicio recibe el origen y cambia el mensaje de WhatsApp
  await ir(p, rf.href);
  const wa = await p.evaluate(() => [...document.querySelectorAll("a[data-whatsapp]")].map((a) => decodeURIComponent(a.getAttribute("href"))));
  marca(wa.length >= 3 && wa.every((h) => h.includes("(gerador de referências · próximo passo)")), "al llegar desde ese panel, los botones de WhatsApp dicen \"(gerador de referências · próximo passo)\"");
}

console.log("\n== 3) Qué se sugiere según lo que ya se descargó ==");
async function sugiere(baixados, pagina) {
  const q = await abre(browser, pagina);
  await q.evaluate((b) => sessionStorage.setItem("es-progresso-v1", JSON.stringify({ baixados: Object.fromEntries(b.map((x) => [x, 1])), dispensados: {} })), baixados);
  await q.goto(BASE + pagina, { waitUntil: "networkidle0" });
  if (pagina !== PAGINAS.referencias) await preenche(q, DADOS);
  if (pagina === PAGINAS.sumario) await preenche(q, { colar: "1 Introdução ..... 7" });
  if (pagina === PAGINAS.referencias) { await llena(q, { tipo: "livro", autoria: { modo: "pessoa", pessoas: [{ sobrenome: "Silva", nome: "Ana" }] }, titulo: "Exemplo", local: "Recife", editora: "Editora X", pub: { ano: "2020" } }); await q.$eval("#btnAdicionar", (e) => e.click()); }
  await descarga(q, "pdf");
  const s = await estadoPanel(q);
  await q.close();
  return s;
}
for (const [baixados, pagina, espera, etiqueta] of [
  [[], PAGINAS.capa, "/gerador-de-folha-de-rosto-abnt/", "capa (nada más descargado) → folha"],
  [["folha"], PAGINAS.capa, "/gerador-de-sumario-abnt/", "capa, con la folha ya descargada → salta a sumário"],
  [["folha", "sumario"], PAGINAS.capa, "/gerador-de-referencias-abnt/", "capa, con folha y sumário ya hechos → referências"],
  [["sumario"], PAGINAS.folha, "/gerador-de-referencias-abnt/", "folha, con el sumário ya hecho → referências"],
  [[], PAGINAS.sumario, "/gerador-de-referencias-abnt/", "sumário (aunque falten las otras) → referências"],
  [["folha", "sumario", "referencias"], PAGINAS.capa, "/formatacao-abnt-tcc/", "capa, con folha, sumário y referências ya hechos → servicio"],
  [[], PAGINAS.referencias, "/formatacao-abnt-tcc/", "referências (aunque falten las otras) → servicio"],
]) {
  const s = await sugiere(baixados, pagina);
  marca(s.visible && s.href.startsWith(espera + "#origem="), `${etiqueta}: ${s.href}`);
}
{ // archivo con varias piezas: marca todas las que iban dentro
  const q = await abre(browser, PAGINAS.sumario);
  await preenche(q, { ...DADOS, colar: "1 Introdução ..... 7", juntas: true });
  await descarga(q, "pdf");
  const pr = await progreso(q);
  marca(pr && pr.baixados.capa && pr.baixados.folha && pr.baixados.sumario, "un archivo con capa + folha + sumário juntos marca las tres partes: " + JSON.stringify(pr?.baixados));
  const s = await estadoPanel(q);
  marca(s.visible && /Escolha o tipo de fonte/.test(s.texto), "y entonces sugiere las referências");
  // Limpar dados borra también el progreso
  await q.$eval("#btnLimpar", (e) => e.click());
  await Promise.all([q.waitForNavigation({ waitUntil: "networkidle0" }), q.$eval("#btnLimpar", (e) => e.click())]);
  marca((await progreso(q)) === null && (await feitos(q)).length === 0, "\"Limpar dados\" también borra el progreso (la pestaña queda sin pasos marcados)");
  await q.close();
}
{ // sessionStorage bloqueado: nada falla
  const q = await browser.newPage();
  await q.evaluateOnNewDocument(() => { Object.defineProperty(window, "sessionStorage", { get() { throw new Error("bloqueado"); } }); const c = HTMLAnchorElement.prototype.click; window.__arquivos = []; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__arquivos.push(this.download); return; } return c.call(this); }; });
  const errores = []; q.on("pageerror", (e) => errores.push(e.message)); q.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  await q.setViewport({ width: 1280, height: 900 });
  await q.goto(BASE + PAGINAS.capa, { waitUntil: "networkidle0" });
  await preenche(q, DADOS).catch(() => {});
  await descarga(q, "pdf");
  const s = await estadoPanel(q);
  marca(errores.length === 0 && s.visible, "con el almacenamiento del navegador bloqueado todo sigue funcionando y el panel aparece igual (errores: " + errores.length + ")");
  await q.close();
}

console.log("\n== 4) Ofertas propias en los espacios de anuncio ==");
const slotsOferta = Object.entries(cfg.anuncios.espacos).filter(([, v]) => v.startsWith("oferta:") && cfg.anuncios.ofertas[v.slice(7)].ativa).map(([k]) => k);
marca(slotsOferta.length > 0 && slotsOferta.every((s) => /-(meio-1|meio-2|lateral|entre-secoes)$/.test(s)), `la configuración asigna ofertas a: ${slotsOferta.join(", ")} (nunca junto a la herramienta)`);
{
  const porPagina = {}; for (const s of slotsOferta) porPagina[s.split("-")[0]] = (porPagina[s.split("-")[0]] || 0) + 1;
  marca(Object.values(porPagina).every((n) => n <= 1), "como máximo una oferta propia por página");
}
for (const [id, url] of Object.entries(PAGINAS)) {
  for (const [nombre, vp] of [["computador 1280", { width: 1280, height: 900 }], ["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const q = await abre(browser, url, vp);
    const r = await q.evaluate(() => {
      const bb = (e) => { const x = e.getBoundingClientRect(); return { top: x.top + scrollY, bottom: x.bottom + scrollY }; };
      const of = [...document.querySelectorAll(".oferta[data-oferta]")];
      const a = document.querySelector(".acoes"), l = document.getElementById("listaSumario"), ab = document.querySelector(".aviso-norma");
      const o = of[0];
      return { n: of.length, slots: of.map((x) => x.dataset.slot), anuncios: [...document.querySelectorAll(".anuncio")].map((x) => x.dataset.slot), href: o && o.querySelector("a").getAttribute("href"), selo: o && o.querySelector(".oferta-selo").textContent, titulo: o && o.querySelector(".oferta-titulo").textContent, texto: o && o.querySelector(".oferta-texto").textContent, claseAd: o && /anuncio/.test(o.className), bg: o && getComputedStyle(o).backgroundImage !== "none", top: o && bb(o).top, acoes: a && bb(a).bottom, lista: l && bb(l).bottom, aviso: ab && bb(ab).bottom, ov: document.documentElement.scrollWidth - innerWidth, botH: o && Math.round(o.querySelector("a").getBoundingClientRect().height) };
    });
    const esperado = slotsOferta.filter((s) => s.startsWith(id + "-"));
    if (!esperado.length) {
      marca(r.n === 0 && r.anuncios.length >= 1, `${id} ${nombre}: sin oferta propia (el espacio queda libre para el AdSense: ${r.anuncios.join(", ")})`);
    } else {
      marca(r.n === 1 && r.slots[0] === esperado[0] && !r.anuncios.includes(esperado[0]), `${id} ${nombre}: una sola oferta propia, en el espacio ${r.slots[0]} (ya no es un espacio de anuncio vacío)`);
      marca(r.href === `${cfg.anuncios.ofertas.formatacao.url}#origem=${id}-oferta` && r.selo === cfg.anuncios.ofertas.formatacao.selo && !r.claseAd && r.bg, `${id} ${nombre}: enlace ${r.href}, sello "${r.selo}", con el estilo del sitio (no la clase de anuncio)`);
      marca(r.texto.includes("R$") && r.botH >= 44 && r.ov <= 0, `${id} ${nombre}: texto "${r.titulo}" con el precio de la configuración, botón de ${r.botH}px, sin scroll horizontal`);
      marca(r.top > (r.aviso || 0) + 150 && r.top > (r.acoes || 0) + 300 && (!r.lista || r.top > r.lista + 300), `${id} ${nombre}: lejos de los botones de descarga (${Math.round(r.top - r.acoes)}px) y de la lista del sumário`);
      marca(r.anuncios.length === Object.keys(cfg.anuncios.espacos).filter((s) => s.startsWith(id + "-")).length - 1, `${id} ${nombre}: los demás espacios (${r.anuncios.join(", ")}) siguen libres para el AdSense`);
    }
    await q.close();
  }
}

console.log("\n== 5) La configuración manda (se arman versiones de prueba del sitio) ==");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-prueba-"));
function construye(cambia, nombre) {
  const c = JSON.parse(JSON.stringify(cfg)); cambia(c);
  const archivo = path.join(tmp, nombre + ".json"); fs.writeFileSync(archivo, JSON.stringify(c));
  const salida = path.join(tmp, nombre);
  try {
    execFileSync(process.execPath, ["build.mjs"], { cwd: path.resolve(".."), env: { ...process.env, SITE_CONFIG: archivo, BUILD_OUT: salida }, stdio: "pipe" });
    return { ok: true, salida, html: (ruta) => fs.readFileSync(path.join(salida, ruta, "index.html"), "utf8") };
  } catch (e) { return { ok: false, error: String(e.stderr || e.message) }; }
}
{
  const v = construye((c) => { c.anuncios.ofertas.formatacao.ativa = false; }, "oferta-apagada");
  marca(v.ok && !/class="oferta"/.test(v.html("gerador-de-capa-abnt")) && /data-slot="capa-meio-1"/.test(v.html("gerador-de-capa-abnt")) && /class="anuncio[^"]*" data-slot="capa-meio-1"/.test(v.html("gerador-de-capa-abnt")), "con la oferta desactivada (ativa: false) no queda ninguna oferta y el espacio vuelve a ser un espacio libre para el AdSense");
}
{
  const v = construye((c) => { for (const k of Object.keys(c.anuncios.espacos)) c.anuncios.espacos[k] = "adsense"; }, "todo-adsense");
  marca(v.ok && ["gerador-de-capa-abnt", "gerador-de-folha-de-rosto-abnt", "gerador-de-sumario-abnt"].every((d) => !/class="oferta"/.test(v.html(d)) && (v.html(d).match(/class="anuncio/g) || []).length === 4), "con todos los espacios en \"adsense\": 4 espacios libres por herramienta y ninguna oferta");
}
{
  const v = construye((c) => { c.anuncios.espacos["capa-meio-2"] = "oferta:formatacao"; }, "dos-ofertas");
  marca(!v.ok && /duas ofertas/.test(v.error), "dos ofertas en una misma página: el build se detiene y lo explica (\"...duas ofertas próprias... o máximo é uma por página\")");
}
{
  const v = construye((c) => { c.anuncios.espacos["capa-abaixo-da-ferramenta"] = "oferta:formatacao"; c.anuncios.espacos["capa-meio-1"] = "adsense"; }, "oferta-cerca");
  marca(!v.ok && /perto da ferramenta/.test(v.error), "una oferta pegada a la herramienta: el build se detiene (\"...fica perto da ferramenta...\")");
}
{
  const v = construye((c) => { c.percurso.passos.push({ id: "apendices", nome: "Apêndices", url: "/guias/apendice-e-anexo-abnt/", convite: "Monte os apêndices.", botao: "Abrir os apêndices" }); }, "paso-nuevo");
  const h = v.ok ? v.html("gerador-de-capa-abnt") : "";
  const dados = v.ok ? JSON.parse(/id="percurso-dados">([^<]+)</.exec(h)[1]) : null;
  marca(v.ok && (h.match(/class="percurso-passo/g) || []).length === 6 && /Apêndices/.test(h) && dados.passos.length === 5 && dados.passos[4].id === "apendices", "agregar un paso nuevo SOLO en site.config.json (apêndices) lo muestra en el indicador y en los datos del panel, sin tocar código");
}
{
  const v = construye((c) => { c.servico.origens.componentes.kit = "kit TCC"; }, "componente-nuevo");
  const h = v.ok ? v.html("formatacao-abnt-tcc") : "";
  marca(v.ok && /capa-kit/.test(h) && /sumario-kit/.test(h), "un componente de medición nuevo en la configuración genera sus mensajes de WhatsApp (capa-kit, sumario-kit...) sin tocar código");
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log("\n== 6) Medición: parámetro #origem en todos los enlaces nuevos y mensajes de WhatsApp ==");
{
  const q = await abre(browser, SERVICO);
  const claves = await q.evaluate(() => Object.keys(JSON.parse(document.getElementById("whatsapp-origens").textContent)));
  const combos = ["inicio", "capa", "folha", "sumario", "referencias"].flatMap((pg) => ["proximo", "percurso", "oferta"].map((c) => `${pg}-${c}`));
  marca(combos.every((k) => claves.includes(k)) && ["servico", "inicio", "capa", "folha", "sumario", "referencias"].every((k) => claves.includes(k)), `el servicio conoce los ${claves.length} orígenes (páginas × componentes): ${combos.length} nuevos + los 5 de antes`);
  await q.close();
  for (const [id] of Object.entries(PAGINAS)) {
    for (const comp of ["percurso", "oferta"]) {
      const z = await abre(browser, SERVICO + `#origem=${id}-${comp}`);
      const txt = await z.evaluate(() => decodeURIComponent(document.querySelector("a[data-whatsapp]").getAttribute("href")));
      marca(txt.includes(`(${cfg.servico.origens.paginas[id]} · ${cfg.servico.origens.componentes[comp]})`), `#origem=${id}-${comp} → WhatsApp: "...(${cfg.servico.origens.paginas[id]} · ${cfg.servico.origens.componentes[comp]})..."`);
      await z.close();
    }
  }
  // todos los enlaces nuevos de cada página llevan ?origem
  for (const [id, url] of Object.entries(PAGINAS)) {
    const z = await abre(browser, url);
    const links = await z.evaluate(() => [...document.querySelectorAll(".percurso a, .oferta a, .hero-aviso a, .convite-servico a")].map((a) => a.getAttribute("href")));
    marca(links.length >= 3 && links.every((h) => /[#]origem=[a-z]+(-[a-z]+)?$/.test(h)), `${id}: todos los enlaces nuevos (${links.length}) llevan #origem=... → ${[...new Set(links.map((h) => h.split("#")[1]))].join(", ")}`);
    await z.close();
  }
}

console.log("\n== 6b) Celular (390 y 320 px): indicador y panel ==");
for (const w of [390, 320]) {
  const vp = { width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  for (const [id, url] of Object.entries(PAGINAS)) {
    const q = await abre(browser, url, vp);
    const r = await q.evaluate(() => { const n = document.querySelector(".percurso"); const nb = n.getBoundingClientRect(); return { ov: document.documentElement.scrollWidth - innerWidth, dentro: nb.left >= 0 && nb.right <= innerWidth, altos: [...n.querySelectorAll(".percurso-item")].map((i) => Math.round(i.getBoundingClientRect().height)), filas: new Set([...n.querySelectorAll(".percurso-passo")].map((l) => Math.round(l.getBoundingClientRect().top))).size, alto: Math.round(nb.height) }; });
    marca(r.ov <= 0 && r.dentro && r.altos.every((h) => h >= 44), `${w}px ${id}: el indicador cabe (${r.filas} filas, ${r.alto}px de alto), sin scroll horizontal y con botones de ≥ 44 px`);
    await q.close();
  }
  const q = await abre(browser, PAGINAS.capa, vp);
  await preenche(q, DADOS);
  await descarga(q, "pdf");
  const s = await estadoPanel(q);
  marca(s.visible && s.debajo && s.sinTapar && s.ov <= 0 && s.cerrar >= 44, `${w}px capa: el panel "Próximo passo" aparece debajo de los botones, sin tapar nada ni crear scroll horizontal (cerrar: ${s.cerrar}px)`);
  await q.close();
}

console.log("\n== 7) Política de Privacidade ==");
{
  const z = await abre(browser, "/politica-de-privacidade/");
  const t = norm(await z.evaluate(() => document.querySelector("main").innerText));
  marca(/Progresso do "Monte seu TCC"/.test(t) && /só nesta aba/.test(t) && /não é cookie/.test(t) && /"Limpar dados" também apaga isso/.test(t), "la Política explica el progreso guardado solo en la pestaña (sin cookies) y que \"Limpar dados\" lo borra");
  marca(/ofertas do próprio site/.test(t) && /Serviço do Estuda Simples/.test(t), "la Política dice que algunos espacios muestran ofertas del propio sitio (no anuncios de terceros)");
  await z.close();
}

await p.close();
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALLAS` : "\nTodo OK");
process.exit(falhas.length ? 1 : 0);
