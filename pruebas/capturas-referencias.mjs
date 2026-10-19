// Capturas del gerador de referências (computador y celular) para revisar el diseño: formulario con una referencia a medio hacer,
// la lista con 4 referencias y la vista previa de la página REFERÊNCIAS. Salen en ../capturas/referencias/. Requiere el sitio en :3000.
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { llena } from "./lib-referencias.mjs";
import { CASOS } from "./ejemplos-referencias.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "../capturas/referencias";
fs.mkdirSync(OUT, { recursive: true });
const caso = (inicio) => CASOS.find((c) => c.esperado.startsWith(inicio)).dados;
const CUATRO = [caso("PAES"), caso("MARTELETO"), caso("OLIVEIRA, Aloídes"), caso("BRASIL. Lei nº 14.681")];
const PC = { width: 1280, height: 1500, deviceScaleFactor: 1 };
const CEL = { width: 390, height: 1700, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const esp = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
for (const [nome, vp] of [["computador", PC], ["celular", CEL]]) {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(BASE + "/gerador-de-referencias-abnt/", { waitUntil: "networkidle0" });
  await p.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important} html{scroll-behavior:auto!important}" });

  // 1) formulario con un livro a medio llenar, y la referencia ya armada
  await llena(p, CUATRO[0]);
  await p.evaluate(() => document.getElementById("livro__online-link") && 0);
  await esp(300);
  await p.screenshot({ path: `${OUT}/formulario-${nome}.png` });

  // 2) lista con 4 referencias (de 4 tipos) y vista previa
  for (const d of CUATRO) { await llena(p, d); await p.$eval("#btnAdicionar", (e) => e.click()); await esp(120); }
  await p.evaluate(() => document.getElementById("tipo").dispatchEvent(new Event("change", { bubbles: true })));
  await p.evaluate(() => document.getElementById("lista").scrollIntoView({ block: "start" }));
  await esp(300);
  await p.screenshot({ path: `${OUT}/lista-4-referencias-${nome}.png` });

  // 3) en el celular, la pestaña de la vista previa
  if (nome === "celular") {
    await p.$eval("#abaPrevia", (e) => e.click());
    await esp(500);
    await p.screenshot({ path: `${OUT}/previa-${nome}.png` });
  }
  console.log(nome, "ok");
  await p.close();
}
await b.close();
