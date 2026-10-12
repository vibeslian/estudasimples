// Mediana de varias mediciones de Lighthouse (modo celular) por página: capturas/lighthouse/_runs/<pagina>-<n>.json
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "capturas", "lighthouse", "_vivo");
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pages = [...new Set(fs.readdirSync(dir).map((f) => f.replace(/-\d+\.json$/, "")))];
for (const p of pages) {
  const runs = fs.readdirSync(dir).filter((f) => f.startsWith(p + "-")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  const sc = (k) => runs.map((r) => Math.round(r.categories[k].score * 100));
  console.log(`${p.padEnd(11)} perf ${med(sc("performance"))} (runs ${sc("performance").join("/")}) | acces ${med(sc("accessibility"))} | SEO ${med(sc("seo"))} | buenas prácticas ${med(sc("best-practices"))} | LCP ${med(runs.map((r) => r.audits["largest-contentful-paint"].numericValue / 1000)).toFixed(1)} s | TBT ${Math.round(med(runs.map((r) => r.audits["total-blocking-time"].numericValue)))} ms | CLS ${med(runs.map((r) => r.audits["cumulative-layout-shift"].numericValue)).toFixed(3)}`);
}
