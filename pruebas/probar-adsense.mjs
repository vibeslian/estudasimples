// Etapa 18: Google AdSense, apagado por defecto + ads.txt + aviso de cookies.
// Construye el sitio varias veces con copias de site.config.json (no toca dist/ ni el servidor :3000) y comprueba:
//   A) apagado (la configuración real): nada del Google en ninguna página, ads.txt y etiqueta de verificación, textos legales "futuros";
//   B) encendido con IDs de bloque de EJEMPLO (inventados): aviso, script, <ins>, rodapé, textos legales en presente y fecha;
//   C) los errores que el build debe dar;
//   D) navegador (sitio encendido, con googlesyndication interceptado: nunca se contacta a Google de verdad):
//      nada se carga antes de elegir; "Recusar" pide anuncios no personalizados; "Aceitar" no; la elección se guarda y se respeta;
//      "Preferências de anúncios" reabre el aviso; sin almacenamiento el aviso vuelve; CLS 0; sin desborde en 320/390/1280; axe sin problemas.
// Uso: node probar-adsense.mjs   (desde pruebas/)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { CONFIG_REAL, construye, leer, existe, paginasHtml, sirve, limpia } from "./lib-anuncie.mjs";
import { axeEn, describeAxe } from "./lib-axe.mjs";

let fallos = 0, total = 0;
const ok = (cond, msg, extra = "") => { total++; if (!cond) { fallos++; console.log(`  FALLA: ${msg}${extra ? " -> " + extra : ""}`); } };
const seccion = (t) => console.log(`\n== ${t}`);
const limpiables = [];
const constr = (mod, nombre) => { const r = construye(mod, nombre); limpiables.push(r.dir); return r; };
const CLIENTE = "ca-pub-3212984323046188";
const ON = (extra = {}) => ({ anuncios: { adsenseAtivo: true, adsense: { blocos: { conteudo: "1234567890", lateral: "0987654321" }, legalAtualizadoEm: "2026-10-22", ...extra } } });

// ---------- A) apagado ----------
seccion("A) apagado (configuración real)");
const AN = CONFIG_REAL.anuncios;
ok(AN.adsenseAtivo === false, "anuncios.adsenseAtivo está en false en la configuración real");
ok(AN.adsense.cliente === CLIENTE, "el ID del editor es el de la cuenta de feriasclaras.com.br");
const off = constr({}, "ads-off");
ok(off.ok, "el build con la configuración real funciona", off.salida.slice(-300));
const paginas = paginasHtml(off.dir);
ok(paginas.length >= 40, `se construyeron ${paginas.length} páginas`);
ok(leer(off.dir, "ads.txt") === `google.com, pub-3212984323046188, DIRECT, f08c47fec0942fa0\n`, "ads.txt tiene exactamente la línea de AdSense");
ok(!leer(off.dir, "sitemap.xml").includes("ads.txt"), "ads.txt no está en el sitemap");
ok(!existe(off.dir, "assets/js/anuncios.js"), "no se publica anuncios.js (el aviso de cookies)");
let sinGoogle = true, conMeta = true, conIns = false, conAviso = false;
for (const p of paginas) {
  const h = leer(off.dir, p);
  if (/googlesyndication|adsbygoogle|doubleclick|anuncios\.js/.test(h)) { sinGoogle = false; console.log("  Google/AdSense en", p); }
  if (!h.includes(`<meta name="google-adsense-account" content="${CLIENTE}">`)) { conMeta = false; console.log("  falta la etiqueta en", p); }
  if (/<ins\b/.test(h)) conIns = true;
  if (h.includes("aviso-anuncios") || h.includes("data-anuncios-preferencias")) conAviso = true;
}
ok(sinGoogle, "ninguna página nombra ni carga googlesyndication / adsbygoogle / doubleclick");
ok(conMeta, "todas las páginas llevan <meta name=google-adsense-account> (verificación; sin cookies ni scripts)");
ok(!conIns, "ninguna página tiene bloques <ins> de AdSense");
ok(!conAviso, "ninguna página tiene el aviso de cookies ni el enlace 'Preferências de anúncios'");
ok(!/ADS:(ON|OFF)/.test(paginas.map((p) => leer(off.dir, p)).join("")), "no quedan marcas <!--ADS:...--> en ninguna página");
const polOff = leer(off.dir, "politica-de-privacidade/index.html");
const terOff = leer(off.dir, "termos-de-uso/index.html");
ok(polOff.includes("O site não exibe anúncios de terceiros hoje") && polOff.includes("No futuro, o site poderá exibir anúncios do Google AdSense"), "la Política sigue diciendo que hoy no hay anuncios de terceiros");
ok(polOff.includes("Antes de exibir anúncios personalizados, o site vai mostrar um aviso sobre cookies"), "la Política mantiene la promesa del aviso de cookies");
ok(polOff.includes('<h2 id="anuncios">4. Anúncios e Google AdSense</h2>'), "la sección 4 de la Política tiene el ancla #anuncios");
ok(terOff.includes("No futuro, o site poderá exibir anúncios de terceiros"), "los Termos siguen en futuro");
ok(!polOff.includes("es-anuncios") && !polOff.includes("Preferências de anúncios"), "apagado: la Política no habla del localStorage de los anuncios (las herramientas del ENEM sí usan localStorage y lo declaran en la sección 2.1)");
const espOff = paginas.map((p) => (leer(off.dir, p).match(/class="anuncio[^"]*anuncio--desligado/g) || []).length).reduce((a, b) => a + b, 0);
ok(espOff > 0, `los espacios de anuncio siguen presentes pero apagados (${espOff})`);

// ---------- B) encendido ----------
seccion("B) encendido (IDs de bloque de ejemplo)");
const on = constr(ON(), "ads-on");
ok(on.ok, "el build encendido funciona", on.salida.slice(-300));
const paginasOn = paginasHtml(on.dir);
ok(existe(on.dir, "assets/js/anuncios.js"), "se publica anuncios.js");
const js = leer(on.dir, "assets/js/anuncios.js");
ok(js.includes(`var CLIENTE = "${CLIENTE}"`) && !js.includes("{{"), "anuncios.js lleva el ID del editor y ningún {{marcador}} sin resolver");
ok(js.indexOf("pagead2.googlesyndication.com") > js.indexOf("function carregar"), "el script del Google solo se crea dentro de carregar() (después de la elección)");
let todasAviso = true, scriptAntes = false, libres = 0, insBien = true;
for (const p of paginasOn) {
  const h = leer(on.dir, p);
  if (!h.includes('id="aviso-anuncios"') || !h.includes("data-anuncios-preferencias") || !h.includes("/assets/js/anuncios.js?v=")) { todasAviso = false; console.log("  falta aviso/enlace/script en", p); }
  if (/<script[^>]*googlesyndication/.test(h)) scriptAntes = true; // en el HTML nunca debe haber un <script> del Google
  for (const m of h.matchAll(/<ins class="adsbygoogle"[^>]*>/g)) {
    const lat = /width:300px;height:600px/.test(m[0]);
    if (!m[0].includes(`data-ad-client="${CLIENTE}"`) || !m[0].includes(lat ? 'data-ad-slot="0987654321"' : 'data-ad-slot="1234567890"')) insBien = false;
    libres++;
  }
  if (/ADS:(ON|OFF)/.test(h)) { todasAviso = false; console.log("  marca sin resolver en", p); }
}
ok(todasAviso, "todas las páginas llevan el aviso, el enlace del rodapé y anuncios.js, sin marcas sin resolver");
ok(!scriptAntes, "ningún <script> del Google está escrito en el HTML (lo crea anuncios.js tras la elección)");
ok(libres > 0 && insBien, `los bloques <ins> llevan el ID del editor y el del bloque correcto (${libres} en total)`);
const capaOn = leer(on.dir, "gerador-de-capa-abnt/index.html");
ok(/class="oferta"/.test(capaOn) && !/data-slot="capa-meio-1"[^>]*>\s*<span>Anúncio<\/span>\s*<ins/.test(capaOn), "el espacio con oferta propia (capa-meio-1) no recibe bloque del Google");
ok(/class="anuncio anuncio--separado anuncio--ligado" data-slot="capa-abaixo-da-ferramenta"/.test(capaOn), "los espacios de AdSense quedan 'ligados' (reservan altura)");
const polOn = leer(on.dir, "politica-de-privacidade/index.html");
const terOn = leer(on.dir, "termos-de-uso/index.html");
ok(!polOn.includes("não exibe anúncios de terceiros hoje") && !polOn.includes("No futuro, o site poderá exibir") && !/quando os anúncios forem ativados/i.test(polOn) && !/será o seu consentimento/.test(polOn) && !polOn.includes("uso futuro"), "la Política ya no habla en futuro");
ok(polOn.includes("O site exibe anúncios do Google AdSense") && polOn.includes("Nenhum anúncio, e nenhum script do Google, é carregado antes de você escolher"), "la Política describe el aviso y que nada se carga antes de elegir");
ok(polOn.includes("localStorage") && polOn.includes("es-anuncios") && polOn.includes("Preferências de anúncios"), "la Política declara el localStorage del aviso y cómo cambiar la elección");
ok(polOn.includes("22 de outubro de 2026"), "la Política muestra la fecha de actualización de AdSense", (/Última atualização: [^<]+/.exec(polOn) || [""])[0]);
ok(polOn.includes("A sua escolha sobre anúncios personalizados: fica guardada no seu navegador") && polOn.includes("Para a personalização dos anúncios, a base legal é o seu consentimento"), "la Política declara el plazo de guardado de la elección (sección 6) y ajusta la base legal a la personalización");
ok(!/será o seu consentimento|uso futuro/.test(polOn) && !/forem ativados/i.test(polOn), "la Política encendida no conserva ningún 'será'/'forem ativados' del texto de futuro");
ok(!polOff.includes("A sua escolha sobre anúncios personalizados") && !polOff.includes("Para a personalização dos anúncios"), "la Política apagada no menciona la elección ni la base legal nueva");
ok(capaOn.includes("Nada do Google é carregado antes da sua escolha") && capaOn.includes("ainda pode usar cookies para medir anúncios") && capaOn.includes('role="dialog"'), "el aviso dice la verdad sobre lo que se carga, avisa de las cookies de medición y es un diálogo no modal");
ok(terOn.includes("O site exibe anúncios de terceiros") && terOn.includes("22 de outubro de 2026"), "los Termos hablan en presente y llevan la misma fecha");
ok(on.config && leer(on.dir, "ads.txt") === leer(off.dir, "ads.txt"), "ads.txt es igual encendido y apagado");
// fecha: gana la más reciente entre afiliados y AdSense
const AF = CONFIG_REAL.afiliados;
const mix = constr({ ...ON({ legalAtualizadoEm: "2026-10-05" }), afiliados: { legalAtualizadoEm: "2026-10-30" } }, "ads-mix");
ok(mix.ok && /Última atualização: 30 de outubro de 2026/.test(leer(mix.dir, "politica-de-privacidade/index.html")), "con afiliados más nuevos que AdSense, la fecha legal es la de afiliados (la más reciente)", AF.ativo ? "" : "(afiliados apagado: no aplica)");

// ---------- C) errores ----------
seccion("C) errores del build");
const casos = [
  ["sin ID de bloque de contenido", ON({ blocos: { conteudo: "", lateral: "0987654321" } }), "blocos.conteudo"],
  ["sin ID de bloque lateral", ON({ blocos: { conteudo: "1234567890", lateral: "" } }), "blocos.lateral"],
  ["ID de bloque inválido", ON({ blocos: { conteudo: "abc", lateral: "0987654321" } }), "10 números"],
  ["sin fecha legal", ON({ legalAtualizadoEm: "" }), "legalAtualizadoEm"],
  ["ID de editor inválido", { anuncios: { adsense: { cliente: "pub-123" } } }, "ca-pub-"],
];
for (const [nombre, mod, texto] of casos) {
  const r = constr(mod, "ads-err");
  ok(!r.ok && r.salida.includes(texto), `${nombre}: el build se detiene con un mensaje claro`, r.ok ? "construyó igual" : r.salida.slice(-200));
}
const apagadoConIds = constr({ anuncios: { adsense: { blocos: { conteudo: "1234567890", lateral: "0987654321" } } } }, "ads-off-ids");
ok(apagadoConIds.ok && !/adsbygoogle/.test(leer(apagadoConIds.dir, "index.html")), "apagado con IDs cargados: sigue sin aparecer nada del Google");

// ---------- D) navegador ----------
seccion("D) navegador (sitio encendido; Google interceptado)");
const srv = await sirve(on.dir);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "es-ads-")) });
const GOOGLE = /googlesyndication\.com|doubleclick\.net|google\.com\/pagead/;
const nueva = async (w = 1280, h = 900) => {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 }); // igual que probar-sitio.mjs
  const peticiones = [];
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    const u = r.url();
    if (GOOGLE.test(u)) { peticiones.push(u); r.respond({ status: 200, contentType: "text/javascript", body: "window.__googleCargado=(window.__googleCargado||0)+1;" }); } else r.continue();
  });
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  return { p, ctx, peticiones };
};
const URL = srv.url + "/gerador-de-capa-abnt/";
const visible = (p) => p.$eval("#aviso-anuncios", (e) => !e.hidden && getComputedStyle(e).display !== "none");

{ // 1) primera visita: aviso visible, nada del Google
  const { p, ctx, peticiones } = await nueva();
  await p.goto(URL, { waitUntil: "networkidle0" });
  ok(await visible(p), "primera visita: el aviso de cookies se ve");
  ok(peticiones.length === 0, "primera visita: ninguna petición a Google antes de elegir", peticiones.join(" | "));
  const btns = await p.$$eval("#aviso-anuncios [data-anuncios-escolha]", (bs) => bs.map((x) => ({ t: x.textContent.trim(), h: x.getBoundingClientRect().height, w: x.getBoundingClientRect().width })));
  ok(btns.length === 2 && /Recusar/.test(btns[0].t) && /Aceitar/.test(btns[1].t), "hay dos botones: Recusar anúncios personalizados y Aceitar anúncios personalizados", JSON.stringify(btns));
  ok(btns.every((x) => x.h >= 44) && Math.abs(btns[0].w - btns[1].w) < 2 && Math.abs(btns[0].h - btns[1].h) < 2, "los dos botones tienen el mismo tamaño (mismo peso) y son táctiles (>=44 px)");
  const prefsVisible = await p.$eval("[data-anuncios-preferencias]", (e) => e.textContent.trim());
  ok(prefsVisible === "Preferências de anúncios", "el rodapé tiene 'Preferências de anúncios'");
  const cls = await p.evaluate(() => window.__cls);
  ok(cls === 0, "CLS 0 con el aviso", String(cls));
  // Recusar
  await p.click('[data-anuncios-escolha="nao-personalizados"]');
  await p.waitForFunction(() => window.__googleCargado === 1, { timeout: 4000 }).catch(() => {});
  ok(!(await visible(p)), "tras elegir, el aviso se cierra");
  ok(peticiones.length === 1 && peticiones[0].includes("client=" + CLIENTE), "Recusar: se carga el script del Google con el ID del editor", peticiones.join(" | "));
  ok(await p.evaluate(() => window.adsbygoogle && window.adsbygoogle.requestNonPersonalizedAds === 1), "Recusar: se piden anuncios NO personalizados (requestNonPersonalizedAds = 1)");
  ok(await p.evaluate(() => localStorage.getItem("es-anuncios")) === "nao-personalizados@2026-10-22", "la elección queda en localStorage (no en cookie)");
  ok((await p.cookies()).length === 0, "el aviso y el sitio no crean cookies propias (el script real del Google sí puede crear las suyas: está sustituido por un stub)");
  const empujados = await p.evaluate(() => window.adsbygoogle.length);
  const visibles = await p.$$eval(".anuncio ins.adsbygoogle", (l) => l.filter((x) => x.offsetWidth).length);
  ok(empujados === visibles && visibles > 0, `se pide un anuncio por bloque visible (${visibles})`, `push=${empujados}`);
  ok(await p.$$eval(".anuncio:has(ins.adsbygoogle)", (l) => l.filter((x) => x.offsetWidth && x.hasAttribute("aria-hidden")).length === 0), "los espacios con anuncio pierden aria-hidden");
  // segunda página: respeta la elección, sin aviso
  await p.goto(srv.url + "/guias/", { waitUntil: "networkidle0" });
  ok(!(await visible(p)), "segunda página: no vuelve a preguntar");
  await p.waitForFunction(() => window.__googleCargado === 1, { timeout: 4000 }).catch(() => {});
  ok(await p.evaluate(() => window.adsbygoogle.requestNonPersonalizedAds === 1), "segunda página: sigue en no personalizados");
  // cambiar de idea desde el rodapé
  await p.focus("[data-anuncios-preferencias]");
  await p.click("[data-anuncios-preferencias]");
  ok(await visible(p), "'Preferências de anúncios' reabre el aviso");
  ok(await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-anuncios-escolha")), "al abrir el aviso desde el rodapé, el foco pasa al primer botón");
  ok(p.url().endsWith("/guias/"), "el enlace no navega (queda en la misma página)");
  await p.keyboard.press("Escape");
  ok(!(await visible(p)), "Escape cierra el aviso si ya hay una elección");
  ok(await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-anuncios-preferencias")), "al cerrar, el foco vuelve al enlace 'Preferências de anúncios' (el teclado no se pierde)");
  // elección guardada con una versión vieja de la Política: el aviso vuelve a preguntar y no carga nada
  const ctxV = await b.createBrowserContext();
  const pv = await ctxV.newPage();
  await pv.setRequestInterception(true);
  const reqV = [];
  pv.on("request", (r) => { if (GOOGLE.test(r.url())) { reqV.push(r.url()); r.respond({ status: 200, contentType: "text/javascript", body: "" }); } else r.continue(); });
  await pv.goto(srv.url + "/guias/", { waitUntil: "load" });
  await pv.evaluate(() => localStorage.setItem("es-anuncios", "personalizados@2020-01-01"));
  await pv.goto(srv.url + "/guias/", { waitUntil: "networkidle0" });
  ok(await visible(pv) && reqV.length === 0, "elección guardada con otra versión de la Política: el aviso vuelve a preguntar y no se carga nada");
  await ctxV.close();
  await p.click("[data-anuncios-preferencias]");
  await Promise.all([p.waitForNavigation({ waitUntil: "networkidle0" }), p.click('[data-anuncios-escolha="personalizados"]')]);
  ok(await p.evaluate(() => localStorage.getItem("es-anuncios")) === "personalizados@2026-10-22", "Aceitar: la elección cambia a personalizados");
  await p.waitForFunction(() => window.__googleCargado === 1, { timeout: 4000 }).catch(() => {});
  ok(await p.evaluate(() => !window.adsbygoogle.requestNonPersonalizedAds), "tras cambiar a Aceitar la página se recarga SIN la marca de no personalizados");
  await ctx.close();
}
{ // 2) Aceitar en una visita nueva
  const { p, ctx, peticiones } = await nueva();
  await p.goto(URL, { waitUntil: "networkidle0" });
  await p.click('[data-anuncios-escolha="personalizados"]');
  await p.waitForFunction(() => window.__googleCargado === 1, { timeout: 4000 }).catch(() => {});
  ok(peticiones.length === 1 && await p.evaluate(() => !window.adsbygoogle.requestNonPersonalizedAds), "Aceitar: se carga el script y NO se marca como no personalizado");
  await ctx.close();
}
{ // 3) sin almacenamiento: el aviso vuelve en cada página, nada falla
  const { p, ctx, peticiones } = await nueva();
  await p.evaluateOnNewDocument(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("bloqueado"); } }); });
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  await p.goto(URL, { waitUntil: "networkidle0" });
  ok(await visible(p), "sin localStorage: el aviso se ve");
  await p.click('[data-anuncios-escolha="nao-personalizados"]');
  await p.waitForFunction(() => window.__googleCargado === 1, { timeout: 4000 }).catch(() => {});
  ok(peticiones.length === 1 && errores.length === 0, "sin localStorage: elegir funciona y no hay errores en la consola", errores.join(" | "));
  await p.goto(srv.url + "/guias/", { waitUntil: "networkidle0" });
  ok(await visible(p), "sin localStorage: en la página siguiente el aviso vuelve a preguntar (nunca asume consentimiento)");
  await ctx.close();
}
{ // 4) diseño y accesibilidad con el aviso abierto, en 3 anchos y en páginas distintas
  for (const [w, h] of [[320, 640], [390, 800], [1280, 900]]) {
    for (const ruta of ["/", "/gerador-de-sumario-abnt/", "/politica-de-privacidade/", "/guias/margens-abnt/"]) {
      const { p, ctx } = await nueva(w, h);
      await p.goto(srv.url + ruta, { waitUntil: "networkidle0" });
      const m = await p.evaluate(() => {
        const av = document.getElementById("aviso-anuncios").getBoundingClientRect();
        return { desborde: document.documentElement.scrollWidth - innerWidth, cls: window.__cls, dentro: av.left >= 0 && av.right <= innerWidth && av.bottom <= innerHeight, alto: av.height, vh: innerHeight };
      });
      const et = `${w}px ${ruta}`;
      ok(m.desborde <= 0, `${et}: sin desborde horizontal`, String(m.desborde));
      ok(m.cls === 0, `${et}: CLS 0`, String(m.cls));
      ok(m.dentro, `${et}: el aviso cabe en la pantalla`);
      ok(m.alto <= m.vh * 0.5, `${et}: el aviso ocupa como máximo la mitad de la pantalla`, `${Math.round(m.alto)} de ${m.vh}`);
      if (ruta === "/gerador-de-sumario-abnt/" || ruta === "/politica-de-privacidade/") {
        const axe = await axeEn(p);
        ok(axe.length === 0, `${et}: accesibilidad (axe) sin problemas`, axe.length ? "\n" + describeAxe(axe) : "");
      }
      await ctx.close();
    }
  }
}
{ // 5) apagado: el navegador no contacta a Google ni muestra aviso
  const srvOff = await sirve(off.dir);
  const { p, ctx, peticiones } = await nueva();
  await p.goto(srvOff.url + "/gerador-de-capa-abnt/", { waitUntil: "networkidle0" });
  ok(await p.$("#aviso-anuncios") === null && peticiones.length === 0, "apagado: sin aviso y sin ninguna petición a Google");
  ok(await p.evaluate(() => localStorage.getItem("es-anuncios")) === null && (await p.cookies()).length === 0, "apagado: no guarda nada en localStorage ni cookies");
  ok(await p.$$eval(".anuncio", (l) => l.every((x) => getComputedStyle(x).display === "none")), "apagado: los espacios no ocupan lugar");
  await ctx.close();
  await srvOff.cierra();
}
await b.close();
await srv.cierra();
limpiables.forEach(limpia);
console.log(`\n${total - fallos}/${total} comprobaciones correctas${fallos ? `, ${fallos} FALLAN` : ""}`);
process.exit(fallos ? 1 : 0);
