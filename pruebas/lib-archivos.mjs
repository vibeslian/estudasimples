// Utilidades compartidas por las pruebas de archivos (folha de rosto, logo, modelo escolar y capa+folha juntas):
// abrir la herramienta, llenar el formulario, medir la vista previa, leer el PDF y el Word descargados.
import puppeteer from "puppeteer-core";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import JSZip from "jszip";
import fs from "node:fs";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

export const BASE = process.env.BASE_URL || "http://localhost:3000";
export const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const lanza = () => puppeteer.launch({ executablePath: CHROME, headless: "new" });

const ASC = { Arial: 0.905, "Times New Roman": 0.891 };
export const PLACEHOLDERS = ["NOME DO AUTOR", "Nome do autor", "TÍTULO DO TRABALHO", "Título do trabalho", "CIDADE", "Cidade", "ANO", "Ano",
  "Nome do orientador", "Nome do professor", "Nome da disciplina", "Universidade Exemplo"];
export const achaPlaceholders = (texto) => PLACEHOLDERS.filter((x) => texto.includes(x));

export const URL_PAGINA = { capa: "/gerador-de-capa-abnt/", folha: "/gerador-de-folha-de-rosto-abnt/" };
export const SHEET = { capa: "sheet", folha: "sheetFolha" };

export async function abre(browser, rota, vp = { width: 1280, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => {
    window.__arquivos = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = (b) => { window.__ultimoBlob = b; return orig.call(URL, b); };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__arquivos.push({ nome: this.download, blob: window.__ultimoBlob }); return; } return click.call(this); };
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  await page.goto(BASE + rota, { waitUntil: "networkidle0" });
  page.__erros = erros;
  return page;
}

const ROTULOS_ESTILO = { institution: "Instituição", course: "Curso / departamento", author: "Autor(es)", title: "Título", subtitle: "Subtítulo", city: "Cidade", year: "Ano", orientador: "Orientador e professor" };

export async function preenche(page, d) {
  await page.evaluate((d) => {
    const dispara = (e) => e.dispatchEvent(new Event("input", { bubbles: true }));
    const set = (id, v) => { const e = document.getElementById(id); if (!e) throw new Error("falta #" + id); e.value = v; dispara(e); };
    const marca = (id, v) => { const e = document.getElementById(id); if (e.checked !== v) { e.checked = v; dispara(e); } };
    if (d.escolar !== undefined) marca("escolar", d.escolar);
    for (const id of ["institution", "course", "workType", "degree", "area", "title", "subtitle", "volume", "city", "year", "font", "titleSize", "advisorLabel", "advisor", "coLabel", "discipline", "teacher", "teacherLabel"]) {
      if (d[id] !== undefined) set(id, d[id]);
    }
    if (d.authors) {
      while (document.querySelectorAll("#autores input").length < d.authors.length) document.getElementById("addAutor").click();
      document.querySelectorAll("#autores input").forEach((el, i) => { el.value = d.authors[i] ?? ""; });
    }
    if (d.coadvisors) {
      while (document.querySelectorAll("#coorientadores input").length < d.coadvisors.length) document.getElementById("addCoorientador").click();
      document.querySelectorAll("#coorientadores input").forEach((el, i) => { el.value = d.coadvisors[i] ?? ""; });
    }
    if (d.nature !== undefined) set("nature", d.nature); // texto digitado à mão
    for (const id of ["juntas", "natureJust", "logoCapa", "logoFolha"]) if (d[id] !== undefined) marca(id, d[id]);
    set("title", d.title ?? document.getElementById("title").value);
  }, d);
  if (d.logoArquivo) {
    const input = await page.$("#logoArquivo");
    await input.uploadFile(d.logoArquivo);
    await page.waitForFunction(() => !document.getElementById("logoOpcoes").hidden, { timeout: 10000 });
    await page.evaluate((d) => {
      const dispara = (e) => e.dispatchEvent(new Event("input", { bubbles: true }));
      if (d.logoTamanho) { const e = document.getElementById("logoTamanho"); e.value = d.logoTamanho; dispara(e); }
      for (const id of ["logoCapa", "logoFolha"]) if (d[id] !== undefined) { const e = document.getElementById(id); e.checked = d[id]; dispara(e); }
    }, d);
  }
  for (const [k, [caps, bold]] of Object.entries(d.estilo || {})) {
    for (const [prop, valor] of [["maiúsculas", caps], ["negrito", bold]]) {
      const sel = `input[aria-label="${ROTULOS_ESTILO[k]}: ${prop}"]`;
      const atual = await page.$eval(sel, (e) => e.checked);
      if (atual !== valor) await page.$eval(sel, (e) => e.click());
    }
  }
}

// Linhas da prévia (DOM): topo e extremos esquerdo/direito de cada linha, em pontos a partir do canto da folha
export async function linhasPrevia(page, sheetId) {
  return page.evaluate((sheetId) => {
    const sheet = document.getElementById(sheetId);
    const antes = sheet.style.transform; sheet.style.transform = "none";
    const o = sheet.getBoundingClientRect();
    const res = [];
    sheet.querySelectorAll("p").forEach((p) => {
      // só o texto (não as caixas das linhas): retângulos de cada trecho de texto
      const rects = [];
      const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); rects.push(...[...r.getClientRects()].filter((x) => x.width > 0.1)); }
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
  }, sheetId);
}

export async function palavrasPrevia(page, sheetId) {
  return page.evaluate((sheetId) => [...document.querySelectorAll("#" + sheetId + " p")].flatMap((p) => [...p.querySelectorAll(".linha > span")].flatMap((s) => s.textContent.split(/\s+/).filter(Boolean).map((w) => ({ w, b: s.style.fontWeight === "700", tam: parseFloat(p.style.fontSize) })))), sheetId);
}

export async function imagemPrevia(page, sheetId) {
  return page.evaluate((sheetId) => {
    const sheet = document.getElementById(sheetId);
    const img = sheet.querySelector("img.logo-bloco");
    if (!img) return null;
    const antes = sheet.style.transform; sheet.style.transform = "none";
    const o = sheet.getBoundingClientRect(); const r = img.getBoundingClientRect();
    sheet.style.transform = antes;
    return { x: (r.left - o.left) * 0.75, y: (r.top - o.top) * 0.75, w: r.width * 0.75, h: r.height * 0.75 };
  }, sheetId);
}

/* ---------- PDF (pdf.js) ---------- */
function mul(A, B) {
  return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
}

export async function lePdf(buffer, numPagina, fonte) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), verbosity: 0, useSystemFonts: true }).promise;
  const pagina = await doc.getPage(numPagina);
  const vp = pagina.getViewport({ scale: 1 });
  const tc = await pagina.getTextContent();
  const itens = tc.items.filter((i) => i.str.trim());
  const grupos = [];
  for (const i of itens) {
    const y = i.transform[5]; const tam = Math.abs(i.transform[3]) || i.height;
    let g = grupos.find((g) => Math.abs(g.y - y) < 1.5);
    if (!g) { g = { y, tam, esq: 1e9, dir: -1e9, texto: "" }; grupos.push(g); }
    g.esq = Math.min(g.esq, i.transform[4]); g.dir = Math.max(g.dir, i.transform[4] + i.width); g.texto += (g.texto ? " " : "") + i.str;
  }
  const A = ASC[fonte] ?? 0.9;
  const linhas = grupos.sort((a, b) => b.y - a.y).map((g) => ({ topo: vp.height - g.y - A * g.tam, esq: g.esq, dir: g.dir, tam: g.tam, texto: g.texto }));
  // imagens: posição pelo operador de pintura e a matriz de transformação acumulada
  const ops = await pagina.getOperatorList();
  const O = pdfjs.OPS;
  let ctm = [1, 0, 0, 1, 0, 0]; const pilha = []; const imagens = [];
  ops.fnArray.forEach((fn, i) => {
    if (fn === O.save) pilha.push(ctm);
    else if (fn === O.restore) ctm = pilha.pop() || ctm;
    else if (fn === O.transform) ctm = mul(ctm, ops.argsArray[i]);
    else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintImageXObjectRepeat) {
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]]);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      imagens.push({ x: Math.min(...xs), y: vp.height - Math.max(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
    }
  });
  return { linhas, imagens, paginas: doc.numPages, w: vp.width, h: vp.height };
}

// Palavras com fonte e tamanho, lidas do conteúdo do PDF (jsPDF), uma lista por página
export function palavrasDoPdf(buf) {
  const txt = buf.toString("latin1");
  const fontes = {};
  for (const m of txt.matchAll(/(\d+) 0 obj\s*<<\s*\/Type\s*\/Font[\s\S]*?\/BaseFont\s*\/([\w-]+)[\s\S]*?>>/g)) fontes[m[1]] = m[2];
  const rec = {}; for (const m of txt.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) rec[m[1]] = fontes[m[2]];
  const dec = new TextDecoder("windows-1252");
  const paginas = [];
  for (const m of txt.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let s; try { s = zlib.inflateSync(Buffer.from(m[1], "latin1")); } catch (e) { continue; }
    const conteudo = s.toString("latin1");
    if (!/ Tf/.test(conteudo)) continue;
    const saida = [];
    let fonte = "", tam = 0;
    for (const linha of conteudo.split("\n")) {
      const f = linha.match(/^\/(F\d+) ([\d.]+) Tf/); if (f) { fonte = rec[f[1]]; tam = +f[2]; continue; }
      const t = linha.match(/^\((.*)\) Tj$/); if (!t) continue;
      const bytes = []; const lit = Buffer.from(t[1], "latin1");
      for (let i = 0; i < lit.length; i++) { if (lit[i] === 92) { const n = lit[i + 1]; if (n >= 48 && n <= 55) { let o = ""; let j = i + 1; while (j < lit.length && j < i + 4 && lit[j] >= 48 && lit[j] <= 55) o += String.fromCharCode(lit[j++]); bytes.push(parseInt(o, 8)); i = j - 1; } else { bytes.push(n); i++; } } else bytes.push(lit[i]); }
      for (const w of dec.decode(Buffer.from(bytes)).split(/\s+/).filter(Boolean)) saida.push({ w, b: /Bold/.test(fonte), fonte, tam });
    }
    paginas.push(saida);
  }
  return paginas;
}

/* ---------- Word ---------- */
export async function leDocx(buf) {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  const runs = [...xml.matchAll(/<w:r>([\s\S]*?)<\/w:r>/g)].map((m) => ({ b: /<w:b\/>/.test(m[1]), sz: +(m[1].match(/<w:sz w:val="(\d+)"/) || [0, 0])[1] / 2, f: (m[1].match(/w:ascii="([^"]+)"/) || [0, ""])[1], t: ((m[1].match(/<w:t[^>]*>([^<]*)<\/w:t>/) || [0, ""])[1]) }));
  const palavras = runs.flatMap((r) => r.t.split(/\s+/).filter(Boolean).map((w) => ({ w: w.replace(/&amp;/g, "&"), b: r.b, tam: r.sz, fonte: r.f })));
  return {
    palavras,
    secoes: (xml.match(/<w:sectPr/g) || []).length,
    pgMar: (xml.match(/<w:pgMar[^>]*>/) || [""])[0],
    pgSz: (xml.match(/<w:pgSz[^>]*>/) || [""])[0],
    jc: [...new Set([...xml.matchAll(/<w:jc w:val="(\w+)"/g)].map((m) => m[1]))],
    recuos: [...new Set([...xml.matchAll(/<w:ind w:left="(\d+)"/g)].map((m) => m[1]))],
    linhas: [...new Set([...xml.matchAll(/<w:spacing[^>]*w:line="(\d+)"[^>]*w:lineRule="(\w+)"/g)].map((m) => m[1] + "/" + m[2]))],
    imagens: Object.keys(zip.files).filter((n) => n.startsWith("word/media/")),
    extentsImagens: [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((m) => ({ w: +m[1] / 12700, h: +m[2] / 12700 })),
  };
}

export function wordParaPdf(docx, pdf) {
  const ps = `$ErrorActionPreference='Stop'; $w=New-Object -ComObject Word.Application; $w.Visible=$false; $w.DisplayAlerts=0; $w.ScreenUpdating=$false; try { $d=$w.Documents.Open('${docx.replace(/\//g, "\\")}', $false, $true, $false); $pg=$d.ComputeStatistics(2); $d.ExportAsFixedFormat('${pdf.replace(/\//g, "\\")}', 17, $false); $d.Close($false); Write-Output "$pg" } finally { $w.Quit() }`;
  return +execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8", timeout: 120000 }).trim();
}

/* ---------- Comparações ---------- */
export function compara(prev, arq) {
  const out = { linhasPrevia: prev.length, linhasArquivo: arq.length };
  if (prev.length !== arq.length) { out.erro = "número de linhas diferente"; return out; }
  let mdy = 0, mdxe = 0, mdxd = 0, mdt = 0;
  prev.forEach((p, i) => { const a = arq[i]; mdy = Math.max(mdy, Math.abs(p.topo - a.topo)); mdxe = Math.max(mdxe, Math.abs(p.esq - a.esq)); mdxd = Math.max(mdxd, Math.abs(p.dir - a.dir)); mdt = Math.max(mdt, Math.abs(p.tam - a.tam)); });
  Object.assign(out, { dVert: +mdy.toFixed(2), dEsq: +mdxe.toFixed(2), dDir: +mdxd.toFixed(2), dTam: +mdt.toFixed(2) });
  return out;
}
export const norm = (s) => s.normalize("NFC");
// Uma palavra com hífen pode ser cortada no fim da linha ("Pós-" / "Graduação"): compara as partes
const partePorHifen = (lista) => lista.flatMap((x) => x.w.split(/(?<=-)(?=[^-])/).map((w) => ({ ...x, w })));
export function difPalavras(esperado, real, comTam = true) {
  esperado = partePorHifen(esperado); real = partePorHifen(real);
  const dif = [];
  if (esperado.length !== real.length) dif.push(`${esperado.length} palavras esperadas, ${real.length} encontradas`);
  esperado.forEach((e, i) => { const r = real[i]; if (!r) return; if (norm(e.w) !== norm(r.w)) dif.push(`#${i} texto "${e.w}" ≠ "${r.w}"`); else if (e.b !== r.b) dif.push(`#${i} "${e.w}" negrito ${e.b}≠${r.b}`); else if (comTam && Math.abs(e.tam - r.tam) > 0.1) dif.push(`#${i} "${e.w}" tamanho ${e.tam}≠${r.tam}`); });
  return dif;
}
export const difImagem = (a, b) => (a && b ? +Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h)).toFixed(2) : null);

export async function baixaArquivo(page, botao, indice) {
  await page.$eval(botao, (e) => e.click()); // clic por programa: con scroll suave la posición del botón cambia mientras Puppeteer hace clic
  await page.waitForFunction((n) => window.__arquivos.length >= n, { timeout: 30000 }, indice + 1);
  const r = await page.evaluate(async (idx) => { const f = window.__arquivos[idx]; const buf = new Uint8Array(await f.blob.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return { nome: f.nome, b64: btoa(s) }; }, indice);
  return { nome: r.nome, buf: Buffer.from(r.b64, "base64") };
}
export { fs, JSZip, pdfjs };
