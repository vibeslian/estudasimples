# Recomendações com link de afiliado (Etapa 17)

Bloco **"Recomendado para o seu trabalho"**: de 1 a 3 cartões pequenos (livro ou curso) no fim de algumas guias, **antes de "Guias relacionadas"**.
Está **desligado** (`afiliados.ativo: false`) e os 10 produtos propostos estão **sem link**: não aparece nada e as páginas ficam idênticas às de antes (provado byte a byte com `BASE_REF`).
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
Ver `site.config.json` → `afiliados.produtos` (10 livros, todos sem link). Títulos, autores e guias estão ali; as edições não são citadas, porque mudam.
Regras da Amazon a lembrar: não mostrar preço (só a API de Associados pode), não esconder o link (nada de encurtadores que disfarcem o destino) e manter a frase de associado.

## Provas
`cd pruebas && BASE_REF=<commit> node probar-afiliados.mjs`: apagado (nada aparece, igual ao commit), ligado com exemplos (onde aparece e onde nunca, etiqueta, rel, tag, frase da Amazon, Termos e Política), erros do build, e layout em 320/390/1280 px (sem rolagem lateral, CLS 0, botões de 44 px, letra de 12 px ou mais, axe sem problemas).
Capturas: `node capturas-afiliados.mjs` (usa links de EXEMPLO inventados, nunca vão ao site).
