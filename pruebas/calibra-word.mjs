// Calibra el cálculo de saltos de línea contra Word REAL, usando el .docx real que genera el sitio (sin kerning, igual que el usuario).
// Word se abre oculto y sin ventanas (Visible = false) y se cierra al terminar; nada se abre en pantalla.
// Por cada párrafo compara en qué línea pone Word cada palabra con la que predice el modelo del sitio. Uso: node calibra-word.mjs
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { lanza, abre, URL_PAGINA, fs } from "./lib-archivos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)).split("\\").join("/");
const TRAB = AQUI + "/../ejemplos/_pruebas";
const DOCS = TRAB + "/calib";
fs.rmSync(DOCS, { recursive: true, force: true }); fs.mkdirSync(DOCS, { recursive: true });
const semTags = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const textos = [];
for (const n of ["capa", "folha"]) for (const i of JSON.parse(fs.readFileSync(AQUI + `/../conteudo/faq-${n}.json`, "utf8"))) for (const r of i.r) textos.push(semTags(r));
const largos = textos.filter((t) => t.length >= 140).slice(0, 60);
const titulos = textos.filter((t) => t.length >= 50 && t.length <= 150).slice(0, 48).map((t) => t.replace(/[.:]+$/, ""));
const FONTES = ["Arial", "Times New Roman"];
const casos = [];
largos.forEach((t, i) => casos.push({ tipo: "natureza", text: t, font: FONTES[i % 2], just: true }));
largos.forEach((t, i) => casos.push({ tipo: "natureza-esq", text: t, font: FONTES[i % 2], just: false }));
titulos.forEach((t, i) => casos.push({ tipo: "titulo", text: t, font: FONTES[i % 2], size: ["12", "14", "16"][i % 3] }));

const browser = await lanza();
const page = await abre(browser, URL_PAGINA.folha);
const itens = [];
const modelo = [];
for (const [i, c] of casos.entries()) {
  const r = await page.evaluate(async (c) => {
    const m = await import("/assets/js/abnt/modelo.js");
    const l = await import("/assets/js/abnt/layout.js");
    const e = await import("/assets/js/abnt/exporta.js");
    const dados = { institution: "X", authors: ["Autor"], title: c.tipo === "titulo" ? c.text : "Titulo", subtitle: "", city: "Cidade", year: "2026", font: c.font, titleSize: c.size || "12",
      workType: "outro", nature: c.tipo === "titulo" ? "Texto." : c.text, natureManual: true, natureJustificada: c.just !== false, advisor: "", coadvisors: [] };
    const mod = m.montaFolha(dados);
    await e.garanteFontes(c.font);
    const medir = e.medidorCanvas(c.font);
    const alvoId = c.tipo === "titulo" ? "title" : "natureza";
    const bloco = mod.blocks.find((b) => b.id === alvoId);
    const g = l.geometria();
    const larg = g.larguraArea - (bloco.recuo || 0);
    const palavrasPorLinha = (linhas) => linhas.map((ln) => ln.parts.map((p) => p.text).join("").split(/\s+/).filter(Boolean).length);
    const variantes = {};
    for (const comp of [0, 0.2, 0.22, 0.24, 0.25, 0.26, 0.28, 0.3]) variantes[comp] = palavrasPorLinha(l.quebraLinhas(bloco.runs, larg, (t, b) => medir(t, b, bloco.size), { compressao: bloco.align === "justify" ? comp : 0 }));
    const texto = bloco.runs.map((r) => r.text).join("");
    const { blob } = await e.geraDocx(dados, ["folha"]);
    const buf = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000));
    return { texto, variantes, b64: btoa(s) };
  }, c);
  const arq = `${DOCS}/${String(i).padStart(3, "0")}.docx`;
  fs.writeFileSync(arq, Buffer.from(r.b64, "base64"));
  itens.push({ docx: arq.replace(/\//g, "\\"), texto: r.texto });
  modelo.push(r.variantes);
}
await browser.close();
fs.writeFileSync(TRAB + "/calib-entrada.json", JSON.stringify(itens));

console.log(`Midiendo ${itens.length} .docx reales en Word (oculto)...`);
const ps = `& ([scriptblock]::Create((Get-Content -Raw -Encoding UTF8 '${AQUI}/linhas-docx.ps1'))) -Entrada '${TRAB}/calib-entrada.json' -Saida '${TRAB}/calib-saida.json'`;
console.log(execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8", timeout: 590000 }).trim());
const word = JSON.parse(fs.readFileSync(TRAB + "/calib-saida.json", "utf8").replace(/^\uFEFF/, ""));

// Palabras por línea según Word
const porLinha = (nums) => { const m = new Map(); for (const n of nums) m.set(n, (m.get(n) || 0) + 1); return [...m.keys()].sort((a, b) => a - b).map((k) => m.get(k)); };
const comps = Object.keys(modelo[0]);
const tipos = ["natureza", "natureza-esq", "titulo"];
console.log("\nPárrafos con los mismos saltos de línea que Word (de cada tipo):");
console.log("compresión".padEnd(12), tipos.map((t) => t.padEnd(16)).join(""), "total");
for (const comp of comps) {
  const fila = [];
  let okT = 0;
  for (const t of tipos) {
    let ok = 0, n = 0;
    casos.forEach((c, i) => { if (c.tipo !== t) return; n++; const w = porLinha(word[i] || []); if (JSON.stringify(w) === JSON.stringify(modelo[i][comp])) ok++; });
    okT += ok; fila.push(`${ok}/${n}`.padEnd(16));
  }
  console.log(String(comp).padEnd(12), fila.join(""), `${okT}/${casos.length}`);
}
const malos = casos.map((c, i) => ({ c, i })).filter(({ c, i }) => JSON.stringify(porLinha(word[i] || [])) !== JSON.stringify(modelo[i]["0"])).slice(0, 12);
console.log("\nEjemplos con compresión 0 (palabras por línea: Word | modelo):");
for (const { c, i } of malos) console.log(`  [${c.tipo} ${c.font}${c.size ? " " + c.size : ""}] ${JSON.stringify(porLinha(word[i] || []))} | ${JSON.stringify(modelo[i]["0"])}`);
