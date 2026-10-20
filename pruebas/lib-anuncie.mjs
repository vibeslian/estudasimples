// Ayudas para las pruebas de la página /anuncie/ y del cartón "Parceiro recomendado": construyen el sitio con una copia modificada de
// site.config.json (SITE_CONFIG y BUILD_OUT, que build.mjs ya admite) y lo sirven en un puerto propio. No tocan dist/ ni el servidor :3000.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONFIG_REAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "site.config.json"), "utf8"));

// Valores de EJEMPLO (inventados, solo para probar y fotografiar la página encendida; nunca van al sitio real)
export const NUMEROS_EJEMPLO = { referencia: "setembro de 2026", fonte: "dados de exemplo", visitasMes: 12500, paginasVistasMes: 31200, percentualCelular: 78 };
export const PARCEIRO_EJEMPLO = {
  ativo: true,
  anunciante: "Curso Exemplo",
  titulo: "Revisão de texto para o seu TCC",
  texto: "Revisores formados em Letras conferem o seu trabalho antes da entrega. Orçamento sem compromisso.",
  botao: "Conhecer",
  url: "https://www.exemplo.com.br/revisao?utm_source=estudasimples",
  guias: ["como-fazer-referencia-abnt"],
};

const mezcla = (base, mod) => {
  if (Array.isArray(mod) || mod === null || typeof mod !== "object") return mod;
  const r = { ...base };
  for (const [k, v] of Object.entries(mod)) r[k] = mezcla(base ? base[k] : undefined, v);
  return r;
};

/** Construye el sitio con la configuración real + los cambios de `mod`. Devuelve {dir, ok, salida}. */
export function construye(mod = {}, nombre = "sitio") {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `es-${nombre}-`));
  const cfg = mezcla(CONFIG_REAL, mod);
  const cfgPath = path.join(tmp, "site.config.json");
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  const dir = path.join(tmp, "dist");
  const r = spawnSync(process.execPath, ["build.mjs"], { cwd: RAIZ, env: { ...process.env, SITE_CONFIG: cfgPath, BUILD_OUT: dir }, encoding: "utf8" });
  return { dir, ok: r.status === 0, salida: (r.stdout || "") + (r.stderr || ""), config: cfg };
}

export const leer = (dir, rel) => fs.readFileSync(path.join(dir, rel), "utf8");
export const existe = (dir, rel) => fs.existsSync(path.join(dir, rel));

export function paginasHtml(dir) {
  const out = [];
  const recorre = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) recorre(p); else if (n.endsWith(".html")) out.push(path.relative(dir, p).split(path.sep).join("/")); } };
  recorre(dir);
  return out;
}

/** Servidor estático mínimo para la carpeta construida (puerto libre). */
export function sirve(dir) {
  const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let f = path.join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!fs.existsSync(f)) { res.writeHead(404); res.end("404"); return; }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" });
      res.end(fs.readFileSync(f));
    }).listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${s.address().port}`, cierra: () => new Promise((r) => s.close(r)) }));
  });
}

export const limpia = (dir) => fs.rmSync(path.dirname(dir), { recursive: true, force: true });
