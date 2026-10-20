// axe-core (el motor de accesibilidad de Lighthouse) para las pruebas: se busca en pruebas/node_modules y en la caché de npx
// (donde lo trae 'npx lighthouse@12'); o se indica con AXE_PATH.
// Se desactiva la regla "region" (consejo, no norma: pide que hasta el título del encabezado esté dentro de un landmark; Lighthouse no la usa).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function buscaAxe() {
  if (process.env.AXE_PATH) return process.env.AXE_PATH;
  const candidatos = [path.resolve("node_modules/axe-core/axe.min.js")];
  const npx = path.join(os.homedir(), "AppData", "Local", "npm-cache", "_npx");
  if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) candidatos.push(path.join(npx, d, "node_modules", "axe-core", "axe.min.js"));
  const hallado = candidatos.find((p) => fs.existsSync(p));
  if (!hallado) throw new Error("No encuentro axe-core. Corre una vez 'npx lighthouse@12 --version' (lo trae) o indica AXE_PATH.");
  return hallado;
}
const AXE = fs.readFileSync(buscaAxe(), "utf8");

/** Corre axe en la página abierta. Devuelve la lista de problemas: [{id, impacto, ayuda, cuantos, nodos:[{sel, res}]}]. */
export async function axeEn(page) {
  await page.addStyleTag({ content: ".revelar{opacity:1!important;transform:none!important;transition:none!important}" }).catch(() => {});
  await page.evaluate(AXE);
  return page.evaluate(async () => {
    const res = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, rules: { region: { enabled: false } }, resultTypes: ["violations"] });
    return res.violations.map((v) => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 3).map((n) => ({ sel: n.target.join(" "), res: (n.any.concat(n.all, n.none)[0] || {}).message || "" })), cuantos: v.nodes.length }));
  });
}

/** Texto para mostrar los problemas de axe. */
export function describeAxe(problemas) {
  return problemas.map((v) => `   - ${v.id} (${v.impacto}, ${v.cuantos} elementos): ${v.ayuda}\n` + v.nodos.map((n) => `       · ${n.sel.slice(0, 110)} | ${n.res.replace(/\s+/g, " ").slice(0, 170)}`).join("\n")).join("\n");
}
