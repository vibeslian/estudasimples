// Medición aproximada "celular lento" (cuando PageSpeed no responde): Chrome móvil emulado, red 4G lenta, CPU 4x más lenta.
// Mide FCP, LCP, CLS, el bloqueo del hilo (TBT aproximado: tiempo de tareas largas por encima de 50 ms) y el peso descargado.
// Uso: BASE_URL=https://estudasimples.com.br node medir-celular.mjs /ruta/ [/otra/ ...]
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const rutas = process.argv.slice(2).length ? process.argv.slice(2) : ["/gerador-de-referencias-abnt/"];
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const ruta of rutas) {
  const resultados = [];
  for (let i = 0; i < 3; i++) {
    const p = await b.newPage();
    await p.setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
    const cdp = await p.createCDPSession();
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    let bytes = 0;
    cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; });
    await p.evaluateOnNewDocument(() => {
      window.__m = { lcp: 0, cls: 0, tbt: 0, fcp: 0 };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__m.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.startTime > window.__m.fcp && e.duration > 50) window.__m.tbt += e.duration - 50; }).observe({ type: "longtask", buffered: true });
    });
    await p.goto(BASE + ruta, { waitUntil: "networkidle0", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1500));
    const m = await p.evaluate(() => window.__m);
    resultados.push({ ...m, kb: Math.round(bytes / 1024) });
    await p.close();
  }
  const med = (k) => resultados.map((r) => r[k]).sort((a, c) => a - c)[1];
  console.log(`${ruta}  FCP ${(med("fcp") / 1000).toFixed(2)} s · LCP ${(med("lcp") / 1000).toFixed(2)} s · TBT≈ ${Math.round(med("tbt"))} ms · CLS ${med("cls").toFixed(4)} · ${med("kb")} KB (mediana de 3)`);
}
await b.close();
