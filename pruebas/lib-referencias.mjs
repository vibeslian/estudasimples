// Ayudas para las pruebas del gerador de referências en el navegador: llenar el formulario de un tipo con los DADOS del motor
// (los mismos objetos de ejemplos-referencias.mjs) y leer lo que la página muestra.
import { TIPO_POR_ID, idCampo } from "../src/assets/js/abnt/referencias-campos.js";

// Convierte los dados en una lista de operaciones sencillas que se ejecutan dentro de la página
export function operaciones(dados) {
  const tipo = dados.tipo;
  const ops = [];
  const recorre = (blocos) => {
    for (const b of blocos) {
      const id = idCampo(tipo, b.id || "");
      if (b.k === "mais" || b.k === "linha") { recorre(b.campos); continue; }
      if (b.k === "titulo2") continue;
      if (b.k === "autoria") {
        const a = dados[b.id] || { modo: "pessoa", pessoas: [] };
        const base = idCampo(tipo, b.id);
        ops.push({ op: "valor", id: base + "-modo", valor: a.modo || "pessoa" });
        const pessoas = a.pessoas && a.pessoas.length ? a.pessoas : [{ sobrenome: "", nome: "" }];
        ops.push({ op: "pessoas", base, pessoas });
        if (a.entidade !== undefined) ops.push({ op: "valor", id: base + "-entidade", valor: a.entidade || "", opcional: true });
        if (a.orgao !== undefined) ops.push({ op: "valor", id: base + "-orgao", valor: a.orgao || "", opcional: true });
        if (a.papel) ops.push({ op: "valor", id: base + "-papel", valor: a.papel, opcional: true });
        if (a.quatro) ops.push({ op: "valor", id: base + "-quatro", valor: a.quatro, opcional: true });
      } else if (b.k === "check") ops.push({ op: "marca", id, valor: !!dados[b.id] });
      else if (b.k === "data") for (const p of b.partes) ops.push({ op: "valor", id: `${id}-${p}`, valor: (dados[b.id] || {})[p] ?? "" });
      else if (b.k === "online") {
        const o = dados.online || {};
        ops.push({ op: "valor", id: id + "-link", valor: o.link || "" }, { op: "valor", id: id + "-acesso", valor: o.acesso || "" });
        if (b.doi) ops.push({ op: "valor", id: id + "-doi", valor: o.doi || "" });
      } else ops.push({ op: "valor", id, valor: dados[b.id] !== undefined ? String(dados[b.id]) : b.valor ?? (b.k === "select" ? b.opcoes[0][0] : "") });
    }
  };
  recorre(TIPO_POR_ID[tipo].blocos);
  // "anoTipo" (select) e outros campos de "mais opções" ficam cobertos pelo recorre; o dado extra do ano vem solto em dados.anoTipo
  return ops;
}

// Llena el formulario del tipo (elige el tipo, abre los "mais opções" y dispara los eventos de entrada)
export async function llena(page, dados) {
  await page.evaluate((tipo) => {
    const s = document.getElementById("tipo");
    s.value = tipo;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }, dados.tipo);
  await page.evaluate((ops) => {
    const dispara = (e) => e.dispatchEvent(new Event("input", { bubbles: true }));
    for (const o of ops) {
      if (o.op === "pessoas") {
        const lista = document.getElementById(o.base + "-lista");
        while (lista.children.length < o.pessoas.length) document.getElementById(o.base + "-add").click();
        [...lista.children].forEach((l, i) => {
          const p = o.pessoas[i] || { sobrenome: "", nome: "" };
          l.querySelector(".ref-sobrenome").value = p.sobrenome || "";
          l.querySelector(".ref-nome").value = p.nome || "";
        });
        dispara(lista.querySelector("input"));
      } else if (o.op === "marca") {
        const e = document.getElementById(o.id);
        if (e.checked !== o.valor) { e.checked = o.valor; dispara(e); }
      } else {
        const e = document.getElementById(o.id);
        if (!e) { if (o.opcional) continue; throw new Error("falta #" + o.id); }
        e.value = o.valor;
        dispara(e);
      }
    }
  }, operaciones(dados));
}

// Lo que muestra la página en la tarjeta "Sua referência"
export const leResultado = (page) => page.evaluate(() => {
  const t = document.getElementById("refTexto");
  return {
    visivel: !document.getElementById("refConteudo").hidden,
    texto: t.textContent,
    negrito: [...t.querySelectorAll("strong")].map((s) => s.textContent),
    par: document.getElementById("citPar").textContent,
    nar: document.getElementById("citNar").textContent,
    avisos: document.getElementById("refAvisos").hidden ? "" : document.getElementById("refAvisos").textContent,
    falta: document.getElementById("refFalta").hidden ? "" : document.getElementById("refFalta").textContent,
    podeAdicionar: !document.getElementById("btnAdicionar").disabled,
  };
});

// Items de la lista (texto, negrito y citación de cada uno)
export const leLista = (page) => page.evaluate(() => [...document.querySelectorAll("#lista .ref-item")].map((it) => ({
  id: it.dataset.id,
  tipo: it.querySelector(".ref-item-tipo").textContent,
  texto: it.querySelector(".ref-item-texto").textContent,
  negrito: [...it.querySelectorAll(".ref-item-texto strong")].map((s) => s.textContent),
  cita: it.querySelector(".ref-item-cita").textContent,
})));
