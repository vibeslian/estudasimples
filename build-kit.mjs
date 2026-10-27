// Kit TCC: produto digital pago (modelo em Word + checklist + guia), vendido pela Hotmart. Tudo vem do bloco "kit" de site.config.json.
// Enquanto kit.ativo for false: a página /kit-tcc/, o kit.css e as imagens em assets/img/kit/ NÃO entram no site (o build.mjs os pula),
// nenhuma outra página fala do kit e os textos legais continuam como estavam.
// Quando kit.ativo for true: a página entra no sitemap, o rodapé e a página do serviço ganham o link, os Termos e a Política ganham a seção do kit.
// Trechos entre <!--KIT:ON--> e <!--/KIT:ON--> só existem com o kit ligado; entre <!--KIT:OFF--> e <!--/KIT:OFF-->, só com ele desligado.
// O build.mjs chama preparaKit().
import { dataLonga } from "./build-guias.mjs";

export const URL_KIT = "/kit-tcc/";
const RE_PRECO = /^\d{1,3}(\.\d{3})*,\d{2}$/;
const RE_URL_COMPRA = /^https:\/\/(pay|go)\.hotmart\.com\/[A-Za-z0-9_?=&%./:+-]+$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function preparaKit(config) {
  const k = config.kit;
  const onde = "site.config.json (kit)";
  if (!k) throw new Error("site.config.json: falta o bloco kit");
  const ativo = k.ativo === true;
  if (typeof k.preco !== "string" || !RE_PRECO.test(k.preco)) throw new Error(`${onde}: "preco" deve ser texto no formato 29,90`);
  if (Number(k.preco.replace(/\./g, "").replace(",", ".")) <= 0) throw new Error(`${onde}: "preco" deve ser maior que zero`);
  if (!Number.isInteger(k.garantiaDias) || k.garantiaDias < 7 || k.garantiaDias > 30) throw new Error(`${onde}: "garantiaDias" deve ser um número inteiro de 7 a 30 (a garantia escolhida na Hotmart; por lei são, no mínimo, 7 dias nas compras pela internet)`);
  if (ativo) {
    if (!RE_URL_COMPRA.test(k.urlCompra || "")) throw new Error(`${onde}: para ligar o kit, "urlCompra" deve ser o link de compra da Hotmart (https://pay.hotmart.com/... ou https://go.hotmart.com/...)`);
    if (!RE_DATA.test(k.legalAtualizadoEm || "") || Number.isNaN(Date.parse(k.legalAtualizadoEm)) || new Date(k.legalAtualizadoEm).toISOString().slice(0, 10) !== k.legalAtualizadoEm) throw new Error(`${onde}: para ligar o kit, preencha "legalAtualizadoEm" (a data, como "2026-11-05", em que os Termos e a Política passam a falar do kit)`);
  }
  const marcas = (texto) => texto.replace(/<!--KIT:(ON|OFF)-->([\s\S]*?)<!--\/KIT:\1-->(\n?)/g, (_, modo, miolo, quebra) => ((modo === "ON") === ativo ? miolo + quebra : ""));
  return {
    ativo,
    marcas,
    legalAtualizadoEm: ativo ? k.legalAtualizadoEm : null,
    dataLegal: ativo ? dataLonga(k.legalAtualizadoEm) : null,
    valores: {
      "{{KIT_PRECO}}": "R$ " + k.preco,
      "{{KIT_URL}}": ativo ? k.urlCompra : "",
      "{{KIT_PRECO_NUM}}": k.preco.replace(/\./g, "").replace(",", "."),
      "{{KIT_GARANTIA}}": String(k.garantiaDias),
    },
  };
}
