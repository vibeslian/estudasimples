// IndexNow: avisa a Bing y otros buscadores (no a Google) de las páginas nuevas o cambiadas.
// El archivo de la clave vive en src/<clave>.txt y se publica en la raíz del sitio. La clave NO se escribe en este script,
// ni se imprime: el script la lee del archivo y solo muestra "(clave)".
//
// Uso (después de publicar, cuando el sitio ya esté en vivo):
//   node indexnow.mjs --todas                 todas las URLs del sitemap en vivo
//   node indexnow.mjs --cambiadas [a [b]]     URLs cambiadas entre dos commits (por defecto HEAD~1 y HEAD)
//   node indexnow.mjs https://.../x/ ...      URLs concretas
//   agregar --probar para ver qué enviaría, sin enviar nada
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, "site.config.json"), "utf8"));
const SITIO = cfg.siteUrl.replace(/\/+$/, "");
const HOST = new URL(SITIO).host;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const MAX = 10000; // límite del protocolo por envío

// Archivos que afectan a todas las páginas: si cambian, el aviso correcto es --todas
const GLOBALES = [/^src\/partials\//, /^src\/assets\/(css|js)\//, /^site\.config\.json$/, /^build[\w-]*\.mjs$/];

function claveYArchivo() {
  const hallados = fs.readdirSync(path.join(RAIZ, "src")).filter((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (hallados.length !== 1) throw new Error(`Debe haber exactamente 1 archivo de clave en src/ (hay ${hallados.length}).`);
  const archivo = hallados[0];
  const clave = fs.readFileSync(path.join(RAIZ, "src", archivo), "utf8").trim();
  if (clave !== archivo.replace(/\.txt$/, "")) throw new Error("El contenido del archivo de clave no coincide con su nombre.");
  return { clave, archivo };
}

// salir con una pausa corta: en Windows, cerrar Node con conexiones aún abiertas puede dar un error falso
const salir = async (c) => { await new Promise((ok) => setTimeout(ok, 300)); process.exit(c); };
const git = (...a) => execFileSync("git", a, { cwd: RAIZ, encoding: "utf8" });

async function bajar(url) {
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      return r;
    } catch (e) {
      if (i === 4) throw e;
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
}

async function urlsDelSitemap() {
  const r = await bajar(`${SITIO}/sitemap.xml`);
  if (!r.ok) throw new Error(`sitemap.xml respondió ${r.status}`);
  return [...(await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

// Convierte los archivos cambiados en URLs de páginas
function urlsCambiadas(desde, hasta) {
  const cambios = git("diff", "--name-status", "--no-renames", desde, hasta).split("\n").filter(Boolean).map((l) => l.split("\t"));
  const urls = new Set();
  const globales = [];
  const paginaDe = (dir) => `${SITIO}/${dir ? dir + "/" : ""}`;
  for (const [estado, f] of cambios) {
    if (estado === "D") continue;
    let m;
    if ((m = /^src\/(.*)index\.html$/.exec(f)) && !m[1].startsWith("partials/") && !/(^|\/)_/.test(m[1])) urls.add(paginaDe(m[1].replace(/\/$/, "")));
    else if ((m = /^conteudo\/faq-guia-([a-z0-9-]+)\.json$/.exec(f))) urls.add(paginaDe(`guias/${m[1]}`));
    else if (f === "conteudo/guias.json") {
      const ver = (ref) => { try { return JSON.parse(git("show", `${ref}:conteudo/guias.json`)); } catch { return []; } };
      const antes = new Map(ver(desde).map((g) => [g.slug, JSON.stringify(g)]));
      for (const g of ver(hasta)) if (antes.get(g.slug) !== JSON.stringify(g)) urls.add(paginaDe(`guias/${g.slug}`));
      urls.add(paginaDe("guias")); // el índice /guias/ lista todas
    } else if (GLOBALES.some((re) => re.test(f))) globales.push(f);
  }
  return { urls: [...urls], globales };
}

const args = process.argv.slice(2);
const probar = args.includes("--probar");
const resto = args.filter((a) => a !== "--probar");

let urls;
if (resto[0] === "--todas") urls = await urlsDelSitemap();
else if (resto[0] === "--cambiadas") {
  const { urls: u, globales } = urlsCambiadas(resto[1] || "HEAD~1", resto[2] || "HEAD");
  urls = u;
  if (globales.length) console.log(`Aviso: cambiaron archivos que afectan a todas las páginas (${globales.join(", ")}). Si el cambio se nota en todo el sitio, usa --todas.`);
} else urls = resto.filter((a) => a.startsWith(SITIO + "/"));

urls = [...new Set(urls)].filter((u) => new URL(u).host === HOST);
if (!urls.length) { console.log("No hay URLs para avisar."); await salir(0); }
if (urls.length > MAX) throw new Error(`Más de ${MAX} URLs: envíalas en partes.`);

const { clave, archivo } = claveYArchivo();
const ubicacion = `${SITIO}/${archivo}`;

// 1) El archivo de la clave debe estar en vivo y coincidir (si no, el buscador rechaza el aviso)
const r0 = await bajar(ubicacion);
const cuerpo = r0.ok ? (await r0.text()).trim() : "";
if ((!r0.ok || cuerpo !== clave) && probar) console.log(`Aviso: el archivo de clave todavía no está en vivo (estado ${r0.status}). Para enviar, publica primero.`);
else if (!r0.ok || cuerpo !== clave) {
  console.error(`El archivo de clave no está bien publicado (estado ${r0.status}). Publica primero el sitio y vuelve a intentar.`);
  await salir(1);
}
else console.log(`Archivo de clave en vivo: OK (${SITIO}/(clave).txt)`);
console.log(`URLs a avisar (${urls.length}):`);
for (const u of urls) console.log("  " + u);
if (probar) { console.log("Modo --probar: no se envió nada."); await salir(0); }

// 2) Envío
const r = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: clave, keyLocation: ubicacion, urlList: urls }),
  signal: AbortSignal.timeout(30000),
});
const texto = (await r.text()).replace(new RegExp(clave, "g"), "(clave)").slice(0, 300);
const sig = { 200: "aceptado", 202: "aceptado (el buscador validará la clave enseguida)", 400: "pedido mal formado", 403: "clave rechazada (no coincide con el archivo)", 422: "URLs que no pertenecen al sitio o clave inválida", 429: "demasiados envíos, espera un rato" };
console.log(`IndexNow respondió ${r.status}: ${sig[r.status] || "respuesta inesperada"}${texto ? " · " + texto : ""}`);
await salir(r.status === 200 || r.status === 202 ? 0 : 1);
