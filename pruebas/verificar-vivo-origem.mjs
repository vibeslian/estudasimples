// Comprobación en vivo del cambio ?origem -> #origem: el botón de WhatsApp del servicio cambia de mensaje con los dos formatos.
// Uso: node verificar-vivo-origem.mjs [https://estudasimples.com.br]
import puppeteer from "puppeteer-core";

const SITIO = process.argv[2] || "https://estudasimples.com.br";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
let fallos = 0;
const marca = (ok, txt) => { if (!ok) fallos++; console.log((ok ? "OK    " : "FALLA ") + txt); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const textoWa = async (ruta) => {
  const p = await browser.newPage();
  await p.goto(SITIO + ruta, { waitUntil: "networkidle2" });
  const hrefs = await p.$$eval("a[data-whatsapp]", (l) => l.map((a) => decodeURIComponent(a.getAttribute("href"))));
  await p.close();
  return hrefs;
};
const ref = await textoWa("/formatacao-abnt-tcc/");
const conHash = await textoWa("/formatacao-abnt-tcc/#origem=capa");
const conQuery = await textoWa("/formatacao-abnt-tcc/?origem=capa");
const raro = await textoWa("/formatacao-abnt-tcc/#origem=__proto__");
marca(ref.length >= 3 && ref.every((h) => h.includes("página de formatação")), "sin origen: mensaje de la página del servicio");
marca(conHash.length >= 3 && conHash.every((h) => h.includes("gerador de capa")), "#origem=capa: el mensaje dice «gerador de capa»");
marca(conQuery.length >= 3 && conQuery.every((h) => h.includes("gerador de capa")), "?origem=capa (enlaces de fuera): sigue funcionando");
marca(raro.every((h) => h.includes("página de formatação")), "valor raro (#origem=__proto__): vuelve al mensaje normal");

// un enlace interno real: desde una guía, el enlace al servicio lleva #origem y llega bien
const p = await browser.newPage();
await p.goto(SITIO + "/guias/normas-abnt/", { waitUntil: "networkidle2" });
const enlace = await p.$$eval('a[href*="/formatacao-abnt-tcc/"]', (l) => l.map((a) => a.getAttribute("href")).find((h) => h === "/formatacao-abnt-tcc/#origem=guia-normas-abnt"));
marca(enlace === "/formatacao-abnt-tcc/#origem=guia-normas-abnt", `enlace interno de la guía: ${enlace}`);
await Promise.all([p.waitForNavigation({ waitUntil: "networkidle2" }), p.$eval(`a[href="${enlace}"]`, (a) => a.click())]);
const url = p.url();
const wa = await p.$$eval("a[data-whatsapp]", (l) => l.map((a) => decodeURIComponent(a.getAttribute("href"))));
marca(url.endsWith("#origem=guia-normas-abnt") && wa.length >= 3 && wa.every((h) => h.includes("guia")), `al hacer clic llega a ${url.replace(SITIO, "")} y el WhatsApp dice: ${(wa[0] || "").slice(0, 90)}`);
await browser.close();
console.log(fallos ? `\n${fallos} FALLOS` : "\nTodo OK");
process.exit(fallos ? 1 : 0);
