# Design do site (Etapa 2.5)

## Onde mudar o quê
| Quero mudar... | Arquivo |
|---|---|
| Nome do site, domínio, e-mail | `site.config.json` |
| Cores, fontes, arredondamento | `src/assets/css/tokens.css` (um só lugar) |
| Logo | é o texto `{{SITE_NAME}}` + um ponto coral (CSS `.logo::after` em `base.css`). Ícone da aba: `src/favicon.svg` (hoje é um "S" com ponto coral; troque se mudar o nome) |
| Blocos de explicação (Etapa 4) | classes em `src/assets/css/components.css`; exemplos em `/_guia-de-estilo/` (só aparece com `npm run dev`) |

## Paleta (contrastes WCAG calculados)
| Uso | Cor | Contraste |
|---|---|---|
| Fundo creme | `#faf8f3` | texto `#1e2924` = 14:1 |
| Texto suave | `#4a5750` | 7,1:1 no creme |
| Principal (sálvia escuro) | `#3b5d4c` | 6,9:1 no creme; 7,3:1 com texto branco |
| Acento coral (botões) | `#e8674a` | texto escuro sobre ele = 4,6:1 (branco daria 3,2:1 e NÃO passa) |
| Coral como texto | `#c4472b` | 4,6:1 |
| Bordas de campos | `#6f8277` | 4,1:1 sobre branco (mínimo 3:1 para controles) |
| Erro comum / forma certa | `#8a3420` em `#fbebe6` / `#2f5242` em `#e4ece3` | 7:1 / 7,2:1 |

O coral só aparece em botões principais e pequenos detalhes (ponto do logo, marcadores, borda da caixa de dica).

## Tipografia
- Títulos: **Nunito** (800), texto: **Inter** (400–700). Ambas são do Google Fonts, hospedadas no próprio site (`src/assets/fonts`, ~87 KB, `font-display: swap`, subconjunto latino com todos os acentos do português). Assim não há pedido ao Google (mais rápido e melhor para a LGPD).

## Movimento
- Manchas do fundo: só CSS, só `transform` (leve para a GPU), 3 camadas, 34–50 s por ciclo, pausam quando saem da tela.
- Aparecer ao rolar: classe `.revelar` (JS de ~1 KB). Nunca usada no formulário nem na prévia.
- Botões e cartões: pequena subida no hover (só em dispositivos com mouse) e "aperto" ao tocar. Dentro da ferramenta os botões só mudam de cor.
- `prefers-reduced-motion: reduce`: sem manchas animadas, sem fundido, sem transições (testado).

## Medição (Lighthouse, modo celular simulado; mediana de 3 medições, Etapa 4)
| Página | Performance | Accessibility | SEO | Best Practices |
|---|---|---|---|---|
| Início | 98 | 100 | 100 | 100 |
| Gerador de capa (com todo o conteúdo) | 98 | 100 | 100 | 100 |
| Sobre | 100 | 100 | 100 | 100 |
| Política de Privacidade | 100 | 100 | 100 | 100 |

A nota de Performance varia 2–7 pontos de uma medição para outra na mesma página (ruído do computador), por isso se usa a mediana. Medido contra o servidor local (com gzip). Em produção a latência real da rede soma tempo, e os anúncios do AdSense vão baixar o Performance: repetir depois de publicar e depois de ativar anúncios (`node pruebas/lighthouse-mediana.cjs` lê as medições guardadas em `capturas/lighthouse/_runs`).

## Mudanças da Etapa 3 (nome definitivo)
- Nome: **Estuda Simples**, domínio **estudasimples.com.br** (`site.config.json`).
- A fonte do texto passou de Atkinson Hyperlegible para **Inter** porque a Atkinson desenha o zero cortado ("2Ø26"). O zero do Inter é normal. A capa baixada não é afetada: usa Arial ou Times New Roman.
- Portada (computador): mini capa de exemplo à direita, com entrada suave de 1,2 s (desligada com `prefers-reduced-motion`; oculta no celular).

## Letra de respaldo e salto de layout (Etapa 8b)
O Lighthouse mede o CLS (salto de layout). Quando a fonte do site (Nunito e Inter) chegava tarde e trocava a letra do aparelho, o texto mudava de tamanho e o conteúdo "pulava" (CLS de até 0,20 na portada com a fonte atrasada 1,5 s, e uma corrida de 0,126 no Lighthouse da página do serviço). Duas coisas resolveram:
1. **Letra de respaldo com as mesmas medidas** (`"Inter Fallback"` e `"Nunito Fallback"` em `tokens.css`): usa o Arial do aparelho (ou Liberation Sans/Arimo/Helvetica) com `size-adjust`, `ascent-override` e `descent-override` calculados contra as fontes do site. Medidas: largura média do Inter 400 = 106 % do Arial, Inter 600–700 = 101,8 % do Arial Bold, Nunito 800 = 99 % do Arial Bold; ascendente/descendente do Inter 0,96875/0,2412 e do Nunito 1,011/0,353, divididos pelo `size-adjust`. **Se trocar a fonte do site, refaça estas contas** (meça um texto em português num `canvas` com `measureText`) e rode `pruebas/probar-fuentes-cls.mjs`.
2. **`font-display: optional`** nas duas fontes: se a fonte não chegar nos primeiros ~100 ms, a página inteira usa a letra de respaldo e **não troca no meio** (nada pula). Com a fonte em cache (segunda página) ou com boa rede, sai a fonte do site. A fonte continua pré-carregada (`<link rel="preload">`), então a página seguinte já a encontra.
A troca só deixa de ser perfeita em um caso: se um parágrafo quebra uma linha diferente com a letra de respaldo (acontecia na folha de rosto no celular, CLS 0,04, antes do `optional`). Com `optional` esse caso não existe, porque a letra não muda durante a carga.
Resultado (`node probar-fuentes-cls.mjs`, 9 páginas × celular e computador, fontes atrasadas 1,5 s): CLS 0,0000 em todas (antes: até 0,2020 e 8 páginas acima de 0,01).
As fontes de pré-visualização das ferramentas (Arimo e Tinos, em `ferramenta.css`) só carregam quando faltam no aparelho e não afetam o layout da página.
