// Peças do site que vêm só de site.config.json (Etapa 8.5): o indicador "Monte seu TCC passo a passo", as ofertas próprias
// que ocupam alguns espaços de anúncio e as mensagens de origem do WhatsApp. O build.mjs chama estas funções.
// Para acrescentar uma ferramenta nova: um item em "percurso.passos" (e, se quiser, os espaços dela em "anuncios.espacos").

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonSeguro = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export const PAGINAS_ORIGEM = ["inicio", "capa", "folha", "sumario", "referencias"];
// Uma oferta própria nunca fica junto da ferramenta: só nos espaços do meio do texto, na coluna lateral e entre as seções da portada
const SLOT_PERMITIDO_PARA_OFERTA = /-(meio-1|meio-2|lateral|entre-secoes)$/;
const paginaDoSlot = (slot) => slot.split("-")[0];

/** Mensagens do WhatsApp: as de site.config.json + uma por "página-componente" (capa-proximo, inicio-percurso, folha-oferta...) feita pelo modelo. */
export function mensagensWhatsapp(sv) {
  const m = {};
  const paginas = (sv.origens && sv.origens.paginas) || {};
  const componentes = (sv.origens && sv.origens.componentes) || {};
  for (const p of PAGINAS_ORIGEM) {
    for (const [c, rotuloC] of Object.entries(componentes)) {
      if (!paginas[p]) throw new Error(`site.config.json: falta servico.origens.paginas.${p}`);
      m[`${p}-${c}`] = sv.modeloMensagem.replace("{pagina}", paginas[p]).replace("{componente}", rotuloC);
    }
  }
  return { ...m, ...sv.mensagens };
}

export function preparaConexoes(config, adsense) {
  const per = config.percurso;
  const an = config.anuncios;
  if (!per || !Array.isArray(per.passos) || !per.final) throw new Error("site.config.json: falta o bloco percurso (passos e final)");
  if (!an || !an.espacos) throw new Error("site.config.json: falta o bloco anuncios (espacos)");
  const ofertas = an.ofertas || {};

  // ---- confere a configuração dos espaços ----
  const ofertaPorPagina = {};
  for (const [slot, destino] of Object.entries(an.espacos)) {
    if (destino === "adsense") continue;
    const m = /^oferta:(.+)$/.exec(destino);
    if (!m || !ofertas[m[1]]) throw new Error(`site.config.json: o espaço "${slot}" usa "${destino}", que não existe (use "adsense" ou "oferta:<nome>")`);
    const oferta = ofertas[m[1]];
    if (!oferta.ativa) continue; // oferta desligada: o espaço continua livre para o AdSense
    if (!SLOT_PERMITIDO_PARA_OFERTA.test(slot)) throw new Error(`site.config.json: o espaço "${slot}" fica perto da ferramenta e não pode ter oferta própria (use meio-1, meio-2, lateral ou entre-secoes)`);
    const pagina = paginaDoSlot(slot);
    if (!oferta.paginas || !oferta.paginas[pagina]) throw new Error(`site.config.json: a oferta "${m[1]}" não tem texto para a página "${pagina}"`);
    if (ofertaPorPagina[pagina]) throw new Error(`site.config.json: a página "${pagina}" teria duas ofertas próprias ("${ofertaPorPagina[pagina]}" e "${slot}"); o máximo é uma por página`);
    ofertaPorPagina[pagina] = slot;
  }
  const usados = new Set();

  const espaco = (slot) => {
    const destino = an.espacos[slot];
    if (!destino) throw new Error(`site.config.json: o espaço "${slot}" (usado no HTML) não está em anuncios.espacos`);
    usados.add(slot);
    const m = /^oferta:(.+)$/.exec(destino);
    if (m && ofertas[m[1]].ativa) {
      const o = ofertas[m[1]];
      const pagina = paginaDoSlot(slot);
      const t = o.paginas[pagina];
      return `<aside class="oferta" data-slot="${slot}" data-oferta="${esc(m[1])}" aria-label="${esc(o.selo)}">
        <p class="oferta-selo">${esc(o.selo)}</p>
        <p class="oferta-titulo">${esc(t.titulo)}</p>
        <p class="oferta-texto">${esc(t.texto)}</p>
        <a class="btn btn-acento oferta-botao" href="${o.url}?origem=${pagina}-oferta">${esc(o.botao)}</a>
      </aside>`;
    }
    const extra = slot.endsWith("abaixo-da-ferramenta") ? " anuncio--separado" : slot.endsWith("lateral") ? " anuncio--lateral" : "";
    // com o AdSense desligado o espaço não ocupa lugar (nenhum buraco na página); ligado, ele reserva a altura para não haver saltos
    const ligado = an.adsenseAtivo === true;
    const estado = ligado ? " anuncio--ligado" : " anuncio--desligado";
    // ligado: o bloco <ins> do Google entra aqui, mas o script só é carregado depois que o visitante escolhe no aviso de cookies (anuncios.js)
    return `<div class="anuncio${extra}${estado}" data-slot="${slot}" aria-hidden="true"><span>Anúncio</span>${adsense ? adsense.bloco(slot) : ""}</div>`;
  };

  const itens = [...per.passos, per.final];
  const percursoHtml = (pagina) => {
    const li = itens.map((it, i) => {
      const final = it === per.final;
      const classe = "percurso-passo" + (final ? " percurso-final" : "") + (it.id === pagina ? " percurso-atual" : "");
      const etiqueta = it.etiqueta ? `<span class="percurso-etiqueta">${esc(it.etiqueta)}</span><span class="sr-only"> (serviço pago, não é obrigatório)</span>` : "";
      const miolo = `<span class="percurso-num" data-n="${i + 1}" aria-hidden="true">${i + 1}</span><span class="percurso-texto"><span class="percurso-nome">${esc(it.nome)}</span>${etiqueta}</span><span class="sr-only percurso-estado"></span>`;
      if (it.id === pagina) return `<li class="${classe}" data-passo="${it.id}"><span class="percurso-item" aria-current="step">${miolo}<span class="percurso-dica">Você está aqui</span></span></li>`;
      return `<li class="${classe}" data-passo="${it.id}"><a class="percurso-item" href="${it.url}?origem=${pagina || "servico"}-percurso">${miolo}</a></li>`;
    }).join("\n        ");
    return `<nav class="percurso" aria-label="${esc(per.titulo)}">
      <p class="percurso-titulo">${esc(per.titulo)}</p>
      <ol class="percurso-lista">
        ${li}
      </ol>
      <p class="percurso-nota">Os passos que você baixar nesta aba ficam marcados. Isso fica só no seu navegador.</p>
    </nav>`;
  };
  const percursoJson = (pagina) => jsonSeguro({
    atual: pagina || null,
    passos: per.passos.map(({ id, nome, url, convite, botao }) => ({ id, nome, url, convite, botao })),
    final: (({ id, nome, url, convite, botao }) => ({ id, nome, url, convite, botao }))(per.final),
  });

  return { espaco, percursoHtml, percursoJson, espacosUsados: usados, ofertaPorPagina };
}
