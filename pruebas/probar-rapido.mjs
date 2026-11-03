// Prueba rápida antes de publicar (no necesita Chrome ni servidor): `npm test` desde la raíz del proyecto.
// Arma el sitio en una carpeta temporal y revisa lo que, si falla, rompe el sitio publicado:
// el build corre, los enlaces internos existen, el sitemap está completo, no quedan marcas sin reemplazar,
// cada página tiene un H1, un título y un canonical, los datos estructurados son JSON válido y los JS compilan.
// Las pruebas completas (con Chrome) siguen en pruebas/probar-*.mjs; esta es la red de seguridad mínima.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = mkdtempSync(join(tmpdir(), "estudasimples-rapido-"));
let fallos = 0, total = 0;
const ok = (cond, msg, extra = "") => { total++; if (!cond) { fallos++; console.log("  FALLA: " + msg + (extra ? " -> " + extra : "")); } };

const b = spawnSync(process.execPath, ["build.mjs"], { cwd: RAIZ, env: { ...process.env, BUILD_OUT: OUT }, encoding: "utf8" });
ok(b.status === 0, "el build termina sin error", (b.stderr || "").split("\n").slice(0, 4).join(" | "));
if (b.status !== 0) { console.log(`\n${fallos} FALLOS de ${total} comprobaciones`); process.exit(1); }

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const archivos = walk(OUT);
const htmls = archivos.filter((f) => f.endsWith(".html"));
const rel = (f) => f.slice(OUT.length).replace(/\\/g, "/");

const existe = (ruta) => {
  const limpia = decodeURIComponent(ruta.split("#")[0].split("?")[0]);
  if (!limpia.startsWith("/")) return true;
  const p = join(OUT, limpia);
  return (existsSync(p) && statSync(p).isFile()) || existsSync(join(p, "index.html"));
};

const rotos = new Set(), sinMarca = [], sinH1 = [], sinTitulo = [], sinCanon = [], ldMalo = [];
for (const f of htmls) {
  const t = readFileSync(f, "utf8");
  if (/\{\{[A-Za-z_:-]+[^}]*\}\}/.test(t)) sinMarca.push(rel(f));
  if (!f.endsWith("404.html")) {
    if ((t.match(/<h1[\s>]/g) || []).length !== 1) sinH1.push(rel(f));
    if (!/<title>[^<]{5,}<\/title>/.test(t)) sinTitulo.push(rel(f));
    if (!/<link rel="canonical" href="https:\/\/[^"]+">/.test(t)) sinCanon.push(rel(f));
  }
  for (const m of t.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!existe(m[1])) rotos.add(`${rel(f)} -> ${m[1]}`);
  for (const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { ldMalo.push(rel(f)); } }
}
ok(sinMarca.length === 0, "no quedan marcas {{...}} sin reemplazar", sinMarca.slice(0, 3).join(", "));
ok(sinH1.length === 0, "cada página tiene exactamente un H1", sinH1.slice(0, 3).join(", "));
ok(sinTitulo.length === 0, "cada página tiene título", sinTitulo.slice(0, 3).join(", "));
ok(sinCanon.length === 0, "cada página tiene canonical", sinCanon.slice(0, 3).join(", "));
ok(rotos.size === 0, "todos los enlaces y archivos internos existen", [...rotos].slice(0, 4).join(" | "));
ok(ldMalo.length === 0, "los datos estructurados son JSON válido", ldMalo.slice(0, 3).join(", "));

const sitemap = readFileSync(join(OUT, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
ok(urls.length >= 40, "el sitemap tiene las páginas esperadas", String(urls.length));
ok(urls.every(existe), "todas las URL del sitemap existen", urls.filter((u) => !existe(u)).join(", "));

let jsMal = [];
for (const f of archivos.filter((x) => extname(x) === ".js" && !rel(x).includes("/vendor/"))) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) jsMal.push(rel(f));
}
ok(jsMal.length === 0, "todos los JS compilan", jsMal.join(", "));

rmSync(OUT, { recursive: true, force: true });
console.log(fallos ? `\n${fallos} FALLOS de ${total} comprobaciones` : `\nTodo en orden: ${total} comprobaciones (${htmls.length} páginas, ${urls.length} URL en el sitemap).`);
process.exit(fallos ? 1 : 0);
