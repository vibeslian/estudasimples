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
