# Página "Anuncie no Estuda Simples" (Etapa 15)

Página para empresas de educação anunciarem: `/anuncie/`. Está **pronta, mas escondida** até o site passar de 10.000 visitas por mês.
Tudo o que muda (interruptor, números, preços, textos dos níveis, WhatsApp, anunciantes) fica no bloco `anuncie` de `site.config.json`.
Código: `build-anuncie.mjs`, `src/anuncie/index.html`, `src/assets/css/anuncie.css` (página) e `.parceiro` em `components.css` (cartão).

## Interruptor: `anuncie.ativo`
| | `false` (hoje) | `true` |
|---|---|---|
| Página `/anuncie/` | existe, com `<meta name="robots" content="noindex">` | indexável |
| `sitemap.xml` | fora | dentro |
| Link "Anuncie" no rodapé | nenhum | em todas as páginas |
| Outras páginas | idênticas byte a byte às de antes (provado com `BASE_REF`) | só ganham o link do rodapé |
| IndexNow | `indexnow.mjs` não avisa `/anuncie/` | avisa |

Para ligar: 1) preencha `anuncie.numeros` com dados **reais** (`referencia`, `visitasMes`, `paginasVistasMes`, `percentualCelular`, e `fonte` se quiser);
2) ponha `"ativo": true`; 3) `node build.mjs` e publique (depois IndexNow `--todas`, porque o rodapé muda em todas as páginas).
O build **se recusa** a ligar com algum número em branco (para nunca publicar cifras inventadas) e avisa se `visitasMes` for menor que `visitasMinimas` (10.000).

## Preços e níveis
`anuncie.niveis`: lista com `id`, `nome`, `preco` (R$ por mês), `resumo` e `inclui` (lista). Valores iniciais: R$ 200 (Banner), R$ 500 (Parceiro recomendado), R$ 1.000 (Parceiro + vídeos).
O "a partir de" do topo da página é o menor preço.

## Contato
E-mail: `contactEmail`. WhatsApp: `anuncie.whatsapp` (se vazio/ausente, usa `servico.whatsapp`) com a mensagem `anuncie.mensagemWhatsapp` ("Olá! Quero anunciar no Estuda Simples.").

## Cartão "Parceiro recomendado" (desligado, sem anúncios)
`anuncie.parceiroRecomendado`: `ativo` (interruptor geral) e `anuncios` (lista). Cada anúncio: `ativo`, `anunciante`, `titulo` (até 60 letras), `texto` (até 160), `botao` (até 24), `url` (só `https://`), `guias` (lista de pastas de guia, ou `["todas"]`). Há um `_exemplo` no próprio arquivo.
- Aparece no fim de "Guias relacionadas" das guias escolhidas; uma guia só pode ter um parceiro (o build avisa se houver dois).
- Sempre leva o selo "Patrocinado"; o link tem `rel="sponsored noopener noreferrer"` e abre em outra aba. Os textos são escapados (nenhum HTML entra).
- Não carrega nenhum script nem imagem de terceiros.
- Não existe ainda o formato "banner" próprio: os espaços reservados (`anuncios.espacos`) continuam livres para o AdSense.

## Regras de quem pode anunciar (também escritas na página)
Só educação (cursinhos ENEM, pós/EAD, idiomas, revisão de texto, verificação de plágio, editoras, papelarias). Não: venda de TCC pronto, trabalhos feitos por encomenda, apostas, nada enganoso. Todo anúncio vem marcado "Patrocinado".

## Provas
`pruebas/probar-anuncie.mjs` (constrói o site com cópias da configuração, sem tocar em `dist/`): apagada (noindex, sem sitemap, sem links, sem anúncios), ligada (sitemap, link em todos os rodapés, números e preços vindos da configuração), erros do build, cartão do parceiro, e layout em 320/390/1280 px (sem rolagem lateral, CLS 0).
Com `BASE_REF=<commit>` compara as outras páginas com as desse commit. Capturas: `node capturas-anuncie.mjs` (usa números de EXEMPLO, nunca vão ao site).
