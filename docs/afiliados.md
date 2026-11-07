# Recomendações com link de afiliado (Etapa 17)

Bloco **"Recomendado para o seu trabalho"**: de 1 a 3 cartões pequenos (livro ou curso) no fim de algumas guias, **antes de "Guias relacionadas"**.
**Estado (7/11/2026): LIGADO** (`afiliados.ativo: true`), agora com **4 livros** (Amazon, ID `estudasimples-20`: Marconi e Lakatos, Gil, Severino e Medeiros) e 1 curso da Hotmart (*ABNT Descomplicada*, hotlink `go.hotmart.com/G108129335U`), data legal `2026-11-07`. Mudança de 7/11 (análise de 3 especialistas, `docs/analisis-ofertas-2026-11-07.md`): os livros foram escolhidos por INTENÇÃO (nada de livros de metodologia em guias de formato, onde vai o Kit TCC), no máximo **2 por guia**, com uma frase própria para cada guia (campo `frases`), o bloco sai **no meio da guia** (marcador `{{GUIA_AFILIADOS}}`, antes de `{{ESPACO:guia-meio-1}}`) e não no fim, o botão é verde cheio (o coral fica só para o que é do Estuda Simples) e a frase exata da Amazon aparece no subtítulo. Saíram 6 livros (Gil pesquisa social, Marconi fundamentos, Eco, Andrade, Cervo, Creswell). Aparece em 12 guias.
Se `ativo` voltar a `false` (ou se um produto ficar sem link), o bloco, as seções "12. Links de afiliado" e as frases novas dos Termos e da Política somem, e as páginas ficam idênticas às de antes (provado byte a byte: `BASE_REF=<commit-sem-afiliados> node pruebas/probar-afiliados.mjs`).
Código: `build-afiliados.mjs`, `build-guias.mjs` (onde entra), CSS `.afiliados` em `src/assets/css/guias.css` (só as guias o carregam), prova `pruebas/probar-afiliados.mjs`.

## Como ligar (tudo em `site.config.json`, bloco `afiliados`)
1. `amazonTag`: o seu ID de afiliado da Amazon (ex.: `meusite-20`). É acrescentado (`?tag=`) aos links de `amazon.com.br` que ainda não o tenham. Links curtos (`amzn.to`) ou que já tenham `tag=` ficam como estão.
2. `produtos[].url`: o link (https) de cada produto. **Produto sem link não aparece.**
3. `legalAtualizadoEm`: a data de hoje (ex.: `"2026-11-05"`). Ela vira a "Última atualização" dos Termos de Uso e da Política de Privacidade.
4. `ativo: true`, `node build.mjs`, publicar, verificar em vivo e IndexNow `--todas` (mudam Termos, Política e as guias com o bloco).

O build **se recusa** a ligar se: um link da Amazon não tem ID de afiliado; falta `legalAtualizadoEm`; um link não é https; `tipo` não é `livro`/`curso`; um livro não tem autor; uma guia teria mais de 2 produtos; uma guia com produtos não tem o marcador `{{GUIA_AFILIADOS}}` no HTML (ou o tem repetido); `id` repetido; frase com mais de 150 letras.

## Cada produto
`id` (único), `tipo` (`livro` ou `curso`), `titulo`, `autor` (obrigatório para livro), `frase` (por que ajuda, até 150 letras; só diz o assunto do livro) e, se quiser, `frases` ({guia: frase}, para dizer para que serve o livro NAQUELA guia), `url`, `guias` (pastas de guias, ou `["todas"]`), `botao` (opcional). O botão diz "Ver na Amazon" (livro com link da Amazon), "Ver o livro" ou "Ver o curso". Os produtos aparecem na ordem da lista.

## O que o visitante vê (e o que fica sempre)
- Etiqueta visível **"Link de afiliado"** em cada cartão; `rel="sponsored nofollow noopener noreferrer"` e abre em outra aba.
- No subtítulo do bloco, em destaque: **"Como participante do Programa de Associados da Amazon, sou remunerado pelas compras qualificadas efetuadas."** (a frase só sai se houver algum link da Amazon à mostra). Abaixo do bloco: aviso de comissão, o lembrete de que não é preciso comprar se a faculdade já indicou a bibliografia ou a biblioteca tem o livro, e o link para os Termos.
- Ao ligar, **Termos de Uso** e **Política de Privacidade** ganham a seção "12. Links de afiliado" (`#links-de-afiliado`) e a nova data. Desligado, essas páginas ficam como estavam.
- Nunca aparece nas ferramentas, na portada, no serviço, em `/guias/`, nos Termos nem na Política: só dentro de guias, no meio do texto, separado da tarjeta do kit (que fica no fim da guia).
- Visual próprio (fundo verde-claro e faixa lateral verde; etiqueta coral), diferente dos anúncios (`.anuncio`), da oferta própria (`.oferta`) e do "Parceiro recomendado" (`.parceiro`, borda tracejada).

## Lista inicial (verificada em catálogos de bibliotecas, editoras e livrarias; título e autor)
Ver `site.config.json` → `afiliados.produtos` (4 livros, todos com link da Amazon, e 1 curso). Títulos, autores e guias estão ali; as edições não são citadas, porque mudam. Os 4 códigos (ISBN-10) foram conferidos nas páginas da Amazon (sem o tag) e em catálogos.
- Os textos de cada cartão só dizem o que dá para verificar (o assunto do livro); evite "clássico", "o mais usado" e parecidos.
- Livros de metodologia podem ser antigos: por isso o bloco avisa "Livros podem trazer versões antigas das normas da ABNT". Se um livro esgotar na Amazon, troque o `url` e o título, ou tire o produto da lista.
- O build recusa um link da Amazon com `?tag=` diferente de `amazonTag` (a comissão iria para outra conta).
- **Verificado en el panel de Associados (7/11/2026, Contrato Operacional y Regulamento de Comissões de Amazon Brasil):** libros y libros digitales pagan **10 %**; el contrato brasileño NO trae la regla de «3 ventas en 180 días» (era un dato de otro país/blogs: no la usar); cualquiera de las partes puede terminar el contrato con 7 días de aviso. La frase obligatoria, que debe verse «de forma clara e destacada», es exactamente: «Como participante do Programa de Associados da Amazon, sou remunerado pelas compras qualificadas efetuadas.» (está en el subtítulo del bloque). Eventos de recompensa (por cada nuevo suscriptor de prueba): Kindle Unlimited R$ 15, Amazon Prime R$ 9, Music Unlimited R$ 10, Cartão Amazon R$ 30; no usados. Datos de la cuenta: últimos 30 días 1 clic y 0 pedidos, ganancias R$ 0,00.

## Textos legais que mudam ao ligar
Com os afiliados à mostra, entram: Termos 9 (frase sobre links de afiliado) e 13 (12 sem o kit); Política 2.5, 3, 5 (lojas parceiras) e 12. Os ganchos ficam em `src/termos-de-uso/index.html` e `src/politica-de-privacidade/index.html` (`{{AFILIADOS_*}}`) e os textos em `build-afiliados.mjs`.
Regras da Amazon a lembrar: não mostrar preço (só a API de Associados pode), não esconder o link (nada de encurtadores que disfarcem o destino) e manter a frase de associado.

## Provas
`cd pruebas && BASE_REF=<commit> node probar-afiliados.mjs`: apagado (nada aparece, igual ao commit), ligado com exemplos (onde aparece e onde nunca, etiqueta, rel, tag, frase da Amazon, Termos e Política), erros do build, e layout em 320/390/1280 px (sem rolagem lateral, CLS 0, botões de 44 px, letra de 12 px ou mais, axe sem problemas).
Capturas: `node capturas-afiliados.mjs` (usa links de EXEMPLO inventados, nunca vão ao site).

## Cursos da Hotmart (21/10/2026)
- Use o hotlink que a Hotmart dá (Sou afiliado > Links de divulgação), **exatamente como está**: o build NÃO acrescenta tag da Amazon a links que não são da Amazon. Antes de pôr, confira com `curl -L` adónde redireciona e que a página de vendas carrega (os três primeiros destinos que Lian tinha estavam mortos). Aqui a página de vendas é a própria da Hotmart (`hotmart.com/pt-br/marketplace/produtos/...`).
- Quando há link da Hotmart à mostra, os textos legais (Política 3, 5 e 12) dizem "a Hotmart" ao lado de "a Amazon" (`build-afiliados.mjs`, `ehHotmart`). A frase "Como Associado da Amazon…" só sai nas guias com algum link da Amazon; o aviso "Livros podem trazer versões antigas…" só sai nas guias com algum livro.
- Regras da Hotmart para afiliados: sem spam (mensagens em massa), sem usar a marca da Hotmart como se o produto fosse dela, sem prometer resultados garantidos. A frase do cartão só diz o que a página do produto mostra.
- Afiliação de Lian: 21/10/2026, produto 1496737 (comissão 20 %, cookie eterno, último clique). Relatórios de vendas: painel da Hotmart.
