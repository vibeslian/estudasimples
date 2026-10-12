// Servidor local para ver o site em http://localhost:3000 (só para desenvolvimento).
// Imita o Cloudflare: comprime texto (gzip) e usa cache longo nas fontes.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = "dist";
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2",
};
const COMPRIMIVEIS = new Set([".html", ".css", ".js", ".json", ".xml", ".txt", ".svg"]);

createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(ROOT, path);
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    let data = await readFile(file);
    const ext = extname(file);
    const headers = { "Content-Type": TYPES[ext] || "application/octet-stream" };
    if (ext === ".woff2") headers["Cache-Control"] = "public, max-age=31536000, immutable";
    else if (req.url.includes("?v=")) headers["Cache-Control"] = "public, max-age=31536000, immutable";
    else headers["Cache-Control"] = "no-cache";
    if (COMPRIMIVEIS.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      data = gzipSync(data);
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    // como no Cloudflare Pages: se existir 404.html, é ele que aparece (com status 404)
    const pagina = await readFile(join(ROOT, "404.html")).catch(() => null);
    res.writeHead(404, { "Content-Type": pagina ? "text/html; charset=utf-8" : "text/plain; charset=utf-8" });
    res.end(pagina || "404 - Página não encontrada");
  }
}).listen(PORT, () => console.log(`Site em http://localhost:${PORT}`));
