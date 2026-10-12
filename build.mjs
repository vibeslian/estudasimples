// Construye o site: copia src/ -> dist/, troca os valores de site.config.json,
// insere os fragmentos compartilhados (cabeçalho, rodapé...), junta o CSS global em um só arquivo,
// gera as perguntas frequentes (HTML + dados estruturados) e cria sitemap.xml e robots.txt.
// Uso: node build.mjs          (versão para publicar)
//      node build.mjs --dev    (inclui páginas de desenvolvimento, como /_guia-de-estilo/)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";

const SRC = "src";
const OUT = "dist";
const DEV = process.argv.includes("--dev");
const config = JSON.parse(readFileSync("site.config.json", "utf8"));
const siteUrl = config.siteUrl.replace(/\/+$/, "");

// CSS global: estes arquivos viram um só (assets/css/site.css), menos pedidos = carrega mais rápido
const CSS_GLOBAL = ["tokens", "base", "components"];
const cssDir = join(SRC, "assets", "css");
const minificaCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
const cssGlobal = CSS_GLOBAL.map((n) => readFileSync(join(cssDir, n + ".css"), "utf8")).join("\n");

const values = {
  "{{SITE_NAME}}": config.siteName,
  "{{SITE_URL}}": siteUrl,
  "{{CONTACT_EMAIL}}": config.contactEmail,
  "{{TAGLINE}}": config.tagline,
  "{{YEAR}}": String(new Date().getFullYear()),
  "{{BUILD}}": Date.now().toString(36), // muda a cada build: evita CSS/JS antigo em cache
};

const TEXT_EXT = new Set([".html", ".css", ".js", ".json", ".xml", ".txt", ".svg", ".webmanifest"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Perguntas frequentes: um só arquivo (conteudo/faq-<nome>.json) gera o HTML visível e o dado estruturado FAQPage.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const semTags = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
function faq(nome) {
  const itens = JSON.parse(readFileSync(join("conteudo", `faq-${nome}.json`), "utf8"));
  const linhas = itens.map(
    (i) => `  <details><summary>${esc(i.p)}</summary><div class="faq-resposta">${i.r.map((p) => "<p>" + p + "</p>").join("")}</div></details>`
  );
  const html = ['<div class="faq">', ...linhas, "</div>"].join("\n");
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: itens.map((i) => ({ "@type": "Question", name: i.p, acceptedAnswer: { "@type": "Answer", text: i.r.map(semTags).join(" ") } })),
  };
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  return { html, jsonld: `<script type="application/ld+json">${json}</script>` };
}

function render(text) {
  text = text
    .replace(/\{\{FAQ_HTML:([\w-]+)\}\}/g, (_, n) => faq(n).html)
    .replace(/\{\{FAQ_JSONLD:([\w-]+)\}\}/g, (_, n) => faq(n).jsonld);
  // fragmentos compartilhados: {{include:header}} -> src/partials/header.html (duas passadas: eles podem incluir outros)
  for (let i = 0; i < 2; i++) text = text.replace(/\{\{include:([\w-]+)\}\}/g, (_, name) => readFileSync(join(SRC, "partials", name + ".html"), "utf8"));
  for (const [key, val] of Object.entries(values)) text = text.split(key).join(val);
  return text;
}

rmSync(OUT, { recursive: true, force: true });
const pages = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const partes = rel.split(sep);
  if (partes[0] === "partials") continue; // fragmentos não são publicados sozinhos
  const privada = partes.some((p, i) => i < partes.length - 1 && p.startsWith("_")); // pastas _algo = só desenvolvimento
  if (privada && !DEV) continue;
  if (partes[0] === "assets" && partes[1] === "css" && CSS_GLOBAL.includes(partes[2].replace(".css", ""))) continue; // já vão no site.css

  const dest = join(OUT, rel);
  mkdirSync(join(dest, ".."), { recursive: true });
  // as bibliotecas de terceiros (assets/js/vendor) são copiadas sem tocar no conteúdo
  const copiaDireto = partes.includes("vendor");
  if (TEXT_EXT.has(extname(file)) && !copiaDireto) writeFileSync(dest, render(readFileSync(file, "utf8")));
  else writeFileSync(dest, readFileSync(file));

  if (rel.endsWith("index.html") && !privada) {
    pages.push("/" + rel.slice(0, -"index.html".length).split(sep).join("/")); // "/" ou "/gerador-de-capa-abnt/"
  }
}

mkdirSync(join(OUT, "assets", "css"), { recursive: true });
writeFileSync(join(OUT, "assets", "css", "site.css"), minificaCss(cssGlobal));

const today = new Date().toISOString().slice(0, 10);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.sort().map((p) => `  <url><loc>${siteUrl}${p}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(OUT, "sitemap.xml"), sitemap);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

// Cloudflare Pages: cache longo para fontes e bibliotecas (têm a versão no nome do arquivo)
writeFileSync(
  join(OUT, "_headers"),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n\n` +
    `/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/assets/js/vendor/*\n  Cache-Control: public, max-age=31536000, immutable\n`
);

console.log(`Site construído em ${OUT}/ (${pages.length} páginas${DEV ? ", modo dev" : ""}):`);
pages.forEach((p) => console.log("  " + p));
