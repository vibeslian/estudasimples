// Etapa 15: página "Anuncie no Estuda Simples" (/anuncie/) e cartão "Parceiro recomendado".
// Tudo vem do bloco "anuncie" de site.config.json. Enquanto anuncie.ativo for false, a página fica ESCONDIDA:
// existe, mas tem noindex, não entra no sitemap e nenhuma página tem link para ela. O build.mjs chama estas funções.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const brl = (n) => "R$ " + n.toLocaleString("pt-BR");
const fmt = (n) => n.toLocaleString("pt-BR");

export const URL_ANUNCIE = "/anuncie/";
const CAMPOS_NUMEROS = [
  ["visitasMes", "visitas por mês"],
  ["paginasVistasMes", "páginas vistas por mês"],
  ["percentualCelular", "dos acessos pelo celular"],
];

/** Cartão "Parceiro recomendado". Todo anúncio vem com o selo "Patrocinado" e o link leva rel="sponsored". */
function cartaoParceiro(x, exemplo = false) {
  const botao = exemplo
    ? `<span class="btn parceiro-botao">${esc(x.botao)}</span>`
    : `<a class="btn parceiro-botao" href="${esc(x.url)}" target="_blank" rel="sponsored noopener noreferrer">${esc(x.botao)}<span class="sr-only"> (anúncio, abre em outra aba)</span></a>`;
  return `<aside class="parceiro" aria-label="Parceiro recomendado (conteúdo patrocinado)">
        <p class="parceiro-topo"><span class="parceiro-rotulo">Parceiro recomendado</span><span class="parceiro-selo">Patrocinado</span></p>
        <p class="parceiro-nome">${esc(x.titulo)}</p>
        <p class="parceiro-texto">${esc(x.texto)}</p>
        <p class="parceiro-rodape">${botao}<span class="parceiro-anunciante">${esc(x.anunciante)}</span></p>
      </aside>`;
}

export function preparaAnuncie(config, guias) {
  const a = config.anuncie;
  if (!a) throw new Error("site.config.json: falta o bloco anuncie");
  const ativo = a.ativo === true;
  const onde = "site.config.json (anuncie)";

  // ---- números do site ----
  const n = a.numeros || {};
  const faltam = CAMPOS_NUMEROS.map(([k]) => k).concat("referencia").filter((k) => n[k] === null || n[k] === undefined || n[k] === "");
  if (ativo && faltam.length) throw new Error(`${onde}: para ligar a página (ativo: true) preencha os números reais em anuncie.numeros. Faltam: ${faltam.join(", ")}`);
  for (const [k] of CAMPOS_NUMEROS) if (n[k] != null && (typeof n[k] !== "number" || !Number.isFinite(n[k]) || n[k] < 0)) throw new Error(`${onde}: numeros.${k} deve ser um número (sem pontos nem texto)`);
  if (n.percentualCelular != null && n.percentualCelular > 100) throw new Error(`${onde}: numeros.percentualCelular não pode passar de 100`);
  if (ativo && n.visitasMes < (a.visitasMinimas || 0)) console.warn(`Aviso: a página /anuncie/ está LIGADA, mas visitasMes (${n.visitasMes}) é menor que o mínimo combinado (${a.visitasMinimas}).`);

  // ---- níveis e preços ----
  if (!Array.isArray(a.niveis) || a.niveis.length < 1) throw new Error(`${onde}: falta a lista niveis`);
  const ids = new Set();
  for (const v of a.niveis) {
    if (!/^[a-z0-9-]+$/.test(v.id || "") || ids.has(v.id)) throw new Error(`${onde}: nível com id inválido ou repetido (${v.id})`);
    ids.add(v.id);
    if (!v.nome || !v.resumo) throw new Error(`${onde}: o nível "${v.id}" precisa de nome e resumo`);
    if (typeof v.preco !== "number" || !(v.preco > 0)) throw new Error(`${onde}: o nível "${v.id}" precisa de um preço (número maior que zero)`);
    if (!Array.isArray(v.inclui) || !v.inclui.length) throw new Error(`${onde}: o nível "${v.id}" precisa da lista inclui`);
  }
  const precoMinimo = Math.min(...a.niveis.map((v) => v.preco));

  // ---- contato ----
  const numeroWa = String(a.whatsapp || config.servico.whatsapp);
  if (!/^\d{10,15}$/.test(numeroWa)) throw new Error(`${onde}: whatsapp deve ter só números (com 55 e o DDD)`);
  if (!a.mensagemWhatsapp) throw new Error(`${onde}: falta mensagemWhatsapp`);
  const whatsappUrl = `https://wa.me/${numeroWa}?text=${encodeURIComponent(a.mensagemWhatsapp)}`;

  // ---- partes da página ----
  const numerosHtml = () => {
    const blocos = CAMPOS_NUMEROS.map(([k, rotulo]) => {
      const v = n[k] == null ? "—" : k === "percentualCelular" ? fmt(n[k]) + "%" : fmt(n[k]);
      return `<div class="numero"><b>${v}</b><span>${rotulo}</span></div>`;
    }).join("\n        ");
    const nota = n.referencia ? `Dados de ${esc(n.referencia)}${n.fonte ? `. Fonte: ${esc(n.fonte)}` : ""}.` : "Números ainda não preenchidos.";
    return `<div class="numeros revelar">
        ${blocos}
      </div>
      <p class="numeros-nota revelar">${nota}</p>`;
  };

  const niveisHtml = () => a.niveis.map((v) => `<div class="cartao preco nivel">
          <h3>${esc(v.nome)}</h3>
          <p class="preco-valor">${brl(v.preco)}</p>
          <p class="preco-nota">por mês</p>
          <p class="nivel-resumo">${esc(v.resumo)}</p>
          <ul class="nivel-lista">
            ${v.inclui.map((i) => `<li>${esc(i)}</li>`).join("\n            ")}
          </ul>
        </div>`).join("\n        ");

  const passos = (config.percurso && config.percurso.passos) || [];
  const ferramentasHtml = () => {
    const itens = passos.map((p) => `<li><a href="${p.url}"><strong>Gerador de ${esc(p.nome.toLowerCase())}</strong></a></li>`);
    itens.push(`<li><a href="/guias/"><strong>${guias.length} guias ABNT</strong></a></li>`);
    return `<ul class="ferramentas-lista">
        ${itens.join("\n        ")}
      </ul>`;
  };

  const exemploParceiro = cartaoParceiro({
    titulo: "Seu curso ou serviço aparece aqui",
    texto: "Duas frases curtas sobre o que você oferece, para quem lê a guia certa na hora certa.",
    botao: "Conhecer",
    anunciante: "Sua empresa",
  }, true);

  // ---- cartão "Parceiro recomendado" nas guias ----
  const pr = a.parceiroRecomendado || {};
  const slugs = new Set(guias.map((g) => g.slug));
  const anuncios = pr.ativo === true ? (pr.anuncios || []).filter((x) => x.ativo !== false) : [];
  const porGuia = new Map();
  anuncios.forEach((x, i) => {
    const id = `${onde}, parceiroRecomendado.anuncios[${i}]`;
    for (const [k, max] of [["anunciante", 60], ["titulo", 60], ["texto", 160], ["botao", 24]]) {
      if (!x[k] || typeof x[k] !== "string") throw new Error(`${id}: falta "${k}"`);
      if (x[k].length > max) throw new Error(`${id}: "${k}" tem ${x[k].length} letras (máximo ${max})`);
    }
    let u;
    try { u = new URL(x.url); } catch { throw new Error(`${id}: url inválida`); }
    if (u.protocol !== "https:") throw new Error(`${id}: a url precisa começar com https://`);
    if (!Array.isArray(x.guias) || !x.guias.length) throw new Error(`${id}: "guias" deve ser uma lista (use ["todas"] para todas)`);
    const alvo = x.guias.includes("todas") ? [...slugs] : x.guias;
    for (const g of alvo) {
      if (!slugs.has(g)) throw new Error(`${id}: a guia "${g}" não existe`);
      if (porGuia.has(g)) throw new Error(`${id}: a guia "${g}" já tem outro parceiro (o máximo é um por guia)`);
      porGuia.set(g, x);
    }
  });
  const parceiroDaGuia = (slug) => (porGuia.has(slug) ? cartaoParceiro(porGuia.get(slug)) : "");

  return {
    ativo,
    parceiroDaGuia,
    parceirosAtivos: porGuia.size,
    valores: {
      // com a página apagada: noindex, e o rodapé fica exatamente como antes (texto vazio, nenhum espaço a mais)
      "{{ANUNCIE_ROBOTS}}": ativo ? "" : '<meta name="robots" content="noindex">',
      "{{ANUNCIE_LINK_RODAPE}}": ativo ? `\n      <a href="${URL_ANUNCIE}">Anuncie</a>` : "",
      "{{ANUNCIE_WHATSAPP_URL}}": whatsappUrl,
      "{{ANUNCIE_PRECO_MINIMO}}": brl(precoMinimo),
      "{{ANUNCIE_NUMEROS}}": numerosHtml(),
      "{{ANUNCIE_NIVEIS}}": niveisHtml(),
      "{{ANUNCIE_FERRAMENTAS}}": ferramentasHtml(),
      "{{ANUNCIE_EXEMPLO_PARCEIRO}}": exemploParceiro,
    },
  };
}
