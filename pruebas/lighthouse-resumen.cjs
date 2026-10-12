const fs = require("fs");
for (const n of ["inicio", "capa", "sobre", "privacidad"]) {
  const r = JSON.parse(fs.readFileSync(`${__dirname}/../capturas/lighthouse/${n}.report.json`, "utf8"));
  const c = r.categories, a = r.audits;
  console.log(`${n.padEnd(7)} perf ${Math.round(c.performance.score * 100)} | acces ${Math.round(c.accessibility.score * 100)} | SEO ${Math.round(c.seo.score * 100)} | buenas prácticas ${Math.round(c["best-practices"].score * 100)} | FCP ${a["first-contentful-paint"].displayValue} LCP ${a["largest-contentful-paint"].displayValue} TBT ${a["total-blocking-time"].displayValue} CLS ${a["cumulative-layout-shift"].displayValue}`);
  for (const cat of Object.values(c)) for (const ref of cat.auditRefs) { const x = a[ref.id]; if (x.score !== null && x.score < 0.9 && ref.weight > 0 && !["informative", "notApplicable"].includes(x.scoreDisplayMode)) console.log("   !", cat.id, x.id, x.score, x.displayValue || ""); }
}
