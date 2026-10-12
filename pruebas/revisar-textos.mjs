// Revisión de textos del sitio construido (dist/): palabras que no están en el diccionario pt-BR (raíces del hunspell, comprobación simple y rápida,
// con falsos positivos en conjugaciones raras) + comprobación de enlaces externos. Revisar la lista a ojo.
// Uso: npm run build && node revisar-textos.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(AQUI, "..", "dist");
const norm = (s) => s.toLowerCase().normalize("NFC");
const stems = new Set(
  fs.readFileSync(path.join(AQUI, "node_modules", "dictionary-pt-br", "index.dic"), "utf8").split("\n").slice(1).map((l) => norm(l.split("/")[0].trim())).filter(Boolean)
);
// siglas, nombres y términos propios del sitio, revisados a mano
const PROPIAS = new Set("abnt nbr enem lgpd anpd pdf docx adsense cloudflare google word arial times roman html https ufv uern unisa tcc tccs lian martínez estuda simples viçosa ads ip uf gov br com aboutads adssettings policies arimo tinos nº iii faq ok mg sp rn cdc a4 12 dia".split(" "));

const variantes = (w) => {
  const v = [w];
  for (const [a, b] of [["s", ""], ["es", ""], ["ões", "ão"], ["ais", "al"], ["eis", "el"], ["ns", "m"], ["mente", ""], ["ões", "ão"], ["ães", "ão"], ["ães", "ã"], ["as", "o"], ["a", "o"], ["os", "o"], ["ra", "r"], ["as", "a"], ["ções", "ção"], ["zes", "z"], ["res", "r"], ["ado", "ar"], ["ada", "ar"], ["ados", "ar"], ["adas", "ar"], ["ido", "er"], ["ido", "ir"], ["ida", "ir"], ["idos", "ir"], ["ando", "ar"], ["endo", "er"], ["indo", "ir"], ["ou", "ar"], ["am", "ar"], ["em", "ar"], ["a", "ar"], ["e", "ar"], ["e", "er"], ["o", "ar"], ["amos", "ar"], ["emos", "er"], ["ei", "ar"], ["ará", "ar"], ["erá", "er"], ["aria", "ar"], ["ia", "er"], ["ão", "ar"], ["to", "r"], ["ta", "r"], ["ção", "r"], ["inho", ""], ["íssimo", ""]]) {
    if (w.endsWith(a) && w.length - a.length >= 2) v.push(w.slice(0, -a.length) + b);
  }
  return v;
};

function paginas(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "assets" ? [] : paginas(path.join(dir, e.name))) : e.name.endsWith(".html") ? [path.join(dir, e.name)] : []));
}
const visible = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"');

const desconhecidas = new Map();
const externos = new Set();
let total = 0;
for (const f of paginas(DIST)) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(DIST, f).replace(/\\/g, "/");
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) if (!m[1].includes("estudasimples.com.br")) externos.add(m[1]);
  const metas = [...html.matchAll(/<(?:title)>([^<]*)<|<meta (?:name="description"|property="og:(?:title|description)") content="([^"]*)"/g)].map((m) => m[1] || m[2]).join(" ");
  const palavras = (visible(html) + " " + metas).match(/[\p{L}][\p{L}'’-]*/gu) || [];
  for (const w0 of palavras) {
    total++;
    const w = norm(w0.replace(/^[-'’]+|[-'’]+$/g, ""));
    if (w.length < 3 || PROPIAS.has(w)) continue;
    const partes = w.includes("-") ? w.split("-") : [w];
    if (partes.every((p) => p.length < 3 || PROPIAS.has(p) || variantes(p).some((x) => stems.has(x)))) continue;
    if (!desconhecidas.has(w)) desconhecidas.set(w, new Set());
    desconhecidas.get(w).add(rel.replace("/index.html", "/") || "/");
  }
}
console.log(`Palabras revisadas: ${total}. Sin coincidencia en el diccionario: ${desconhecidas.size}`);
console.log([...desconhecidas.keys()].sort().join(", "));

console.log("\nEnlaces externos:");
for (const u of externos) {
  try {
    const hdr = { "User-Agent": "Mozilla/5.0 (revision de enlaces)" };
    let r = await fetch(u, { method: "HEAD", redirect: "follow", headers: hdr });
    if ([400, 403, 405].includes(r.status)) r = await fetch(u, { method: "GET", redirect: "follow", headers: hdr });
    console.log(String(r.status).padEnd(5), u, r.url !== u ? "-> " + r.url : "");
  } catch (e) { console.log("ERROR", u, e.message); }
}
