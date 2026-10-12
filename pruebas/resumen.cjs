const r = require("./resultados/resumen.json");
for (const c of r) {
  if (!c.pdf) { console.log(JSON.stringify(c)); continue; }
  const q = c.pdf.comparacao;
  console.log(`\n== ${c.cenario}`);
  console.log(`  PDF  : ${c.pdf.paginas} pág. ${c.pdf.tamanho.split(" (")[0]} | líneas ${q.linhasPrevia}/${q.linhasArquivo} | Δvert ${q["máx Δ vertical (pt)"]} Δesq ${q["máx Δ borda esq. (pt)"]} Δdir ${q["máx Δ borda dir. (pt)"]} pt | gris: ${JSON.stringify(c.pdf.placeholders)} | fuentes: ${JSON.stringify(c.pdf.familia)}`);
  console.log(`         estilo palabra a palabra (texto, mayúsculas, negrita, tamaño): ${c.pdf.estilo.length ? "DIFERENCIAS " + JSON.stringify(c.pdf.estilo.slice(0, 5)) : "idéntico a la prévia"}`);
  console.log(`  DOCX : márgenes ${(c.docx.pgMar.match(/w:(top|right|bottom|left)="(\d+)"/g) || []).join(" ")} | ${c.docx.pgSz.replace("<w:pgSz ", "").replace("/>", "")} | fuentes ${JSON.stringify(c.docx.fontesUsadas)} | interlineado ${JSON.stringify(c.docx.espacamento)} | gris: ${JSON.stringify(c.docx.placeholders)}`);
  console.log(`         estilo palabra a palabra: ${c.docx.estilo.length ? "DIFERENCIAS " + JSON.stringify(c.docx.estilo.slice(0, 5)) : "idéntico a la prévia"}`);
  if (c.docx.comparacaoWord) { const w = c.docx.comparacaoWord; console.log(`  Word REAL: ${c.docx.paginasNoWord} | líneas ${w.linhasPrevia}/${w.linhasArquivo} | Δvert ${w["máx Δ vertical (pt)"]} Δesq ${w["máx Δ borda esq. (pt)"]} Δdir ${w["máx Δ borda dir. (pt)"]} pt ${w.erro || ""}`); }
}
