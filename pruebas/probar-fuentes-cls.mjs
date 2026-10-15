// Salto de diseño (CLS) por el cambio de tipografía: simula una red lenta retrasando las fuentes del sitio (Nunito e Inter)
// y mide los "layout shifts" de cada página. Con la letra de respaldo igualada a la web (Etapa 8b) debe quedar casi en cero.
// Con font-display: optional la fuente del sitio solo se usa si llega a tiempo; si no, la página entera usa la letra de respaldo.
// También limita la red (4G lenta), porque el JS de las herramientas llega tarde y no debe mover nada (la lista vacía del sumário lo movía 27 px).
// Uso: node probar-fuentes-cls.mjs            (con el sitio en http://localhost:3000 o BASE_URL)
//      RETRASO=3000 node probar-fuentes-cls.mjs   (milisegundos de retraso de las fuentes; por defecto 1500)
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const RETRASO = +(process.env.RETRASO || 1500);
const LIMITE = 0.01;
const PAGINAS = ["/", "/gerador-de-capa-abnt/", "/gerador-de-folha-de-rosto-abnt/", "/gerador-de-sumario-abnt/", "/formatacao-abnt-tcc/", "/sobre/", "/contato/", "/politica-de-privacidade/", "/termos-de-uso/", "/guias/", "/guias/margens-abnt/", "/guias/modelos-de-capa-abnt/", "/guias/resumo-abnt/", "/guias/normas-abnt/"];
const VP = [["celular 390", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["computador 1280", { width: 1280, height: 900 }]];
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
let falhas = 0, maximo = 0;
console.log(`Fuentes del sitio retrasadas ${RETRASO} ms (como una red lenta); límite aceptable de CLS: ${LIMITE}`);
for (const [nombre, vp] of VP) {
  for (const url of PAGINAS) {
    const p = await b.newPage();
    await p.setViewport(vp);
    if (!process.env.SIN_RED_LENTA) { // red 4G lenta: 150 ms de latencia y 1,6 Mbps (como Lighthouse); retrasa también los módulos JS de las herramientas
      const cdp = await p.createCDPSession(); await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    }
    await p.setRequestInterception(true);
    p.on("request", (r) => { if (/\/fonts\/(nunito|inter)-latin\.woff2/.test(r.url())) setTimeout(() => r.continue().catch(() => {}), RETRASO); else r.continue().catch(() => {}); });
    await p.evaluateOnNewDocument(() => {
      window.__cls = 0; window.__shifts = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), n: (e.sources || []).slice(0, 2).map((s) => (s.node && (s.node.className || s.node.nodeName)) || "?").join(",") }); } }).observe({ type: "layout-shift", buffered: true });
    });
    await p.goto(BASE + url, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));
    const r = await p.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts, fuentes: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")).join(",") }));
    maximo = Math.max(maximo, r.cls);
    // con red rápida se ve la letra del sitio; con red lenta, la de respaldo igualada (y nada se mueve cuando la fuente llega)
    const letraOk = RETRASO === 0 ? /Nunito/.test(r.fuentes) && /Inter(,|$)/.test(r.fuentes) : /Inter Fallback/.test(r.fuentes) && /Nunito Fallback/.test(r.fuentes);
    const mal = r.cls > LIMITE || !letraOk;
    if (mal) falhas++;
    console.log(`${mal ? "FALLA" : "OK   "} ${nombre.padEnd(16)} ${url.padEnd(34)} CLS ${r.cls.toFixed(4)} ${letraOk ? "" : "(letra inesperada: " + r.fuentes + ") "}${r.shifts.length ? "  " + JSON.stringify(r.shifts.slice(0, 2)) : ""}`);
    await p.close();
  }
}
await b.close();
console.log(falhas ? `\n${falhas} páginas con CLS > ${LIMITE} (máximo ${maximo.toFixed(4)})` : `\nTodo OK (CLS máximo ${maximo.toFixed(4)})`);
process.exit(falhas ? 1 : 0);
