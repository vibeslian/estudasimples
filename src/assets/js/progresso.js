// "Monte seu TCC passo a passo" e painel "Próximo passo".
// Guarda só nesta aba do navegador (sessionStorage) quais partes o estudante já baixou e quais avisos ele fechou.
// Não usa cookies, não envia nada a nenhum servidor e some quando a aba é fechada. O botão "Limpar dados" das ferramentas apaga tudo na hora.
// Os passos (capa, folha de rosto, sumário e os que vierem) e os textos vêm de site.config.json, pelo bloco #percurso-dados que o build coloca na página.
const CHAVE = "es-progresso-v1";
const tenta = (fn, padrao = null) => { try { return fn(); } catch (e) { return padrao; } };

const dadosDaPagina = () => tenta(() => JSON.parse(document.getElementById("percurso-dados").textContent));
export const lerProgresso = () => {
  const p = tenta(() => JSON.parse(sessionStorage.getItem(CHAVE)));
  return { baixados: (p && p.baixados) || {}, dispensados: (p && p.dispensados) || {} };
};
const grava = (p) => tenta(() => { sessionStorage.setItem(CHAVE, JSON.stringify(p)); return true; }, false);

/** Marca no indicador os passos já baixados (e desmarca os outros). Não muda o tamanho de nada: o círculo do número troca por "✓". */
export function pinta() {
  const p = lerProgresso();
  document.querySelectorAll(".percurso-passo[data-passo]").forEach((li) => {
    const feito = !!p.baixados[li.dataset.passo];
    li.classList.toggle("feito", feito);
    const num = li.querySelector(".percurso-num");
    if (num) num.textContent = feito ? "✓" : num.dataset.n;
    const estado = li.querySelector(".percurso-estado");
    if (estado) estado.textContent = feito ? " (já baixado nesta aba)" : "";
  });
}

/** Chamada quando um arquivo foi baixado: ids são as partes que estavam nele (por exemplo ["capa", "folha"]). */
export function registraDownload(ids) {
  const p = lerProgresso();
  for (const id of ids) p.baixados[id] = 1;
  grava(p);
  pinta();
}

export function limpaProgresso() {
  tenta(() => sessionStorage.removeItem(CHAVE));
  pinta();
}

/** O que sugerir depois de baixar a parte `atualId`: a primeira parte DEPOIS dela que ainda não foi baixada; se não sobrar nenhuma, o serviço. */
export function sugestao(atualId, progresso, cfg) {
  const ordem = cfg.passos.map((s) => s.id);
  const depois = cfg.passos.slice(ordem.indexOf(atualId) + 1);
  return depois.find((s) => !progresso.baixados[s.id]) || cfg.final;
}

/** Mostra (dentro da página, sem pop-up) o painel "Próximo passo", a não ser que o estudante já o tenha fechado nesta aba. */
export function mostraProximo(atualId) {
  const cfg = dadosDaPagina();
  const painel = document.getElementById("proximoPasso");
  if (!cfg || !painel) return;
  const p = lerProgresso();
  const alvo = sugestao(atualId, p, cfg);
  const chave = `${atualId}>${alvo.id}`;
  if (p.dispensados[chave]) { painel.hidden = true; return; }
  painel.dataset.chave = chave;
  painel.querySelector(".proximo-titulo").textContent = alvo.id === cfg.final.id ? "Próximo passo: o trabalho inteiro" : `Próximo passo: ${alvo.nome}`;
  painel.querySelector(".proximo-texto").textContent = alvo.convite;
  const botao = painel.querySelector(".proximo-botao");
  botao.textContent = alvo.botao;
  botao.href = `${alvo.url}#origem=${atualId}-proximo`;
  painel.hidden = false;
}

function iniciaPainel() {
  const painel = document.getElementById("proximoPasso");
  const fechar = painel && painel.querySelector(".proximo-fechar");
  if (!fechar) return;
  fechar.addEventListener("click", () => {
    const p = lerProgresso();
    if (painel.dataset.chave) p.dispensados[painel.dataset.chave] = 1;
    grava(p);
    painel.hidden = true;
    const volta = document.getElementById("btnPdf"); // o foco não pode se perder junto com o painel
    if (volta) volta.focus();
  });
}

pinta();
iniciaPainel();
