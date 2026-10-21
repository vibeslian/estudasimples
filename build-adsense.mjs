// Etapa 18: Google AdSense. Tudo vem do bloco "anuncios" de site.config.json.
// Enquanto anuncios.adsenseAtivo for false: não carrega NENHUM script do Google, não há aviso de cookies e os espaços ficam sem lugar na página.
// O que existe mesmo apagado: o /ads.txt e a etiqueta <meta name="google-adsense-account"> (sem cookies), que o AdSense usa para verificar o site.
// Quando adsenseAtivo for true: aviso de cookies com a opção de recusar anúncios personalizados (src/partials/footer.html e assets/js/anuncios.js),
// script do Google só depois da escolha, blocos <ins> nos espaços, rodapé "Preferências de anúncios" e os textos da Política e dos Termos no presente
// (trechos entre <!--ADS:ON--> e <!--/ADS:ON-->, ou <!--ADS:OFF--> para o texto de quando está apagado).
// O build.mjs e o build-conexoes.mjs chamam estas funções.
import { dataLonga } from "./build-guias.mjs";

export const TAG_GOOGLE = "f08c47fec0942fa0"; // identificador fixo do Google no ads.txt (é o mesmo para todos os editores)
const RE_CLIENTE = /^ca-pub-[0-9]{16}$/;
const RE_BLOCO = /^[0-9]{10}$/;

export function preparaAdsense(config) {
  const an = config.anuncios;
  const a = an && an.adsense;
  const onde = "site.config.json (anuncios.adsense)";
  if (!a) throw new Error("site.config.json: falta anuncios.adsense (o ID do editor, ca-pub-...)");
  if (!RE_CLIENTE.test(a.cliente || "")) throw new Error(`${onde}: "cliente" deve ser o ID do editor no formato ca-pub-1234567890123456 (16 números)`);
  const ativo = an.adsenseAtivo === true;
  const blocos = a.blocos || {};
  for (const k of ["conteudo", "lateral"]) {
    if (blocos[k] && !RE_BLOCO.test(blocos[k])) throw new Error(`${onde}: blocos.${k} deve ter 10 números (o ID do bloco de anúncios criado no painel do AdSense)`);
  }
  if (ativo) {
    for (const k of ["conteudo", "lateral"]) {
      if (!blocos[k]) throw new Error(`${onde}: para ligar o AdSense, preencha blocos.${k} (o ID do bloco, 10 números, criado em AdSense > Anúncios > Por bloco de anúncios)`);
    }
    if (!a.legalAtualizadoEm) throw new Error(`${onde}: para ligar o AdSense, preencha legalAtualizadoEm (a data, como "2026-11-05", em que a Política e os Termos passam a falar dos anúncios)`);
  }
  const cliente = a.cliente;
  const pub = cliente.replace(/^ca-/, "");

  // ---- /ads.txt: existe sempre (o AdSense o confere ao aprovar o site) ----
  const adsTxt = `google.com, ${pub}, DIRECT, ${TAG_GOOGLE}\n`;

  // ---- bloco de anúncio dentro de um espaço (só quando ligado) ----
  const bloco = (slot) => {
    if (!ativo) return "";
    if (slot.endsWith("lateral")) return `<ins class="adsbygoogle" style="display:inline-block;width:300px;height:600px" data-ad-client="${cliente}" data-ad-slot="${blocos.lateral}"></ins>`;
    return `<ins class="adsbygoogle" style="display:block" data-ad-client="${cliente}" data-ad-slot="${blocos.conteudo}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  };

  // ---- textos legais: <!--ADS:OFF-->...<!--/ADS:OFF--> vale com o AdSense apagado; <!--ADS:ON-->...<!--/ADS:ON--> só quando ligado ----
  const marcas = (texto) => texto
    .replace(/<!--ADS:(ON|OFF)-->([\s\S]*?)<!--\/ADS:\1-->(\n?)/g, (_, modo, miolo, quebra) => ((modo === "ON") === ativo ? miolo + quebra : "")); // a quebra de linha depois da marca só fica se o trecho fica

  return {
    ativo,
    cliente,
    adsTxt,
    bloco,
    marcas,
    legalAtualizadoEm: ativo ? a.legalAtualizadoEm : null,
    dataLegal: ativo ? dataLonga(a.legalAtualizadoEm) : null,
    valores: { "{{ADSENSE_CLIENTE}}": cliente, "{{ADSENSE_LEGAL}}": ativo ? a.legalAtualizadoEm : "" },
  };
}
