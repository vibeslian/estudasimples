// Opiniões de quem usou o site e o Kit TCC. Tudo vem de conteudo/avaliacoes.json (ou do arquivo da variável AVALIACOES, só para as provas).
// Regras de honestidade, que o build confere:
//  - só entra opinião REAL, com a autorização de quem a escreveu (autorizouPublicar: true);
//  - "compraVerificada: true" só vale quando a opinião veio da Hotmart (fonte "hotmart");
//  - nunca se inventa nota nem texto; sem opiniões, a página do kit mostra um convite honesto e nenhum dado estruturado de avaliação.
// O build.mjs chama preparaAvaliacoes() e troca {{AVALIACOES_KIT}}, {{AVALIACOES_HOME}} e {{KIT_REVIEWS_LD}}.
import { readFileSync } from "node:fs";

const FONTES = { hotmart: "Opinião pela Hotmart", email: "Opinião enviada por e-mail", whatsapp: "Opinião enviada por WhatsApp" };
const PRODUTOS = ["kit", "geral"];
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function carregaAvaliacoes(caminho = process.env.AVALIACOES || "conteudo/avaliacoes.json", hoje = new Date().toISOString().slice(0, 10)) {
  const bruto = JSON.parse(readFileSync(caminho, "utf8"));
  const itens = bruto.itens;
  if (!Array.isArray(itens)) throw new Error(`${caminho}: "itens" deve ser uma lista`);
  const ids = new Set();
  itens.forEach((a, i) => {
    const onde = `${caminho}, item ${i + 1}${a && a.id ? ` (${a.id})` : ""}`;
    if (!a || typeof a !== "object") throw new Error(`${onde}: deve ser um objeto`);
    if (typeof a.id !== "string" || !/^[a-z0-9-]{3,40}$/.test(a.id)) throw new Error(`${onde}: "id" deve ter de 3 a 40 letras minúsculas, números ou hífens`);
    if (ids.has(a.id)) throw new Error(`${onde}: "id" repetido`);
    ids.add(a.id);
    if (typeof a.nome !== "string" || a.nome.trim().length < 2 || a.nome.length > 40) throw new Error(`${onde}: "nome" deve ter de 2 a 40 letras (primeiro nome e inicial, como "Camila S.")`);
    if (typeof a.texto !== "string" || a.texto.trim().length < 15 || a.texto.length > 600) throw new Error(`${onde}: "texto" deve ter de 15 a 600 letras`);
    if (a.perfil !== undefined && (typeof a.perfil !== "string" || a.perfil.length > 60)) throw new Error(`${onde}: "perfil" deve ter até 60 letras`);
    if (a.nota !== undefined && (!Number.isInteger(a.nota) || a.nota < 1 || a.nota > 5)) throw new Error(`${onde}: "nota" deve ser um número inteiro de 1 a 5 (ou ficar de fora)`);
    if (!PRODUTOS.includes(a.produto)) throw new Error(`${onde}: "produto" deve ser "kit" ou "geral"`);
    if (!Object.hasOwn(FONTES, a.fonte)) throw new Error(`${onde}: "fonte" deve ser hotmart, email ou whatsapp`);
    if (a.compraVerificada === true && a.fonte !== "hotmart") throw new Error(`${onde}: "compraVerificada" só vale quando a fonte é a Hotmart`);
    if ([a.nome, a.perfil, a.texto].some((x) => typeof x === "string" && x.includes("{{"))) throw new Error(`${onde}: o texto não pode conter "{{"`);
    if (a.autorizouPublicar !== true) throw new Error(`${onde}: só se publica a opinião de quem autorizou ("autorizouPublicar": true)`);
    if (!RE_DATA.test(a.data || "") || Number.isNaN(Date.parse(a.data)) || new Date(a.data).toISOString().slice(0, 10) !== a.data) throw new Error(`${onde}: "data" deve ser uma data real, como 2026-11-05`);
    if (a.data > hoje) throw new Error(`${onde}: "data" não pode estar no futuro`);
  });
  return itens;
}

const estrela = (cheia) => `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="${cheia ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const estrelas = (n) => `<span class="estrelas" role="img" aria-label="Nota ${n} de 5">${[1, 2, 3, 4, 5].map((k) => estrela(k <= n)).join("")}</span>`;
const dataCurta = (iso) => { const m = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."]; const [a, mes, d] = iso.split("-"); return `${Number(d)} ${m[Number(mes) - 1]} ${a}`; };

function cartao(a, comProduto = false) {
  const selo = a.compraVerificada === true ? "Compra verificada na Hotmart" : FONTES[a.fonte];
  return `<li class="opiniao"><blockquote><p>${esc(a.texto.trim())}</p></blockquote>${a.nota ? estrelas(a.nota) : ""}<p class="opiniao-autor"><strong>${esc(a.nome.trim())}</strong>${a.perfil ? ", " + esc(a.perfil) : ""}</p><p class="opiniao-meta">${esc(selo)} · ${dataCurta(a.data)}${comProduto ? " · " + (a.produto === "kit" ? "Kit TCC" : "Ferramentas gratuitas") : ""}</p></li>`;
}

const CONVITE = `<p class="opinioes-vazio">Ainda não há opiniões publicadas: o Kit TCC é novo. Quem comprar pode contar como foi escrevendo para <a href="mailto:{{CONTACT_EMAIL}}?subject=Minha%20opini%C3%A3o%20sobre%20o%20Kit%20TCC">{{CONTACT_EMAIL}}</a>. Eu só publico a opinião com a sua autorização, com o seu nome (ou só as iniciais), sem inventar nada e sem mudar o sentido do que você escreveu.</p>`;

export function preparaAvaliacoes(kitAtivo, caminho, hoje) {
  const itens = carregaAvaliacoes(caminho, hoje);
  const ordenadas = [...itens].sort((x, y) => y.data.localeCompare(x.data));
  const doKit = ordenadas.filter((a) => a.produto === "kit");
  const comNota = doKit.filter((a) => a.nota);
  let ld = "";
  if (comNota.length) {
    const media = comNota.reduce((s, a) => s + a.nota, 0) / comNota.length;
    const reviews = comNota.map((a) => ({ "@type": "Review", author: { "@type": "Person", name: a.nome.trim() }, datePublished: a.data, reviewBody: a.texto.trim(), reviewRating: { "@type": "Rating", ratingValue: String(a.nota), bestRating: "5", worstRating: "1" } }));
    ld = `,"aggregateRating":${JSON.stringify({ "@type": "AggregateRating", ratingValue: (Math.round(media * 10) / 10).toFixed(1), reviewCount: String(comNota.length), bestRating: "5", worstRating: "1" })},"review":${JSON.stringify(reviews)}`.replace(/</g, "\\u003c"); // um texto com </script> não pode fechar a etiqueta dos dados estruturados
  }
  const home = ordenadas.filter((a) => kitAtivo || a.produto !== "kit").slice(0, 3);
  return {
    total: itens.length,
    kitHtml: doKit.length ? `<ul class="opinioes" role="list">${doKit.map((a) => cartao(a)).join("")}</ul>` : CONVITE,
    homeHtml: home.length
      ? `<section class="secao" id="opinioes-inicio" aria-labelledby="opinioes-inicio-titulo"><div class="container"><div class="secao-topo revelar"><span class="etiqueta">Opiniões</span><h2 id="opinioes-inicio-titulo">O que dizem as pessoas que usaram o site</h2></div><ul class="opinioes" role="list">${home.map((a) => cartao(a, true)).join("")}</ul></div></section>\n\n`
      : "",
    reviewsLd: ld,
  };
}
