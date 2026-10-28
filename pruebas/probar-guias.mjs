// Etapa 10: las guías de /guias/. Parte A (sin navegador): lee la carpeta dist/ ya construida y revisa títulos únicos, descripciones,
// JSON-LD (Article, BreadcrumbList, FAQPage solo con preguntas visibles), enlaces internos y anclas, sitemap, enlaces guía ↔ herramienta
// con ?origem, guías relacionadas, fuentes. Parte B (navegador): sin scroll horizontal en 320, 390 y 1280, sin errores de consola y
// el menú sin desbordar. Parte B necesita el sitio en http://localhost:3000 (o BASE_URL). Con LIVE=1 la parte A lee BASE_URL por la red.
import fs from "node:fs";
import path from "node:path";
import { lanza, BASE } from "./lib-archivos.mjs";

const RAIZ = path.resolve("..");
const DIST = path.join(RAIZ, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, "site.config.json"), "utf8"));
const guias = JSON.parse(fs.readFileSync(path.join(RAIZ, "conteudo", "guias.json"), "utf8"));
const LIVE = process.env.LIVE === "1";
const falhas = [];
const ABNT = guias.filter((g) => g.categoria !== "ENEM e escola"); // la guía principal enlaza a todas las de ABNT; las de «ENEM e escola» se enlazan desde sus herramientas y entre sí
const ENEM = guias.filter((g) => g.categoria === "ENEM e escola");
const marca = (c, m) => { console.log(c ? "OK   " : "FALLA", m); if (!c) falhas.push(m); };
const norm = (t) => t.replace(/ /g, " ").replace(/\s+/g, " ").trim();

// la red a veces corta una conexión: se reintenta antes de dar la prueba por mala
async function red(url, opc) { for (let i = 0; i < 5; i++) { try { return await fetch(url, opc); } catch (e) { if (i === 4) throw e; await new Promise((r) => setTimeout(r, 3000)); } } }
async function leePagina(url) {
  if (LIVE) { const r = await red(BASE + url); return r.ok ? await r.text() : null; }
  const f = path.join(DIST, url.replace(/^\//, ""), url.endsWith("/") ? "index.html" : "");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}
const existeRuta = async (url) => {
  const limpio = url.split("#")[0].split("?")[0];
  if (LIVE) { const r = await red(BASE + limpio, { method: "HEAD" }); return r.ok; }
  const f = path.join(DIST, limpio.replace(/^\//, ""));
  return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, "index.html")));
};

const todas = ["/", "/guias/", "/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/gerador-de-referencias-abnt/", "/contador-de-linhas-enem/", "/cronograma-de-estudos-enem/", "/calculadora-de-media/", "/formatacao-abnt-tcc/", "/sobre/", "/contato/", "/politica-de-privacidade/", "/termos-de-uso/", ...guias.map((g) => `/guias/${g.slug}/`)];
const html = {};
for (const u of todas) html[u] = await leePagina(u);

console.log("== A1) Las 32 guías (29 de ABNT + 3 de ENEM e escola) y el índice existen y están completos ==");
marca(guias.length === 32 && ABNT.length === 29 && ENEM.length === 3, `guias.json tiene 32 guías: 29 de ABNT + 3 de «ENEM e escola» (${guias.length}: ${ABNT.length} + ${ENEM.length})`);
for (const g of guias) {
  const h = html[`/guias/${g.slug}/`];
  marca(!!h && !/\{\{[A-Za-z_:]/.test(h), `/guias/${g.slug}/ existe y no tiene marcas sin resolver`);
}
marca(!!html["/guias/"] && guias.every((g) => html["/guias/"].includes(`href="/guias/${g.slug}/"`)), "el índice /guias/ enlaza las 32 guías");

console.log("\n== A2) Títulos y descripciones únicos, de buen tamaño ==");
const titulos = new Map(), descs = new Map();
for (const [u, h] of Object.entries(html)) {
  if (!h) continue;
  const t = norm((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
  const d = norm((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "");
  (titulos.get(t) || titulos.set(t, []).get(t)).push(u);
  (descs.get(d) || descs.set(d, []).get(d)).push(u);
}
marca([...titulos.entries()].every(([t, us]) => t && us.length === 1), `títulos únicos en las ${Object.keys(html).length} páginas${[...titulos.entries()].filter(([, us]) => us.length > 1).map(([t, us]) => ` (repetido: ${us.join(", ")})`).join("")}`);
marca([...descs.entries()].every(([d, us]) => d && us.length === 1), "descripciones únicas en todas las páginas");
for (const g of guias) {
  const h = html[`/guias/${g.slug}/`] || "";
  const t = norm((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
  const d = norm((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "");
  marca(t.length >= 35 && t.length <= 66, `${g.slug}: título de ${t.length} caracteres (35–66): ${t}`);
  marca(d.length >= 100 && d.length <= 160, `${g.slug}: descripción de ${d.length} caracteres (100–160)`);
  const h1s = (h.match(/<h1[ >]/g) || []).length;
  marca(h1s === 1, `${g.slug}: un solo H1`);
  marca(new RegExp(`<link rel="canonical" href="[^"]*/guias/${g.slug}/">`).test(h), `${g.slug}: canonical correcto`);
  marca(/Atualizado em <time datetime="\d{4}-\d{2}-\d{2}"/.test(h), `${g.slug}: fecha de actualización visible`);
}

console.log("\n== A3) Datos estructurados (JSON-LD) ==");
const jsonld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
for (const g of guias) {
  const h = html[`/guias/${g.slug}/`] || "";
  const bloques = jsonld(h);
  marca(bloques.length >= 3 && bloques.every(Boolean), `${g.slug}: todos los bloques JSON-LD son JSON válido (${bloques.length})`);
  const tipos = bloques.filter(Boolean).map((b) => b["@type"]);
  const art = bloques.find((b) => b?.["@type"] === "Article");
  marca(tipos.includes("Article") && tipos.includes("BreadcrumbList") && !!art?.headline && !!art?.dateModified && !!art?.author?.name && !!art?.publisher?.name && !!art?.image, `${g.slug}: Article (título, fecha, autor, publisher, imagen) + BreadcrumbList`);
  const faq = bloques.find((b) => b?.["@type"] === "FAQPage");
  const visibles = [...h.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => norm(m[1].replace(/<[^>]+>/g, "")));
  const enJson = (faq?.mainEntity || []).map((q) => norm(q.name));
  marca(!!faq && enJson.length >= 5 && enJson.length === visibles.length && enJson.every((q, i) => q === visibles[i]), `${g.slug}: FAQPage con ${enJson.length} preguntas y todas visibles en la página, en el mismo orden`);
  const pasos = (faq?.mainEntity || []).every((q) => q.acceptedAnswer?.text && !/<(?!\/?(a|strong|em|p|br|ul|ol|li)\b)/.test(q.acceptedAnswer.text));
  marca(pasos, `${g.slug}: respuestas del FAQ con texto y solo HTML permitido`);
}
{
  const ind = jsonld(html["/guias/"] || "");
  marca(ind.every(Boolean) && ind.some((b) => b?.["@type"] === "BreadcrumbList") && ind.some((b) => b?.["@type"] === "CollectionPage" || b?.["@type"] === "ItemList"), "/guias/: JSON-LD válido con BreadcrumbList y lista de guías");
  marca(!jsonld(html["/guias/"] || "").some((b) => b?.["@type"] === "FAQPage"), "/guias/: sin FAQPage (no tiene preguntas visibles)");
}

console.log("\n== A4) Enlaces internos y anclas ==");
const malos = [];
for (const [u, h] of Object.entries(html)) {
  if (!h) continue;
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of h.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) continue;
    if (href.startsWith("#")) { if (href.length > 1 && !ids.has(href.slice(1))) malos.push(`${u} → ${href} (ancla)`); continue; }
    if (!href.startsWith("/")) { malos.push(`${u} → ${href} (relativo)`); continue; }
    if (!(await existeRuta(href))) malos.push(`${u} → ${href}`);
  }
}
marca(malos.length === 0, `todos los enlaces internos y anclas funcionan${malos.length ? ": " + malos.slice(0, 8).join("; ") : ""}`);

console.log("\n== A5) Guía ↔ herramienta, relacionadas y fuentes ==");
for (const g of guias) {
  const h = html[`/guias/${g.slug}/`] || "";
  marca(h.includes(`href="${g.ferramenta.url}#origem=guia-${g.slug}"`), `${g.slug}: el botón lleva a ${g.ferramenta.url} con #origem=guia-${g.slug}`);
  const rel = g.relacionadas;
  marca(rel.length >= 2 && rel.length <= 3 && rel.every((r) => r !== g.slug && guias.some((x) => x.slug === r) && h.includes(`href="/guias/${r}/"`)), `${g.slug}: ${rel.length} guías relacionadas, todas existen y están enlazadas`);
  const fuentes = [...h.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"[^>]*>/g)].filter((m) => !m[0].includes("estudasimples") && !/wa\.me/.test(m[1]));
  marca(g.fontes.length >= 3 && g.fontes.every((f) => h.includes(`href="${f.url}"`)) && fuentes.every((m) => /rel="[^"]*noopener/.test(m[0])), `${g.slug}: ${g.fontes.length} fuentes con enlace y rel="noopener"`);
  marca(/id="fontes"|class="guia-fontes"/.test(h) && /Fontes/.test(h), `${g.slug}: sección "Fontes" al final`);
}
for (const [id, url] of [["capa", "/gerador-de-capa-abnt/"], ["folha", "/gerador-de-folha-de-rosto-abnt/"], ["sumario", "/gerador-de-sumario-abnt/"], ["contador", "/contador-de-linhas-enem/"], ["cronograma", "/cronograma-de-estudos-enem/"], ["media", "/calculadora-de-media/"]]) {
  const h = html[url] || "";
  const con = guias.filter((g) => (g.ferramentas || []).includes(id));
  marca(con.length >= (ENEM.some((g) => (g.ferramentas || []).includes(id)) ? 1 : 2) && con.every((g) => h.includes(`href="/guias/${g.slug}/"`)), `la herramienta ${id} enlaza a sus ${con.length} guías`);
}
marca(html["/"] && html["/"].includes('href="/guias/"') && html["/"].includes('href="/guias/normas-abnt/"'), "la portada enlaza al índice y a la guía principal");
for (const u of todas) { const h = html[u]; if (h && !h.includes('href="/guias/"')) marca(false, `${u}: falta el enlace "Guias" en el menú o el pie`); }
marca(todas.every((u) => !html[u] || html[u].includes('href="/guias/"')), "el menú o el pie de todas las páginas enlazan a /guias/");

console.log("\n== A6) La guía principal enlaza a las otras 28 de ABNT ==");
{
  const h = html["/guias/normas-abnt/"] || "";
  const faltan = ABNT.filter((g) => g.slug !== "normas-abnt" && !h.includes(`href="/guias/${g.slug}/"`)).map((g) => g.slug);
  marca(faltan.length === 0, `normas-abnt enlaza a las 28 guías de ABNT${faltan.length ? " (faltan: " + faltan.join(", ") + ")" : ""}`);
}

{
  const tcc = guias.filter((g) => g.categoria === "TCC passo a passo");
  marca(tcc.length === 10, `la sección "TCC passo a passo" tiene 10 guías (${tcc.length})`);
  const idx = html["/guias/"] || "";
  const sec = (idx.match(/<h2>TCC passo a passo<\/h2>[\s\S]*?<\/section>/) || [""])[0];
  marca(tcc.every((g) => sec.includes(`href="/guias/${g.slug}/"`)), "/guias/ muestra la sección «TCC passo a passo» con las 10 guías");
  const t = html["/guias/normas-abnt-tcc/"] || "";
  marca(tcc.every((g) => t.includes(`href="/guias/${g.slug}/"`)), "«Normas ABNT para TCC» enlaza a las 10 guías nuevas");
  const m = html["/guias/como-fazer-tcc/"] || "";
  marca(tcc.filter((g) => g.slug !== "como-fazer-tcc").every((g) => m.includes(`href="/guias/${g.slug}/"`)) && ["/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/"].every((u) => m.includes(u)), "«Como fazer TCC» enlaza a las otras 9 guías y a las 3 herramientas");
}

{
  const sem = guias.filter((g) => g.categoria === "Trabalhos do semestre");
  marca(sem.length === 6, `la sección "Trabalhos do semestre" tiene 6 guías (${sem.length})`);
  const idx = html["/guias/"] || "";
  const sec = (idx.match(/<h2>Trabalhos do semestre<\/h2>[\s\S]*?<\/section>/) || [""])[0];
  marca(sem.every((g) => sec.includes(`href="/guias/${g.slug}/"`)), "/guias/ muestra la sección «Trabalhos do semestre» con las 6 guías");
  const hub = html["/guias/normas-abnt/"] || "";
  marca(sem.every((g) => hub.includes(`href="/guias/${g.slug}/"`)), "la guía principal enlaza a las 6 guías de «Trabalhos do semestre»");
  // cada guía nueva la enlaza al menos otra guía que no sea solo "relacionadas" (enlaces desde el texto o desde la guía principal)
  const entrantes = (slug) => guias.filter((g) => g.slug !== slug && (html[`/guias/${g.slug}/`] || "").includes(`href="/guias/${slug}/"`)).length;
  marca(sem.every((g) => entrantes(g.slug) >= 3), `cada guía de «Trabalhos do semestre» recibe enlaces de al menos 3 guías (${sem.map((g) => g.slug.split("-")[0] + ":" + entrantes(g.slug)).join(", ")})`);
}

console.log("\n== A7) Sin párrafos repetidos entre guías ==");
{
  const vistos = new Map();
  for (const g of guias) {
    const h = html[`/guias/${g.slug}/`] || "";
    // las tarjetas de "guías relacionadas", de "fontes" y la del Kit TCC (aside.oferta, un llamado a la acción) repiten a propósito su texto
    const cuerpo = (h.match(/<article[\s\S]*?<\/article>/) || [""])[0].replace(/<section class="guia-relacionadas[\s\S]*?<\/section>/g, "").replace(/<section class="afiliados"[\s\S]*?<\/section>/g, "").replace(/<aside class="oferta"[\s\S]*?<\/aside>/g, "").replace(/<p class="padrao">[\s\S]*?<\/p>/g, "").replace(/<section class="guia-fontes"[\s\S]*?<\/section>/g, "");
    for (const m of cuerpo.matchAll(/<(p|li)[ >][\s\S]*?<\/\1>/g)) {
      const t = norm(m[0].replace(/<[^>]+>/g, ""));
      if (t.length < 90) continue;
      (vistos.get(t) || vistos.set(t, new Set()).get(t)).add(g.slug);
    }
  }
  const rep = [...vistos.entries()].filter(([, s]) => s.size > 1);
  marca(rep.length === 0, `ningún párrafo largo se repite en dos guías${rep.length ? ": " + rep.slice(0, 3).map(([t, s]) => `[${[...s].join("+")}] ${t.slice(0, 60)}…`).join(" | ") : ""}`);
}

console.log("\n== A8) Sitemap ==");
{
  const sm = LIVE ? await (await red(BASE + "/sitemap.xml")).text() : fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const esperadas = ["/guias/", ...guias.map((g) => `/guias/${g.slug}/`)];
  const faltan = esperadas.filter((e) => !urls.some((u) => u.endsWith(e)));
  marca(faltan.length === 0, `el sitemap incluye /guias/ y las 32 guías${faltan.length ? " (faltan: " + faltan.join(", ") + ")" : ""}`);
  marca(new Set(urls).size === urls.length, `el sitemap no repite URLs (${urls.length})`);
}

console.log("\n== A9) Publicidad ==");
for (const g of guias) {
  const h = html[`/guias/${g.slug}/`] || "";
  marca(/data-slot="guia-meio-1"/.test(h) && /data-slot="guia-meio-2"/.test(h) && /data-slot="guia-lateral"/.test(h), `${g.slug}: tiene los 3 espacios reservados (meio 1, meio 2, lateral)`);
}

if (!LIVE) {
  console.log("\n== B) Navegador: sin desborde horizontal ni errores ==");
  let b;
  try { b = await lanza(); } catch (e) { marca(false, "no se pudo abrir Chrome: " + e.message); }
  if (b) {
    const ok = await fetch(BASE + "/guias/").then((r) => r.ok).catch(() => false);
    if (!ok) marca(false, `el sitio no responde en ${BASE} (npm run dev)`);
    else {
      for (const [nombre, vp] of [["320", { width: 320, height: 700, isMobile: true, hasTouch: true }], ["390", { width: 390, height: 844, isMobile: true, hasTouch: true }], ["1280", { width: 1280, height: 900 }]]) {
        const sin = [];
        for (const url of ["/guias/", ...guias.map((g) => `/guias/${g.slug}/`)]) {
          const p = await b.newPage(); await p.setViewport(vp);
          const erros = []; p.on("pageerror", (e) => erros.push(e.message)); p.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
          await p.goto(BASE + url, { waitUntil: "networkidle0" });
          const r = await p.evaluate(() => {
            const sobra = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && !e.closest(".rolavel") && getComputedStyle(e).position !== "fixed"; }).slice(0, 3).map((e) => e.tagName + "." + e.className);
            const nav = document.querySelector("header nav, .nav");
            return { ov: document.documentElement.scrollWidth - innerWidth, sobra, navOv: nav ? Math.max(0, Math.round(nav.getBoundingClientRect().right - (innerWidth - 20))) : 0 };
          });
          if (r.ov > 0 || erros.length || r.navOv > 1) sin.push(`${url} (desborde ${r.ov}, menú ${r.navOv}${r.sobra.length ? ", " + r.sobra.join("/") : ""}${erros.length ? ", errores: " + erros[0] : ""})`);
          await p.close();
        }
        marca(sin.length === 0, `ancho ${nombre}: las ${guias.length + 1} páginas sin scroll horizontal, sin errores de consola y con el menú dentro de la pantalla${sin.length ? " → " + sin.join("; ") : ""}`);
      }
      // /guias/: tarjetas en 1 columna por debajo de 600 px
      for (const [ancho, esperadas] of [[390, 1], [599, 1], [700, 2], [1280, 3]]) {
        const p = await b.newPage(); await p.setViewport({ width: ancho, height: 800 });
        await p.goto(BASE + "/guias/", { waitUntil: "networkidle0" });
        const cols = await p.evaluate(() => getComputedStyle(document.querySelector(".guias-grande .guia-cartoes")).gridTemplateColumns.split(" ").length);
        marca(cols === esperadas, `/guias/ a ${ancho}px: tarjetas en ${cols} columna(s) (esperado ${esperadas})`);
        await p.close();
      }
      // con el AdSense apagado, ningún espacio de anuncio ocupa lugar; encendido, reservan su altura
      if (cfg.anuncios.adsenseAtivo !== true) {
        for (const [nombre, vp] of [["390", { width: 390, height: 800 }], ["1280", { width: 1280, height: 900 }]]) {
          const conHueco = [];
          for (const url of ["/", "/guias/", ...guias.map((g) => `/guias/${g.slug}/`), "/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/gerador-de-referencias-abnt/"]) {
            const p = await b.newPage(); await p.setViewport(vp);
            await p.goto(BASE + url, { waitUntil: "networkidle0" });
            const n = await p.evaluate(() => [...document.querySelectorAll(".anuncio")].filter((a) => a.getBoundingClientRect().height > 0).length);
            if (n) conHueco.push(url);
            await p.close();
          }
          marca(conHueco.length === 0, `AdSense apagado, ancho ${nombre}: ningún espacio de anuncio ocupa lugar${conHueco.length ? " → " + conHueco.join(", ") : ""}`);
        }
      }
    }
    await b.close();
  }
}

console.log(falhas.length ? `\n${falhas.length} FALLA(S)` : "\nTodo OK");
process.exit(falhas.length ? 1 : 0);
