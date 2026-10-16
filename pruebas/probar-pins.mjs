// Etapa 13 (Pinterest): confere as imagens de /pins/, o CSV de carga em massa e a etiqueta de verificação do <head>.
// Roda a partir da pasta pruebas/ (como as outras provas). Precisa de dist/ já construído (npm run build) e, para os links do CSV,
// do site em http://localhost:3000 (ou BASE_URL).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { BASE } from "./lib-archivos.mjs";

const RAIZ = path.resolve("..");
const DIST = path.join(RAIZ, "dist");
const pines = JSON.parse(fs.readFileSync(path.join(RAIZ, "pinterest", "pines.json"), "utf8"));
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, "site.config.json"), "utf8"));
let falhas = 0;
const marca = (ok, msg) => { console.log(`${ok ? "OK   " : "FALHA"} ${msg}`); if (!ok) falhas++; };
const walk = (d) => fs.readdirSync(d).flatMap((n) => { const p = path.join(d, n); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });

console.log("== A) Imagens");
marca(pines.length === 20, `pines.json tem 20 pins (${pines.length})`);
let semErro = true;
for (const p of pines) {
  const f = path.join(DIST, "pins", p.id + ".png");
  if (!fs.existsSync(f)) { marca(false, `falta dist/pins/${p.id}.png`); semErro = false; continue; }
  const b = fs.readFileSync(f);
  const png = b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (!png || w !== 1000 || h !== 1500) { marca(false, `${p.id}.png: ${png ? "" : "não é PNG, "}${w}x${h} (esperado 1000x1500)`); semErro = false; }
  if (b.length > 400 * 1024) { marca(false, `${p.id}.png pesa ${Math.round(b.length / 1024)} KB (máx. 400 KB)`); semErro = false; }
}
marca(semErro, "as 20 imagens existem em dist/pins/, são PNG 1000x1500 e pesam até 400 KB");
const extras = fs.existsSync(path.join(DIST, "pins")) ? fs.readdirSync(path.join(DIST, "pins")).filter((n) => !pines.some((p) => n === p.id + ".png")) : [];
marca(extras.length === 0, `não há arquivos soltos em dist/pins/ (${extras.join(", ") || "nenhum"})`);

console.log("\n== B) Escondidas: fora do sitemap e sem links no site");
const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
marca(!/\/pins\//.test(sitemap), "o sitemap.xml não tem nenhuma URL de /pins/");
marca(!fs.existsSync(path.join(DIST, "pins", "index.html")), "/pins/ não tem página (não há index.html)");
const htmls = walk(DIST).filter((f) => f.endsWith(".html"));
const comLink = htmls.filter((f) => /["'(=]\/pins\/|estudasimples\.com\.br\/pins\//.test(fs.readFileSync(f, "utf8")));
marca(comLink.length === 0, `nenhuma página HTML liga para /pins/ (${comLink.map((f) => path.relative(DIST, f)).join(", ") || "nenhuma"})`);

console.log("\n== C) CSV de carga em massa");
const csvTxt = fs.readFileSync(path.join(RAIZ, "pinterest", "pines.csv"), "utf8");
marca(!csvTxt.startsWith("﻿"), "o CSV está em UTF-8 sem BOM");
// leitor de CSV simples (aspas duplas)
const linhas = []; { let cel = "", fila = [], q = false;
  for (let i = 0; i < csvTxt.length; i++) { const c = csvTxt[i];
    if (q) { if (c === '"' && csvTxt[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') q = false; else cel += c; }
    else if (c === '"') q = true; else if (c === ",") { fila.push(cel); cel = ""; } else if (c === "\n") { fila.push(cel); linhas.push(fila); fila = []; cel = ""; } else cel += c; } }
const cab = linhas[0];
marca(cab.join("|") === "Title|Media URL|Pinterest board|Thumbnail|Description|Link|Publish date|Keywords", `cabeçalho com as 8 colunas na ordem certa (${cab.join("|")})`);
const filas = linhas.slice(1);
marca(filas.length === 20 && filas.every((f) => f.length === 8), `20 linhas com 8 colunas cada (${filas.length})`);
marca(filas.every((f) => f[0].length > 0 && f[0].length <= 100), `títulos de até 100 caracteres (máx. ${Math.max(...filas.map((f) => f[0].length))})`);
marca(filas.every((f) => f[4].length > 0 && f[4].length <= 500), `descrições de até 500 caracteres (máx. ${Math.max(...filas.map((f) => f[4].length))})`);
marca(filas.every((f) => new Set(f[0]).size > 1) && new Set(filas.map((f) => f[0])).size === 20, "20 títulos diferentes");
marca(new Set(filas.map((f) => f[4])).size === 20, "20 descrições diferentes");
marca(filas.every((f) => ["Capas ABNT", "Normas ABNT", "TCC passo a passo", "Trabalhos escolares"].includes(f[2])), "todos os pins estão em um dos 4 tableros");
marca(filas.every((f) => f[3] === ""), "a coluna Thumbnail está vazia (só vale para vídeo)");
marca(filas.every((f) => new RegExp(`^${cfg.siteUrl}/pins/[a-z0-9-]+\\.png$`).test(f[1])), "Media URL aponta para estudasimples.com.br/pins/<id>.png");
marca(filas.every((f) => fs.existsSync(path.join(DIST, new URL(f[1]).pathname))), "cada Media URL tem o arquivo correspondente em dist/");
marca(filas.every((f) => f[5].endsWith("?origem=pinterest") && f[5].startsWith(cfg.siteUrl + "/")), "todos os links vão para o site e terminam em ?origem=pinterest");
marca(filas.every((f) => /^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(f[6])), "Publish date no formato 2026-10-19T11:00:00");
const porDia = {}; for (const f of filas) porDia[f[6].slice(0, 10)] = (porDia[f[6].slice(0, 10)] || 0) + 1;
marca(Object.values(porDia).every((n) => n >= 2 && n <= 3), `2 ou 3 pins por dia (${Object.values(porDia).join(",")})`);
marca(filas.every((f) => { const k = f[7].split(",").map((x) => x.trim()).filter(Boolean); return k.length >= 3 && k.length <= 5; }), "3 a 5 palavras-chave por pin");
const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
marca(filas.every((f) => f[7].split(",").map((x) => x.trim()).filter((k) => sem(f[4]).includes(sem(k))).length >= 3), "pelo menos 3 palavras-chave aparecem no texto da descrição");
// links do CSV: a página existe (sem a query, que é só medição)
let linksOk = true;
for (const url of [...new Set(filas.map((f) => f[5]))]) {
  try { const r = await fetch(BASE + new URL(url).pathname + new URL(url).search); if (r.status !== 200) { linksOk = false; console.log("  ", url, r.status); } }
  catch (e) { linksOk = false; console.log("  ", url, "erro", e.message); }
}
marca(linksOk, `os ${new Set(filas.map((f) => f[5])).size} links diferentes do CSV respondem 200 no site (${BASE})`);

console.log("\n== D) Etiqueta de verificação do Pinterest");
const inicio = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
if (cfg.pinterestVerificacao) marca(inicio.includes(`<meta name="p:domain_verify" content="${cfg.pinterestVerificacao}">`), "a página inicial tem a etiqueta p:domain_verify");
else marca(!/p:domain_verify/.test(inicio), "sem código configurado: nenhuma etiqueta no <head> (lugar reservado)");
// com um código de teste, a etiqueta sai no <head> de todas as páginas
const tmp = path.join(RAIZ, "dist-prova-pinterest"), tmpCfg = path.join(RAIZ, "site-prova-pinterest.config.json");
fs.writeFileSync(tmpCfg, JSON.stringify({ ...cfg, pinterestVerificacao: "abcdef0123456789abcdef0123456789" }));
try {
  execFileSync("node", ["build.mjs"], { cwd: RAIZ, env: { ...process.env, BUILD_OUT: tmp, SITE_CONFIG: tmpCfg }, stdio: "pipe" });
  const todas = walk(tmp).filter((f) => f.endsWith(".html") && !f.includes(`${path.sep}404`));
  const sem404 = todas.filter((f) => !/p:domain_verify/.test(fs.readFileSync(f, "utf8")));
  marca(sem404.length === 0, `com um código de teste, a etiqueta aparece em todas as páginas (${todas.length - sem404.length}/${todas.length})`);
  const h = fs.readFileSync(path.join(tmp, "index.html"), "utf8");
  marca(h.indexOf("p:domain_verify") > -1 && h.indexOf("p:domain_verify") < h.indexOf("</head>"), "a etiqueta está dentro do <head>");
  let rejeita = false;
  fs.writeFileSync(tmpCfg, JSON.stringify({ ...cfg, pinterestVerificacao: '"><script>x</script>' }));
  try { execFileSync("node", ["build.mjs"], { cwd: RAIZ, env: { ...process.env, BUILD_OUT: tmp, SITE_CONFIG: tmpCfg }, stdio: "pipe" }); } catch { rejeita = true; }
  marca(rejeita, "um código com caracteres estranhos faz o build parar (sem injetar HTML)");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(tmpCfg, { force: true }); }

console.log(falhas ? `\n${falhas} falha(s)` : "\nTodo OK");
process.exit(falhas ? 1 : 0);
