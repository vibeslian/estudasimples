// Escreve, na hora do build, o HTML dos formulários do gerador de referências a partir de src/assets/js/abnt/referencias-campos.js.
// Assim a página já chega pronta (sem o JS montar os campos e fazer o layout pular) e o HTML e o JS usam a mesma lista de campos.
// Ids do DOM: "<tipo>__<campo>" (ver idCampo em referencias-campos.js).
import { TIPOS, PAPEIS, idCampo } from "./src/assets/js/abnt/referencias-campos.js";
import { MESES_EXTENSO } from "./src/assets/js/abnt/referencias-campos.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const OPCIONAL = ' <span class="opcional">(opcional)</span>';

const rotuloDe = (b) => esc(b.rotulo) + (b.opcional ? OPCIONAL : "");
const ajuda = (b) => (b.ajuda ? `<p class="dica-campo">${esc(b.ajuda)}</p>` : "");

function campoTexto(tipo, b) {
  const id = idCampo(tipo, b.id);
  const tipoInput = b.tipoCampo === "date" ? "date" : "text";
  const extra = b.k === "num" ? ' inputmode="numeric" autocomplete="off"' : ' autocomplete="off"';
  const valor = b.valor ? ` value="${esc(b.valor)}"` : "";
  if (b.k === "area") return `<div class="campo"><label for="${id}">${rotuloDe(b)}</label><textarea id="${id}" rows="3"${b.placeholder ? ` placeholder="${esc(b.placeholder)}"` : ""}></textarea>${ajuda(b)}</div>`;
  return `<div class="campo"><label for="${id}">${rotuloDe(b)}</label><input type="${tipoInput}" id="${id}"${extra}${valor}${b.placeholder ? ` placeholder="${esc(b.placeholder)}"` : ""}>${ajuda(b)}</div>`;
}

function campoSelect(tipo, b) {
  const id = idCampo(tipo, b.id);
  return `<div class="campo"><label for="${id}">${rotuloDe(b)}</label><select id="${id}">${b.opcoes.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select>${ajuda(b)}</div>`;
}

function campoData(tipo, b) {
  const base = idCampo(tipo, b.id);
  const mes = (parte, rotulo) => `<div class="ref-data-parte"><label for="${base}-${parte}">${rotulo}</label><select id="${base}-${parte}"><option value="">—</option>${MESES_EXTENSO.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("")}</select></div>`;
  const partes = {
    dia: `<div class="ref-data-parte"><label for="${base}-dia">Dia${OPCIONAL}</label><input type="text" id="${base}-dia" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="Ex.: 15"></div>`,
    mes: mes("mes", "Mês" + OPCIONAL),
    mesIni: mes("mesIni", "Mês" + OPCIONAL),
    mesFim: mes("mesFim", "Até o mês" + OPCIONAL),
    ano: `<div class="ref-data-parte"><label for="${base}-ano">Ano</label><input type="text" id="${base}-ano" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Ex.: 2024"></div>`,
  };
  return `<fieldset class="grupo ref-data" data-partes="${b.partes.length}"><legend>${esc(b.rotulo)}</legend><div class="ref-data-linha ref-data-${b.partes.length}">${b.partes.map((p) => partes[p]).join("")}</div>${ajuda(b)}</fieldset>`;
}

function blocoOnline(tipo, b) {
  const base = idCampo(tipo, "online");
  return `<fieldset class="grupo"><legend>Se você leu na internet</legend>
          <p class="dica-campo ref-dica-topo">Copie o endereço da barra do navegador. A data de acesso é o dia em que você abriu a página (já vem a de hoje).</p>
          <div class="campo"><label for="${base}-link">Endereço (link)${OPCIONAL}</label><input type="text" id="${base}-link" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://..."></div>
          <div class="campo"><label for="${base}-acesso">Data de acesso${OPCIONAL}</label><input type="date" id="${base}-acesso"></div>${b.doi ? `
          <div class="campo"><label for="${base}-doi">DOI${OPCIONAL}</label><input type="text" id="${base}-doi" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ex.: 10.1590/18094449201800530005"><p class="dica-campo">Só o código, que começa com 10. (o gerador escreve o endereço doi.org).</p></div>` : ""}</fieldset>`;
}

function blocoAutoria(tipo, b) {
  const base = idCampo(tipo, b.id);
  const opcoes = [["pessoa", "Uma ou mais pessoas"]];
  if (b.entidade) opcoes.push(["entidade", "Uma instituição ou órgão (ex.: IBGE, Ministério da Educação)"]);
  if (b.sem) opcoes.push(["nenhum", "Sem autor (a entrada é pelo título)"]);
  const legenda = b.rotulo || "Quem escreveu";
  const seletor = opcoes.length > 1 ? `<div class="campo"><label for="${base}-modo">Autoria</label><select id="${base}-modo">${opcoes.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select>${b.ajudaSem ? `<p class="dica-campo">${esc(b.ajudaSem)}</p>` : ""}</div>` : `<input type="hidden" id="${base}-modo" value="pessoa">`;
  const papel = b.papel ? `<div class="campo" data-papel><label for="${base}-papel">Função</label><select id="${base}-papel">${PAPEIS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select><p class="dica-campo">Escolha "Organizador" se o livro tem uma pessoa que organizou os textos de vários autores.</p></div>` : "";
  const entidade = b.entidade ? `<div data-modo-bloco="entidade" hidden>
            <div class="campo"><label for="${base}-entidade">Nome da instituição ou órgão</label><input type="text" id="${base}-entidade" autocomplete="off" placeholder="Ex.: Universidade Federal de Uberlândia"><p class="dica-campo">Governo e órgãos públicos: comece por BRASIL, o estado ou o município. Ex.: Brasil</p></div>
            <div class="campo"><label for="${base}-orgao">Órgão ou setor${OPCIONAL}</label><input type="text" id="${base}-orgao" autocomplete="off" placeholder="Ex.: Ministério da Educação"></div>
          </div>` : "";
  return `<fieldset class="grupo ref-autoria" data-autoria="${b.id}"><legend>${esc(legenda)}</legend>
          ${seletor}
          <div data-modo-bloco="pessoa">
            <div class="ref-pessoas" id="${base}-lista">
              <div class="autor-linha ref-pessoa"><input type="text" class="ref-sobrenome" autocomplete="off" aria-label="Sobrenome do autor 1" placeholder="Sobrenome (ex.: Silva)"><input type="text" class="ref-nome" autocomplete="off" aria-label="Nome do autor 1" placeholder="Nome (ex.: Maria Helena)"><button type="button" class="btn btn-remover" hidden>Remover</button></div>
            </div>
            <p class="dica-campo">O sobrenome é o último nome da pessoa ("Maria Helena Silva": sobrenome Silva). Sobrenomes como "Santos Filho" ou "Costa Neto" ficam juntos.</p>
            <button type="button" class="btn btn-pequeno" id="${base}-add">+ Adicionar autor</button>
            <div class="campo ref-quatro" data-quatro hidden><label for="${base}-quatro">Com 4 ou mais autores</label><select id="${base}-quatro"><option value="todos">Escrever todos (recomendado pela norma)</option><option value="primeiro">Só o primeiro, seguido de et al.</option></select></div>
          </div>
          ${entidade}${papel}
        </fieldset>`;
}

function bloco(tipo, b) {
  switch (b.k) {
    case "autoria": return blocoAutoria(tipo, b);
    case "texto": case "num": case "area": return campoTexto(tipo, b);
    case "select": return campoSelect(tipo, b);
    case "check": return `<label class="marca"><input type="checkbox" id="${idCampo(tipo, b.id)}"> ${esc(b.rotulo)}</label>`;
    case "data": return campoData(tipo, b);
    case "online": return blocoOnline(tipo, b);
    case "titulo2": return `<h3 class="ref-subtitulo">${esc(b.rotulo)}</h3>`;
    case "linha": return `<div class="ref-linha ref-linha-${b.campos.length}">${b.campos.map((c) => bloco(tipo, c)).join("")}</div>`;
    case "mais": return `<details class="estilo"><summary>${esc(b.rotulo)}</summary><div class="estilo-corpo">${b.campos.map((c) => bloco(tipo, c)).join("\n")}</div></details>`;
    default: throw new Error("bloco desconhecido: " + b.k);
  }
}

/** { opcoes: <option>...</option> do seletor de tipo, forms: <div class="ref-form">... para cada tipo, exemplos: dados dos exemplos (JSON seguro) } */
export function montaFormulariosReferencias() {
  const opcoes = TIPOS.map((t) => `<option value="${t.id}">${esc(t.nome)}</option>`).join("");
  const forms = TIPOS.map((t, i) => `        <div class="ref-form" id="form-${t.id}" data-tipo="${t.id}"${i ? " hidden" : ""}>
${t.blocos.map((b) => "          " + bloco(t.id, b)).join("\n")}
        </div>`).join("\n");
  // texto "Exemplo: ..." do primeiro tipo, já escrito no HTML: se o JS o colocasse depois, o formulário desceria alguns pixels
  const exemploInicial = "Exemplo: " + esc(TIPOS[0].exemplo);
  return { opcoes, forms, exemploInicial };
}
