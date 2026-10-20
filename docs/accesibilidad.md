# Accesibilidade (meta: Lighthouse 100)

Prova automática: `cd pruebas && node probar-accesibilidad.mjs` (axe-core, o mesmo motor do Lighthouse, mais regras extras).
Passa por **todas as páginas do sitemap + 404 + /anuncie/**, em celular (390 px) e computador (1280 px), e por estados do gerador de referências (formulário cheio, lista com 4 referências, editando).
`BASE_URL=https://estudasimples.com.br node probar-accesibilidad.mjs` roda contra o site em vivo; `MSYS_NO_PATHCONV=1 PAGINAS=/sobre/,/contato/ node ...` só algumas páginas.
Lighthouse (só acessibilidade): `npx lighthouse@12 <url> --only-categories=accessibility --output=json --output-path=x.json --chrome-flags="--headless=new" --quiet` (`--preset=desktop` para computador); `node pruebas/lh-resumen-acc.cjs x.json` lista o que falha.
A regra `region` do axe (conteúdo fora de um landmark: o título do topo fica antes do `<main>`) está desligada: é conselho, não norma, e o Lighthouse não a usa.

## O que foi corrigido (Etapa 16, 20/10/2026)
| Problema | Onde | Correção |
|---|---|---|
| `aria-required-children`: `role="list"` sem nenhum `listitem` | lista de referências vazia, em /gerador-de-referencias-abnt/ | o `role="list"` e o `aria-label` só existem quando há itens (`renderLista` em `referencias.js`) |
| `color-contrast`: texto de exemplo da prévia (`.fantasma`) com #9ca3af sobre branco = 2,5:1 | prévia do computador nas 4 ferramentas (capa, folha, sumário, referências) | cor #767676 (4,5:1), ainda cinza claro, em `ferramenta.css` |
| `scrollable-region-focusable`: tabelas com rolagem lateral sem acesso pelo teclado | 37 tabelas em 24 guias e a tabela de divergências do gerador de referências | o contêiner `.rolavel`/`.ref-rolavel` ganhou `role="region"`, `tabindex="0"` e `aria-label` (a legenda da tabela) |
| `empty-table-header`: `<th>` vazio | guia apêndice e anexo | `<th><span class="sr-only">Característica</span></th>` |

Regra para páginas novas: tabela larga dentro de `<div class="rolavel" role="region" tabindex="0" aria-label="legenda">`; lista só com `role="list"` se tiver itens; texto cinza com contraste de pelo menos 4,5:1 (3:1 só para texto grande).
