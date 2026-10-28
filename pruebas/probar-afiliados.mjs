// Etapa 17: "Recomendado para o seu trabalho" (livros y cursos con link de afiliado, al final de las guías, antes de "Guias relacionadas").
// Construye el sitio varias veces con copias de site.config.json (no toca dist/ ni el servidor :3000) y comprueba:
//   A) apagado (la configuración real con el interruptor en false, y también con enlaces cargados o con el interruptor encendido pero sin enlaces): no aparece nada y las páginas no cambian;
//   B) encendido con productos de ejemplo: dónde aparece (y dónde nunca), etiqueta "Link de afiliado", rel="sponsored nofollow", ID de Amazon,
//      frase obligatoria de Amazon, secciones nuevas en Termos y Política;
//   C) los errores que el build debe dar;
//   D) diseño en 320, 390 y 1280 px: sin desborde, CLS 0, botones táctiles, accesibilidad (axe) sin problemas.
// Opcional: BASE_REF=<commit> compara todas las páginas (con todo apagado) con las de ese commit: deben ser idénticas.
// Uso: node probar-afiliados.mjs   (desde pruebas/)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { RAIZ, CONFIG_REAL, construye, leer, paginasHtml, sirve, limpia } from "./lib-anuncie.mjs";
import { axeEn, describeAxe } from "./lib-axe.mjs";

let fallos = 0, total = 0;
const ok = (cond, msg, extra = "") => { total++; if (!cond) { fallos++; console.log(`  FALLA: ${msg}${extra ? " -> " + extra : ""}`); } };
const seccion = (t) => console.log(`\n== ${t}`);
const limpiables = [];
const constr = (mod, nombre) => { const r = construye({ kit: { ativo: false }, ...mod }, nombre); limpiables.push(r.dir); return r; };
const AF = CONFIG_REAL.afiliados;
const FRASE = "Como Associado da Amazon, ganho com compras qualificadas.";
const sitemapUrls = (dir) => [...leer(dir, "sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

// productos de EJEMPLO: los 10 de la lista real, con enlaces inventados (solo para probar y fotografiar; nunca van al sitio)
const conEnlaces = (n = AF.produtos.length) => AF.produtos.map((p, i) => (i < n ? { ...p, url: `https://www.amazon.com.br/dp/B00EJEMPLO${String(i + 1).padStart(2, "0")}` } : { ...p, url: "" }));
const CURSO = { id: "curso-ejemplo", tipo: "curso", titulo: "Curso de exemplo: escrita acadêmica", autor: "", frase: "Aulas curtas sobre como organizar e escrever o trabalho acadêmico.", url: "https://www.exemplo.com.br/curso?utm_source=estudasimples", guias: ["resumo-abnt"] };
const ON = (extra = {}) => ({ afiliados: { ativo: true, amazonTag: "exemplo-20", legalAtualizadoEm: "2026-10-21", produtos: conEnlaces().concat(CURSO), ...extra } });
const GUIAS_CON = [...new Set(AF.produtos.flatMap((p) => p.guias))]; // guías que deben mostrar el bloque

const SIN_URL = AF.produtos.map((p) => ({ ...p, url: "" }));
const OFF = { afiliados: { ativo: false }, kit: { ativo: false } }; // la configuración real con el interruptor apagado

// ---------- R) configuración real (la que se publica) ----------
seccion("R) configuración real");
ok(AF && AF.ativo === true && AF.amazonTag === "estudasimples-20" && AF.legalAtualizadoEm === "2026-10-21", "afiliados encendido, con el ID estudasimples-20 y la fecha legal 2026-10-21");
const LIBROS = AF.produtos.filter((p) => p.tipo === "livro"), CURSOS = AF.produtos.filter((p) => p.tipo === "curso");
ok(AF.produtos.length === 11 && LIBROS.length === 10 && CURSOS.length === 1, "11 productos: 10 libros y 1 curso (ABNT Descomplicada, de Hotmart)");
ok(CURSOS[0].url === "https://go.hotmart.com/G108129335U" && JSON.stringify(CURSOS[0].guias) === JSON.stringify(["normas-abnt", "citacao-abnt", "como-fazer-referencia-abnt", "modelo-de-artigo-cientifico-abnt"]), "el curso usa su hotlink de Hotmart y solo 4 guías de contenido (nunca las de puro formato)");
const hostOk = (u) => { try { const x = new URL(u); return x.protocol === "https:" && x.hostname === "www.amazon.com.br" && /^\/dp\/[0-9]{9}[0-9X]$/.test(x.pathname) && x.searchParams.get("tag") === "estudasimples-20" && [...x.searchParams.keys()].length === 1; } catch { return false; } };
ok(LIBROS.every((p) => hostOk(p.url)), "los 10 enlaces de libros son https://www.amazon.com.br/dp/<ISBN>?tag=estudasimples-20", LIBROS.filter((p) => !hostOk(p.url)).map((p) => p.id).join(", "));
const isbnOk = (a) => [...a].reduce((t, c, i) => t + (c === "X" ? 10 : +c) * (10 - i), 0) % 11 === 0;
ok(LIBROS.every((p) => isbnOk(new URL(p.url).pathname.slice(4))), "los 10 códigos son ISBN-10 válidos (dígito de control)");
const real = constr({ kit: { ativo: false } }, "af-real");
ok(real.ok, "el build con la configuración real funciona", real.salida.slice(-300));
const guiasReal = paginasHtml(real.dir).filter((p) => /^guias\/[^/]+\/index\.html$/.test(p));
const conReal = guiasReal.filter((p) => /class="afiliados"/.test(leer(real.dir, p))).map((p) => p.split("/")[1]).sort();
const GUIAS_REAL = [...new Set(AF.produtos.flatMap((p) => p.guias))].sort();
ok(conReal.length === 14 && JSON.stringify(conReal) === JSON.stringify(GUIAS_REAL), "el bloque sale en las 14 guías elegidas", conReal.join(","));
let botonesBien = true;
for (const g of conReal) {
  const b = (/<section class="afiliados"[\s\S]*?<\/section>/.exec(leer(real.dir, `guias/${g}/index.html`)) || [""])[0];
  const esp = AF.produtos.filter((p) => p.guias.includes(g)).map((p) => p.url);
  const hall = [...b.matchAll(/class="btn afiliado-botao" href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  if (JSON.stringify(hall) !== JSON.stringify(esp)) { botonesBien = false; console.log("  ", g, hall, esp); }
  ok(b.includes("Como Associado da Amazon, ganho com compras qualificadas."), `${g}: la frase de Amazon se ve`);
}
ok(botonesBien, "cada botón apunta exactamente al libro y enlace correctos, con tag=estudasimples-20");
ok(leer(real.dir, "termos-de-uso/index.html").includes("12. Links de afiliado") && leer(real.dir, "politica-de-privacidade/index.html").includes("12. Links de afiliado"), "Termos y Política tienen la sección 12");

// ---------- A) apagado ----------
seccion("A) apagado");
ok(AF.produtos.every((p) => ["livro", "curso"].includes(p.tipo) && p.autor && p.titulo && p.frase && p.guias.length), "cada producto tiene tipo, título, autor, frase y guías");
const cuenta = {};
for (const p of AF.produtos) for (const g of p.guias) cuenta[g] = (cuenta[g] || 0) + 1;
ok(Object.values(cuenta).every((n) => n <= 3), "ninguna guía recibe más de 3 productos", JSON.stringify(Object.entries(cuenta).filter(([, n]) => n > 3)));
const off = constr(OFF, "af-off");
ok(off.ok, "el build apagado funciona", off.salida.slice(-300));
const pagOff = paginasHtml(off.dir);
const conAlgo = pagOff.filter((p) => /afiliado|Recomendado para o seu trabalho|class="afiliados"|Associado da Amazon/i.test(leer(off.dir, p)));
ok(conAlgo.length === 0, "apagado: ninguna página menciona afiliados ni muestra el bloque", conAlgo.join(", "));
ok(leer(off.dir, "termos-de-uso/index.html").includes("Última atualização: 14 de outubro de 2026.") && leer(off.dir, "politica-de-privacidade/index.html").includes("Última atualização: 14 de outubro de 2026."), "apagado: Termos y Política conservan su fecha y texto");
const sinEnlaceEncendido = constr({ afiliados: { ativo: true, amazonTag: "exemplo-20", produtos: SIN_URL } }, "af-sinurl");
ok(sinEnlaceEncendido.ok && !paginasHtml(sinEnlaceEncendido.dir).some((p) => /class="afiliados"|links-de-afiliado/.test(leer(sinEnlaceEncendido.dir, p))), "interruptor encendido pero productos sin enlace: no se muestra nada (ni las secciones legales)");
const apagadoConEnlaces = constr({ afiliados: { ativo: false, produtos: conEnlaces() } }, "af-off2");
ok(!paginasHtml(apagadoConEnlaces.dir).some((p) => /class="afiliados"|links-de-afiliado/.test(leer(apagadoConEnlaces.dir, p))), "interruptor apagado con enlaces cargados: no se muestra nada");
const distintasOff = pagOff.filter((p) => leer(off.dir, p).replace(/\?v=[a-z0-9]+/g, "") !== leer(apagadoConEnlaces.dir, p).replace(/\?v=[a-z0-9]+/g, ""));
ok(distintasOff.length === 0, "apagado con enlaces cargados = apagado sin enlaces: todas las páginas idénticas (sin necesitar BASE_REF)", distintasOff.slice(0, 5).join(", "));
ok(!/lojas parceiras|Hoje, algumas guias já têm links de afiliado|comissão/.test(leer(off.dir, "politica-de-privacidade/index.html") + leer(off.dir, "termos-de-uso/index.html")), "apagado: Termos y Política sin ninguna frase nueva de afiliados");
const sinFalta = paginasHtml(off.dir).filter((p) => /\{\{[A-Za-z0-9_:-]+\}\}/.test(leer(off.dir, p)));
ok(sinFalta.length === 0, "ninguna página queda con marcas {{...}} sin reemplazar", sinFalta.join(", "));

// ---------- comparación con un commit anterior ----------
if (process.env.BASE_REF) {
  seccion(`afiliados apagado: idéntico a ${process.env.BASE_REF}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-base-"));
  limpiables.push(path.join(tmp, "dist"));
  execFileSync("git", ["-C", RAIZ, "worktree", "add", "--detach", path.join(tmp, "arbol"), process.env.BASE_REF], { stdio: "ignore" });
  try {
    const r = spawnSync(process.execPath, ["build.mjs"], { cwd: path.join(tmp, "arbol"), env: { ...process.env, BUILD_OUT: path.join(tmp, "dist") }, encoding: "utf8" });
    ok(r.status === 0, "el commit base se construye", r.stderr);
    const norm = (s) => s.replace(/\?v=[a-z0-9]+/g, "?v=X").replace(/<lastmod>[^<]+<\/lastmod>/g, "");
    const lista = (d) => { const o = []; const rr = (x) => { for (const n of fs.readdirSync(x)) { const p = path.join(x, n); if (fs.statSync(p).isDirectory()) rr(p); else o.push(path.relative(d, p).split(path.sep).join("/")); } }; rr(d); return o; };
    const base = lista(path.join(tmp, "dist")), nuevo = lista(off.dir);
    ok(JSON.stringify(base.sort()) === JSON.stringify(nuevo.sort()), "los mismos archivos", `base ${base.length} / nuevo ${nuevo.length}`);
    const distintos = base.filter((p) => /\.(html|xml|txt|js|json|svg)$|site\.css$/.test(p) && fs.existsSync(path.join(off.dir, p)) && norm(fs.readFileSync(path.join(tmp, "dist", p), "utf8")) !== norm(fs.readFileSync(path.join(off.dir, p), "utf8")));
    ok(distintos.length === 0, "todas las páginas y el CSS global son idénticos byte a byte", distintos.slice(0, 5).join(", "));
    console.log(`  comparados ${base.length} archivos`);
  } finally { execFileSync("git", ["-C", RAIZ, "worktree", "remove", "--force", path.join(tmp, "arbol")], { stdio: "ignore" }); }
}

// ---------- B) encendido con ejemplos ----------
seccion("B) encendido con productos de ejemplo");
const on = constr(ON(), "af-on");
ok(on.ok, "el build encendido funciona", on.salida.slice(-300));
const pagOn = paginasHtml(on.dir);
const guiasOn = pagOn.filter((p) => /^guias\/[^/]+\/index\.html$/.test(p));
const conBloque = guiasOn.filter((p) => /class="afiliados"/.test(leer(on.dir, p))).map((p) => p.split("/")[1]).sort();
ok(JSON.stringify(conBloque) === JSON.stringify([...GUIAS_CON].sort()), "el bloque sale justo en las guías elegidas, y en ninguna otra", `salen ${conBloque.length}: ${conBloque.join(",")}`);
const fuera = pagOn.filter((p) => !/^guias\/[^/]+\/index\.html$/.test(p) && /class="afiliados"/.test(leer(on.dir, p)));
ok(fuera.length === 0, "nunca en las herramientas, la portada, el servicio, /guias/, Termos ni Política", fuera.join(", "));
ok(!/class="afiliados"/.test(leer(on.dir, "guias/margens-abnt/index.html")), "una guía puramente de formato (margens) no tiene el bloque");
const bloqueDe = (g) => (/<section class="afiliados"[\s\S]*?<\/section>/.exec(leer(on.dir, `guias/${g}/index.html`)) || [""])[0];
for (const g of GUIAS_CON) {
  const html = leer(on.dir, `guias/${g}/index.html`), b = bloqueDe(g);
  const esperados = AF.produtos.filter((p) => p.guias.includes(g)).map((p) => p.titulo);
  const hallados = [...b.matchAll(/class="afiliado-titulo">([^<]+)</g)].map((m) => m[1].replace(/&amp;/g, "&"));
  ok(JSON.stringify(hallados) === JSON.stringify(esperados.concat(g === "resumo-abnt" ? [CURSO.titulo] : [])), `${g}: productos y orden como en la lista`, hallados.join(" | "));
  ok(hallados.length >= 1 && hallados.length <= 3, `${g}: de 1 a 3 productos`);
  const cartones = (b.match(/<li class="afiliado[ "][^>]*>/g) || []).length;
  ok((b.match(/Link de afiliado<\/span>/g) || []).length === cartones, `${g}: cada tarjeta lleva la etiqueta visible "Link de afiliado"`);
  ok((b.match(/rel="sponsored nofollow noopener noreferrer"/g) || []).length === cartones && (b.match(/target="_blank"/g) || []).length === cartones, `${g}: todos los enlaces llevan rel="sponsored nofollow noopener noreferrer" y abren en otra pestaña`);
  ok(html.indexOf('class="afiliados"') < html.indexOf('class="guia-relacionadas"') && html.indexOf('class="guia-ferramenta"') < html.indexOf('class="afiliados"') && html.indexOf('class="afiliados"') < html.indexOf('id="fontes"'), `${g}: queda después de la caja de la herramienta y justo antes de "Guias relacionadas"`);
  ok(/<\/section>\s*<section class="guia-relacionadas"/.test(html), `${g}: sin nada entre el bloque y "Guias relacionadas"`);
  ok(/<h2 id="recomendados">Recomendado para o seu trabalho<\/h2>/.test(b), `${g}: título "Recomendado para o seu trabalho" (h2)`);
}
const bTcc = bloqueDe("como-fazer-tcc");
ok(/href="https:\/\/www\.amazon\.com\.br\/dp\/B00EJEMPLO\d+\?tag=exemplo-20"/.test(bTcc), "los enlaces de Amazon reciben el ID de afiliado (tag=exemplo-20)");
ok((bTcc.match(/>Ver na Amazon</g) || []).length === 3 && /class="afiliado-tipo">Livro</.test(bTcc), "botón 'Ver na Amazon' y tipo 'Livro'");
ok(bTcc.includes(FRASE) && /<p class="afiliados-nota">/.test(bTcc), "la frase de Amazon está debajo del bloque (letra pequeña)");
const bCurso = bloqueDe("resumo-abnt");
ok(bCurso.includes(">Ver o curso<") && bCurso.includes("utm_source=estudasimples") && !/tag=exemplo-20[^"]*curso/.test(bCurso), "el curso dice 'Ver o curso' y conserva su enlace tal cual (sin ID de Amazon)");
ok(!/class="afiliado-autor"/.test((/<li class="afiliado[ "][^>]*>(?:(?!<\/li>)[\s\S])*Curso de exemplo[\s\S]*?<\/li>/.exec(bCurso) || [""])[0]), "un curso sin autor no deja una línea vacía");
const soloCurso = constr({ afiliados: { ativo: true, legalAtualizadoEm: "2026-10-21", produtos: [CURSO] } }, "af-curso");
ok(soloCurso.ok && !/Associado da Amazon/.test(leer(soloCurso.dir, "guias/resumo-abnt/index.html") + leer(soloCurso.dir, "termos-de-uso/index.html")), "con solo un curso (no Amazon) no sale la frase de Amazon");
const algunos = constr({ afiliados: { ativo: true, amazonTag: "exemplo-20", legalAtualizadoEm: "2026-10-21", produtos: conEnlaces(2) } }, "af-2");
const nTarjetas = (g) => (leer(algunos.dir, `guias/${g}/index.html`).match(/<li class="afiliado[ "][^>]*>/g) || []).length;
ok(nTarjetas("como-fazer-tcc") === 1 && nTarjetas("metodologia-do-tcc") === 1 && nTarjetas("referencial-teorico-do-tcc") === 0, "con solo 2 productos con enlace (los otros 8 sin enlace), solo esos 2 aparecen");
// páginas legales
for (const [pag, clave] of [["termos-de-uso", "Termos"], ["politica-de-privacidade", "Política"]]) {
  const h = leer(on.dir, `${pag}/index.html`);
  ok(/<h2 id="links-de-afiliado">12\. Links de afiliado<\/h2>/.test(h), `${clave}: sección "12. Links de afiliado"`);
  ok(h.includes(FRASE), `${clave}: incluye la frase obligatoria de Amazon`);
  ok(h.includes("Última atualização: 21 de outubro de 2026."), `${clave}: la fecha de actualización cambia`);
}
ok(/rel="sponsored/.test(bTcc) && /href="\/termos-de-uso\/#links-de-afiliado"/.test(bTcc), "la nota de cada bloque enlaza a la sección de los Termos");
ok(bTcc.includes("Livros podem trazer versões antigas das normas da ABNT"), "la nota avisa que los libros pueden traer versiones antiguas de las normas ABNT");
const pol = leer(on.dir, "politica-de-privacidade/index.html"), ter = leer(on.dir, "termos-de-uso/index.html");
ok(/Atenção: algumas guias têm recomendações de livros e cursos com links de afiliado/.test(pol), "Política 2.5: ya no dice solo 'sin anuncios': menciona los links de afiliado");
ok(/<li><strong>lojas parceiras \(por exemplo, a Amazon\)<\/strong>, somente se você clicar/.test(pol), "Política 5: las tiendas aparecen entre los terceros");
ok(/Ao clicar em um link de afiliado, a Amazon pode definir cookies/.test(pol), "Política 3 (Cookies): menciona los cookies de la tienda");
ok(/A partir daí/.test(pol) && !/Daí em diante/.test(pol) && /lista "Pelo navegador" da seção 4/.test(pol), "Política 12: portugués y remisión correctos");
ok(/Hoje, algumas guias já têm links de afiliado/.test(ter) && /Escolho os livros e os cursos por tratarem do assunto de cada guia/.test(ter), "Termos 9 y 12: textos nuevos");
ok(!/Eu escolho os livros|pelo que acho útil/.test(ter), "Termos 12: sin la afirmación subjetiva");
const soloCursoPol = leer(soloCurso.dir, "politica-de-privacidade/index.html");
ok(/Ao clicar em um link de afiliado, a loja pode definir cookies/.test(soloCursoPol) && !/Amazon/.test(soloCursoPol.split("12. Links de afiliado")[1] || ""), "con solo un curso (no Amazon), la Política habla de 'a loja' y no de Amazon");
const resto = pagOn.filter((p) => /\{\{[A-Za-z0-9_:-]+\}\}/.test(leer(on.dir, p)));
ok(resto.length === 0, "encendido: ninguna página con marcas {{...}} sin reemplazar", resto.join(", "));
ok(sitemapUrls(on.dir).length === sitemapUrls(off.dir).length, "el sitemap no cambia");
const xss = constr(ON({ produtos: [{ ...conEnlaces()[0], titulo: '<img src=x onerror=alert(1)>', autor: 'A "B" & C', frase: '<b onmouseover=1>hola</b>', botao: '<i>ver</i>' }] }), "af-xss");
const hx = leer(xss.dir, "guias/como-fazer-tcc/index.html");
ok(!hx.includes("<img src=x") && hx.includes("&lt;img src=x onerror=alert(1)&gt;") && hx.includes("A &quot;B&quot; &amp; C"), "título y autor se escapan (no entra HTML)");
ok(!hx.includes("<b onmouseover") && !hx.includes("<i>ver</i>") && hx.includes("&lt;b onmouseover=1&gt;hola&lt;/b&gt;") && hx.includes("&lt;i&gt;ver&lt;/i&gt;"), "frase y botón también se escapan");

// ---------- H) curso de Hotmart ----------
seccion("H) curso de Hotmart (enlace intacto, texto legal y frase de Amazon según corresponda)");
const HOT = { id: "curso-hotmart", tipo: "curso", titulo: "Curso de exemplo Hotmart", autor: "Autora Exemplo", frase: "Curso em vídeo de exemplo sobre normas da ABNT.", url: "https://go.hotmart.com/X123456789Y", guias: ["normas-abnt"] };
const LIBROS_EJ = LIBROS.map((p, i) => ({ ...p, url: `https://www.amazon.com.br/dp/B00EJEMPLO${String(i + 1).padStart(2, "0")}` }));
const bloqueNormas = (dir) => (/<section class="afiliados"[\s\S]*?<\/section>/.exec(leer(dir, "guias/normas-abnt/index.html")) || [""])[0];
const soHot = constr({ afiliados: { ativo: true, amazonTag: "exemplo-20", legalAtualizadoEm: "2026-10-21", produtos: [HOT] } }, "af-hot");
ok(soHot.ok, "el build con solo un curso de Hotmart funciona", soHot.salida.slice(-300));
const bH = bloqueNormas(soHot.dir), polH = leer(soHot.dir, "politica-de-privacidade/index.html");
ok(bH.includes('href="https://go.hotmart.com/X123456789Y"') && !/tag=/.test(bH), "solo Hotmart: el hotlink sale exacto y SIN tag de Amazon");
ok(!bH.includes(FRASE) && !polH.includes(FRASE) && !/Livros podem trazer/.test(bH), "solo Hotmart: no aparece la frase de Amazon ni el aviso de libros");
ok(/<li><strong>lojas parceiras \(por exemplo, a Hotmart\)<\/strong>/.test(polH) && /Ao clicar em um link de afiliado, a Hotmart pode definir cookies/.test(polH) && /vai para a loja \(por exemplo, a Hotmart\)/.test(polH), "solo Hotmart: la Política dice «a Hotmart» en las secciones 3, 5 y 12");
const ambos = constr({ afiliados: { ativo: true, amazonTag: "exemplo-20", legalAtualizadoEm: "2026-10-21", produtos: LIBROS_EJ.concat(HOT) } }, "af-ambos");
ok(ambos.ok, "el build con libros de Amazon + curso de Hotmart funciona", ambos.salida.slice(-300));
const bA = bloqueNormas(ambos.dir), polA = leer(ambos.dir, "politica-de-privacidade/index.html");
ok(bA.includes(FRASE) && /Livros podem trazer/.test(bA) && bA.includes('href="https://go.hotmart.com/X123456789Y"'), "ambos: la guía con libros lleva la frase de Amazon, el aviso de libros y el hotlink de Hotmart intacto");
ok(/lojas parceiras \(por exemplo, a Amazon e a Hotmart\)/.test(polA) && /Ao clicar em um link de afiliado, a Amazon ou a Hotmart pode definir cookies/.test(polA), "ambos: la Política nombra a la Amazon y a la Hotmart");

// ---------- C) errores ----------
seccion("C) errores que el build debe dar");
const falla = (mod, quiere, msg) => { const r = construye(mod, "af-err"); limpiables.push(r.dir); ok(!r.ok && quiere.test(r.salida), msg, r.ok ? "el build NO falló" : r.salida.split("\n").find((l) => /Error/.test(l))); };
falla(ON({ amazonTag: "" }), /precisa do ID de afiliado/, "enlace de Amazon sin ID de afiliado (encendido): se niega");
falla(ON({ legalAtualizadoEm: null }), /legalAtualizadoEm/, "encendido con productos pero sin fecha legal: se niega");
falla(ON({ produtos: [{ ...conEnlaces()[0], url: "http://www.amazon.com.br/dp/X" }] }), /https/, "enlace sin https: se niega");
falla(ON({ produtos: [{ ...conEnlaces()[0], url: "https://www.amazon.com.br/dp/B00EJEMPLO01?tag=otra-cuenta-20" }] }), /outra conta/, "enlace con tag de otra cuenta: se niega (la comisión iría a otro lado)");
falla(ON({ produtos: [{ ...conEnlaces()[0], url: "javascript:alert(1)" }] }), /https|inválida/, "enlace javascript: se niega");
falla(ON({ produtos: [{ ...conEnlaces()[0], guias: ["no-existe"] }] }), /não existe/, "guía inexistente: se niega");
falla(ON({ produtos: [{ ...conEnlaces()[0], tipo: "pelicula" }] }), /livro.*curso/, "tipo inválido: se niega");
falla(ON({ produtos: [{ ...conEnlaces()[0], autor: "" }] }), /falta "autor"/, "libro sin autor: se niega");
falla(ON({ produtos: [conEnlaces()[0], { ...conEnlaces()[1], id: conEnlaces()[0].id }] }), /repetido/, "id repetido: se niega");
falla(ON({ produtos: [0, 1, 2, 3].map((i) => ({ ...conEnlaces()[i], id: `x${i}`, guias: ["margens-abnt"] })) }), /máximo é 3/, "4 productos en una guía: se niega");
falla(ON({ amazonTag: "con espacios!" }), /amazonTag/, "ID de afiliado mal escrito: se niega");
falla(ON({ produtos: [{ ...conEnlaces()[0], frase: "x".repeat(151) }] }), /frase/, "frase demasiado larga: se niega");

// ---------- D) diseño y accesibilidad ----------
seccion("D) diseño y accesibilidad en 320, 390 y 1280 px");
const servidor = await sirve(on.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-af-")) });
const revisa = async (ruta, ancho, tieneBloque) => {
  const p = await b.newPage();
  await p.setViewport({ width: ancho, height: 900, isMobile: ancho < 700, hasTouch: ancho < 700, deviceScaleFactor: 1 });
  const malos = [];
  p.on("response", (r) => { if (r.status() >= 400) malos.push(`${r.status()} ${r.url()}`); });
  p.on("pageerror", (e) => malos.push("error JS: " + e.message));
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await p.goto(servidor.url + ruta, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 400));
  const m = await p.evaluate(() => {
    const bl = document.querySelector(".afiliados");
    const col = bl ? bl.parentElement.getBoundingClientRect() : null;
    const x = bl ? bl.getBoundingClientRect() : null;
    const botones = [...document.querySelectorAll(".afiliado-botao")].map((e) => Math.round(e.getBoundingClientRect().height));
    const chicos = [...document.querySelectorAll(".afiliados *")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).length;
    const sellos = [...document.querySelectorAll(".afiliado-selo")].every((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility === "visible");
    return { desborde: document.documentElement.scrollWidth - innerWidth, cls: window.__cls, hay: !!bl, dentro: !bl || (x.left >= col.left - 1 && x.right <= col.right + 1), botones, chicos, sellos, tarjetas: document.querySelectorAll(".afiliado").length };
  });
  const et = `${ruta} ${ancho}px`;
  ok(m.hay === tieneBloque, `${et}: ${tieneBloque ? "tiene" : "no tiene"} el bloque`);
  ok(m.desborde <= 0, `${et}: sin desborde horizontal`, `${m.desborde}px`);
  ok(m.cls === 0, `${et}: CLS 0`, String(m.cls));
  ok(m.dentro, `${et}: el bloque cabe en su columna`);
  ok(m.botones.every((h) => h >= 44), `${et}: botones de 44 px o más`, m.botones.join(","));
  ok(m.chicos === 0 && m.sellos, `${et}: letra de 12 px o más y etiqueta "Link de afiliado" visible`);
  ok(malos.length === 0, `${et}: ningún recurso falla ni error de JS`, malos.slice(0, 3).join(" | "));
  const axe = await axeEn(p);
  ok(axe.length === 0, `${et}: accesibilidad (axe) sin problemas`, axe.length ? "\n" + describeAxe(axe) : "");
  await p.close();
};
for (const ancho of [320, 390, 1280]) {
  for (const g of ["como-fazer-tcc", "resumo-abnt", "consideracoes-finais-tcc"]) await revisa(`/guias/${g}/`, ancho, true);
  await revisa("/guias/margens-abnt/", ancho, false);
}
for (const ruta of ["/termos-de-uso/", "/politica-de-privacidade/"]) for (const ancho of [390, 1280]) await revisa(ruta, ancho, false);
await b.close();
await servidor.cierra();
for (const d of limpiables) limpia(d);

console.log(`\n${fallos ? "FALLÓ" : "Todo OK"}: ${total - fallos}/${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
