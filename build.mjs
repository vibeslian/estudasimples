// Construye o site: copia src/ -> dist/, troca os valores de site.config.json,
// insere os fragmentos compartilhados (cabeçalho, rodapé...), junta o CSS global em um só arquivo,
// gera as perguntas frequentes (HTML + dados estruturados) e cria sitemap.xml e robots.txt.
// Uso: node build.mjs          (versão para publicar)
//      node build.mjs --dev    (inclui páginas de desenvolvimento, como /_guia-de-estilo/)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";
import { execSync } from "node:child_process";
import { preparaConexoes, mensagensWhatsapp } from "./build-conexoes.mjs";
import { carregaGuias, preparaGuias, dataLonga } from "./build-guias.mjs";
import { montaFormulariosReferencias } from "./build-referencias.mjs";
import { preparaAnuncie, URL_ANUNCIE } from "./build-anuncie.mjs";
import { preparaKit } from "./build-kit.mjs";
import { preparaAfiliados } from "./build-afiliados.mjs";
import { preparaAdsense } from "./build-adsense.mjs";
import { preparaAvaliacoes } from "./build-avaliacoes.mjs";

const SRC = "src";
const OUT = process.env.BUILD_OUT || "dist"; // BUILD_OUT e SITE_CONFIG só servem para as provas montarem uma versão de teste
const DEV = process.argv.includes("--dev");
const config = JSON.parse(readFileSync(process.env.SITE_CONFIG || "site.config.json", "utf8"));
const siteUrl = config.siteUrl.replace(/\/+$/, "");
function pinterestMeta(codigo) {
  if (!codigo) return "";
  if (!/^[A-Za-z0-9]{16,64}$/.test(codigo)) throw new Error("site.config.json: pinterestVerificacao deve ter só letras e números (o código do Pinterest, 16–64 caracteres)");
  return `<meta name="p:domain_verify" content="${codigo}">`;
}

// CSS global: estes arquivos viram um só (assets/css/site.css), menos pedidos = carrega mais rápido
const CSS_GLOBAL = ["tokens", "base", "components"];
const cssDir = join(SRC, "assets", "css");
const minificaCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
const cssGlobal = CSS_GLOBAL.map((n) => readFileSync(join(cssDir, n + ".css"), "utf8")).join("\n");

// Serviço de formatação (WhatsApp, prazo e preços): tudo vem de site.config.json, para mudar num só lugar
const sv = config.servico;
const guiasLista = carregaGuias(); // conteudo/guias.json (Etapa 10)
const anuncie = preparaAnuncie(config, guiasLista); // página /anuncie/ (escondida enquanto anuncie.ativo for false) e cartão "Parceiro recomendado"
const kit = preparaKit(config);
const avaliacoes = preparaAvaliacoes(kit.ativo); // opiniões reais e autorizadas (conteudo/avaliacoes.json) // Kit TCC, produto pago na Hotmart (a página /kit-tcc/ nem existe enquanto kit.ativo for false)
const afiliados = preparaAfiliados(config, guiasLista, { numTermos: kit.ativo ? 13 : 12 }); // "Recomendado para o seu trabalho" (apagado enquanto afiliados.ativo for false)
const gb = preparaGuias(config, guiasLista, anuncie.parceiroDaGuia, afiliados.daGuia);
const mensagens = { ...gb.mensagens(sv.modeloMensagem), ...mensagensWhatsapp(sv) }; // guia-<slug>, as de site.config.json e as de página-componente (capa-proximo...)
const adsense = preparaAdsense(config); // Google AdSense (apagado enquanto anuncios.adsenseAtivo for false; o ads.txt e a etiqueta de verificação existem sempre)
const conexoes = preparaConexoes(config, adsense);
const refForms = montaFormulariosReferencias(); // formulários do gerador de referências (campos em src/assets/js/abnt/referencias-campos.js)
// um link wa.me por página de origem: a mensagem diz de onde o cliente veio (mensagens em site.config.json)
const waUrl = (id) => {
  if (!mensagens[id]) throw new Error(`site.config.json: falta servico.mensagens.${id}`);
  return `https://wa.me/${sv.whatsapp}?text=${encodeURIComponent(mensagens[id])}`;
};
// página que mostra o convite para o serviço -> id da mensagem de origem
const ORIGEM_POR_PAGINA = { "index.html": "inicio", "gerador-de-capa-abnt/index.html": "capa", "gerador-de-folha-de-rosto-abnt/index.html": "folha", "gerador-de-sumario-abnt/index.html": "sumario", "gerador-de-referencias-abnt/index.html": "referencias" };
for (const id of Object.values(ORIGEM_POR_PAGINA).concat("servico")) waUrl(id);
const brl = (n) => "R$\u00a0" + n.toLocaleString("pt-BR"); // espaço sem quebra: "R$" e o valor nunca ficam em linhas diferentes
const values = {
  "{{REF_TIPOS}}": refForms.opcoes,
  "{{REF_FORMS}}": refForms.forms,
  "{{REF_EXEMPLO_INICIAL}}": refForms.exemploInicial,
  "{{WHATSAPP_URL}}": waUrl("servico"),
  "{{WHATSAPP_ORIGENS}}": JSON.stringify(Object.fromEntries(Object.keys(mensagens).map((id) => [id, waUrl(id)]))),
  "{{WHATSAPP_EXIBICAO}}": sv.whatsappExibicao,
  "{{PRAZO}}": sv.prazo,
  "{{PRECO_ATE30}}": brl(sv.precos.ate30),
  "{{PRECO_31A60}}": brl(sv.precos.de31a60),
  "{{PRECO_ATE30_NUM}}": String(sv.precos.ate30),
  "{{PRECO_31A60_NUM}}": String(sv.precos.de31a60),
  "{{SITE_NAME}}": config.siteName,
  "{{SITE_URL}}": siteUrl,
  "{{CONTACT_EMAIL}}": config.contactEmail,
  "{{TAGLINE}}": config.tagline,
  "{{YEAR}}": String(new Date().getFullYear()),
  // etiqueta de verificação do Pinterest (config.pinterestVerificacao); vazia = não escreve nada no <head>
  "{{PINTEREST_META}}": pinterestMeta(config.pinterestVerificacao),
  "{{BUILD}}": Date.now().toString(36), // muda a cada build: evita CSS/JS antigo em cache
  ...anuncie.valores,
  ...afiliados.valores,
  ...adsense.valores,
  ...kit.valores,
};
// "Última atualização" dos Termos e da Política: a mais recente entre os links de afiliado (se há produtos à mostra), o AdSense (se ligado) e o Kit TCC (se ligado)
const datasLegais = [afiliados.visiveis > 0 ? config.afiliados.legalAtualizadoEm : null, adsense.legalAtualizadoEm, kit.legalAtualizadoEm, config.servico.legalAtualizadoEm].filter(Boolean).sort();
if (datasLegais.length) values["{{LEGAL_ATUALIZADO}}"] = dataLonga(datasLegais[datasLegais.length - 1]);

const TEXT_EXT = new Set([".html", ".css", ".js", ".json", ".xml", ".txt", ".svg", ".webmanifest"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Perguntas frequentes: um só arquivo (conteudo/faq-<nome>.json) gera o HTML visível e o dado estruturado FAQPage.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const semTags = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
function faq(nome) {
  const itens = JSON.parse(readFileSync(join("conteudo", `faq-${nome}.json`), "utf8"));
  const linhas = itens.map(
    (i) => `  <details><summary>${esc(i.p)}</summary><div class="faq-resposta">${i.r.map((p) => "<p>" + p + "</p>").join("")}</div></details>`
  );
  const html = ['<div class="faq">', ...linhas, "</div>"].join("\n");
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: itens.map((i) => ({ "@type": "Question", name: i.p, acceptedAnswer: { "@type": "Answer", text: i.r.map(semTags).join(" ") } })),
  };
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  return { html, jsonld: `<script type="application/ld+json">${json}</script>` };
}

// Avisos do ENEM (bloco na portada): existem só até a data enem.ate (AAAA-MM-DD, inclusive). Depois dela, o próximo build já não os inclui.
const enemAte = (config.enem && config.enem.ate) || "";
if (enemAte && !/^\d{4}-\d{2}-\d{2}$/.test(enemAte)) throw new Error("site.config.json: enem.ate deve ser uma data AAAA-MM-DD");
const enemAtivo = !!enemAte && new Date().toISOString().slice(0, 10) <= enemAte;
const enemMarcas = (texto) => texto.replace(/<!--ENEM:ON-->([\s\S]*?)<!--\/ENEM:ON-->(\n?)/g, (_, miolo, quebra) => (enemAtivo ? miolo + quebra : ""));

// Módulos das ferramentas: ferramenta.js importa exporta.js, que importa modelo.js... Sem aviso, o navegador só descobre cada um depois de baixar o anterior
// (idas e voltas em série, lentas no 4G). Aqui o build lê os «import» e põe um <link rel="modulepreload"> para cada um antes do <script type="module">.
const importsDe = (arquivoJs) => {
  let texto;
  try { texto = readFileSync(arquivoJs, "utf8"); } catch { return []; }
  const achados = [];
  const re = /(?:^|[\n;])\s*(?:import|export)\b[^'"\n;]*?\bfrom\s*["'](\.{1,2}\/[^"']+\.js)["']|(?:^|[\n;])\s*import\s*["'](\.{1,2}\/[^"']+\.js)["']|(?:^|[\n;])\s*import\s*\{([^}]*)\}\s*from\s*["'](\.{1,2}\/[^"']+\.js)["']/g;
  let m;
  while ((m = re.exec(texto))) achados.push(m[1] || m[2] || m[4]);
  return achados.map((a) => join(arquivoJs, "..", a));
};
function cadeiaModulos(arquivoJs, vistos = new Set()) {
  for (const dep of importsDe(arquivoJs)) {
    if (vistos.has(dep)) continue;
    vistos.add(dep);
    cadeiaModulos(dep, vistos);
  }
  return vistos;
}
function modulepreload(html) {
  return html.replace(/<script type="module" src="(\/assets\/js\/[^"?]+\.js)(\?v=[^"]*)?"><\/script>/g, (tag, src) => {
    const deps = [...cadeiaModulos(join(SRC, src))].map((p) => "/" + relative(SRC, p).split(sep).join("/"));
    return deps.map((d) => `<link rel="modulepreload" href="${d}">`).join("\n") + (deps.length ? "\n" : "") + tag;
  });
}

// Imagem de compartilhamento por família de páginas (gerada por pruebas/generar-og-familias.mjs); o resto usa a og.png geral.
const GUIAS_ENEM = new Set(guiasLista.filter((g) => g.categoria === "ENEM e escola").map((g) => g.slug));
const PAGINAS_ENEM = new Set(["contador-de-linhas-enem", "folha-de-redacao-enem", "cronograma-de-estudos-enem", "calculadora-de-media"]);
function ogDaPagina(rel) {
  const partes = rel.split(/[\/]/);
  if (partes[partes.length - 1] !== "index.html") return null;
  const pasta = partes[0], guia = partes[1];
  if (PAGINAS_ENEM.has(pasta) || (pasta === "guias" && GUIAS_ENEM.has(guia))) return { arq: "og-enem.png", alt: "Estuda Simples: ferramentas e guias gratuitos para o ENEM" };
  if (pasta === "guias") return { arq: "og-guias.png", alt: "Estuda Simples: guias das normas ABNT" };
  if (pasta === "formatacao-abnt-tcc") return { arq: "og-servico.png", alt: "Estuda Simples: formatação ABNT de TCC" };
  if (pasta === "kit-tcc") return { arq: "og-kit.png", alt: "Estuda Simples: Kit TCC, modelo em Word nas normas ABNT" };
  return null;
}

function render(text, origem = "servico", rel = "") {
  const guia = (/^guias[\\/]([a-z0-9-]+)[\\/]index\.html$/.exec(rel) || [])[1];
  if (guia) {
    const marcas = (text.match(/\{\{GUIA_AFILIADOS\}\}/g) || []).length;
    if (marcas > 1) throw new Error(`src/guias/${guia}: o marcador {{GUIA_AFILIADOS}} aparece ${marcas} vezes (deve ser 1)`);
    if (marcas === 0 && gb.afiliados(guia)) throw new Error(`src/guias/${guia}: a guia tem produtos de afiliado em site.config.json, mas falta o marcador {{GUIA_AFILIADOS}} no HTML (sem ele o bloco não aparece)`);
  }
  text = text
    .replace(/\{\{FAQ_HTML:([\w-]+)\}\}/g, (_, n) => faq(n).html)
    .replace(/\{\{FAQ_JSONLD:([\w-]+)\}\}/g, (_, n) => faq(n).jsonld)
    .replace(/[{][{]ESPACO:([a-z0-9-]+)[}][}]/g, (_, slot) => conexoes.espaco(slot))
    .replace(/[{][{]GUIA_(HEAD|HERO|FERRAMENTA|RELACIONADAS|FONTES|AFILIADOS)[}][}]/g, (_, k) => { if (!guia) throw new Error(`{{GUIA_${k}}} só vale dentro de src/guias/<guia>/index.html (${rel})`); return gb[{ HEAD: "head", HERO: "hero", FERRAMENTA: "ferramenta", RELACIONADAS: "relacionadas", FONTES: "fontes", AFILIADOS: "afiliados" }[k]](guia); })
    .replace(/[{][{]GUIAS_DA_FERRAMENTA:([a-z0-9-]+)[}][}]/g, (_, id) => gb.daFerramenta(id))
    .split("{{GUIAS_LISTA}}").join(gb.lista())
    .replace(/[{][{]GUIAS_DESTAQUE:([0-9]+)[}][}]/g, (_, n) => gb.destaque(Number(n)))
    .split("{{GUIAS_JSONLD}}").join(gb.indiceJson())
    .split("{{AVALIACOES_KIT}}").join(avaliacoes.kitHtml)
    .split("{{AVALIACOES_HOME}}").join(avaliacoes.homeHtml)
    .split("{{KIT_REVIEWS_LD}}").join(avaliacoes.reviewsLd)
    .split("{{PERCURSO_HTML}}").join(conexoes.percursoHtml(origem === "servico" ? undefined : origem))
    .split("{{PERCURSO_DADOS}}").join(conexoes.percursoJson(origem === "servico" ? undefined : origem));
  // fragmentos compartilhados: {{include:header}} -> src/partials/header.html (duas passadas: eles podem incluir outros)
  for (let i = 0; i < 2; i++) text = text.replace(/\{\{include:([\w-]+)\}\}/g, (_, name) => readFileSync(join(SRC, "partials", name + ".html"), "utf8"));
  text = text.split("{{GUIA_SLUG}}").join(guia || ""); // de qual guia veio o clique no cartão do kit (vai no #origem=guia-<nome>)
  text = adsense.marcas(text); // <!--ADS:OFF--> / <!--ADS:ON-->: textos que mudam quando o AdSense é ligado
  text = kit.marcas(text); // <!--KIT:OFF--> / <!--KIT:ON-->: textos que mudam quando o Kit TCC é ligado
  text = enemMarcas(text); // <!--ENEM:ON-->: avisos da semana da prova; somem sozinhos depois de enem.ate (site.config.json)
  for (const [key, val] of Object.entries({ ...values, "{{ORIGEM}}": origem })) text = text.split(key).join(val);
  // nos dados estruturados o "R$ 80" leva espaço comum (na página fica o espaço sem quebra)
  text = text.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (m) => m.replace(/\u00a0/g, " "));
  if (rel.endsWith(".html")) {
    text = modulepreload(text);
    const og = ogDaPagina(rel);
    if (og) text = text.split('/assets/og.png"').join(`/assets/${og.arq}"`).split('content="Estuda Simples: gerador de capa ABNT grátis"').join(`content="${og.alt}"`);
  }
  return text;
}

rmSync(OUT, { recursive: true, force: true });
const pages = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const partes = rel.split(sep);
  if (partes[0] === "partials") continue; // fragmentos não são publicados sozinhos
  const privada = partes.some((p, i) => i < partes.length - 1 && p.startsWith("_")); // pastas _algo = só desenvolvimento
  if (privada && !DEV) continue;
  if (partes[0] === "assets" && partes[1] === "downloads" && !kit.ativo) continue; // a amostra do kit só existe com o kit ligado
  if (rel === join("assets", "js", "kit.js") && !kit.ativo) continue; // barra de compra do kit: só existe com o kit ligado
  if (rel === join("assets", "js", "anuncios.js") && !adsense.ativo) continue; // aviso de cookies: só existe com o AdSense ligado
  if (!kit.ativo && (partes[0] === "kit-tcc" || rel === join("assets", "css", "kit.css") || (partes[0] === "assets" && partes[1] === "img" && partes[2] === "kit"))) continue; // Kit TCC apagado: nada dele vai para o site
  if (partes[0] === "assets" && partes[1] === "css" && CSS_GLOBAL.includes(partes[2].replace(".css", ""))) continue; // já vão no site.css

  const dest = join(OUT, rel);
  mkdirSync(join(dest, ".."), { recursive: true });
  // as bibliotecas de terceiros (assets/js/vendor) são copiadas sem tocar no conteúdo
  const copiaDireto = partes.includes("vendor");
  if (TEXT_EXT.has(extname(file)) && !copiaDireto) writeFileSync(dest, render(readFileSync(file, "utf8"), ORIGEM_POR_PAGINA[partes.join("/")], partes.join("/")));
  else writeFileSync(dest, readFileSync(file));

  if (rel.endsWith("index.html") && !privada) {
    if ("/" + rel.slice(0, -"index.html".length).split(sep).join("/") === URL_ANUNCIE && !anuncie.ativo) continue; // página escondida: fora do sitemap
    if (/<meta name="robots" content="noindex/.test(readFileSync(dest, "utf8"))) continue; // páginas com noindex (pedido, painel) não vão ao sitemap
    pages.push("/" + rel.slice(0, -"index.html".length).split(sep).join("/")); // "/" ou "/gerador-de-capa-abnt/"
  }
}

mkdirSync(join(OUT, "assets", "css"), { recursive: true });
writeFileSync(join(OUT, "assets", "css", "site.css"), minificaCss(cssGlobal));

// <lastmod> só com datas reais de mudança (o Google desconfia de um lastmod igual ao dia do build em todas as páginas):
// nas guias vale o campo «atualizado»; nas outras páginas, a data do último commit que as tocou (só se o histórico do git estiver completo; se não, a página fica sem lastmod).
const git = (cmd) => { try { return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
const historiaCompleta = git("git rev-parse --is-shallow-repository") === "false";
const atualizadoDaGuia = Object.fromEntries(guiasLista.map((g) => [g.slug, g.atualizado]));
const maisRecenteGuia = guiasLista.map((g) => g.atualizado).sort().pop();
function lastmodDe(p) {
  const guia = (/^\/guias\/([a-z0-9-]+)\/$/.exec(p) || [])[1];
  if (guia && atualizadoDaGuia[guia]) return atualizadoDaGuia[guia];
  if (p === "/guias/") return maisRecenteGuia;
  if (!historiaCompleta) return "";
  const arquivo = p === "/" ? join(SRC, "index.html") : join(SRC, p.slice(1), "index.html");
  return git(`git log -1 --format=%cs -- "${arquivo}"`);
}
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.sort().map((p) => { const d = lastmodDe(p); return `  <url><loc>${siteUrl}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`; }).join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(OUT, "sitemap.xml"), sitemap);
writeFileSync(join(OUT, "ads.txt"), adsense.adsTxt);
// robots.txt: o Google, o Bing, os buscadores de IA e os assistentes de IA que leem a página quando uma pessoa pergunta (ChatGPT-User, Claude-User, Perplexity-User) têm a entrada livre.
// Só ficam de fora os robôs que coletam textos para TREINAR modelos de IA. (A Cloudflare pode acrescentar a sua própria lista na frente: ver docs/publicar.md.)
const ROBOS_DE_TREINO = ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended", "Bytespider", "cohere-ai", "meta-externalagent", "omgili", "Diffbot", "PetalBot", "MistralAI-Training"];
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\n` + ROBOS_DE_TREINO.map((r) => `User-agent: ${r}\nDisallow: /\n`).join("\n") + `\nSitemap: ${siteUrl}/sitemap.xml\n`);

// Páginas de pedido e painel: política de segurança de conteúdo (só o próprio site; sem frames; o aviso de visitas da Cloudflare continua permitido)
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
// Na página do pedido, a prévia em PDF abre numa aba nova a partir de um endereço blob: (que herda esta política); por isso ali o visualizador de PDF precisa de object-src com blob:
const CSP_DO = (r) => (r === "/pedido/" ? CSP.replace("object-src 'none'", "object-src 'self' blob:") : CSP);
const CSP_PEDIDOS = ["/pedir-formatacao/", "/pedido/", "/painel/"].map((r) => `${r}\n  Content-Security-Policy: ${CSP_DO(r)}\n\n${r}*\n  Content-Security-Policy: ${CSP_DO(r)}\n\n`).join("");

// Cloudflare Pages: cache longo para fontes e bibliotecas (têm a versão no nome do arquivo)
writeFileSync(
  join(OUT, "_headers"),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n\n` +
    CSP_PEDIDOS +
    `/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/assets/js/vendor/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/assets/css/*\n  Cache-Control: public, max-age=31536000, immutable\n`
);

console.log(`Site construído em ${OUT}/ (${pages.length} páginas${DEV ? ", modo dev" : ""}):`);
pages.forEach((p) => console.log("  " + p));
