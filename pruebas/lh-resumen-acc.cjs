// Resume un informe de Lighthouse (solo accesibilidad): nota y cada comprobación que falla, con los elementos.
// Uso: node lh-resumen-acc.cjs informe.json [informe2.json ...]
const fs = require("fs");
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(f, "utf8"));
  console.log(`\n=== ${f}  ·  ${r.finalDisplayedUrl}  ·  accesibilidad ${Math.round(r.categories.accessibility.score * 100)}`);
  for (const ref of r.categories.accessibility.auditRefs) {
    const a = r.audits[ref.id];
    if (a.score === null || a.score === 1 || a.scoreDisplayMode === "notApplicable" || a.scoreDisplayMode === "manual" || a.scoreDisplayMode === "informative") continue;
    console.log(`\n- [${a.score}] ${ref.id}: ${a.title} (peso ${ref.weight})`);
    for (const it of (a.details && a.details.items) || []) {
      const n = it.node || (it.subItems && it.subItems.items && it.subItems.items[0] && it.subItems.items[0].relatedNode) || {};
      console.log(`    · ${(n.selector || "").slice(0, 90)} | ${(n.snippet || "").replace(/\s+/g, " ").slice(0, 110)} | ${(n.explanation || "").replace(/\s+/g, " ").slice(0, 200)}`);
    }
  }
}
