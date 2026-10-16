// Gera as imagens de Pinterest (PNG 1000x1500) a partir dos desenhos das guias e as grava em src/pins/.
// Funciona sem abrir nenhum programa visível: usa o Chrome em modo headless e o site local em http://localhost:3000
// (npm run dev). Uso (a partir da pasta do projeto):
//   node pinterest/gerar-pines.mjs            gera todos os pins de pinterest/pines.json
//   node pinterest/gerar-pines.mjs id1 id2    gera só esses pins
//   MUESTRA=pasta node ...                    grava em outra pasta (para revisar antes de publicar)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puppeteer = createRequire(path.join(RAIZ, "pruebas", "package.json"))("puppeteer-core");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SAIDA = process.env.MUESTRA ? path.resolve(process.env.MUESTRA) : path.join(RAIZ, "src", "pins");
fs.mkdirSync(SAIDA, { recursive: true });

const pines = JSON.parse(fs.readFileSync(path.join(RAIZ, "pinterest", "pines.json"), "utf8"));
const ids = process.argv.slice(2);
const lista = ids.length ? pines.filter((p) => ids.includes(p.id)) : pines;
if (ids.length && lista.length !== ids.length) throw new Error("id desconhecido em pines.json");

// Estilos do pin (as cores e fontes são as do site: tokens.css)
const CSS = `
html,body{margin:0;padding:0;background:#faf8f3}
.pin{position:relative;width:1000px;height:1500px;overflow:hidden;background:#faf8f3;display:flex;flex-direction:column;font-family:Inter,"Segoe UI",Arial,sans-serif;color:#1e2924}
.pin *{box-sizing:border-box}
.pin-fundo{z-index:0;position:absolute;right:-170px;top:-170px;width:480px;height:480px;border-radius:50%;background:#fce6de}
.pin-fundo2{z-index:0;position:absolute;left:-200px;bottom:90px;width:420px;height:420px;border-radius:50%;background:#e4ece3}
.pin-topo{position:relative;z-index:1;margin:64px 70px 0;flex:none}
.pin-selo{display:inline-block;padding:8px 22px;border-radius:999px;background:#3b5d4c;color:#faf8f3;font:700 28px/1 Nunito,"Segoe UI",sans-serif;letter-spacing:.06em;text-transform:uppercase}
.pin-titulo{margin:22px 0 0;font:800 104px/1.02 Nunito,"Segoe UI",sans-serif;color:#22362b;letter-spacing:-.01em}
.pin-sub{margin:16px 0 0;font:600 40px/1.2 Nunito,"Segoe UI",sans-serif;color:#c4472b}
.pin-meio{position:relative;z-index:1;flex:1;min-height:0;margin:26px 70px 22px;display:flex;align-items:center;justify-content:center}
.pin-cartao{background:#fff;border-radius:24px;box-shadow:0 2px 4px rgba(34,54,43,.08),0 16px 36px rgba(34,54,43,.14);padding:26px;max-height:100%;display:flex;align-items:center;justify-content:center}
.pin-cartao.papel{background:#dfe9e2;padding:30px}
.pin-cartao svg text{font-family:Arial,"Liberation Sans",Arimo,sans-serif}
.pin-cartao svg{display:block;max-width:none;margin:0;box-shadow:0 6px 22px rgba(34,54,43,.28);border-radius:3px;border:0}
.pin-chips{position:relative;z-index:1;flex:none;margin:0 70px 34px;display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.pin-chip{padding:11px 22px;border-radius:999px;background:#fff;border:3px solid #3b5d4c;color:#22362b;font:700 30px/1.15 Inter,"Segoe UI",sans-serif;text-align:center}
.pin-rodape{position:relative;z-index:1;flex:none;height:120px;background:#3b5d4c;display:flex;align-items:center;justify-content:center;gap:22px}
.pin-rodape span{font:800 50px/1 Nunito,"Segoe UI",sans-serif;color:#faf8f3;letter-spacing:.01em}
.pin-rodape svg{width:64px;height:64px}
.pin-linhas{display:grid;gap:10px;width:100%}
.pin-linha{display:grid;grid-template-columns:18px 1fr;gap:18px;padding:13px 20px 13px 0;background:#fff;border-radius:16px;overflow:hidden}
.pin-linha i{display:block;border-radius:0 8px 8px 0;background:var(--c);border-right:3px solid rgba(0,0,0,.18)}
.pin-linha b{display:block;font:800 27px/1.1 Nunito,"Segoe UI",sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#22362b}
.pin-linha p{margin:5px 0 0;font:500 29px/1.26 Inter,"Segoe UI",sans-serif;color:#1e2924}
.pin-anat{font-size:36px;line-height:1.9}
.pin-anat p{margin:0 0 6px}
.pin-anat mark{padding:2px 6px;border-radius:6px;background:var(--c);color:#1e2924}
.pin-anat .legenda{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:14px;font-size:30px;line-height:1.3;color:#4a5750}
.pin-anat .legenda span::before{content:"";display:inline-block;width:20px;height:20px;margin-right:10px;border-radius:5px;background:var(--c);border:2px solid rgba(0,0,0,.2)}
.pin-grupos{display:grid;gap:18px;width:100%}
.pin-grupo{background:#fff;border-radius:20px;padding:20px 24px;border:3px solid #d9e2dc}
.pin-grupo h3{margin:0 0 12px;font:800 34px/1 Nunito,"Segoe UI",sans-serif;text-transform:uppercase;letter-spacing:.05em;color:#3b5d4c}
.pin-grupo div{display:flex;flex-wrap:wrap;gap:10px}
.pin-el{padding:7px 16px;border-radius:999px;font:600 27px/1.1 Inter,"Segoe UI",sans-serif;border:3px dashed #8fa39a;color:#4a5750;background:#faf8f3}
.pin-el.obr{background:#3b5d4c;border:3px solid #3b5d4c;color:#faf8f3;font-weight:700}
.pin-legenda{display:flex;justify-content:center;gap:34px;margin-top:6px;font:600 28px/1 Inter,sans-serif;color:#4a5750}
.pin-legenda span::before{content:"";display:inline-block;width:26px;height:26px;margin-right:10px;vertical-align:-5px;border-radius:999px;background:#3b5d4c}
.pin-legenda span+span::before{background:#faf8f3;border:3px dashed #8fa39a;width:26px;height:26px}
.pin-fichas{display:grid;gap:14px;width:100%}
.pin-ficha{background:#fff;border-radius:16px;border:3px solid #d9e2dc;overflow:hidden}
.pin-ficha h3{margin:0;padding:12px 22px;background:#3b5d4c;color:#faf8f3;font:800 32px/1.1 Nunito,"Segoe UI",sans-serif}
.pin-ficha p{margin:0;padding:14px 22px 16px;font:500 29px/1.3 Inter,"Segoe UI",sans-serif;color:#1e2924}
`;

const MARCA = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="16" fill="#faf8f3"/><path d="M42 21c-2.5-2.6-6-3.7-10-3.7-6.2 0-10 3.1-10 7.4 0 9.6 20.5 4.6 20.5 15 0 4.7-4.5 7.6-10.8 7.6-4.7 0-8.7-1.6-11.7-4.8" fill="none" stroke="#3b5d4c" stroke-width="5.5" stroke-linecap="round"/><circle cx="48" cy="46" r="5" fill="#e8674a"/></svg>';

// Roda dentro da página da guia: lê o desenho e monta a imagem do pin no lugar do conteúdo
async function monta(pin, css, marca) {
  const el = document.querySelectorAll(pin.sel)[pin.idx || 0];
  if (!el) throw new Error(`sem elemento ${pin.sel}[${pin.idx || 0}] em ${pin.pagina}`);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const corta = (s, n) => { s = s.replace(/\s+/g, " ").trim(); if (s.length <= n) return s; const c = s.slice(0, n); return c.slice(0, c.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "") + "…"; };
  let miolo = "", fit = null;

  if (pin.tipo === "svg") {
    if (pin.vb) el.setAttribute("viewBox", pin.vb);
    const vb = el.getAttribute("viewBox").split(/\s+/).map(Number);
    fit = { w: vb[2], h: vb[3], cartao: true, svg: true, papel: true };
    miolo = el.outerHTML;
  } else if (pin.tipo === "anat-resumo") {
    const legenda = [...el.querySelectorAll(".legenda span")].map((s) => ({ c: s.style.getPropertyValue("--c").trim(), t: s.textContent.trim() }));
    const vistos = new Set(), linhas = [];
    for (const m of el.querySelectorAll("mark")) {
      const c = m.style.getPropertyValue("--c").trim();
      if (vistos.has(c)) continue;
      vistos.add(c);
      const rot = (legenda.find((l) => l.c === c) || {}).t || "";
      linhas.push(`<div class="pin-linha" style="--c:${c}"><i></i><div><b>${esc(rot)}</b><p>${esc(corta(m.textContent, pin.corte || 84))}</p></div></div>`);
    }
    miolo = `<div class="pin-linhas">${linhas.join("")}</div>`;
  } else if (pin.tipo === "captura") {
    fit = { w: pin.imgW, h: pin.imgH, cartao: true, svg: true, papel: true };
    miolo = `<img src="${pin.dataUrl}" width="${pin.imgW}" height="${pin.imgH}" alt="" style="display:block;border-radius:3px;box-shadow:0 6px 22px rgba(34,54,43,.28)">`;
  } else if (pin.tipo === "anat") {
    miolo = `<div class="pin-anat">${el.innerHTML}</div>`;
    fit = { cartao: true };
  } else if (pin.tipo === "estrutura") {
    const grupos = [];
    for (const tr of el.querySelectorAll("tbody tr")) {
      const tds = tr.querySelectorAll("td");
      let nome, elem, obr;
      if (tds.length === 3) { nome = tds[0].textContent.trim(); grupos.push({ nome, itens: [] }); elem = tds[1].textContent.trim(); obr = tds[2].textContent.trim(); }
      else { elem = tds[0].textContent.trim(); obr = tds[1].textContent.trim(); }
      grupos[grupos.length - 1].itens.push({ elem, obr: /^Obrigat/.test(obr) });
    }
    const curto = { "Resumo em língua estrangeira": "Abstract", "Resumo em português": "Resumo", "Lista de abreviaturas e siglas": "Lista de siglas", "Lista de ilustrações": "Lista de ilustrações" };
    miolo = `<div class="pin-grupos">${grupos.map((g) => `<div class="pin-grupo"><h3>${esc(g.nome)}</h3><div>${g.itens.map((i) => `<span class="pin-el${i.obr ? " obr" : ""}">${esc(curto[i.elem] || i.elem)}</span>`).join("")}</div></div>`).join("")}<div class="pin-legenda"><span>Obrigatório</span><span>Opcional</span></div></div>`;
  } else if (pin.tipo === "fichas") {
    const fichas = [...document.querySelectorAll(".ficha")].filter((f) => /^\d\./.test(f.querySelector(".ficha-topo").textContent.trim()));
    miolo = `<div class="pin-fichas">${fichas.map((f) => {
      const p = f.querySelector(".ficha-corpo p").textContent.trim().replace(/^•\s*/, "");
      return `<div class="pin-ficha"><h3>${esc(f.querySelector(".ficha-topo").textContent.trim())}</h3><p>${esc(corta(p, pin.corte || 110))}</p></div>`;
    }).join("")}</div>`;
  } else throw new Error("tipo desconhecido: " + pin.tipo);

  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
  document.body.className = "";
  document.body.innerHTML = `<div class="pin">
    <div class="pin-fundo"></div><div class="pin-fundo2"></div>
    <div class="pin-topo"><span class="pin-selo">${esc(pin.selo || "Guia ABNT")}</span><h1 class="pin-titulo" id="pt">${esc(pin.titulo)}</h1><p class="pin-sub">${esc(pin.sub)}</p></div>
    <div class="pin-meio" id="pm">${fit && fit.cartao ? `<div class="pin-cartao${fit.papel ? " papel" : ""}" id="pc">${miolo}</div>` : miolo}</div>
    <div class="pin-chips">${(pin.chips || []).map((c) => `<span class="pin-chip">${esc(c)}</span>`).join("")}</div>
    <div class="pin-rodape">${marca}<span>estudasimples.com.br</span></div>
  </div>`;
  await document.fonts.ready;
  await Promise.all(["800 100px Nunito", "600 40px Nunito", "500 30px Inter", "700 30px Inter"].map((f) => document.fonts.load(f)));

  // título: reduz a letra até caber em 3 linhas
  const t = document.getElementById("pt");
  let tam = 104;
  while ((t.scrollHeight > 3 * tam * 1.02 + 2 || t.scrollWidth > t.clientWidth) && tam > 60) { tam -= 4; t.style.fontSize = tam + "px"; }

  // desenho: ocupa a zona do meio sem passar dela
  const meio = document.getElementById("pm");
  const caixa = meio.getBoundingClientRect();
  if (fit && fit.svg) {
    const s = document.querySelector("#pc svg, #pc img");
    const maxW = caixa.width - 60, maxH = caixa.height - 60;
    const k = Math.min(maxW / fit.w, maxH / fit.h);
    s.setAttribute("width", Math.floor(fit.w * k)); s.setAttribute("height", Math.floor(fit.h * k));
    s.style.width = Math.floor(fit.w * k) + "px"; s.style.height = Math.floor(fit.h * k) + "px"; s.style.maxWidth = "none"; s.style.maxHeight = "none";
  }
  const filho = meio.firstElementChild;
  const alturaFilho = filho.getBoundingClientRect().height;
  return { titulo: tam, meioAltura: Math.round(caixa.height), filhoAltura: Math.round(alturaFilho), transborda: alturaFilho > caixa.height + 1 };
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
let erros = 0;
for (const pin of lista) {
  const p = await b.newPage();
  await p.setViewport({ width: 1000, height: 1500, deviceScaleFactor: 1 });
  await p.goto(BASE + pin.pagina, { waitUntil: "networkidle0" });
  if (pin.tipo === "captura") {
    // a prévia da ferramenta é fotografada a 2x (para não ficar borrada); "trocas" tira o ano fixo do desenho
    const c = await b.newPage();
    await c.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });
    await c.goto(BASE + pin.pagina, { waitUntil: "networkidle0" });
    // "preencher": campos do formulário da ferramenta (ex.: o ano vazio deixa o texto de exemplo "ANO" em vez do ano atual)
    await c.evaluate((campos) => {
      for (const [sel, valor] of Object.entries(campos || {})) {
        const el = document.querySelector(sel);
        el.value = valor;
        el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, pin.preencher);
    await new Promise((ok) => setTimeout(ok, 500));
    // "trocas": ajustes de texto depois que a ferramenta desenhou a folha (ex.: "Ano" -> "ANO", como as outras linhas de exemplo)
    await c.evaluate((sel, trocas) => {
      const w = document.createTreeWalker(document.querySelector(sel), NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) for (const [de, para] of trocas || []) if (n.nodeValue.trim() === de) n.nodeValue = para;
    }, pin.sel, pin.trocas);
    if (pin.escurecer) await c.addStyleTag({ content: `${pin.sel} *{color:#000 !important}` }); // textos de exemplo em cinza ficam pretos, como numa folha de verdade
    const caixa = await c.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; }, pin.sel);
    const [x0, y0, x1, y1] = pin.recorte || [0, 0, 1, 1]; // recorte: aproxima o desenho, como o viewBox dos SVG
    const clip = { x: caixa.x + caixa.width * x0, y: caixa.y + caixa.height * y0, width: caixa.width * (x1 - x0), height: caixa.height * (y1 - y0) };
    pin.dataUrl = "data:image/png;base64," + (await c.screenshot({ clip, encoding: "base64", captureBeyondViewport: true }));
    pin.imgW = Math.round(clip.width); pin.imgH = Math.round(clip.height);
    await c.close();
  }
  const r = await p.evaluate(`(${monta.toString()})(${JSON.stringify(pin)}, ${JSON.stringify(CSS)}, ${JSON.stringify(MARCA)})`);
  const arq = path.join(SAIDA, pin.id + ".png");
  await p.screenshot({ path: arq, clip: { x: 0, y: 0, width: 1000, height: 1500 } });
  if (r.transborda) erros++;
  console.log(`${r.transborda ? "REVISAR" : "ok     "} ${pin.id}.png · título ${r.titulo}px · meio ${r.filhoAltura}/${r.meioAltura}px`);
  await p.close();
}
await b.close();
if (erros) { console.error(`${erros} pin(s) com o desenho maior que a zona do meio`); process.exitCode = 1; }
