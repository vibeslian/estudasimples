// Gera pinterest/pines.csv no formato de carga em massa do Pinterest ("Bulk create Pins").
// Colunas (nesta ordem): Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords.
// Regras do Pinterest (help.pinterest.com, "Bulk upload Pins"): título até 100 caracteres, descrição até 500, Media URL pública
// (PNG/JPEG), Publish date em UTC no formato 2026-10-19T11:00:00, Keywords separadas por vírgula, até 200 pins por arquivo.
// O Thumbnail só serve para vídeo: fica vazio.
//
// Uso (a partir da pasta do projeto):
//   node pinterest/gerar-csv.mjs                    começa 3 dias depois de hoje
//   node pinterest/gerar-csv.mjs --inicio 2026-11-02   primeiro dia de publicação (data do Brasil)
//   node pinterest/gerar-csv.mjs --inicio 2026-10-17 --hora 14   o primeiro pin sai no dia 17 às 14h (Brasília); 8 e 20 também valem
//   --sem-imagens   não exige que as imagens já estejam em src/pins (só para testar o texto)
// Distribuição: 3 pins por dia às 08h, 14h e 20h (horário de Brasília = UTC-3); o primeiro dia pode começar mais tarde (--hora) e o último leva os que sobrarem.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, "site.config.json"), "utf8"));
const SITIO = cfg.siteUrl.replace(/\/+$/, "");
const pines = JSON.parse(fs.readFileSync(path.join(RAIZ, "pinterest", "pines.json"), "utf8"));
const TABLEROS = ["Capas ABNT", "Normas ABNT", "TCC passo a passo", "Trabalhos escolares"];
const HORAS_UTC = ["11:00:00", "17:00:00", "23:00:00"]; // 08h, 14h e 20h em Brasília
const COLUNAS = ["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"];

// --hora 14: o primeiro dia começa na publicação das 14h (as das horas anteriores desse dia não entram)
const hi = process.argv.indexOf("--hora");
const HORA_INICIAL = hi > -1 ? Number(process.argv[hi + 1]) : 0;
if (hi > -1 && ![8, 14, 20].includes(HORA_INICIAL)) throw new Error("--hora precisa ser 8, 14 ou 20");
const i = process.argv.indexOf("--inicio");
let inicio;
if (i > -1) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(process.argv[i + 1] || "")) throw new Error("--inicio precisa ser AAAA-MM-DD");
  inicio = new Date(process.argv[i + 1] + "T00:00:00Z");
} else {
  inicio = new Date(); inicio.setUTCHours(0, 0, 0, 0); inicio.setUTCDate(inicio.getUTCDate() + 3);
}

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const saltados = HORA_INICIAL ? [8, 14, 20].indexOf(HORA_INICIAL) : 0;
const erros = [];
const ids = new Set();
const filas = pines.map((p, n) => {
  const nome = `#${n + 1} ${p.id}`;
  if (ids.has(p.id)) erros.push(`${nome}: id repetido`); ids.add(p.id);
  if (!TABLEROS.includes(p.tablero)) erros.push(`${nome}: tablero "${p.tablero}" não existe`);
  if (!p.tituloPin || p.tituloPin.length > 100) erros.push(`${nome}: título com ${(p.tituloPin || "").length} caracteres (máx. 100)`);
  if (!p.descricao || p.descricao.length > 500) erros.push(`${nome}: descrição com ${(p.descricao || "").length} caracteres (máx. 500)`);
  if ((p.keywords || []).some((k) => k.includes(","))) erros.push(`${nome}: palavra-chave com vírgula (a coluna Keywords separa por vírgula)`);
  if (!p.keywords || p.keywords.length < 3 || p.keywords.length > 5) erros.push(`${nome}: precisa de 3 a 5 palavras-chave`);
  const noTexto = (p.keywords || []).filter((k) => norm(p.descricao || "").includes(norm(k))).length;
  if (noTexto < 3) erros.push(`${nome}: só ${noTexto} palavra(s)-chave aparecem na descrição (mínimo 3)`);
  if (!/^\/[a-z0-9\/-]+\/$/.test(p.link || "")) erros.push(`${nome}: link inválido (${p.link})`);
  const png = path.join(RAIZ, "src", "pins", p.id + ".png");
  if (!process.argv.includes("--sem-imagens") && !fs.existsSync(png)) erros.push(`${nome}: falta a imagem src/pins/${p.id}.png (rode node pinterest/gerar-pines.mjs)`);
  const pos = n + saltados, dia = Math.floor(pos / 3), hora = pos % 3; // pos conta também as horas puladas do primeiro dia
  const quando = new Date(inicio.getTime() + dia * 86400000);
  const data = quando.toISOString().slice(0, 10) + "T" + HORAS_UTC[hora];
  return [p.tituloPin, `${SITIO}/pins/${p.id}.png`, p.tablero, "", p.descricao, `${SITIO}${p.link}?origem=pinterest`, data, p.keywords.join(", ")];
});
if (filas.length > 200) erros.push("mais de 200 pins: o Pinterest aceita 200 por arquivo");
if (erros.length) { console.error("Erros:\n- " + erros.join("\n- ")); process.exit(1); }

const celda = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = [COLUNAS, ...filas].map((f) => f.map(celda).join(",")).join("\n") + "\n";
fs.writeFileSync(path.join(RAIZ, "pinterest", "pines.csv"), csv, "utf8"); // UTF-8 sem BOM
const dias = {};
for (const f of filas) dias[f[6].slice(0, 10)] = (dias[f[6].slice(0, 10)] || 0) + 1;
console.log(`pinterest/pines.csv: ${filas.length} pins, de ${filas[0][6]} a ${filas[filas.length - 1][6]} (UTC)`);
console.log("Por dia:", Object.entries(dias).map(([d, c]) => `${d}: ${c}`).join(" · "));
console.log("Por tablero:", TABLEROS.map((t) => `${t}: ${pines.filter((p) => p.tablero === t).length}`).join(" · "));
