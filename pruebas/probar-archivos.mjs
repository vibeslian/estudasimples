const BASE = process.env.BASE_URL || "http://localhost:3000";
import { fileURLToPath } from "node:url";
import pathMod from "node:path";
const PRUEBAS = pathMod.dirname(fileURLToPath(import.meta.url)).split(String.fromCharCode(92)).join("/");
// Prueba de Etapa 3: genera PDF y Word desde la página real y los compara con la vista previa.
import puppeteer from "puppeteer-core";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import JSZip from "jszip";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = PRUEBAS + "/resultados";
const OUT = ROOT;
const USAR_WORD = process.env.SEM_WORD ? false : true;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PLACEHOLDERS = ["NOME DO AUTOR", "Nome do autor", "TÍTULO DO TRABALHO", "Título do trabalho", "CIDADE", "Cidade", "ANO", "Ano"];
const achaPlaceholders = (texto) => PLACEHOLDERS.filter((x) => new RegExp("(^|\\s)" + x + "(\\s|$)").test(texto));
const ASC = { Arial: 0.905, "Times New Roman": 0.891 };

const CENARIOS = [
  { id: "1-arial-padrao", dados: { institution: "Universidade Federal de Viçosa", course: "Curso de Administração", authors: ["Maria Silva", "João Pereira"],
      title: "A influência das redes sociais no aprendizado", subtitle: "um estudo com alunos do ensino médio", volume: "2", city: "Viçosa - MG", font: "Arial" } },
  { id: "2-times-personalizado", dados: { institution: "", course: "", authors: ["Ana Beatriz de Oliveira-Santos"],
      title: "Desafios e perspectivas da educação básica no Brasil contemporâneo", subtitle: "uma análise crítica dos últimos vinte anos de políticas públicas", volume: "", city: "São Paulo", font: "Times New Roman", titleSize: "16",
      estilo: { institution: [false, false], title: [false, true], subtitle: [true, true], author: [false, false], city: [false, false], year: [false, false] } } },
  { id: "3-arial-minimo-14", dados: { institution: "", course: "", authors: ["Carlos Eduardo Lima"], title: "Redes neurais", subtitle: "", volume: "", city: "Recife", font: "Arial", titleSize: "14" } },
  { id: "4-times-completo-14", dados: { institution: "Universidade de São Paulo – Faculdade de Filosofia, Letras e Ciências Humanas", course: "Departamento de Letras Clássicas e Vernáculas",
      authors: ["Fernanda Albuquerque Cavalcanti de Souza", "Rafael Mendes", "Luiza Prado"], title: "A representação da memória e do esquecimento na literatura brasileira do século XX e XXI", subtitle: "estudo comparado de narrativas contemporâneas",
      volume: "1", city: "São Paulo - SP", font: "Times New Roman", titleSize: "14", estilo: { author: [true, false], course: [true, false] } } },
  { id: "5-pontuacao", dados: { institution: "Instituto “Água Viva”", course: "", authors: ["Zoé O’Connor"], title: "Educação — o futuro d’a nação", subtitle: "pós-graduação & mercado", volume: "", city: "Mossoró/RN", font: "Arial" } },
];

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });

async function abre() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => {
    window.__arquivos = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = (b) => { window.__ultimoBlob = b; return orig.call(URL, b); };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__arquivos.push({ nome: this.download, blob: window.__ultimoBlob }); return click.call(this); };
  });
  const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  await page.goto(BASE + "/gerador-de-capa-abnt/", { waitUntil: "networkidle0" });
  page.__erros = erros;
  return page;
}

async function preenche(page, d) {
  await page.evaluate((d) => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); };
    set("institution", d.institution); set("course", d.course); set("title", d.title); set("subtitle", d.subtitle); set("volume", d.volume); set("city", d.city);
    set("font", d.font); if (d.titleSize) set("titleSize", d.titleSize);
    while (document.querySelectorAll("#autores input").length < d.authors.length) document.getElementById("addAutor").click();
    document.querySelectorAll("#autores input").forEach((el, i) => { el.value = d.authors[i]; });
    set("title", d.title);
  }, d);
  const rotulos = { institution: "Instituição", course: "Curso / departamento", author: "Autor(es)", title: "Título", subtitle: "Subtítulo", city: "Cidade", year: "Ano" };
  for (const [k, [caps, bold]] of Object.entries(d.estilo || {})) {
    for (const [prop, valor] of [["maiúsculas", caps], ["negrito", bold]]) {
      const sel = `input[aria-label="${rotulos[k]}: ${prop}"]`;
      const atual = await page.$eval(sel, (e) => e.checked);
      if (atual !== valor) await page.$eval(sel, (e) => e.click());
    }
  }
}

// Linhas da prévia (DOM): topo da área de texto e extremos esquerdo/direito, em pontos a partir do canto da folha
async function linhasPrevia(page) {
  return page.evaluate(() => {
    const sheet = document.getElementById("sheet");
    const antes = sheet.style.transform; sheet.style.transform = "none";
    const o = sheet.getBoundingClientRect();
    const res = [];
    sheet.querySelectorAll("p").forEach((p) => {
      const r = document.createRange(); r.selectNodeContents(p);
      const rects = [...r.getClientRects()].filter((x) => x.width > 0.1);
      const grupos = [];
      for (const x of rects.sort((a, b) => a.top - b.top || a.left - b.left)) {
        const g = grupos.find((g) => Math.abs(g.top - x.top) < 3);
        if (g) { g.left = Math.min(g.left, x.left); g.right = Math.max(g.right, x.right); } else grupos.push({ top: x.top, left: x.left, right: x.right });
      }
      const size = parseFloat(getComputedStyle(p).fontSize) * 0.75;
      grupos.forEach((g) => res.push({ topo: (g.top - o.top) * 0.75, esq: (g.left - o.left) * 0.75, dir: (g.right - o.left) * 0.75, tam: size, texto: p.textContent }));
    });
    sheet.style.transform = antes;
    return res;
  });
}

async function linhasPdf(buffer, fonte) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), verbosity: 0, useSystemFonts: true }).promise;
  const pagina = await doc.getPage(1);
  const vp = pagina.getViewport({ scale: 1 });
  const tc = await pagina.getTextContent();
  const itens = tc.items.filter((i) => i.str.trim());
  await pagina.getOperatorList();
  const palavras = [];
  for (const i of itens) {
    let nome = ""; try { nome = pagina.commonObjs.get(i.fontName).name || ""; } catch (e) { /* */ }
    for (const w of i.str.split(/\s+/).filter(Boolean)) palavras.push({ w, b: /bold/i.test(nome), fonte: nome, tam: Math.abs(i.transform[3]) });
  }
  const grupos = [];
  for (const i of itens) {
    const y = i.transform[5]; const tam = Math.abs(i.transform[3]) || i.height;
    let g = grupos.find((g) => Math.abs(g.y - y) < 1.5);
    if (!g) { g = { y, tam, esq: 1e9, dir: -1e9, texto: "" }; grupos.push(g); }
    g.esq = Math.min(g.esq, i.transform[4]); g.dir = Math.max(g.dir, i.transform[4] + i.width); g.texto += (g.texto ? " " : "") + i.str;
  }
  const A = ASC[fonte] ?? 0.9;
  const linhas = grupos.sort((a, b) => b.y - a.y).map((g) => ({ topo: vp.height - g.y - A * g.tam, esq: g.esq, dir: g.dir, tam: g.tam, texto: g.texto }));
  return { linhas, paginas: doc.numPages, w: vp.width, h: vp.height, texto: itens.map((i) => i.str).join(" "), palavras };
}

function compara(rotulo, prev, arq) {
  const out = { rotulo, linhasPrevia: prev.length, linhasArquivo: arq.length };
  if (prev.length !== arq.length) { out.erro = "número de linhas diferente"; return out; }
  let mdy = 0, mdxe = 0, mdxd = 0, mdt = 0;
  prev.forEach((p, i) => { const a = arq[i]; mdy = Math.max(mdy, Math.abs(p.topo - a.topo)); mdxe = Math.max(mdxe, Math.abs(p.esq - a.esq)); mdxd = Math.max(mdxd, Math.abs(p.dir - a.dir)); mdt = Math.max(mdt, Math.abs(p.tam - a.tam)); });
  Object.assign(out, { "máx Δ vertical (pt)": +mdy.toFixed(2), "máx Δ borda esq. (pt)": +mdxe.toFixed(2), "máx Δ borda dir. (pt)": +mdxd.toFixed(2), "máx Δ tamanho (pt)": +mdt.toFixed(2) });
  return out;
}

// Lee el contenido real del PDF (jsPDF): fuente y tamaño de cada palabra, tal como están guardados en el archivo
import zlib from "node:zlib";
function palavrasDoPdf(buf) {
  const txt = buf.toString("latin1");
  const fontes = {};
  for (const m of txt.matchAll(/(\d+) 0 obj\s*<<\s*\/Type\s*\/Font[\s\S]*?\/BaseFont\s*\/([\w-]+)[\s\S]*?>>/g)) fontes[m[1]] = m[2];
  const rec = {}; for (const m of txt.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) rec[m[1]] = fontes[m[2]];
  const dec = new TextDecoder("windows-1252");
  const saida = [];
  for (const m of txt.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let s; try { s = zlib.inflateSync(Buffer.from(m[1], "latin1")); } catch (e) { continue; }
    const conteudo = s.toString("latin1");
    if (!/ Tf/.test(conteudo)) continue;
    let fonte = "", tam = 0;
    for (const linha of conteudo.split("\n")) {
      const f = linha.match(/^\/(F\d+) ([\d.]+) Tf/); if (f) { fonte = rec[f[1]]; tam = +f[2]; continue; }
      const t = linha.match(/^\((.*)\) Tj$/); if (!t) continue;
      const bytes = []; const lit = Buffer.from(t[1], "latin1");
      for (let i = 0; i < lit.length; i++) { if (lit[i] === 92) { const n = lit[i + 1]; if (n >= 48 && n <= 55) { let o = ""; let j = i + 1; while (j < lit.length && j < i + 4 && lit[j] >= 48 && lit[j] <= 55) o += String.fromCharCode(lit[j++]); bytes.push(parseInt(o, 8)); i = j - 1; } else { bytes.push(n); i++; } } else bytes.push(lit[i]); }
      for (const w of dec.decode(Buffer.from(bytes)).split(/\s+/).filter(Boolean)) saida.push({ w, b: /Bold/.test(fonte), fonte, tam });
    }
  }
  return saida;
}
const norm = (s) => s.normalize("NFC");
function difPalavras(rotulo, esperado, real, comTam) {
  const dif = [];
  if (esperado.length !== real.length) dif.push(`${rotulo}: ${esperado.length} palavras esperadas, ${real.length} encontradas`);
  esperado.forEach((e, i) => { const r = real[i]; if (!r) return; if (norm(e.w) !== norm(r.w)) dif.push(`#${i} texto "${e.w}" ≠ "${r.w}"`); else if (e.b !== r.b) dif.push(`#${i} "${e.w}" negrito prévia=${e.b} arquivo=${r.b}`); else if (comTam && Math.abs(e.tam - r.tam) > 0.1) dif.push(`#${i} "${e.w}" tamanho ${e.tam}≠${r.tam}`); });
  return dif;
}
const resumo = [];
for (const c of CENARIOS) {
  const page = await abre();
  await preenche(page, c.dados);
  const prev = await linhasPrevia(page);
  const spans = await page.evaluate(() => [...document.querySelectorAll("#sheet p")].flatMap((p) => [...p.children].flatMap((s) => s.textContent.split(/\s+/).filter(Boolean).map((w) => ({ w, b: s.style.fontWeight === "700", tam: parseFloat(p.style.fontSize), fonte: getComputedStyle(document.getElementById("sheet")).fontFamily })))));
  const fonteEsperada = c.dados.font;
  const prevOK = !(await page.$eval("#avisoPagina", (e) => !e.hidden));
  const info = { cenario: c.id, avisoPaginaCheia: !prevOK, errosPagina: page.__erros };
  for (const tipo of ["pdf", "docx"]) {
    await page.click(tipo === "pdf" ? "#btnPdf" : "#btnDocx");
    await page.waitForFunction((n) => window.__arquivos.length >= n, { timeout: 30000 }, tipo === "pdf" ? 1 : 2);
    const b64 = await page.evaluate(async (idx) => { const f = window.__arquivos[idx]; const buf = new Uint8Array(await f.blob.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return { nome: f.nome, b64: btoa(s) }; }, tipo === "pdf" ? 0 : 1);
    const buf = Buffer.from(b64.b64, "base64");
    const arquivo = `${OUT}/${c.id}.${tipo}`; fs.writeFileSync(arquivo, buf);
    info[tipo] = { nome: b64.nome, bytes: buf.length };
    if (tipo === "pdf") {
      const p = await linhasPdf(buf, c.dados.font);
      const fontes = [...new Set([...buf.toString("latin1").matchAll(/\/BaseFont\s*\/([A-Za-z\-]+)/g)].map((m) => m[1]))];
      info.pdf.paginas = p.paginas; info.pdf.tamanho = `${p.w.toFixed(2)} x ${p.h.toFixed(2)} pt (A4 = 595.28 x 841.89)`; info.pdf.fontes = fontes;
      info.pdf.placeholders = p.linhas.flatMap((l) => achaPlaceholders(l.texto));
      info.pdf.comparacao = compara("PDF vs prévia", prev, p.linhas); info.pdf.detalhe = prev.map((q, i) => ({ t: q.texto.slice(0, 28), tam: q.tam, prev: +(q.dir - q.esq).toFixed(2), pdf: +(p.linhas[i].dir - p.linhas[i].esq).toFixed(2), esqP: +q.esq.toFixed(2), esqA: +p.linhas[i].esq.toFixed(2) }));
      info.pdf.texto = p.linhas.map((l) => l.texto);
      const pp = palavrasDoPdf(buf);
      info.pdf.estilo = difPalavras("PDF", spans, pp, true);
      info.pdf.familia = [...new Set(pp.map((x) => x.fonte))];
    } else {
      const zip = await JSZip.loadAsync(buf); const xml = await zip.file("word/document.xml").async("string");
      const textos = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
      info.docx.pgSz = (xml.match(/<w:pgSz[^>]*>/) || [""])[0]; info.docx.pgMar = (xml.match(/<w:pgMar[^>]*>/) || [""])[0];
      info.docx.fontes = [...new Set([...xml.matchAll(/w:ascii="([^"]+)"/g)].map((m) => m[1]))];
      info.docx.paragrafos = (xml.match(/<w:p[ >]/g) || []).length;
      info.docx.placeholders = textos.flatMap((tx) => achaPlaceholders(tx));
      info.docx.texto = textos;
      const runs = [...xml.matchAll(/<w:r>([\s\S]*?)<\/w:r>/g)].map((m) => ({ b: /<w:b\/>/.test(m[1]), sz: +(m[1].match(/<w:sz w:val="(\d+)"/) || [0, 0])[1] / 2, f: (m[1].match(/w:ascii="([^"]+)"/) || [0, ""])[1], t: ((m[1].match(/<w:t[^>]*>([^<]*)<\/w:t>/) || [0, ""])[1]) }));
      const palavrasDocx = runs.flatMap((r) => r.t.split(/\s+/).filter(Boolean).map((w) => ({ w: w.replace(/&amp;/g, "&"), b: r.b, tam: r.sz, fonte: r.f })));
      info.docx.estilo = difPalavras("DOCX", spans, palavrasDocx, true);
      info.docx.fontesUsadas = [...new Set(runs.map((r) => r.f))];
      info.docx.espacamento = [...new Set([...xml.matchAll(/<w:spacing[^>]*w:line="(\d+)"[^>]*w:lineRule="(\w+)"/g)].map((m) => m[1] + "/" + m[2]))];
      if (USAR_WORD) {
        const docW = arquivo; const pdfWord = `${OUT}/${c.id}.word.pdf`; const pdfWordTmp = pdfWord;
        const ps = `$ErrorActionPreference='Stop'; $w=New-Object -ComObject Word.Application; $w.Visible=$false; $w.DisplayAlerts=0; try { $d=$w.Documents.Open('${docW.replace(/\//g, "\\")}', $false, $true); $pg=$d.ComputeStatistics(2); $d.ExportAsFixedFormat('${pdfWordTmp.replace(/\//g, "\\")}', 17); $d.Close($false); Write-Output "paginas=$pg" } finally { $w.Quit() }`;
        const r = execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8", timeout: 120000 }).trim();
        info.docx.paginasNoWord = r; 
        const pw = await linhasPdf(fs.readFileSync(pdfWord), c.dados.font);
        info.docx.comparacaoWord = compara("Word (real) vs prévia", prev, pw.linhas);
        info.docx.linhasWord = pw.linhas.map((l, i) => ({ topo: +l.topo.toFixed(1), prev: +prev[i]?.topo.toFixed(1) }));
      }
    }
  }
  resumo.push(info);
  await page.close();
}

// Caso bloqueado: falta el título -> no debe descargar nada y debe avisar
{
  const page = await abre();
  await preenche(page, { institution: "", course: "", authors: ["Maria"], title: "", subtitle: "", volume: "", city: "Recife", font: "Arial" });
  await page.click("#btnPdf"); await new Promise((r) => setTimeout(r, 800));
  resumo.push({ cenario: "6-sin-titulo", descargas: await page.evaluate(() => window.__arquivos.length), mensaje: await page.$eval("#toast", (e) => e.textContent), enfocado: await page.evaluate(() => document.activeElement.id) });
  await page.close();
}
await browser.close();
fs.writeFileSync(OUT + "/resumen.json", JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, (k, v) => (k === "texto" || k === "linhasWord" ? undefined : v), 1));
