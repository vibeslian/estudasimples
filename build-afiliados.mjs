// Etapa 17: "Recomendado para o seu trabalho": livros e cursos com link de afiliado, no fim das guias (antes de "Guias relacionadas").
// Tudo vem do bloco "afiliados" de site.config.json. Enquanto afiliados.ativo for false (ou um produto não tiver link), nada aparece:
// as páginas ficam idênticas às de antes. O build.mjs e o build-guias.mjs chamam estas funções.
import { dataLonga } from "./build-guias.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TIPOS = { livro: "Livro", curso: "Curso" };
export const MAX_POR_GUIA = 3;
export const FRASE_AMAZON = "Como Associado da Amazon, ganho com compras qualificadas.";
const DATA_LEGAL_ORIGINAL = "14 de outubro de 2026"; // "Última atualização" dos Termos e da Política enquanto não houver afiliados

// lojas da Amazon (amazon.com.br, amzn.to, a.co...): levam a frase obrigatória e o ID de afiliado
const ehAmazon = (host) => /(^|\.)amazon\.[a-z.]+$/.test(host) || /^amzn\./.test(host) || host === "a.co";
const ehHotmart = (host) => /(^|\.)hotmart\.com$/.test(host) || host === "hotm.art";
const amazonCompleta = (host) => /(^|\.)amazon\.[a-z.]+$/.test(host); // só estes aceitam ?tag=

// numTermos: número da seção «Links de afiliado» nos Termos de Uso (12; passa a 13 quando o Kit TCC ganha a seção 11 e a «Lei aplicável» vai para 12)
export function preparaAfiliados(config, guias, { numTermos = 12 } = {}) {
  const a = config.afiliados;
  if (!a) throw new Error("site.config.json: falta o bloco afiliados");
  const ativo = a.ativo === true;
  const onde = "site.config.json (afiliados)";
  if (a.amazonTag && !/^[A-Za-z0-9_-]{3,40}$/.test(a.amazonTag)) throw new Error(`${onde}: amazonTag deve ter só letras, números e hífen (o ID de afiliado, como "meusite-20")`);
  const nome = esc(config.siteName);
  const slugs = new Set(guias.map((g) => g.slug));
  const ids = new Set();

  // ---- confere todos os produtos (mesmo os sem link, para pegar erros de digitação cedo) ----
  const produtos = (a.produtos || []).map((p, i) => {
    const id = `${onde}, produtos[${i}]${p.id ? ` (${p.id})` : ""}`;
    if (!/^[a-z0-9-]+$/.test(p.id || "") || ids.has(p.id)) throw new Error(`${id}: "id" ausente, inválido ou repetido`);
    ids.add(p.id);
    if (!TIPOS[p.tipo]) throw new Error(`${id}: "tipo" deve ser "livro" ou "curso"`);
    for (const [k, max, obrig] of [["titulo", 90, true], ["autor", 90, p.tipo === "livro"], ["frase", 150, true], ["botao", 24, false]]) {
      if (p[k] == null || p[k] === "") { if (obrig) throw new Error(`${id}: falta "${k}"`); continue; }
      if (typeof p[k] !== "string" || p[k].length > max) throw new Error(`${id}: "${k}" deve ser um texto de até ${max} letras`);
    }
    if (!Array.isArray(p.guias) || !p.guias.length) throw new Error(`${id}: "guias" deve ser uma lista (nomes de pastas de guias, ou ["todas"])`);
    for (const g of p.guias) if (g !== "todas" && !slugs.has(g)) throw new Error(`${id}: a guia "${g}" não existe`);
    let url = null;
    if (p.url) {
      let u;
      try { u = new URL(p.url); } catch { throw new Error(`${id}: url inválida`); }
      if (u.protocol !== "https:") throw new Error(`${id}: a url precisa começar com https://`);
      if (amazonCompleta(u.hostname) && u.searchParams.has("tag") && a.amazonTag && u.searchParams.get("tag") !== a.amazonTag) throw new Error(`${id}: o link já tem tag=${u.searchParams.get("tag")}, diferente do seu ID de afiliado (${a.amazonTag}): a comissão iria para outra conta`);
      if (amazonCompleta(u.hostname) && !u.searchParams.has("tag")) {
        if (a.amazonTag) u.searchParams.set("tag", a.amazonTag);
        else if (ativo) throw new Error(`${id}: o link da Amazon precisa do ID de afiliado (preencha afiliados.amazonTag, ou use o link com ?tag=)`);
      }
      url = u.toString();
    }
    return { ...p, urlFinal: url, amazon: url ? ehAmazon(new URL(url).hostname) : false, hotmart: url ? ehHotmart(new URL(url).hostname) : false };
  });

  // ---- o que aparece: só com o interruptor ligado e só produtos com link ----
  const visiveis = ativo ? produtos.filter((p) => p.urlFinal) : [];
  const ehEnem = (slug) => { const g = guias.find((x) => x.slug === slug); return !!g && /ENEM/.test(g.categoria || ""); }; // os livros de ABNT não vão para as guias do ENEM
  const daGuiaLista = (slug) => visiveis.filter((p) => (p.guias.includes("todas") && !ehEnem(slug)) || p.guias.includes(slug));
  for (const g of guias) { const n = daGuiaLista(g.slug).length; if (n > MAX_POR_GUIA) throw new Error(`${onde}: a guia "${g.slug}" teria ${n} produtos (o máximo é ${MAX_POR_GUIA})`); }
  const algumVisivel = visiveis.length > 0;
  const algumAmazon = visiveis.some((p) => p.amazon);
  const algumHotmart = visiveis.some((p) => p.hotmart);
  const lojas = [algumAmazon && "a Amazon", algumHotmart && "a Hotmart"].filter(Boolean); // lojas/plataformas citadas nos textos legais
  const porExemplo = lojas.length ? ` (por exemplo, ${lojas.join(" e ")})` : "";
  if (algumVisivel && !a.legalAtualizadoEm) throw new Error(`${onde}: para mostrar produtos, preencha legalAtualizadoEm (a data, como "2026-11-05", em que os Termos e a Política passam a falar de links de afiliado)`);

  const cartao = (p, i) => {
    const botao = p.botao || (p.tipo === "curso" ? "Ver o curso" : p.amazon ? "Ver na Amazon" : "Ver o livro");
    return `<li class="afiliado afiliado--${p.tipo} revelar" style="--i:${i}">
            <p class="afiliado-topo"><span class="afiliado-tipo">${TIPOS[p.tipo]}</span><span class="afiliado-selo">Link de afiliado</span></p>
            <p class="afiliado-titulo">${esc(p.titulo)}</p>${p.autor ? `\n            <p class="afiliado-autor">${esc(p.autor)}</p>` : ""}
            <p class="afiliado-frase">${esc(p.frase)}</p>
            <a class="btn afiliado-botao" href="${esc(p.urlFinal)}" target="_blank" rel="sponsored nofollow noopener noreferrer">${esc(botao)}<span class="sr-only">: ${esc(p.titulo)} (link de afiliado, abre em outra aba)</span></a>
          </li>`;
  };

  const daGuia = (slug) => {
    const itens = daGuiaLista(slug);
    if (!itens.length) return "";
    const nota = `Links de afiliado: se você comprar por eles, o ${nome} pode receber uma pequena comissão, sem custo a mais para você.${itens.some((p) => p.amazon) ? " " + FRASE_AMAZON : ""}${itens.some((p) => p.tipo === "livro") ? " Livros podem trazer versões antigas das normas da ABNT: confira sempre a norma atual e o manual da sua instituição." : ""} <a href="/termos-de-uso/#links-de-afiliado">Saiba mais</a>`;
    return `<section class="afiliados" aria-labelledby="recomendados">
        <h2 id="recomendados">Recomendado para o seu trabalho</h2>
        <p class="afiliados-sub">${itens.some((p) => p.tipo === "curso") ? "Livros e cursos" : "Livros"} que combinam com esta guia. Os links abaixo são <strong>links de afiliado</strong>: se você comprar por eles, o ${nome} pode ganhar uma pequena comissão e o preço não muda para você.</p>
        <ul class="afiliados-lista">
          ${itens.map(cartao).join("\n          ")}
        </ul>
        <p class="afiliados-nota">${nota}</p>
      </section>`;
  };

  // ---- textos das páginas legais: só existem quando há produtos à mostra ----
  const frase = algumAmazon ? `\n    <p>${FRASE_AMAZON}</p>` : "";
  const termos = !algumVisivel ? "" : `

    <h2 id="links-de-afiliado">${numTermos}. Links de afiliado</h2>
    <p>Algumas guias têm a seção "Recomendado para o seu trabalho", com livros e cursos que podem ajudar na hora de fazer o trabalho. Os links dessa seção são <strong>links de afiliado</strong>: se você comprar depois de clicar neles, o ${nome} pode receber uma pequena comissão, e o preço para você não muda. Esses links aparecem sempre com a etiqueta "Link de afiliado".</p>
    <p>Escolho os livros e os cursos por tratarem do assunto de cada guia, e não pelo valor da comissão. Mesmo assim, não controlo as lojas: preço, estoque, entrega e atendimento são com quem vende. Confira os dados do produto na loja antes de comprar.</p>${frase}`;
  const privacidade = !algumVisivel ? "" : `

    <h2 id="links-de-afiliado">12. Links de afiliado</h2>
    <p>As recomendações de livros e cursos nas guias usam links de afiliado. O ${nome} não põe cookies nem ferramentas de rastreamento nesses links, e não pede nem usa o seu nome, o seu e-mail nem os seus dados de pagamento. Nos relatórios das lojas, uso só totais, como cliques, compras e comissão.</p>
    <p>Ao clicar em um desses links, você sai do site e vai para a loja${porExemplo}. Para saber que você veio do ${nome} e me pagar a comissão, a loja pode usar cookies ou identificadores. A partir daí, os seus dados são tratados conforme a política de privacidade da loja, e não por esta. Se você não quiser isso, é só não clicar nesses links ou bloquear cookies de terceiros nas configurações do navegador (como na lista "Pelo navegador" da seção 4).</p>${frase}`;

  const loja = lojas.length ? lojas.join(" ou ") : "a loja";
  const politica25 = !algumVisivel ? "" : `\n    <p>Atenção: algumas guias têm recomendações de livros e cursos com links de afiliado. Eles não são anúncios de uma rede de publicidade e não carregam nada de terceiros na página, mas, se você comprar depois de clicar, o ${nome} pode receber uma comissão. Os detalhes estão na seção 12.</p>`;
  const politica5 = !algumVisivel ? "" : `\n      <li><strong>lojas parceiras${porExemplo}</strong>, somente se você clicar em um link de afiliado, conforme a seção 12: o site não envia dados a elas, mas o seu navegador passa a se comunicar com a loja;</li>`;
  const politica3 = !algumVisivel ? "" : `\n    <p>Ao clicar em um link de afiliado, ${loja} pode definir cookies no seu navegador (seção 12).</p>`;
  const promessaHome = !algumVisivel ? "" : `<li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>Links de afiliado vêm sempre marcados com «Link de afiliado».</span></li>`;
  const sobre = !algumVisivel ? "" : `
    <p>Algumas guias trazem links de afiliado (livros e cursos). Se você comprar por eles, o site pode receber uma pequena comissão, sem custo extra para você, e esses links vêm sempre marcados com «Link de afiliado».</p>`;
  const termos9 = !algumVisivel ? "" : `\n    <p>Hoje, algumas guias já têm links de afiliado para livros e cursos: eles rendem uma comissão ao site, sem custo a mais para você, e vêm sempre com a etiqueta "Link de afiliado". Veja a seção ${numTermos}.</p>`;

  return {
    ativo,
    daGuia,
    visiveis: visiveis.length,
    valores: {
      "{{AFILIADOS_TERMOS}}": termos,
      "{{AFILIADOS_PRIVACIDADE}}": privacidade,
      "{{AFILIADOS_POLITICA_25}}": politica25,
      "{{AFILIADOS_POLITICA_5}}": politica5,
      "{{AFILIADOS_POLITICA_3}}": politica3,
      "{{AFILIADOS_TERMOS_9}}": termos9,
      "{{AFILIADOS_SOBRE}}": sobre,
      "{{AFILIADOS_PROMESSA_HOME}}": promessaHome,
      // data de "Última atualização" dos Termos e da Política: a de sempre, até os links de afiliado entrarem
      "{{LEGAL_ATUALIZADO}}": algumVisivel ? dataLonga(a.legalAtualizadoEm) : DATA_LEGAL_ORIGINAL,
    },
  };
}
