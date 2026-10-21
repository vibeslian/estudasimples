# Recomendações com link de afiliado (Etapa 17)

Bloco **"Recomendado para o seu trabalho"**: de 1 a 3 cartões pequenos (livro ou curso) no fim de algumas guias, **antes de "Guias relacionadas"**.
**Estado (20/10/2026): LIGADO** (`afiliados.ativo: true`), com os 10 livros, o ID `estudasimples-20` e a data legal `2026-10-20`. Aparece em 14 guias.
Se `ativo` voltar a `false` (ou se um produto ficar sem link), o bloco, as seções "12. Links de afiliado" e as frases novas dos Termos e da Política somem, e as páginas ficam idênticas às de antes (provado byte a byte: `BASE_REF=<commit-sem-afiliados> node pruebas/probar-afiliados.mjs`).
Código: `build-afiliados.mjs`, `build-guias.mjs` (onde entra), CSS `.afiliados` em `src/assets/css/guias.css` (só as guias o carregam), prova `pruebas/probar-afiliados.mjs`.

## Como ligar (tudo em `site.config.json`, bloco `afiliados`)
1. `amazonTag`: o seu ID de afiliado da Amazon (ex.: `meusite-20`). É acrescentado (`?tag=`) aos links de `amazon.com.br` que ainda não o tenham. Links curtos (`amzn.to`) ou que já tenham `tag=` ficam como estão.
2. `produtos[].url`: o link (https) de cada produto. **Produto sem link não aparece.**
3. `legalAtualizadoEm`: a data de hoje (ex.: `"2026-11-05"`). Ela vira a "Última atualização" dos Termos de Uso e da Política de Privacidade.
4. `ativo: true`, `node build.mjs`, publicar, verificar em vivo e IndexNow `--todas` (mudam Termos, Política e as guias com o bloco).

O build **se recusa** a ligar se: um link da Amazon não tem ID de afiliado; falta `legalAtualizadoEm`; um link não é https; `tipo` não é `livro`/`curso`; um livro não tem autor; uma guia teria mais de 3 produtos; `id` repetido; frase com mais de 150 letras.

## Cada produto
`id` (único), `tipo` (`livro` ou `curso`), `titulo`, `autor` (obrigatório para livro), `frase` (por que ajuda, até 150 letras), `url`, `guias` (pastas de guias, ou `["todas"]`), `botao` (opcional). O botão diz "Ver na Amazon" (livro com link da Amazon), "Ver o livro" ou "Ver o curso". Os produtos aparecem na ordem da lista.

## O que o visitante vê (e o que fica sempre)
- Etiqueta visível **"Link de afiliado"** em cada cartão; `rel="sponsored nofollow noopener noreferrer"` e abre em outra aba.
- Em letra pequena, abaixo do bloco: aviso de comissão + **"Como Associado da Amazon, ganho com compras qualificadas."** (a frase só sai se houver algum link da Amazon à mostra) + link para os Termos.
- Ao ligar, **Termos de Uso** e **Política de Privacidade** ganham a seção "12. Links de afiliado" (`#links-de-afiliado`) e a nova data. Desligado, essas páginas ficam como estavam.
- Nunca aparece nas ferramentas, na portada, no serviço, em `/guias/`, nos Termos nem na Política: só dentro de guias, bem longe da caixa que leva às ferramentas.
- Visual próprio (fundo verde-claro e faixa lateral verde; etiqueta coral), diferente dos anúncios (`.anuncio`), da oferta própria (`.oferta`) e do "Parceiro recomendado" (`.parceiro`, borda tracejada).

## Lista inicial (verificada em catálogos de bibliotecas, editoras e livrarias; título e autor)
Ver `site.config.json` → `afiliados.produtos` (10 livros, todos com link da Amazon). Títulos, autores e guias estão ali; as edições não são citadas, porque mudam. Os 10 códigos (ISBN-10) foram conferidos nas páginas da Amazon (sem o tag) e em catálogos.
- Os textos de cada cartão só dizem o que dá para verificar (o assunto do livro); evite "clássico", "o mais usado" e parecidos.
- O livro de Andrade (2010) e o de Cervo, Bervian e Silva (2006) são antigos: por isso o bloco avisa "Livros podem trazer versões antigas das normas da ABNT". Se um livro esgotar na Amazon (ex.: Cervo, `8576050471`), troque o `url` e o título, ou tire o produto da lista.
- O build recusa um link da Amazon com `?tag=` diferente de `amazonTag` (a comissão iria para outra conta).
- Lembrete da Amazon: uma conta nova precisa de vendas qualificadas nos primeiros 180 dias (a regra vigente deve ser conferida no painel de Associados), senão pode ser encerrada.

## Textos legais que mudam ao ligar
Com os afiliados à mostra, entram: Termos 9 (frase sobre links de afiliado) e 12; Política 2.5, 3, 5 (lojas parceiras) e 12. Os ganchos ficam em `src/termos-de-uso/index.html` e `src/politica-de-privacidade/index.html` (`{{AFILIADOS_*}}`) e os textos em `build-afiliados.mjs`.
Regras da Amazon a lembrar: não mostrar preço (só a API de Associados pode), não esconder o link (nada de encurtadores que disfarcem o destino) e manter a frase de associado.

## Provas
`cd pruebas && BASE_REF=<commit> node probar-afiliados.mjs`: apagado (nada aparece, igual ao commit), ligado com exemplos (onde aparece e onde nunca, etiqueta, rel, tag, frase da Amazon, Termos e Política), erros do build, e layout em 320/390/1280 px (sem rolagem lateral, CLS 0, botões de 44 px, letra de 12 px ou mais, axe sem problemas).
Capturas: `node capturas-afiliados.mjs` (usa links de EXEMPLO inventados, nunca vão ao site).
