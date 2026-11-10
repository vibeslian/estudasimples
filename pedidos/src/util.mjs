// Utilidades del Worker de pedidos: respuestas, validaciones y límite de intentos.

export const MAX_ARCHIVO = 25 * 1024 * 1024; // 25 MB
export const DIAS_APAGAR_ENTREGA = 15;
export const DIAS_APAGAR_SIN_CONCLUIR = 30;
const ALFABETO_ID = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin letras que se confunden (I, O, 0, 1)

export const ahora = () => Math.floor(Date.now() / 1000);

const CABECERAS = {
  "Content-Security-Policy": "default-src 'none'; sandbox", // nada do que vem do servidor pode executar scripts no navegador
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function json(datos, status = 200) {
  return new Response(JSON.stringify(datos), { status, headers: { ...CABECERAS, "Content-Type": "application/json; charset=utf-8" } });
}

export function erro(status, mensagem) {
  return json({ ok: false, erro: mensagem }, status);
}

export function arquivo(corpo, tipo, nome) {
  return new Response(corpo, {
    headers: { ...CABECERAS, "Content-Type": tipo, "Content-Disposition": `attachment; filename="${nome}"` },
  });
}

function aleatorios(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function novoId() {
  return Array.from(aleatorios(8), (x) => ALFABETO_ID[x % ALFABETO_ID.length]).join("");
}

export function novoToken() {
  // 32 bytes aleatórios em base64url: 43 caracteres, impossível de adivinhar
  return btoa(String.fromCharCode(...aleatorios(32))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const ID_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export async function sha256Hex(texto) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(h), (x) => x.toString(16).padStart(2, "0")).join("");
}

// WhatsApp brasileiro: só dígitos, com DDD (10 ou 11 dígitos), guardado com 55 na frente.
export function normalizaWhatsapp(texto) {
  let d = String(texto || "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (d.length === 11 && d[2] !== "9") return null; // celular com 9 na frente
  return "55" + d;
}

export function nomeLimpo(texto, max = 80) {
  return String(texto || "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function primeiroNome(nome) {
  return nomeLimpo(nome).split(" ")[0] || "";
}

// O nome do arquivo que o cliente mandou só serve para mostrar; no armazenamento nunca se usa.
export function nomeArquivoSeguro(nome) {
  return String(nome || "trabalho").replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/\.{2,}/g, ".").slice(0, 120) || "trabalho";
}

// Os primeiros bytes dizem o que o arquivo é de verdade, não o nome.
export async function tipoReal(blob) {
  const b = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const txt = String.fromCharCode(...b);
  if (txt.startsWith("%PDF-")) return "pdf";
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    // zip: só vale como Word (.docx) se tiver o documento de Word dentro e NÃO tiver macros (os nomes dos arquivos do zip ficam em texto no final)
    const fim = String.fromCharCode(...new Uint8Array(await blob.slice(Math.max(0, blob.size - 262144)).arrayBuffer()));
    if (fim.includes("word/document.xml") && !/vbaProject\.bin/i.test(fim)) return "docx";
  }
  return null;
}

export const temChave = (objeto, chave) => Object.prototype.hasOwnProperty.call(objeto, chave);

export const TIPOS = {
  pdf: { mime: "application/pdf", ext: "pdf" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
};

// Limite de tentativas: devolve true se ainda pode.
export async function limitar(env, chave, max, segundos) {
  const t = ahora();
  const r = await env.DB.prepare(
    "INSERT INTO limites (chave, n, expira) VALUES (?1, 1, ?2) " +
      "ON CONFLICT(chave) DO UPDATE SET n = CASE WHEN expira < ?3 THEN 1 ELSE n + 1 END, expira = CASE WHEN expira < ?3 THEN ?2 ELSE expira END " +
      "RETURNING n",
  ).bind(chave, t + segundos, t).first();
  return r.n <= max;
}

// Código derivado de um dado pessoal (IP, WhatsApp), com um segredo (IP_SALT) para que não dê para desfazer por força bruta.
// Sem o segredo configurado usa a base do site (menos seguro: o documento de colocação em funcionamento manda configurar o segredo).
export async function hmacHex(env, texto) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.IP_SALT || env.PUBLIC_BASE), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(s), (x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function ipHash(request, env) {
  return hmacHex(env, "ip|" + (request.headers.get("CF-Connecting-IP") || "sem-ip"));
}

// Leitura de JSON pequeno (o corpo dos pedidos do cliente nunca passa de alguns bytes).
export async function lerJson(request, limite = 4096) {
  if (Number(request.headers.get("Content-Length") || 0) > limite) return null; // não lê corpos grandes
  const texto = await request.text();
  if (texto.length > limite) return null;
  try {
    const v = JSON.parse(texto);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}
