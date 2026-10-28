// Etapa 8: página del servicio de formatación (/formatacao-abnt-tcc/), enlace de WhatsApp, precios en un solo lugar,
// datos estructurados, menú, pie, sitemap, bloque en las tres herramientas y Política de Privacidade.
// Requiere el sitio en http://localhost:3000 (npm run dev) o BASE_URL. No abre WhatsApp ni descarga nada.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const SERVICO = "/formatacao-abnt-tcc/";
const cfg = JSON.parse(fs.readFileSync("../site.config.json", "utf8")).servico;
const brl = (n) => "R$\u00a0" + n.toLocaleString("pt-BR");
const urlDe = (id) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(cfg.mensagens[id])}`;
const esperadoUrl = urlDe("servico");
const ORIGENES = { capa: "gerador de capa", folha: "gerador de folha de rosto", sumario: "gerador de sumário", referencias: "gerador de referências", inicio: "página inicial", servico: "página de formatação" };
const PERMITIDOS = new Set(["static.cloudflareinsights.com"]);
const falhas = [];
const marca = (c, m) => { console.log(c ? "OK   " : "FALLA", m); if (!c) falhas.push(m); };
const norm = (t) => t.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const externos = new Set();
async function abre(url, vp = { width: 1280, height: 900 }) {
  const p = await b.newPage();
  await p.setViewport(vp);
  p.on("request", (r) => { try { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.hostname !== new URL(BASE).hostname && !PERMITIDOS.has(u.hostname)) externos.add(u.hostname + " <- " + url); } catch (e) { /* data: */ } });
  await p.goto(BASE + url, { waitUntil: "networkidle0" });
  return p;
}

console.log("== 1) WhatsApp, precios y plazo: todo sale de site.config.json ==");
marca(cfg.whatsapp === "5563992167482", `número guardado en site.config.json: +${cfg.whatsapp.slice(0, 2)} (${cfg.whatsapp.slice(2, 4)}) ${cfg.whatsapp.slice(4)}`);
// ningún precio ni plazo escrito a mano en el código fuente: solo marcadores
const fuentes = ["../src/formatacao-abnt-tcc/index.html", "../conteudo/faq-servico.json", "../src/partials/convite-servico.html", "../src/partials/header.html", "../src/partials/footer.html", "../src/index.html", "../src/termos-de-uso/index.html", "../src/politica-de-privacidade/index.html"];
const fuenteTexto = fuentes.map((f) => fs.readFileSync(f, "utf8")).join("\n");
marca(!/R\$\s?\d/.test(fuenteTexto), "el código fuente de la página y del FAQ no tiene ningún \"R$ n\" escrito a mano (solo {{PRECO_...}})");
marca(!/\b\d+\s*a\s*\d+\s*horas/.test(fuenteTexto) && !fuenteTexto.includes("wa.me/") && !fuenteTexto.includes("Vim pelo site") && !/\d{4,}-?\d{4}/.test(fuenteTexto.replace(/\{\{[^}]+\}\}/g, "")), "el plazo, el número y el enlace de WhatsApp tampoco están escritos a mano (solo marcadores)");

{
  const p = await abre(SERVICO);
  const d = await p.evaluate(() => {
    const ctas = [...document.querySelectorAll('a[href*="wa.me"]')].filter((a) => a.getClientRects().length).map((a) => ({ href: a.getAttribute("href"), target: a.target, rel: a.rel, texto: a.textContent.trim(), h: Math.round(a.getBoundingClientRect().height) }));
    const texto = document.querySelector("main").innerText;
    return { ctas, texto, title: document.title, desc: document.querySelector('meta[name="description"]').content, h1: document.querySelector("h1").textContent.trim() };
  });
  marca(d.ctas.length >= 3 && d.ctas.every((c) => c.href === esperadoUrl), `${d.ctas.length} botones de WhatsApp, todos con el mismo enlace: ${esperadoUrl}`);
  marca(new URL(d.ctas[0].href).searchParams.get("text") === "Olá! Vim pelo site Estuda Simples (página de formatação) e quero formatar meu trabalho nas normas ABNT.", "mensaje de la página del servicio: \"Olá! Vim pelo site Estuda Simples (página de formatação) e quero formatar meu trabalho nas normas ABNT.\"");
  marca(Object.keys(cfg.mensagens).sort().join() === "capa,folha,inicio,referencias,servico,sumario" && Object.entries(cfg.mensagens).every(([id, m]) => m === `Olá! Vim pelo site Estuda Simples (${ORIGENES[id]}) e quero formatar meu trabalho nas normas ABNT.`), "los 6 mensajes (servicio, inicio, capa, folha, sumario, referencias) están en site.config.json e identifican el sitio y la página de origen");
  marca(d.ctas.every((c) => c.target === "_blank" && /noopener/.test(c.rel)), "los enlaces de WhatsApp abren en otra pestaña con rel=noopener");
  marca(d.ctas.every((c) => c.h >= 44), `los botones de WhatsApp miden ≥ 44 px de alto (${d.ctas.map((c) => c.h).join(", ")})`);
  // origen: el mismo botón cambia de mensaje según la página de donde viene el visitante (#origem=)
  for (const [id, nombre] of Object.entries(ORIGENES)) {
    const q = await abre(SERVICO + "#origem=" + id);
    const hrefs = await q.evaluate(() => [...document.querySelectorAll("a[data-whatsapp]")].map((a) => a.getAttribute("href")));
    marca(hrefs.length >= 3 && hrefs.every((h) => h === urlDe(id)) && decodeURIComponent(hrefs[0]).includes("(" + nombre + ")"), `#origem=${id}: los ${hrefs.length} botones llevan el mensaje "(${nombre})"`);
    await q.close();
  }
  { // compatibilidad: los enlaces de fuera (Pinterest, compartir) siguen usando ?origem=
    const q = await abre(SERVICO + "?origem=capa");
    const hrefs = await q.evaluate(() => [...document.querySelectorAll("a[data-whatsapp]")].map((a) => a.getAttribute("href")));
    marca(hrefs.length >= 3 && hrefs.every((h) => h === urlDe("capa")), "?origem=capa (enlaces de fuera) sigue cambiando el mensaje de WhatsApp");
    await q.close();
  }
  for (const raro of ["xyz", "__proto__", "<script>", ""]) {
    const q = await abre(SERVICO + "#origem=" + encodeURIComponent(raro));
    const hrefs = await q.evaluate(() => [...document.querySelectorAll("a[data-whatsapp]")].map((a) => a.getAttribute("href")));
    marca(hrefs.every((h) => h === esperadoUrl), `#origem=${raro || "(vacío)"}: origen desconocido → mensaje de la página del servicio`);
    await q.close();
  }
  const t = norm(d.texto);
  marca(t.includes(norm(brl(cfg.precos.ate30))) && t.includes(norm(brl(cfg.precos.de31a60))), `la página muestra ${brl(cfg.precos.ate30)} (hasta 30 páginas) y ${brl(cfg.precos.de31a60)} (31 a 60) tomados de la configuración`);
  marca(/Mais de 60 páginas/.test(t) && /A consultar/.test(t), "más de 60 páginas: \"A consultar\"");
  marca(t.includes(`Entrega em ${cfg.prazo}`), `el plazo "${cfg.prazo}" aparece desde la configuración`);
  marca(!/\{\{|\}\}/.test(d.texto) && !/\{\{/.test(await p.content()), "no queda ningún marcador {{...}} sin reemplazar");
  marca(d.title.length <= 65 && d.desc.length >= 120 && d.desc.length <= 165 && d.title.includes("Formatação ABNT de TCC"), `title ${d.title.length}c y description ${d.desc.length}c dentro de lo recomendado`);
  console.log("   title:", d.title, "\n   h1:", d.h1);

  console.log("\n== 2) Contenido pedido ==");
  const sec = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("main section[id]")].map((s) => [s.id, s.innerText.replace(/\s+/g, " ")])));
  marca(["incluido", "nao-inclui", "o-que-enviar", "como-funciona", "prazo-e-precos", "reembolso", "privacidade", "perguntas-frequentes"].every((id) => sec[id]), `secciones: ${Object.keys(sec).join(", ")}`);
  const inc = ["Margens", "Fonte", "Espaçamento", "Títulos numerados", "Sumário automático", "Paginação", "Capa e folha de rosto", "Citações e referências", "Tabelas e figuras"];
  marca(inc.every((k) => sec.incluido.includes(k)), "incluye: márgenes, fuente, espaciado, títulos numerados, sumário automático, paginación, capa, folha de rosto, citas y referencias, tablas y figuras");
  marca(/não escrevo/i.test(sec["nao-inclui"]) && /não corrijo/i.test(sec["nao-inclui"]) && /não mudo o conteúdo/i.test(sec["nao-inclui"]) && /ano, editora/.test(sec["nao-inclui"]) && /você precisa me enviar/.test(sec["nao-inclui"]), "no incluye: escribir, corregir ni cambiar el contenido; los datos que faltan en las referencias los envía el estudiante");
  marca(/Word/.test(sec["o-que-enviar"]) && /manual ou modelo/.test(sec["o-que-enviar"]), "qué enviar: archivo en Word y manual o modelo de la facultad");
  const pasos = await p.evaluate(() => [...document.querySelectorAll("#como-funciona .passos li h3")].map((h) => h.textContent.trim()));
  marca(pasos.length === 5 && /arquivo/i.test(pasos[0]) && /orçamento/i.test(pasos[1]) && /Pix/.test(pasos[2]) && /formatado/.test(pasos[3]) && /ajustes/i.test(pasos[4]), `cómo funciona, en orden: ${pasos.join(" → ")}`);
  marca(/1 rodada de ajustes/.test((await p.evaluate(() => document.querySelector("main").innerText))), "1 ronda de ajustes incluida");
  marca(/não recebe pagamentos/.test(sec["como-funciona"]), "aclara que el sitio no recibe pagos (el Pix es por fuera)");
  marca(/inteligência artificial/.test(sec.privacidade) && /Apagado 15 dias depois da entrega/.test(sec.privacidade) && /só para o serviço/i.test(sec.privacidade), "privacidad: solo para el servicio, con ayuda de IA, se borra al terminar");
  marca(!(await p.$(".anuncio")), "la página del servicio no tiene espacios de anuncio");
  marca(/Word e PDF/.test(await p.evaluate(() => document.body.innerText)) && /em Word e em PDF/.test(sec["como-funciona"]), "entrega en Word y PDF");
  marca(/quando eu confirmo o pagamento por Pix e recebo todos os arquivos necessários/.test(sec["prazo-e-precos"]) && /só começa a contar quando eu confirmo o pagamento e recebo todos os arquivos necessários/.test(sec["como-funciona"]), "el plazo empieza al confirmar el pago por Pix y recibir todos los archivos");
  marca(/Se o erro de formatação for meu, eu corrijo de graça, sempre/.test(sec["como-funciona"]) && /Se você mudar o conteúdo depois da entrega, é um novo orçamento/.test(sec["nao-inclui"]) && /novo orçamento/.test(sec.reembolso), "ajustes: 1 ronda, error de formatación mío siempre gratis, cambio de contenido = nuevo presupuesto");
  marca(/Reembolso integral/.test(sec.reembolso) && /pelo Pix, em até 7 dias/.test(sec.reembolso) && /antes de eu começar/.test(sec.reembolso) && /não cumprir o prazo/.test(sec.reembolso) && /Depois da entrega/.test(sec.reembolso) && /não é devolvido/.test(sec.reembolso) && /Código de Defesa do Consumidor/.test(sec.reembolso), "reembolso: integral si cancela antes de empezar o si no cumplo el plazo; después de la entrega no, con ajustes; sin quitar derechos del CDC");
  marca(/15 dias depois da entrega/.test(sec.privacidade), "privacidad: archivos borrados 15 días después de la entrega");

  console.log("\n== 3) Datos estructurados ==");
  const ld = await p.evaluate(() => {
    const todos = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));
    const faq = todos.find((x) => x["@type"] === "FAQPage");
    const vis = [...document.querySelectorAll(".faq details")].map((d) => ({ q: d.querySelector("summary").textContent.trim(), a: [...d.querySelectorAll(".faq-resposta p")].map((x) => x.textContent.trim()).join(" ").replace(/\s+/g, " ") }));
    return { tipos: todos.map((x) => x["@type"]), service: todos.find((x) => x["@type"] === "Service"), faq: faq?.mainEntity.map((m) => ({ q: m.name, a: m.acceptedAnswer.text })), vis };
  });
  marca(["Service", "FAQPage", "BreadcrumbList"].every((x) => ld.tipos.includes(x)), `JSON-LD válido: ${ld.tipos.join(", ")}`);
  marca(ld.service.offers.map((o) => o.price).join() === `${cfg.precos.ate30},${cfg.precos.de31a60}` && ld.service.offers.every((o) => o.priceCurrency === "BRL"), `Service: ofertas ${ld.service.offers.map((o) => o.name + " = " + o.price + " " + o.priceCurrency).join(" | ")} (iguales a la configuración)`);
  marca(!ld.service.aggregateRating && !ld.service.review, "sin reseñas ni calificaciones inventadas");
  marca(ld.faq.length === ld.vis.length && ld.faq.length >= 10 && ld.faq.every((f, i) => norm(f.q) === norm(ld.vis[i].q) && norm(f.a) === norm(ld.vis[i].a)), `FAQPage: ${ld.faq.length} preguntas, idénticas al texto visible`);
  marca(ld.faq.some((f) => norm(f.a).includes(norm(brl(cfg.precos.ate30)))) && ld.faq.some((f) => f.a.includes(cfg.prazo)), "el FAQ también toma precios y plazo de la configuración");
  await p.close();
}

console.log("\n== 4) Menú, pie y sitemap ==");
for (const url of ["/", "/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/gerador-de-referencias-abnt/", "/sobre/", "/contato/", "/politica-de-privacidade/", "/termos-de-uso/", SERVICO]) {
  const p = await abre(url);
  const r = await p.evaluate(() => ({ menu: !!document.querySelector('.nav a[href="/formatacao-abnt-tcc/"]'), pie: !!document.querySelector('.footer-links a[href="/formatacao-abnt-tcc/"]') }));
  marca(r.menu && r.pie, `${url.padEnd(34)} menú ${r.menu ? "✓" : "✗"}  pie ${r.pie ? "✓" : "✗"}`);
  await p.close();
}
{
  const xml = await (await fetch(BASE + "/sitemap.xml")).text();
  marca(xml.includes("<loc>https://estudasimples.com.br" + SERVICO + "</loc>"), "sitemap.xml incluye /formatacao-abnt-tcc/");
}
for (const w of [320, 360, 390, 480, 500, 640, 768, 1024, 1280]) {
  const p = await abre("/", { width: w, height: 800, isMobile: w < 768, hasTouch: w < 768 });
  const movil = w < 900;
  if (movil) await p.click("#menuBotao"); // en pantallas angostas el menú está detrás del botón de hamburguesa
  const r = await p.evaluate(() => { const links = [...document.querySelectorAll(".nav a")].filter((a) => a.offsetParent); const n = document.querySelector(".nav").getBoundingClientRect(); return { derecha: Math.round(n.right), limite: innerWidth, desborde: document.documentElement.scrollWidth - innerWidth, enlaces: links.map((a) => a.textContent.trim().replace(/\s+/g, " ")), servicio: links.some((a) => /Formatação/.test(a.textContent)) }; });
  marca(r.derecha <= r.limite + 1 && r.desborde <= 0 && r.servicio, `menú a ${w}px${movil ? " (abierto con la hamburguesa)" : ""}: cabe y muestra "Formatação" (${r.enlaces.slice(0, 6).join(" | ")})`);
  await p.close();
}

console.log("\n== 5) Bloque \"Prefere receber o trabalho inteiro formatado?\" en las tres herramientas ==");
for (const [url, slotAbajo] of [["/gerador-de-capa-abnt/", "capa"], ["/gerador-de-folha-de-rosto-abnt/", "folha"], ["/gerador-de-sumario-abnt/", "sumario"]])
for (const [nombre, vp] of [["computador 1280", { width: 1280, height: 900 }], ["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const p = await abre(url, vp);
  const r = await p.evaluate(() => {
    const c = document.querySelector(".convite-servico"); if (!c) return null;
    const bb = (e) => { const x = e.getBoundingClientRect(); return { top: x.top + scrollY, bottom: x.bottom + scrollY }; };
    const acoes = document.querySelector(".acoes");
    const a = c.querySelector("a");
    return { texto: c.textContent.trim(), href: a.getAttribute("href"), dentroAcoes: !!c.closest(".acoes"), dentroForm: !!c.closest("#form"), cTop: bb(c).top, cBottom: bb(c).bottom, botones: bb(acoes).bottom,
      anuncios: [...document.querySelectorAll(".anuncio")].map((x) => ({ slot: x.dataset.slot, top: bb(x).top, bottom: bb(x).bottom, display: getComputedStyle(x).display })), size: getComputedStyle(c).fontSize, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  marca(!!r, `${url} ${nombre}: existe el bloque`);
  if (!r) { await p.close(); continue; }
  marca(r.texto === "Prefere receber o trabalho inteiro formatado? Conheça meu serviço." && r.href === SERVICO + "#origem=" + slotAbajo, `texto: "${r.texto}" → ${r.href}`);
  marca(r.dentroForm && !r.dentroAcoes && r.cTop >= r.botones + 12, `queda después de los botones de descarga (${Math.round(r.cTop - r.botones)} px por debajo), fuera del grupo de botones`);
  const visibles = r.anuncios.filter((x) => x.display !== "none");
  const cerca = Math.min(...visibles.map((x) => Math.abs(x.top - r.cBottom)));
  marca(visibles.every((x) => x.top > r.cBottom) && cerca >= 150, `lejos de los espacios de anuncio (el más cercano a ${Math.round(cerca)} px)`);
  marca(r.overflow <= 0, `${nombre}: sin scroll horizontal`);
  if (nombre.startsWith("computador")) {
    const q = await abre(r.href);
    const hrefs = await q.evaluate(() => [...document.querySelectorAll("a[data-whatsapp]")].map((a) => a.getAttribute("href")));
    marca(hrefs.length >= 3 && hrefs.every((h) => h === urlDe(slotAbajo)), `siguiendo ese enlace, los botones de WhatsApp llevan el mensaje "(${ORIGENES[slotAbajo]})"`);
    await q.close();
  }
  await p.close();
}

console.log("\n== 5a) Antes e depois (HTML/CSS, sin imágenes) ==");
for (const [nombre, vp] of [["computador 1280", { width: 1280, height: 900 }], ["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["celular 320", { width: 320, height: 700, isMobile: true, hasTouch: true }]]) {
  const p = await abre(SERVICO, vp);
  const r = await p.evaluate(() => {
    const sec = document.getElementById("antes-e-depois"); if (!sec) return null;
    const folhas = [...sec.querySelectorAll(".ad-folha")]; const rects = folhas.map((f) => f.getBoundingClientRect());
    const cont = folhas.map((f) => { const c = f.querySelector(".ad-conteudo"); const fb = f.getBoundingClientRect(); return [...c.querySelectorAll("p")].every((e) => { const b = e.getBoundingClientRect(); return b.bottom <= fb.bottom - fb.height * 0.1 && b.right <= fb.right + 1 && b.left >= fb.left - 1; }); });
    const hero = document.querySelector(".hero").getBoundingClientRect();
    return {
      primera: document.querySelector("main > section")?.id, tras: sec.getBoundingClientRect().top >= hero.bottom - 1,
      alts: folhas.map((f) => ({ role: f.getAttribute("role"), alt: f.getAttribute("aria-label") || "" })), imgs: sec.querySelectorAll("img, svg, canvas, picture").length,
      lado: Math.abs(rects[0].top - rects[1].top) < 2 && rects[0].left < rects[1].left, apiladas: rects[1].top > rects[0].bottom - 1,
      cabe: cont, ov: document.documentElement.scrollWidth - innerWidth, legendas: [...sec.querySelectorAll(".ad-lista")].map((l) => l.children.length),
      texto: sec.innerText.replace(/\s+/g, " "), nota: !!sec.querySelector(".ad-nota"), ancho: Math.round(rects[0].width),
    };
  });
  marca(!!r && r.primera === "antes-e-depois" && r.tras, nombre + ": el ejemplo va justo después de la portada, antes de \"O que está incluído\"");
  marca(!!r && r.alts.length === 2 && r.alts.every((a) => a.role === "img" && a.alt.length > 80) && /sem formatação/.test(r.alts[0].alt) && /ABNT/.test(r.alts[1].alt), nombre + ": las dos páginas tienen texto alternativo (role=img + aria-label)");
  marca(!!r && r.imgs === 0, nombre + ": hecho solo con HTML y CSS (0 imágenes, svg ni canvas): casi no pesa");
  marca(!!r && (nombre.startsWith("computador") ? r.lado : r.apiladas), nombre + (nombre.startsWith("computador") ? ": lado a lado (antes a la izquierda, depois a la derecha)" : ": una debajo de la otra"));
  marca(!!r && r.cabe.every(Boolean) && r.ov <= 0, nombre + ": el contenido cabe dentro de cada página y no hay scroll horizontal (ancho de página " + (r?.ancho) + "px)");
  marca(!!r && r.legendas.join() === "4,4" && /2 METODOLOGIA/.test(r.texto) && /SILVA, João/.test(r.texto) && /Silva, J\./.test(r.texto) && r.nota, nombre + ": 4 observaciones por página, contenido inventado (Silva, Souza, Editora Exemplo) y aviso de que es un trecho");
  await p.close();
}

console.log("\n== 5b) Aviso discreto en la portada ==");
for (const [nombre, vp] of [["computador 1280", { width: 1280, height: 900 }], ["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const p = await abre("/", vp);
  const r = await p.evaluate(() => { const a = document.querySelector(".hero-aviso"); if (!a) return null; const l = a.querySelector("a"); const hero = document.querySelector(".hero").getBoundingClientRect(); const bb = a.getBoundingClientRect(); return { texto: a.textContent.trim(), href: l.getAttribute("href"), dentroHero: bb.bottom <= hero.bottom + 1 && !!a.closest(".hero"), size: parseFloat(getComputedStyle(a).fontSize), ov: document.documentElement.scrollWidth - innerWidth, h: document.querySelector(".escolha-cartao").getBoundingClientRect().top < bb.top }; });
  marca(!!r && r.texto === "Prefere receber o trabalho inteiro formatado? Conheça meu serviço de formatação de TCC." && r.href === SERVICO + "#origem=inicio", `${nombre}: aviso en la portada → ${r?.href}`);
  marca(!!r && r.dentroHero && r.size <= 16 && r.h && r.ov <= 0, `${nombre}: dentro de la portada, debajo de los botones principales, discreto (${r?.size}px) y sin scroll horizontal`);
  await p.close();
}
console.log("\n== 5c) Primera persona del singular en todo el sitio ==");
{
  const paginas = ["/", "/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/gerador-de-referencias-abnt/", SERVICO, "/sobre/", "/contato/", "/politica-de-privacidade/", "/termos-de-uso/"];
  const malos = [];
  for (const u of paginas) {
    const p = await abre(u);
    const t = await p.evaluate(() => document.body.innerText);
    const m = t.match(/\b(nosso|nossa|nossos|nossas|nós|conosco|vocês|a gente|estamos|tratamos|fazemos|usamos|apagamos|corrigimos|escrevemos|podemos|temos|oferecemos|queremos)\b/gi);
    if (m) malos.push(u + ": " + [...new Set(m)].join(", "));
    await p.close();
  }
  marca(malos.length === 0, malos.length ? "voz plural: " + malos.join(" | ") : "ninguna página usa \"nosso/nós/vocês/tratamos/usamos…\" (todo en primera persona del singular)");
}

console.log("\n== 6) Política de Privacidade y Termos ==");
{
  const p = await abre("/politica-de-privacidade/");
  const r = await p.evaluate(() => {
    const h = document.getElementById("servico-formatacao"); const txt = document.querySelector("main").innerText.replace(/\s+/g, " ");
    return { h: h?.textContent.trim(), txt, fecha: document.querySelector(".artigo-meta").textContent.trim() };
  });
  marca(r.h === "2.4. Serviço pago de formatação de trabalhos", `sección nueva con ancla: "${r.h}"`);
  marca(/WhatsApp/.test(r.txt) && /inteligência artificial/.test(r.txt) && /apago os arquivos/i.test(r.txt) && /só para prestar o serviço/i.test(r.txt) && /Pix/.test(r.txt) && /art\. 7º, V/.test(r.txt), "explica: WhatsApp, IA, uso solo para el servicio, borrado, Pix y base legal");
  marca(/WhatsApp \(Meta\)/.test(r.txt) && /Anthropic/.test(r.txt), "sección 5 (con quién se comparte) menciona WhatsApp, proveedores de IA y el banco");
  // la fecha es 14 de outubro (como siempre) o, desde que los links de afiliado están encendidos, la de afiliados.legalAtualizadoEm (21 de outubro de 2026, el curso de Hotmart)
  marca(/14 de outubro de 2026|20 de outubro de 2026|21 de outubro de 2026|27 de outubro de 2026|28 de outubro de 2026/.test(r.fecha), `fecha actualizada: ${r.fecha}`);
  marca(/15 dias depois da entrega/.test(r.txt) && !/Quando o serviço termina, apago/.test(r.txt), "Política: los archivos se borran 15 días después de la entrega (resumen, 2.4 y 6)");
  marca(/De qual página você veio/.test(r.txt) && /mensagem já escrita/.test(r.txt), "Política: explica que el mensaje de WhatsApp dice de qué página viene el visitante");
  const ancla = new URL("/politica-de-privacidade/#servico-formatacao", BASE).href;
  const p2 = await abre(SERVICO);
  marca(await p2.evaluate(() => !!document.querySelector('a[href="/politica-de-privacidade/#servico-formatacao"]')), "la página del servicio enlaza a esa sección de la Política (" + ancla.replace(BASE, "") + ")");
  await p.close(); await p2.close();
  const t = await abre("/termos-de-uso/");
  const tt = await t.evaluate(() => ({ txt: document.querySelector("main").innerText.replace(/\s+/g, " "), ancla: !!document.getElementById("servico-formatacao"), subs: [...document.querySelectorAll("main h3")].map((h) => h.textContent.trim()) }));
  marca(tt.ancla && /Serviço pago de formatação/.test(tt.txt) && tt.subs.length >= 5, "los Termos de Uso describen el servicio pago (con ancla #servico-formatacao): " + tt.subs.join(" | "));
  marca(/Word e em PDF/.test(tt.txt) && /confirmo o pagamento por Pix e recebo todos os arquivos necessários/.test(tt.txt) && /corrijo de graça, sempre/.test(tt.txt) && /novo orçamento/.test(tt.txt) && /15 dias depois da entrega/.test(tt.txt), "Termos: entrega Word y PDF, plazo desde el pago y los archivos, ajustes, nuevo presupuesto y borrado a los 15 días");
  marca(/Devolvo o valor integral, pelo Pix, em até 7 dias/.test(tt.txt) && /antes de eu começar/.test(tt.txt) && /não cumprir o prazo/.test(tt.txt) && /Depois da entrega, o valor não é devolvido/.test(tt.txt) && /Código de Defesa do Consumidor/.test(tt.txt) && /art\. 49/.test(tt.txt) && /art\. 20/.test(tt.txt), "Termos: reembolso integral (antes de empezar / plazo incumplido), sin reembolso tras la entrega, y derechos del CDC (arts. 49 y 20) intactos");
  await t.close();
}

console.log("\n== 7a) Barra fija del WhatsApp (solo celular) ==");
{
  const estado = (p) => p.evaluate(() => { const b = document.getElementById("barraWhatsapp"); const s = getComputedStyle(b); const r = b.getBoundingClientRect(); return { visible: s.visibility === "visible" && r.top < innerHeight - 1 && s.display !== "none", display: s.display, alto: Math.round(r.height), top: Math.round(r.top), pos: s.position, href: b.querySelector("a").getAttribute("href"), tab: s.visibility !== "hidden" }; });
  const irA = async (p, sel, desplaza = 0) => { await p.evaluate((sel, d) => { const e = document.querySelector(sel); window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - d, behavior: "instant" }); }, sel, desplaza); await new Promise((r) => setTimeout(r, 450)); };
  const CEL = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  let p = await abre(SERVICO + "#origem=capa", CEL);
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
  await new Promise((r) => setTimeout(r, 400));
  let e = await estado(p);
  marca(!e.visible && e.pos === "fixed", "celular, arriba de todo: el botón de la portada está a la vista → la barra está oculta");
  await irA(p, "#incluido", 0);
  e = await estado(p);
  marca(e.visible && e.alto >= 60 && e.alto <= 100, "al bajar y no verse ningún otro botón de WhatsApp → aparece la barra (" + e.alto + "px de alto)");
  marca(decodeURIComponent(e.href) === decodeURIComponent(urlDe("capa")), "la barra usa el mensaje según el origen (#origem=capa → \"(gerador de capa)\")");
  const btn = await p.evaluate(() => { const a = document.querySelector("#barraWhatsapp a"); const r = a.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), izq: Math.round(r.left), der: Math.round(innerWidth - r.right), target: a.target, rel: a.rel, texto: a.textContent.trim() }; });
  marca(btn.h >= 48 && btn.izq >= 8 && btn.der >= 8 && btn.target === "_blank" && /noopener/.test(btn.rel) && btn.texto === "Pedir orçamento no WhatsApp", `botón de la barra: "${btn.texto}", ${btn.h}px de alto, margen ${btn.izq}px, abre en otra pestaña`);
  await irA(p, "#prazo-e-precos .preco-rodape a", 300);
  e = await estado(p);
  marca(!e.visible, "con el botón de los precios a la vista → la barra se oculta (no hay dos botones iguales a la vez)");
  await irA(p, "#perguntas-frequentes", 0);
  e = await estado(p);
  marca(e.visible, "en el FAQ (sin botón a la vista) → la barra vuelve a aparecer");
  await irA(p, "#pedir .btn", 300);
  e = await estado(p);
  marca(!e.visible, "con el botón del cierre a la vista → se oculta");
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await new Promise((r) => setTimeout(r, 450));
  const fin = await p.evaluate(() => { const b = document.getElementById("barraWhatsapp"); const bt = b.getBoundingClientRect().top; const vis = getComputedStyle(b).visibility === "visible"; const pie = document.querySelector(".site-footer"); const ultimo = [...pie.querySelectorAll("p, a")].pop().getBoundingClientRect(); const cont = document.querySelector("#pedir .btn").getBoundingClientRect(); return { vis, bt, ultimoBottom: ultimo.bottom, finPagina: scrollY + innerHeight >= document.documentElement.scrollHeight - 2, btnCierreVisible: cont.top < innerHeight && cont.bottom > 0 }; });
  marca(fin.finPagina && (!fin.vis || fin.ultimoBottom <= fin.bt - 4), `al final de la página la barra no tapa el pie (último texto termina en ${Math.round(fin.ultimoBottom)}px y la barra ${fin.vis ? "empieza en " + Math.round(fin.bt) + "px" : "está oculta"})`);
  // con la barra visible en el pie: bajar hasta el final sin botón del cierre a la vista
  await p.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight - 1); });
  await p.evaluate(() => { document.getElementById("barraWhatsapp").classList.add("visivel"); });
  await new Promise((r) => setTimeout(r, 500));
  const fin2 = await p.evaluate(() => { const b = document.getElementById("barraWhatsapp"); const r = b.getBoundingClientRect(); const pie = document.querySelector(".site-footer"); const ultimo = [...pie.querySelectorAll("p, a")].pop().getBoundingClientRect(); return { vis: getComputedStyle(b).visibility, top: r.top, ultimoBottom: ultimo.bottom }; });
  marca(fin2.vis === "visible" && fin2.ultimoBottom <= fin2.top - 4, `aun con la barra visible al final, el último texto del pie (${Math.round(fin2.ultimoBottom)}px) queda por encima de la barra (${Math.round(fin2.top)}px)`);
  await p.close();
  for (const [nombre, vp] of [["computador 1280", { width: 1280, height: 900 }], ["tablet 768", { width: 768, height: 1024, isMobile: true, hasTouch: true }]]) {
    p = await abre(SERVICO, vp);
    await p.evaluate(() => window.scrollTo(0, 1500));
    await new Promise((r) => setTimeout(r, 400));
    const d = await p.evaluate(() => { const b = document.getElementById("barraWhatsapp"); return { display: getComputedStyle(b).display, rects: b.getClientRects().length }; });
    marca(d.display === "none" && d.rects === 0, nombre + ": no hay barra fija (solo en celular)");
    await p.close();
  }
  for (const u of ["/gerador-de-capa-abnt/", "/gerador-de-sumario-abnt/", "/"]) {
    const q = await abre(u, CEL);
    marca(!(await q.$("#barraWhatsapp")), u + ": sin barra (solo en la página del servicio)");
    await q.close();
  }
  p = await abre(SERVICO, CEL);
  const estr = await p.evaluate(() => ({ headers: document.querySelectorAll("header.site-header").length, h1: document.querySelectorAll("h1").length, footers: document.querySelectorAll("footer").length, heros: document.querySelectorAll(".hero").length, titulo: document.body.innerText.split("Formatação ABNT de TCC").length - 1 }));
  marca(estr.headers === 1 && estr.h1 === 1 && estr.footers === 1 && estr.heros === 1, `celular: la página NO se duplica (1 cabecera, 1 h1, 1 pie, 1 portada; el título "Formatação ABNT de TCC" aparece ${estr.titulo} veces en el texto, todas dentro de la página)`);
  await p.close();
}

console.log("\n== 7) Celular: página del servicio ==");
for (const w of [320, 360, 390]) {
  const p = await abre(SERVICO, { width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const r = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth - innerWidth, cta: [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => { const x = a.getBoundingClientRect(); return { w: Math.round(x.width), right: Math.round(x.right) }; }), precios: [...document.querySelectorAll(".preco")].map((e) => Math.round(e.getBoundingClientRect().width)), w: innerWidth }));
  marca(r.ov <= 0 && r.cta.every((c) => c.right <= r.w) && r.precios.every((x) => x > 200), `${w}px: sin scroll horizontal, botones dentro de la pantalla, tarjetas de precio de ${r.precios[0]}px`);
  await p.close();
}

marca(externos.size === 0, externos.size ? "peticiones externas: " + [...externos].join(" | ") : "ninguna petición a terceros (el enlace de WhatsApp solo se abre si el visitante lo toca)");
await b.close();
console.log(falhas.length ? `\n${falhas.length} FALLAS` : "\nTodo OK");
process.exit(falhas.length ? 1 : 0);
