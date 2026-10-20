// Etapa 15: página /anuncie/ (escondida hasta tener más de 10.000 visitas al mes) y cartón "Parceiro recomendado".
// Construye el sitio varias veces con copias de site.config.json (no toca dist/ ni el servidor :3000) y comprueba:
//   A) apagada (la configuración real): existe pero con noindex, fuera del sitemap, sin ningún enlace, sin anuncios;
//   B) encendida: sin noindex, en el sitemap, enlace "Anuncie" en el pie de TODAS las páginas, números y precios salen de la configuración;
//   C) los errores que el build debe dar (encender sin números, anuncios mal escritos);
//   D) el cartón "Parceiro recomendado": solo en las guías elegidas, siempre con "Patrocinado" y rel="sponsored";
//   E) diseño en 320, 390 y 1280 px: sin desborde horizontal, CLS 0, botones táctiles, sin recursos que fallen.
// Opcional: BASE_REF=<commit> compara las demás páginas (con la página apagada) con las de ese commit: deben ser idénticas.
// Uso: node probar-anuncie.mjs   (desde pruebas/)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { RAIZ, CONFIG_REAL, NUMEROS_EJEMPLO, PARCEIRO_EJEMPLO, construye, leer, existe, paginasHtml, sirve, limpia } from "./lib-anuncie.mjs";

let fallos = 0, total = 0;
const ok = (cond, msg, extra = "") => { total++; if (!cond) { fallos++; console.log(`  FALLA: ${msg}${extra ? " -> " + extra : ""}`); } };
const seccion = (t) => console.log(`\n== ${t}`);
const NB = "\u00a0";
const sitemapUrls = (dir) => [...leer(dir, "sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const limpiables = [];
const constr = (mod, nombre) => { const r = construye(mod, nombre); limpiables.push(r.dir); return r; };

// ---------- A) apagada: la configuración real ----------
seccion("A) página apagada (configuración real)");
ok(CONFIG_REAL.anuncie && CONFIG_REAL.anuncie.ativo === false, "en site.config.json, anuncie.ativo debe estar en false hasta pasar de 10.000 visitas");
ok(CONFIG_REAL.anuncie.parceiroRecomendado.ativo === false && CONFIG_REAL.anuncie.parceiroRecomendado.anuncios.length === 0, "el cartón Parceiro recomendado debe estar apagado y sin anuncios cargados");
const off = constr({}, "off");
ok(off.ok, "el build con la página apagada funciona", off.salida.slice(-300));
const pagOff = paginasHtml(off.dir);
const paginaOff = leer(off.dir, "anuncie/index.html");
ok(/<meta name="robots" content="noindex">/.test(paginaOff), "la página apagada tiene noindex");
ok(!sitemapUrls(off.dir).some((u) => u.includes("/anuncie")), "apagada: fuera del sitemap");
const conEnlace = pagOff.filter((p) => p !== "anuncie/index.html" && /href="\/?(https:\/\/estudasimples\.com\.br)?\/anuncie/.test(leer(off.dir, p)));
ok(conEnlace.length === 0, "apagada: ninguna página tiene enlace a /anuncie/", conEnlace.join(", "));
// ni en js, json, xml ni txt (menús, índices, etc.): solo la propia página puede nombrarse
const otrosArchivos = [];
const recorre = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { if (n !== "anuncie") recorre(p); } else if (n !== "anuncie.css" && /\.(js|json|xml|txt|css|svg|webmanifest)$/.test(n) && fs.readFileSync(p, "utf8").includes("/anuncie")) otrosArchivos.push(path.relative(off.dir, p)); } };
recorre(off.dir);
ok(otrosArchivos.length === 0, "apagada: ningún otro archivo del sitio nombra /anuncie/", otrosArchivos.join(", "));
ok(!/Anuncie<\/a>/.test(leer(off.dir, "index.html")), "apagada: el pie de la portada no tiene el enlace Anuncie");
const restantes = pagOff.filter((p) => !/\.html$/.test(p) || /\{\{[A-Za-z0-9_:-]+\}\}/.test(leer(off.dir, p)));
ok(restantes.length === 0, "ninguna página tiene marcas {{...}} sin reemplazar", restantes.join(", "));
const conAnuncio = pagOff.filter((p) => p !== "anuncie/index.html" && (/class="parceiro"/.test(leer(off.dir, p)) || /Patrocinado/.test(leer(off.dir, p))));
ok(conAnuncio.length === 0, "apagada: ninguna otra página muestra el cartón Parceiro recomendado ni el selo Patrocinado", conAnuncio.join(", "));
ok(sitemapUrls(off.dir).length === pagOff.filter((p) => p.endsWith("index.html") && !p.startsWith("anuncie/")).length, "el sitemap tiene todas las páginas menos /anuncie/");
ok(/Números ainda não preenchidos/.test(paginaOff), "apagada y sin números: la página lo dice (no inventa cifras)");
ok(!/Olá! Quero anunciar/.test(leer(off.dir, "index.html")), "la portada no menciona el WhatsApp de anunciantes");
// contenido de la página
const h1 = (paginaOff.match(/<h1[ >]/g) || []).length;
ok(h1 === 1, "un solo h1", String(h1));
ok(/<link rel="canonical" href="https:\/\/estudasimples\.com\.br\/anuncie\/">/.test(paginaOff), "tiene canonical");
for (const [id, v] of Object.entries({ basico: 200, parceiro: 500, completo: 1000 })) {
  const nivel = CONFIG_REAL.anuncie.niveis.find((n) => n.id === id);
  ok(nivel && nivel.preco === v, `precio inicial del nivel ${id} = ${v}`);
}
ok(paginaOff.includes(`R$${NB}200`) && paginaOff.includes(`R$${NB}500`) && paginaOff.includes(`R$${NB}1.000`), "la página muestra R$ 200, R$ 500 y R$ 1.000");
const wa = /href="(https:\/\/wa\.me\/(\d+)\?text=([^"]+))"/.exec(paginaOff);
ok(wa && decodeURIComponent(wa[3]) === "Olá! Quero anunciar no Estuda Simples.", "el botón de WhatsApp lleva el mensaje pedido", wa && decodeURIComponent(wa[3]));
ok(wa && wa[2] === CONFIG_REAL.servico.whatsapp, "el WhatsApp usa el número del sitio");
ok(paginaOff.includes(`mailto:${CONFIG_REAL.contactEmail}`), "tiene el e-mail contato@estudasimples.com.br");
for (const t of ["TCC pronto", "encomenda", "Apostas", "enganoso", "Patrocinado", "ENEM", "idiomas", "plágio", "acheiunsite", "Parceiro recomendado", "Banner"]) ok(paginaOff.includes(t), `la página dice "${t}"`);

// ---------- B) encendida ----------
seccion("B) página encendida (números de ejemplo)");
const on = constr({ anuncie: { ativo: true, numeros: NUMEROS_EJEMPLO, niveis: CONFIG_REAL.anuncie.niveis.map((n) => (n.id === "basico" ? { ...n, preco: 250 } : n)) } }, "on");
ok(on.ok, "el build con la página encendida funciona", on.salida.slice(-300));
const paginaOn = leer(on.dir, "anuncie/index.html");
ok(!/name="robots"/.test(paginaOn), "encendida: sin noindex");
ok(sitemapUrls(on.dir).includes("https://estudasimples.com.br/anuncie/"), "encendida: entra al sitemap");
ok(sitemapUrls(on.dir).length === sitemapUrls(off.dir).length + 1, "el sitemap crece en exactamente 1 URL");
const pagOn = paginasHtml(on.dir);
const conPie = pagOn.filter((p) => leer(on.dir, p).includes('class="site-footer"'));
const sinEnlace = conPie.filter((p) => !leer(on.dir, p).includes('<a href="/anuncie/">Anuncie</a>'));
ok(conPie.length > 30 && sinEnlace.length === 0, "encendida: el pie de TODAS las páginas tiene el enlace Anuncie", sinEnlace.join(", "));
ok(paginaOn.includes("12.500") && paginaOn.includes("31.200") && paginaOn.includes("78%"), "los números salen de site.config.json (12.500 · 31.200 · 78%)");
ok(paginaOn.includes("Dados de setembro de 2026"), "muestra el mes de los datos");
ok(paginaOn.includes(`R$${NB}250`) && !paginaOn.includes(`R$${NB}200 `), "los precios salen de site.config.json (cambiar el nivel básico a 250 se nota)");
ok(/a partir de R\$\u00a0250|A partir de R\$\u00a0250/.test(paginaOn), "el 'a partir de' sigue al precio más bajo");

// ---------- C) errores del build ----------
seccion("C) errores que el build debe dar");
const falla = (mod, quiere, msg) => { const r = construye(mod, "err"); limpiables.push(r.dir); ok(!r.ok && quiere.test(r.salida), msg, r.ok ? "el build NO falló" : r.salida.split("\n").find((l) => /Error/.test(l))); };
falla({ anuncie: { ativo: true } }, /números reais.*Faltam/, "encender sin números reales: el build se niega");
falla({ anuncie: { ativo: true, numeros: { ...NUMEROS_EJEMPLO, visitasMes: null } } }, /visitasMes/, "encender con un número en blanco: se niega");
falla({ anuncie: { numeros: { visitasMes: -5 } } }, /numeros\.visitasMes/, "número negativo: se niega");
falla({ anuncie: { numeros: { percentualCelular: 130 } } }, /não pode passar de 100/, "porcentaje mayor que 100: se niega");
falla({ anuncie: { niveis: [{ id: "x", nome: "X", resumo: "r", preco: 0, inclui: ["a"] }] } }, /preço/, "precio cero: se niega");
const P = (extra) => ({ anuncie: { parceiroRecomendado: { ativo: true, anuncios: [{ ...PARCEIRO_EJEMPLO, ...extra }] } } });
falla(P({ url: "http://www.exemplo.com.br" }), /https/, "enlace sin https: se niega");
falla(P({ url: "javascript:alert(1)" }), /https|inválida/, "enlace javascript: se niega");
falla(P({ guias: ["guia-que-no-existe"] }), /não existe/, "guía inexistente: se niega");
falla(P({ texto: "x".repeat(161) }), /máximo 160/, "texto demasiado largo: se niega");
falla(P({ titulo: "" }), /falta "titulo"/, "sin título: se niega");
falla({ anuncie: { parceiroRecomendado: { ativo: true, anuncios: [PARCEIRO_EJEMPLO, { ...PARCEIRO_EJEMPLO, anunciante: "Otra" }] } } }, /já tem outro parceiro/, "dos parceiros en la misma guía: se niega");
falla({ anuncie: { whatsapp: "abc" } }, /whatsapp/, "WhatsApp mal escrito: se niega");

// ---------- D) cartón Parceiro recomendado ----------
seccion("D) cartón \"Parceiro recomendado\"");
const par = constr({ anuncie: { parceiroRecomendado: { ativo: true, anuncios: [PARCEIRO_EJEMPLO] } } }, "par");
ok(par.ok, "el build con un parceiro funciona", par.salida.slice(-300));
const guiaP = leer(par.dir, "guias/como-fazer-referencia-abnt/index.html");
const tarjeta = (/<aside class="parceiro"[\s\S]*?<\/aside>/.exec(guiaP) || [""])[0];
ok(tarjeta.includes("Patrocinado") && tarjeta.includes("Parceiro recomendado"), "el cartón dice Parceiro recomendado y Patrocinado");
ok(/rel="sponsored noopener noreferrer"/.test(tarjeta) && /target="_blank"/.test(tarjeta), "el enlace lleva rel=sponsored noopener noreferrer y abre en otra pestaña");
ok(tarjeta.includes(PARCEIRO_EJEMPLO.titulo) && tarjeta.includes(PARCEIRO_EJEMPLO.anunciante) && tarjeta.includes("utm_source=estudasimples"), "el cartón muestra el título, el anunciante y el enlace configurados");
ok(guiaP.indexOf('class="guia-cartoes"') < guiaP.indexOf('class="parceiro"') && guiaP.indexOf('class="parceiro"') < guiaP.indexOf('id="fontes"'), "el cartón queda dentro de 'Guias relacionadas', después de las guías");
const otrasGuias = paginasHtml(par.dir).filter((p) => p.startsWith("guias/") && p !== "guias/como-fazer-referencia-abnt/index.html" && /class="parceiro"/.test(leer(par.dir, p)));
ok(otrasGuias.length === 0, "solo la guía elegida muestra el cartón", otrasGuias.join(", "));
ok(!/class="parceiro"/.test(leer(par.dir, "index.html")) && !/class="parceiro"/.test(leer(par.dir, "gerador-de-capa-abnt/index.html")), "ni la portada ni las herramientas muestran el cartón");
const todas = constr({ anuncie: { parceiroRecomendado: { ativo: true, anuncios: [{ ...PARCEIRO_EJEMPLO, guias: ["todas"] }] } } }, "todas");
const guiasTodas = paginasHtml(todas.dir).filter((p) => /^guias\/[^/]+\/index\.html$/.test(p));
ok(guiasTodas.length >= 29 && guiasTodas.every((p) => /class="parceiro"/.test(leer(todas.dir, p))), "con guias: ['todas'] el cartón sale en todas las guías", String(guiasTodas.length));
const apagado = constr({ anuncie: { parceiroRecomendado: { ativo: false, anuncios: [PARCEIRO_EJEMPLO] } } }, "apag");
ok(!/class="parceiro"/.test(leer(apagado.dir, "guias/como-fazer-referencia-abnt/index.html")), "con parceiroRecomendado.ativo en false no sale nada, aunque haya anuncios cargados");
const inactivo = constr({ anuncie: { parceiroRecomendado: { ativo: true, anuncios: [{ ...PARCEIRO_EJEMPLO, ativo: false }] } } }, "inact");
ok(!/class="parceiro"/.test(leer(inactivo.dir, "guias/como-fazer-referencia-abnt/index.html")), "un anuncio con ativo:false no sale");
ok(/Patrocinado/.test(leer(par.dir, "anuncie/index.html")) && !/rel="sponsored/.test(leer(par.dir, "anuncie/index.html")), "el ejemplo de la página /anuncie/ no tiene enlace real (no es un anuncio)");
// el texto del anunciante no puede romper el HTML
const xss = constr({ anuncie: { parceiroRecomendado: { ativo: true, anuncios: [{ ...PARCEIRO_EJEMPLO, titulo: '<img src=x onerror=alert(1)>', anunciante: 'A "B" & C' }] } } }, "xss");
const guiaX = leer(xss.dir, "guias/como-fazer-referencia-abnt/index.html");
ok(!guiaX.includes("<img src=x") && guiaX.includes("&lt;img src=x onerror=alert(1)&gt;") && guiaX.includes("A &quot;B&quot; &amp; C"), "los textos del anunciante se escapan (no entra HTML)");

// ---------- comparación con un commit anterior ----------
if (process.env.BASE_REF) {
  seccion(`otras páginas idénticas a las de ${process.env.BASE_REF} (con la página apagada)`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-base-"));
  limpiables.push(path.join(tmp, "dist"));
  execFileSync("git", ["-C", RAIZ, "worktree", "add", "--detach", path.join(tmp, "arbol"), process.env.BASE_REF], { stdio: "ignore" });
  try {
    const r = spawnSync(process.execPath, ["build.mjs"], { cwd: path.join(tmp, "arbol"), env: { ...process.env, BUILD_OUT: path.join(tmp, "dist") }, encoding: "utf8" });
    ok(r.status === 0, "el commit base se construye", r.stderr);
    const norm = (s) => s.replace(/\?v=[a-z0-9]+/g, "?v=X").replace(/<lastmod>[^<]+<\/lastmod>/g, "");
    const lista = (d) => { const o = []; const rr = (x) => { for (const n of fs.readdirSync(x)) { const p = path.join(x, n); if (fs.statSync(p).isDirectory()) rr(p); else o.push(path.relative(d, p).split(path.sep).join("/")); } }; rr(d); return o; };
    const base = lista(path.join(tmp, "dist")), nuevo = lista(off.dir).filter((p) => !p.startsWith("anuncie/") && p !== "assets/css/anuncie.css");
    ok(JSON.stringify(base.sort()) === JSON.stringify(nuevo.sort()), "los mismos archivos (salvo /anuncie/)", `base ${base.length} / nuevo ${nuevo.length}`);
    const distintos = base.filter((p) => /\.(html|xml|txt|js|json|svg)$/.test(p) && p !== "assets/css/site.css" && fs.existsSync(path.join(off.dir, p)) && norm(fs.readFileSync(path.join(tmp, "dist", p), "utf8")) !== norm(fs.readFileSync(path.join(off.dir, p), "utf8")));
    ok(distintos.length === 0, "las demás páginas y archivos son idénticos byte a byte", distintos.slice(0, 5).join(", "));
    console.log(`  comparados ${base.length} archivos`);
  } finally { execFileSync("git", ["-C", RAIZ, "worktree", "remove", "--force", path.join(tmp, "arbol")], { stdio: "ignore" }); }
}

// ---------- E) diseño ----------
seccion("E) diseño en 320, 390 y 1280 px");
const servidor = await sirve(on.dir);
const servidorPar = await sirve(par.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const revisa = async (base, ruta, ancho, etiqueta, extra) => {
  const p = await b.newPage();
  await p.setViewport({ width: ancho, height: 900, isMobile: ancho < 700, hasTouch: ancho < 700, deviceScaleFactor: 1 });
  const malos = [];
  p.on("response", (r) => { if (r.status() >= 400) malos.push(`${r.status()} ${r.url()}`); });
  p.on("pageerror", (e) => malos.push("error JS: " + e.message));
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await p.goto(base + ruta, { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important}" });
  await new Promise((r) => setTimeout(r, 400));
  const m = await p.evaluate(() => {
    const botones = [...document.querySelectorAll("main a.btn, main .btn")].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height));
    const chicos = [...document.querySelectorAll("main p, main li, main span")].filter((e) => e.offsetParent && e.children.length === 0 && e.textContent.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize)).filter((s) => s < 12);
    return { desborde: document.documentElement.scrollWidth - window.innerWidth, cls: window.__cls, botones, chicos: chicos.length, h1: document.querySelectorAll("h1").length };
  });
  ok(m.desborde <= 0, `${etiqueta} ${ancho}px: sin desborde horizontal`, `${m.desborde}px`);
  ok(m.cls === 0, `${etiqueta} ${ancho}px: CLS 0`, String(m.cls));
  ok(m.botones.every((h) => h >= 44), `${etiqueta} ${ancho}px: botones de 44 px o más`, m.botones.join(","));
  ok(m.chicos === 0, `${etiqueta} ${ancho}px: ningún texto menor de 12 px`, String(m.chicos));
  ok(malos.length === 0, `${etiqueta} ${ancho}px: ningún recurso falla ni error de JS`, malos.slice(0, 3).join(" | "));
  if (extra) await extra(p, ancho);
  await p.close();
};
for (const ancho of [320, 390, 1280]) {
  await revisa(servidor.url, "/anuncie/", ancho, "/anuncie/");
  await revisa(servidorPar.url, "/guias/como-fazer-referencia-abnt/", ancho, "guía con cartón", async (p) => {
    const r = await p.evaluate(() => { const e = document.querySelector(".parceiro"); const x = e.getBoundingClientRect(); const sel = e.querySelector(".parceiro-selo").getBoundingClientRect(); const pai = e.parentElement.getBoundingClientRect(); return { dentro: x.left >= pai.left - 1 && x.right <= pai.right + 1, selo: sel.width > 0 && getComputedStyle(e.querySelector(".parceiro-selo")).visibility === "visible" }; });
    ok(r.dentro, `cartón dentro de su columna (${ancho}px)`);
    ok(r.selo, `el selo Patrocinado se ve (${ancho}px)`);
  });
}
// la página apagada, vista de verdad
const servidorOff = await sirve(off.dir);
{
  const p = await b.newPage();
  await p.goto(servidorOff.url + "/anuncie/", { waitUntil: "networkidle0" });
  ok(await p.evaluate(() => document.querySelector('meta[name="robots"]')?.content === "noindex"), "apagada, en el navegador: meta robots noindex");
  ok((await p.evaluate(() => [...document.querySelectorAll("footer a")].map((a) => a.getAttribute("href")))).every((h) => h !== "/anuncie/"), "apagada, en el navegador: el pie no enlaza a /anuncie/");
  await p.close();
}
await b.close();
await servidor.cierra(); await servidorPar.cierra(); await servidorOff.cierra();
for (const d of limpiables) limpia(d);

console.log(`\n${fallos ? "FALLÓ" : "Todo OK"}: ${total - fallos}/${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
