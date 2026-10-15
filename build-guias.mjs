// Guias ABNT (Etapa 10): o que é igual em todas as guias (cabeçalho do <head>, topo com migalhas, caixa da ferramenta, guias relacionadas,
// fontes, datas e dados estruturados) é montado aqui a partir de conteudo/guias.json. Cada guia só escreve o seu texto.
// Para uma guia nova: um item em conteudo/guias.json e uma pasta em src/guias/<slug>/index.html.
import { readFileSync } from "node:fs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonSeguro = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const dataLonga = (iso) => { const [a, m, d] = iso.split("-").map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; };

export const CATEGORIAS = ["Formatação do trabalho", "Referências e citações", "Estrutura do trabalho", "Capa, folha de rosto e sumário"];

export function carregaGuias(arquivo = "conteudo/guias.json") {
  const guias = JSON.parse(readFileSync(arquivo, "utf8"));
  const slugs = new Set(guias.map((g) => g.slug));
  const titulos = new Set(), descricoes = new Set();
  for (const g of guias) {
    const onde = `conteudo/guias.json, guia "${g.slug}"`;
    if (!/^[a-z0-9-]+$/.test(g.slug)) throw new Error(`${onde}: slug inválido`);
    for (const k of ["titulo", "h1", "descricao", "lead", "resumoIndice", "categoria", "atualizado", "norma", "ferramenta", "relacionadas", "fontes", "rotulo"]) if (!g[k]) throw new Error(`${onde}: falta "${k}"`);
    if (!CATEGORIAS.includes(g.categoria)) throw new Error(`${onde}: categoria desconhecida "${g.categoria}"`);
    if (g.titulo.length > 64) throw new Error(`${onde}: título com ${g.titulo.length} caracteres (máximo 64, ideal até 60)`);
    if (g.descricao.length > 158 || g.descricao.length < 100) throw new Error(`${onde}: descrição com ${g.descricao.length} caracteres (entre 100 e 158)`);
    if (titulos.has(g.titulo)) throw new Error(`${onde}: título repetido`);
    if (descricoes.has(g.descricao)) throw new Error(`${onde}: descrição repetida`);
    titulos.add(g.titulo); descricoes.add(g.descricao);
    if (g.relacionadas.length < 2 || g.relacionadas.length > 3) throw new Error(`${onde}: precisa de 2 ou 3 guias relacionadas`);
    for (const r of g.relacionadas) if (!slugs.has(r) || r === g.slug) throw new Error(`${onde}: guia relacionada inexistente "${r}"`);
    if (g.fontes.length < 2) throw new Error(`${onde}: precisa de pelo menos 2 fontes`);
  }
  return guias;
}

export function preparaGuias(config, guias) {
  const siteUrl = config.siteUrl.replace(/\/+$/, "");
  const por = Object.fromEntries(guias.map((g) => [g.slug, g]));
  const get = (slug) => { if (!por[slug]) throw new Error(`conteudo/guias.json: não existe a guia "${slug}"`); return por[slug]; };
  const url = (slug) => `${siteUrl}/guias/${slug}/`;

  const head = (slug) => {
    const g = get(slug);
    const artigo = {
      "@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.descricao, inLanguage: "pt-BR",
      datePublished: g.publicado || g.atualizado, dateModified: g.atualizado,
      author: { "@type": "Person", name: "Lian Martínez", url: `${siteUrl}/sobre/` },
      publisher: { "@type": "Organization", name: config.siteName, url: `${siteUrl}/` },
      mainEntityOfPage: { "@type": "WebPage", "@id": url(slug) },
      image: [`${siteUrl}/assets/og.png`],
    };
    const migalhas = {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: config.siteName, item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Guias ABNT", item: `${siteUrl}/guias/` },
        { "@type": "ListItem", position: 3, name: g.rotulo, item: url(slug) },
      ],
    };
    return `<title>${esc(g.titulo)}</title>
  <meta name="description" content="${esc(g.descricao)}">
  <link rel="canonical" href="${url(slug)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="${esc(config.siteName)}">
  <meta property="og:title" content="${esc(g.titulo)}">
  <meta property="og:description" content="${esc(g.descricao)}">
  <meta property="og:url" content="${url(slug)}">
  <meta property="article:modified_time" content="${g.atualizado}">
  <link rel="stylesheet" href="/assets/css/guias.css?v={{BUILD}}">
  <script type="application/ld+json">${jsonSeguro(artigo)}</script>
  <script type="application/ld+json">${jsonSeguro(migalhas)}</script>`;
  };

  const hero = (slug) => {
    const g = get(slug);
    return `<div class="hero hero--compacto">
  {{include:manchas}}
  {{include:header}}
  <div class="container hero-conteudo">
    <nav class="migalhas" aria-label="Você está em">
      <ol><li><a href="/">Início</a></li><li><a href="/guias/">Guias ABNT</a></li><li aria-current="page">${esc(g.rotulo)}</li></ol>
    </nav>
    <span class="etiqueta">Guia ABNT</span>
    <h1>${esc(g.h1)}</h1>
    <p class="lead">${esc(g.lead)}</p>
    <p class="guia-meta">Atualizado em <time datetime="${g.atualizado}">${dataLonga(g.atualizado)}</time> · Segundo a ${esc(g.norma)}</p>
  </div>
</div>`;
  };

  const ferramenta = (slug) => {
    const g = get(slug);
    const f = g.ferramenta;
    return `<aside class="guia-ferramenta" aria-label="Ferramenta relacionada">
        <p class="guia-ferramenta-selo">${esc(f.selo || "Ferramenta relacionada")}</p>
        <p class="guia-ferramenta-titulo">${esc(f.nome)}</p>
        <p class="guia-ferramenta-texto">${esc(f.texto)}</p>
        <a class="btn btn-acento" href="${f.url}?origem=guia-${slug}">${esc(f.botao)}</a>
      </aside>`;
  };

  const relacionadas = (slug) => {
    const g = get(slug);
    const cartoes = g.relacionadas.map((r) => {
      const x = get(r);
      return `<li><a class="guia-cartao" href="/guias/${r}/"><span class="guia-cartao-titulo">${esc(x.rotulo)}</span><span class="guia-cartao-texto">${esc(x.resumoIndice)}</span></a></li>`;
    }).join("\n          ");
    return `<section class="guia-relacionadas" aria-labelledby="relacionadas">
        <h2 id="relacionadas">Guias relacionadas</h2>
        <ul class="guia-cartoes">
          ${cartoes}
        </ul>
      </section>`;
  };

  const fontes = (slug) => {
    const g = get(slug);
    const itens = g.fontes.map((f) => `<li><a href="${f.url}" rel="noopener" target="_blank">${esc(f.titulo)}</a>${f.nota ? " " + esc(f.nota) : ""}</li>`).join("\n          ");
    return `<section class="guia-fontes" id="fontes" aria-labelledby="fontes-titulo">
        <h2 id="fontes-titulo">Fontes</h2>
        <ul>
          ${itens}
        </ul>
        <p class="padrao">As explicações são feitas com palavras próprias. O {{SITE_NAME}} não tem ligação com a ABNT: se a sua faculdade tem manual próprio, é ele que vale.</p>
      </section>`;
  };

  // nas páginas das ferramentas: as guias que ensinam a mesma parte do trabalho
  const daFerramenta = (id) => {
    const itens = guias.filter((g) => (g.ferramentas || []).includes(id));
    if (!itens.length) throw new Error(`conteudo/guias.json: nenhuma guia marcada para a ferramenta "${id}"`);
    const li = itens.map((g) => `<li><a class="guia-cartao" href="/guias/${g.slug}/"><span class="guia-cartao-titulo">${esc(g.rotulo)}</span><span class="guia-cartao-texto">${esc(g.resumoIndice)}</span></a></li>`).join("\n          ");
    return `<section class="guia-relacionadas guia-relacionadas--ferramenta" aria-labelledby="guias-${id}">
        <h2 id="guias-${id}">Guias para fazer esta parte do trabalho</h2>
        <ul class="guia-cartoes">
          ${li}
        </ul>
      </section>`;
  };

  // portada: as guias mais procuradas (as primeiras da lista de prioridade)
  const destaque = (n) => {
    const itens = [...guias].sort((a, b) => (a.prioridade || 99) - (b.prioridade || 99)).slice(0, n);
    const li = itens.map((g) => `<li><a class="guia-cartao" href="/guias/${g.slug}/"><span class="guia-cartao-titulo">${esc(g.rotulo)}</span><span class="guia-cartao-texto">${esc(g.resumoIndice)}</span></a></li>`).join("\n          ");
    return `<ul class="guia-cartoes guia-cartoes--tres">
          ${li}
        </ul>`;
  };

  // índice /guias/: cartões por categoria
  const lista = () => CATEGORIAS.map((cat) => {
    const itens = guias.filter((g) => g.categoria === cat).sort((a, b) => (a.prioridade || 99) - (b.prioridade || 99));
    if (!itens.length) return "";
    const li = itens.map((g) => `<li><a class="guia-cartao" href="/guias/${g.slug}/"><span class="guia-cartao-titulo">${esc(g.rotulo)}</span><span class="guia-cartao-texto">${esc(g.resumoIndice)}</span></a></li>`).join("\n        ");
    return `<section class="guias-grupo">
      <h2>${esc(cat)}</h2>
      <ul class="guia-cartoes">
        ${li}
      </ul>
    </section>`;
  }).join("\n    ");

  const indiceJson = () => jsonSeguro({
    "@context": "https://schema.org", "@type": "CollectionPage", name: "Guias ABNT para trabalhos acadêmicos", url: `${siteUrl}/guias/`, inLanguage: "pt-BR",
    description: "Guias práticas das normas ABNT: margens, referências, citações, capa, sumário, resumo e estrutura do TCC.",
    mainEntity: { "@type": "ItemList", itemListElement: guias.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.rotulo, url: url(g.slug) })) },
  });

  // mensagens de WhatsApp: uma por guia (?origem=guia-<slug>)
  const mensagens = (modelo) => Object.fromEntries(guias.map((g) => [`guia-${g.slug}`, modelo.replace("{pagina}", `guia: ${g.rotulo}`).replace(" · {componente}", "")]));

  return { head, hero, ferramenta, relacionadas, fontes, lista, indiceJson, mensagens, daFerramenta, destaque, get };
}
