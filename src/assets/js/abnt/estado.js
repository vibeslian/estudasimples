// Guarda o que o usuário digitou para passar de uma ferramenta (capa) à outra (folha de rosto) sem digitar duas vezes.
// Usa sessionStorage: os dados ficam só nesta aba do navegador, nunca são enviados a nenhum servidor e somem quando a aba é fechada.
// O botão "Limpar dados" apaga tudo na hora. Se o navegador não permitir (modo privado, bloqueio), a ferramenta continua funcionando sem guardar.
const CHAVE = "es-abnt-v1";
const CHAVE_LOGO = "es-abnt-logo-v1";
const CHAVE_AVISO = "es-abnt-aviso";
const CHAVE_REFERENCIAS = "es-abnt-refs-v1"; // lista do gerador de referências (referencias.js)

const tenta = (fn, padrao = null) => { try { return fn(); } catch (e) { return padrao; } };

export const lerEstado = () => tenta(() => JSON.parse(sessionStorage.getItem(CHAVE)));
export const gravaEstado = (obj) => tenta(() => { sessionStorage.setItem(CHAVE, JSON.stringify(obj)); return true; }, false);
export const lerLogo = () => tenta(() => JSON.parse(sessionStorage.getItem(CHAVE_LOGO)));
export const gravaLogo = (logo) => tenta(() => {
  if (logo) sessionStorage.setItem(CHAVE_LOGO, JSON.stringify(logo));
  else sessionStorage.removeItem(CHAVE_LOGO);
  return true;
}, false);

// "Limpar dados": apaga tudo e deixa um aviso para a página mostrar depois de recarregar
export function apagaTudo() {
  tenta(() => { sessionStorage.removeItem(CHAVE); sessionStorage.removeItem(CHAVE_LOGO); sessionStorage.removeItem(CHAVE_REFERENCIAS); sessionStorage.setItem(CHAVE_AVISO, "1"); });
}
export function pegaAviso() {
  const tem = tenta(() => sessionStorage.getItem(CHAVE_AVISO) === "1", false);
  if (tem) tenta(() => sessionStorage.removeItem(CHAVE_AVISO));
  return tem;
}

/* ---------- Logo ---------- */
const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
const LADO_MAXIMO = 1000; // px: de sobra para 3,5 cm de altura em 300 dpi (~410 px)
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

/**
 * Lê a imagem no navegador, reduz e devolve { src (data URL), tipo, w, h, nome }.
 * PNG/WebP com transparência continuam PNG; o resto vira JPEG (menor). Erros: "tipo" | "grande" | "invalida".
 */
export async function processaLogo(arquivo) {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) throw new Error("tipo");
  if (arquivo.size > TAMANHO_MAXIMO) throw new Error("grande");
  let img;
  try {
    img = await createImageBitmap(arquivo);
  } catch (e) {
    throw new Error("invalida");
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * escala));
  const h = Math.max(1, Math.round(img.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  if (img.close) img.close();
  const px = ctx.getImageData(0, 0, w, h).data;
  let transparente = false;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { transparente = true; break; }
  if (!transparente) {
    // JPEG não tem transparência: garante fundo branco
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  const tipo = transparente ? "image/png" : "image/jpeg";
  return { src: canvas.toDataURL(tipo, 0.92), tipo, w, h, nome: (arquivo.name || "logo").slice(0, 60) };
}
