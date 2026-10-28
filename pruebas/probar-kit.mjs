// Kit TCC (/kit-tcc/): página de venda de um producto digital que se vende en Hotmart. Construye el sitio con copias de site.config.json
// (no toca dist/ ni el servidor :3000) y comprueba:
//   A) apagado (la configuración real): la página, su CSS y sus imágenes NO existen; ninguna otra página habla del kit; textos legales intactos;
//   B) encendido (link de prueba): página, sitemap, enlaces en el pie y en la página del servicio, secciones en Términos y Política, datos estructurados;
//   C) los errores que el build debe dar (encender sin link de Hotmart, link ajeno, garantía fuera de rango, precio mal escrito, sin fecha legal);
//   D) diseño en 320, 390, 768 y 1280 px: sin desborde, CLS ~0, objetivos táctiles, axe, barra fija solo en el celular, sin pedidos a terceros.
// Uso: node probar-kit.mjs   (desde pruebas/)
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { CONFIG_REAL, construye, leer, existe, paginasHtml, sirve, limpia } from "./lib-anuncie.mjs";
import { axeEn, describeAxe } from "./lib-axe.mjs";

let fallos = 0, total = 0;
const ok = (c, m, e = "") => { total++; if (!c) { fallos++; console.log(`  FALLA: ${m}${e ? " -> " + e : ""}`); } };
const seccion = (t) => console.log(`\n== ${t}`);
const LINK = "https://pay.hotmart.com/PRUEBA123X";
const limpiables = [];
const constr = (mod, nombre) => { const r = construye(mod, nombre); limpiables.push(r.dir); return r; };
const kitOn = (extra = {}) => ({ kit: { ativo: true, urlCompra: LINK, legalAtualizadoEm: "2026-10-28", ...extra } });
const sitemapUrls = (dir) => [...leer(dir, "sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const todosLosArchivos = (dir) => { const out = []; const rec = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? rec(p) : out.push(p); } }; rec(dir); return out; };
const textoLegal = (dir, rel) => leer(dir, rel).replace(/<[^>]+>/g, " ");

// ---------- A) apagado ----------
seccion("A) kit apagado (se fuerza ativo:false sobre la configuración real)");
ok(CONFIG_REAL.kit && typeof CONFIG_REAL.kit.ativo === "boolean", "site.config.json tiene el interruptor kit.ativo");
ok(!CONFIG_REAL.kit.ativo || (/^https:\/\/(pay|go)\.hotmart\.com\//.test(CONFIG_REAL.kit.urlCompra) && /^\d{4}-\d{2}-\d{2}$/.test(CONFIG_REAL.kit.legalAtualizadoEm)), "si el kit está encendido en la configuración real, tiene link de Hotmart y fecha legal");
ok(CONFIG_REAL.kit.preco === "29,90", "el precio decidido es 29,90", CONFIG_REAL.kit.preco);
const off = constr({ kit: { ativo: false } }, "kitoff");
ok(off.ok, "el build con el kit apagado funciona", off.salida.slice(-300));
ok(!existe(off.dir, "kit-tcc/index.html"), "apagado: la página /kit-tcc/ no existe");
ok(!existe(off.dir, "assets/css/kit.css"), "apagado: kit.css no se publica");
ok(!existe(off.dir, "assets/img/kit/checklist.webp") && !existe(off.dir, "assets/img/kit"), "apagado: las imágenes del kit no se publican");
ok(!sitemapUrls(off.dir).some((u) => u.includes("/kit-tcc")), "apagado: fuera del sitemap");
const archivos = todosLosArchivos(off.dir).filter((f) => /\.(html|js|json|xml|txt|css|svg|webmanifest)$/.test(f));
const mencionan = archivos.filter((f) => /kit-tcc|Kit TCC/i.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(off.dir, f));
ok(mencionan.length === 0, "apagado: ningún archivo del sitio nombra el kit", mencionan.join(", "));
const sinResolver = paginasHtml(off.dir).filter((p) => /\{\{[A-Za-z0-9_:-]+\}\}|<!--\/?KIT:/.test(leer(off.dir, p)));
ok(sinResolver.length === 0, "apagado: ninguna página tiene {{marcas}} ni <!--KIT:--> sin resolver", sinResolver.join(", "));
const tOff = leer(off.dir, "termos-de-uso/index.html"), pOff = leer(off.dir, "politica-de-privacidade/index.html");
ok(/<h2>11\. Lei aplicável, foro e contato<\/h2>/.test(tOff) && !/Hotmart<\/strong>, onde é feita/.test(pOff), "apagado: Términos con 11 secciones y Política sin la compra del kit");
ok(/<h3>2\.5\. Publicidade/.test(pOff), "apagado: la Política sigue con la sección 2.5 Publicidade");
ok(leer(off.dir, "index.html").length > 1000, "apagado: la portada se construye");

// ---------- B) encendido ----------
seccion("B) kit encendido (link de prueba)");
const on = constr(kitOn(), "kiton");
ok(on.ok, "el build con el kit encendido funciona", on.salida.slice(-300));
const pagina = leer(on.dir, "kit-tcc/index.html");
ok(existe(on.dir, "assets/css/kit.css") && existe(on.dir, "assets/img/kit/modelo-capa.webp"), "encendido: kit.css y las imágenes se publican");
ok(sitemapUrls(on.dir).some((u) => u.endsWith("/kit-tcc/")), "encendido: la página entra en el sitemap");
ok(!/name="robots"/.test(pagina), "encendido: sin noindex");
ok((pagina.match(/<h1[ >]/g) || []).length === 1, "un solo h1");
ok(/<link rel="canonical" href="https:\/\/estudasimples\.com\.br\/kit-tcc\/">/.test(pagina), "canonical correcto");
ok(pagina.includes(LINK), "el botón de compra lleva el link de Hotmart de la configuración");
const botones = [...pagina.matchAll(/<a class="btn btn-acento[^"]*" href="([^"]+)"([^>]*)>Quero o Kit TCC/g)];
ok(botones.length === 3 && botones.every((b) => b[1] === LINK && /target="_blank"/.test(b[2]) && /rel="noopener noreferrer"/.test(b[2])), "los 3 botones de compra (héroe, final y barra) llevan el link, target _blank y rel noopener", String(botones.length));
ok(pagina.includes("R$\u00a029,90"), "el precio sale como R$ 29,90 (con espacio sin quiebre)");
ok(/Garantia de 7 dias/.test(pagina), "la garantía sale de la configuración (7 días)");
for (const t of ["Modelo em Word", "Checklist em PDF", "Guia rápido", "Exemplo em PDF", "Geradores gratuitos", "Escreveu com ajuda de inteligência artificial", "não foi testado no Google Docs", "CNPJ 67.704.102/0001-69", "não detecta"]) ok(pagina.includes(t) || pagina.includes(t.replace("não detecta", "Não detecta")), `la página dice «${t}»`);
const ld = [...pagina.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch (e) { return null; } });
ok(ld.length === 3 && ld.every(Boolean), "datos estructurados válidos (Product, BreadcrumbList, FAQPage)", String(ld.length));
const prod = ld.find((x) => x && x["@type"] === "Product");
ok(prod && prod.offers.price === "29.90" && prod.offers.priceCurrency === "BRL" && prod.offers.url === "https://estudasimples.com.br/kit-tcc/", "Product: precio 29.90 BRL y url de la propia página", JSON.stringify(prod && prod.offers));
ok(prod && !("aggregateRating" in prod) && !("review" in prod), "Product: sin reseñas ni calificaciones inventadas");
const faq = ld.find((x) => x && x["@type"] === "FAQPage");
ok(faq && faq.mainEntity.length === 8 && (pagina.match(/<details>/g) || []).length === 8, "8 preguntas, visibles y en los datos estructurados");
ok(faq && /7 dias/.test(JSON.stringify(faq)) && !/\{\{/.test(JSON.stringify(faq)), "la FAQ muestra la garantía real y ninguna {{marca}}");
ok(!/\{\{|<!--\/?KIT:/.test(pagina), "la página no tiene marcas sin resolver");
const tabla = pagina.match(/<table class="kit-tabela">[\s\S]*?<\/table>/);
ok(tabla && /<caption/.test(tabla[0]) && (tabla[0].match(/<th scope="row">/g) || []).length === 7 && (tabla[0].match(/<th scope="col"/g) || []).length === 3, "tabla gratis vs kit: caption, 3 columnas y 7 filas con encabezados");
// enlaces en el resto del sitio
const htmls = paginasHtml(on.dir).filter((p) => p !== "kit-tcc/index.html" && p !== "404.html");
const sinPie = htmls.filter((p) => !leer(on.dir, p).includes('<a href="/kit-tcc/">Kit TCC (modelo em Word)</a>'));
ok(sinPie.length === 0, "encendido: el pie de TODAS las páginas enlaza el kit", sinPie.slice(0, 5).join(", "));
ok(leer(on.dir, "formatacao-abnt-tcc/index.html").includes('href="/kit-tcc/#origem=servico">Kit TCC</a>, o modelo completo em Word, por R$\u00a029,90'), "encendido: la página del servicio menciona el kit con su precio");
const GUIAS_KIT = ["sumario-automatico-word", "numeracao-de-paginas-abnt", "normas-abnt-no-word", "margens-abnt", "fonte-e-espacamento-abnt", "titulos-e-subtitulos-abnt", "normas-abnt-tcc", "normas-abnt", "como-fazer-tcc", "lista-de-ilustracoes-e-tabelas-abnt", "modelos-de-capa-abnt"].map((g) => `guias/${g}/index.html`);
const CON_KIT = ["formatacao-abnt-tcc/index.html", "index.html", "gerador-de-sumario-abnt/index.html", ...GUIAS_KIT];
const sinTarjeta = GUIAS_KIT.filter((p) => !/<aside class="oferta" aria-label="Kit TCC">[\s\S]*href="\/kit-tcc\/#origem=guia-oferta"/.test(leer(on.dir, p)));
ok(sinTarjeta.length === 0, "encendido: las 11 guías de formato llevan la tarjeta del Kit TCC", sinTarjeta.join(", "));
ok(/id="kit-tcc-faixa"/.test(leer(on.dir, "index.html")) && /href="\/kit-tcc\/#origem=inicio-oferta"/.test(leer(on.dir, "index.html")), "encendido: la portada tiene la franja del Kit TCC");
ok(/não se atualiza sozinho/.test(leer(on.dir, "gerador-de-sumario-abnt/index.html")) && /href="\/kit-tcc\/#origem=sumario-aviso"/.test(leer(on.dir, "gerador-de-sumario-abnt/index.html")), "encendido: el generador de sumario avisa que su Word no se actualiza solo y menciona el kit");
const otrosConKit = htmls.filter((p) => !CON_KIT.includes(p) && /href="\/kit-tcc\/#/.test(leer(on.dir, p)));
ok(otrosConKit.length === 0, "encendido: solo el pie, la portada, el servicio, el generador de sumario y las 11 guías de formato enlazan el kit (ningún enlace extra)", otrosConKit.join(", "));
// textos legales
const t = textoLegal(on.dir, "termos-de-uso/index.html"), p = textoLegal(on.dir, "politica-de-privacidade/index.html");
const tHtml = leer(on.dir, "termos-de-uso/index.html"), pHtml = leer(on.dir, "politica-de-privacidade/index.html");
ok(/<h2 id="kit-tcc">11\. Kit TCC \(produto digital\)<\/h2>/.test(tHtml) && /<h2>12\. Lei aplicável, foro e contato<\/h2>/.test(tHtml), "Términos: nueva sección 11 Kit TCC y la última pasa a 12");
for (const h of ["11.1. Compra, pagamento e entrega", "11.2. Reembolso", "11.3. Licença de uso", "11.4. O que o kit é e o que não é"]) ok(t.includes(h), `Términos: «${h}»`);
ok(/em até 7 dias, contados da compra/.test(t) && /art\. 49/.test(t), "Términos: reembolso de 7 días (de la configuración) y art. 49 del CDC");
ok(/não detecta texto de inteligência artificial/.test(t) && /Google Docs/.test(t), "Términos: dice que no detecta IA y que no se probó en Google Docs");
ok(/<h3 id="kit-tcc">2\.5\. Compra do Kit TCC<\/h3>/.test(pHtml) && /<h3>2\.6\. Publicidade/.test(pHtml), "Política: nueva sección 2.5 y Publicidade pasa a 2.6");
ok(/<strong>a Hotmart<\/strong>/.test(pHtml) && /LGPD/.test(p), "Política: la Hotmart entra en la lista de quien recibe datos, con base legal");
ok(/28 de outubro de 2026/.test(t) && /28 de outubro de 2026/.test(p), "«Última atualização» de Términos y Política pasa a la fecha legal del kit");
// numeración: sin repetidos, consecutiva, y referencias cruzadas coherentes (con afiliados visibles, como en la configuración real)
const numeros = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const consecutivos = (l, n) => l.length === n && l.every((x, i) => x === String(i + 1));
ok(consecutivos(numeros(tHtml, /<h2[^>]*>(\d+)\./g), 13), "Términos con el kit: 13 secciones numeradas del 1 al 13 sin repetir", numeros(tHtml, /<h2[^>]*>(\d+)\./g).join());
ok(/<h2 id="links-de-afiliado">13\. Links de afiliado<\/h2>/.test(tHtml) && /Veja a seção 13\./.test(tHtml), "Términos con el kit: afiliados pasa a la 13 y la sección 9 remite a la 13");
ok(consecutivos(numeros(tHtml, /<h3>11\.(\d+)\./g), 4), "Términos con el kit: subsecciones 11.1 a 11.4");
ok(consecutivos(numeros(pHtml, /<h2[^>]*>(\d+)\./g), 12), "Política con el kit: 12 secciones del 1 al 12 sin repetir", numeros(pHtml, /<h2[^>]*>(\d+)\./g).join());
ok(consecutivos(numeros(pHtml, /<h3[^>]*>2\.(\d+)\./g), 6), "Política con el kit: subsecciones 2.1 a 2.6", numeros(pHtml, /<h3[^>]*>2\.(\d+)\./g).join());
ok(/Dados da compra do Kit TCC/.test(pHtml) && /Há também um produto digital pago, o Kit TCC, descrito na seção 11/.test(tHtml), "Política (sección 6) y Términos (sección 2) mencionan el kit");
const tOffHtml = leer(off.dir, "termos-de-uso/index.html"), pOffHtml = leer(off.dir, "politica-de-privacidade/index.html");
ok(consecutivos(numeros(tOffHtml, /<h2[^>]*>(\d+)\./g), 12) && /<h2 id="links-de-afiliado">12\. Links de afiliado<\/h2>/.test(tOffHtml) && /Veja a seção 12\./.test(tOffHtml), "Términos sin el kit: 12 secciones y afiliados en la 12");
ok(consecutivos(numeros(pOffHtml, /<h2[^>]*>(\d+)\./g), 12) && consecutivos(numeros(pOffHtml, /<h3[^>]*>2\.(\d+)\./g), 5), "Política sin el kit: 12 secciones y subsecciones 2.1 a 2.5");
// ninguna otra página cambia de contenido salvo pie y servicio, Términos y Política
const cambian = htmls.filter((x) => !["formatacao-abnt-tcc/index.html", "termos-de-uso/index.html", "politica-de-privacidade/index.html", ...CON_KIT].includes(x) && leer(on.dir, x).replace(/<footer[\s\S]*?<\/footer>/, "") !== leer(off.dir, x).replace(/<footer[\s\S]*?<\/footer>/, "").replace(/\?v=[a-z0-9]+/g, (m) => m));
const cambianReal = cambian.filter((x) => leer(on.dir, x).replace(/<footer[\s\S]*?<\/footer>/, "").replace(/\?v=[a-z0-9]+/g, "") !== leer(off.dir, x).replace(/<footer[\s\S]*?<\/footer>/, "").replace(/\?v=[a-z0-9]+/g, ""));
ok(cambianReal.length === 0, "las demás páginas solo cambian en el pie (comparado con el kit apagado)", cambianReal.slice(0, 4).join(", "));

// ---------- C) errores del build ----------
seccion("C) errores que el build debe dar");
const falla = (mod, texto, nombre) => { const r = constr(mod, nombre); ok(!r.ok && r.salida.includes(texto), `${nombre}: el build se niega («${texto}»)`, r.salida.slice(-200)); };
falla({ kit: { ativo: true, urlCompra: "", legalAtualizadoEm: "2026-10-28" } }, "urlCompra", "kitsinlink");
falla({ kit: { ativo: true, urlCompra: "https://www.ejemplo.com/comprar", legalAtualizadoEm: "2026-10-28" } }, "urlCompra", "kitlinkajeno");
falla({ kit: { ativo: true, urlCompra: "http://pay.hotmart.com/X1", legalAtualizadoEm: "2026-10-28" } }, "urlCompra", "kitlinkhttp");
falla({ kit: { ativo: true, urlCompra: LINK, legalAtualizadoEm: "" } }, "legalAtualizadoEm", "kitsinfecha");
falla({ kit: { garantiaDias: 3 } }, "garantiaDias", "kitgarantia3");
falla({ kit: { garantiaDias: 45 } }, "garantiaDias", "kitgarantia45");
falla({ kit: { preco: "29.90" } }, "preco", "kitprecomal");
falla({ kit: { preco: "0,00" } }, "preco", "kitprecocero");
falla({ kit: { ativo: true, urlCompra: LINK, legalAtualizadoEm: "2026-13-45" } }, "legalAtualizadoEm", "kitfechamala");
ok(constr({ kit: { ativo: false, urlCompra: "", legalAtualizadoEm: "" } }, "kitapagadovacio").ok, "apagado y con los campos vacíos el build sí funciona");
const on2 = constr(kitOn({ preco: "39,90", garantiaDias: 14, urlCompra: "https://go.hotmart.com/K108121126P" }), "kitcambia");
ok(on2.ok && leer(on2.dir, "kit-tcc/index.html").includes("R$\u00a039,90") && /Garantia de 14 dias/.test(leer(on2.dir, "kit-tcc/index.html")) && leer(on2.dir, "kit-tcc/index.html").includes("https://go.hotmart.com/K108121126P"), "cambiar precio, garantía y link en la configuración se refleja en la página");

// ---------- D) diseño ----------
seccion("D) pantallas, accesibilidad y red (con el kit encendido)");
const srv = await sirve(on.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
async function abre(ancho, alto, movil) {
  const ctx = await b.createBrowserContext();
  const pg = await ctx.newPage();
  await pg.setViewport({ width: ancho, height: alto, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 });
  const errores = [], pedidos = [];
  pg.on("pageerror", (e) => errores.push(e.message));
  pg.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  await pg.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await pg.goto(srv.url + "/kit-tcc/", { waitUntil: "networkidle0" });
  pg.on("request", (r) => pedidos.push(r.url()));
  await pg.evaluate(() => { document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel", "visible", "in", "revelado")); return document.fonts.ready; });
  return { pg, ctx, errores, pedidos };
}
for (const [w, h, movil] of [[320, 700, true], [390, 844, true], [768, 1000, false], [1280, 900, false]]) {
  const { pg, ctx, errores } = await abre(w, h, movil);
  ok((await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${w}px: sin scroll horizontal`);
  const peq = await pg.$$eval("main a.btn, .hero-botoes a.btn, .barra-kit a.btn", (l) => l.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).map((e) => e.textContent.trim().slice(0, 25)));
  ok(peq.length === 0, `${w}px: botones de 44 px o más de alto`, peq.join());
  const barra = await pg.$eval("#barraKit", (e) => getComputedStyle(e).display);
  ok(w < 900 ? barra === "flex" : barra === "none", `${w}px: la barra fija de compra ${w < 900 ? "se ve" : "no se ve"} (${barra})`);
  const sinDims = await pg.$$eval("img", (l) => l.filter((i) => !i.getAttribute("width") || !i.getAttribute("height") || !i.getAttribute("alt")).map((i) => i.src));
  ok(sinDims.length === 0, `${w}px: todas las imágenes con ancho, alto y alt`, sinDims.join());
  const cls = await pg.evaluate(() => window.__cls);
  ok(cls < 0.02, `${w}px: sin saltos de layout (CLS ${cls.toFixed(4)})`);
  ok(errores.length === 0, `${w}px: sin errores de consola`, errores.join(" | "));
  await ctx.close();
}
{
  const { pg, ctx, pedidos } = await abre(390, 844, true);
  const externos = pedidos.filter((u) => !u.startsWith(srv.url) && !u.startsWith("data:"));
  ok(externos.length === 0, "ningún pedido a terceros al cargar la página (el link de Hotmart solo se abre al tocar)", externos.join(" | "));
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo({ top: 0, behavior: "instant" }); await new Promise((r) => setTimeout(r, 400)); });
  const rotas = await pg.$$eval("img", (l) => l.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute("src")));
  ok(rotas.length === 0, "todas las imágenes cargan al bajar por la página (las perezosas también)", rotas.join());
  const caja = await pg.$eval(".kit-tabela-caixa", (e) => ({ scroll: e.scrollWidth > e.clientWidth, tab: e.tabIndex, role: e.getAttribute("role") }));
  ok(caja.scroll && caja.tab === 0 && caja.role === "region", "la tabla se desplaza en el celular y se alcanza con teclado (tabindex y role=region)");
  await ctx.close();
}
{
  const { pg, ctx } = await abre(1280, 900, false);
  const axe = await axeEn(pg);
  ok(axe.length === 0, "accesibilidad (axe) en computador", axe.length ? "\n" + describeAxe(axe) : "");
  const dos = await pg.evaluate(() => { const c = document.querySelector(".hero-texto").getBoundingClientRect(), k = document.querySelector(".kit-colagem").getBoundingClientRect(); return k.left > c.right - 5; });
  ok(dos, "computador: texto del héroe y colagem de páginas lado a lado");
  await ctx.close();
}
{
  const { pg, ctx } = await abre(390, 844, true);
  const axe = await axeEn(pg);
  ok(axe.length === 0, "accesibilidad (axe) en celular", axe.length ? "\n" + describeAxe(axe) : "");
  await ctx.close();
}
await b.close();
await srv.cierra();
for (const d of limpiables) limpia(d);
console.log(`\n${fallos ? fallos + " FALLOS de " : "Todo OK: "}${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
