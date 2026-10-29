# Gerador de referências ABNT (Etapa 14)

Página: `/gerador-de-referencias-abnt/`. Faz a referência (NBR 6023:2025) e a citação no texto (NBR 10520:2023) de 8 tipos de fonte, guarda uma lista em ordem alfabética e baixa a página REFERÊNCIAS em Word e PDF. Não usa serviços externos nem procura nada na internet: só organiza o que o estudante digita.

## Onde está cada coisa
| Arquivo | O que faz |
|---|---|
| `src/assets/js/abnt/referencias-campos.js` | **Fonte única dos campos** de cada tipo (livro, capítulo, artigo, site, notícia, lei, vídeo, TCC). O build escreve o HTML dos formulários a partir dele e o JS lê os campos por ele. Para mudar uma pergunta, mude aqui. |
| `build-referencias.mjs` | Escreve os formulários no HTML (`{{REF_TIPOS}}`, `{{REF_FORMS}}`, `{{REF_EXEMPLO_INICIAL}}`). Assim a página chega pronta e o layout não pula. |
| `src/assets/js/abnt/referencias-modelo.js` | O motor, sem DOM: dados do formulário → trechos `{ text, bold }`, citação, ordem alfabética e letras a/b. |
| `src/assets/js/abnt/referencias-layout.js` | Posição de cada linha da página (A4, margens 3/3/2/2, espaço simples, linha em branco entre referências, uma referência não se parte entre páginas). |
| `src/assets/js/abnt/referencias-exporta.js` | PDF (jsPDF) e Word (docx), com o mesmo cálculo da prévia. |
| `src/assets/js/abnt/referencias.js` | A interface: formulário ao vivo, lista, editar/remover, copiar com negrito, prévia, abas do celular. |
| `conteudo/faq-referencias.json` | Perguntas frequentes (HTML + FAQPage). |

## Regras que o gerador aplica
- Autor: SOBRENOME em maiúsculas, vírgula, nome. Até 3 autores, todos; 4 ou mais: todos ou só o primeiro + et al. (opção do estudante, padrão "todos"). Papel (org.), (coord.), (ed.), (comp.) só no livro.
- Instituição: nome em maiúsculas (BRASIL, órgão depois do ponto). Sem autor: entrada pelo título, primeira palavra em maiúsculas (e a seguinte, se a primeira for artigo, monossílabo ou número); o título sem negrito.
- Negrito **só no título**: os dois-pontos e o subtítulo ficam sem negrito. Conferido nos exemplos de 4 manuais (UFU, Unifesp, Unisa, Unilab): mais de 100 casos de negrito que termina antes dos dois-pontos; os dois-pontos dentro do negrito só aparecem em rótulos como "Palavras-chave:", nunca em exemplos de referência; no artigo e na notícia, o negrito vai no nome da revista/jornal; no capítulo, no título do livro.
- Faltou dado: `[S. l.]` (depois de ponto), `[s. l.]` (depois de vírgula, nos periódicos e jornais sem link; com link, em artigos, notícias e sites, o local é opcional e se omite, NBR 6023:2025, 7.20), `[s. n.]`, `[S. l.: s. n.]`; ano `[2018?]`, `[2017]`, `[ca. 2015]`, `[200-]`, `[201-?]`.
- Meses abreviados em português: jan., fev., mar., abr., maio, jun., jul., ago., set., out., nov., dez. Dia sem zero. "Disponível em:" e "Acesso em:" só com link; a data de acesso já vem com a de hoje.
- Editora: tira Ltda., S.A. etc. Lei: "nº" e número com ponto de milhar (9610 → 9.610).
- Citação: padrão da NBR 10520:2023, `(Silva, 2020)` e `Silva (2020)`; 4 ou mais autores `Alves et al.`; sem autor `(Anteprojeto [...], 1987)`; mesmo autor e mesmo ano → 2020a e 2020b (na referência e na citação). Opção "modelo antigo" `(SILVA, 2020)`.
- Lista ordenada por entrada (sem acentos, apóstrofo e hífen ignorados), depois pelo título.

## Onde os manuais divergem (e o que o gerador escolhe)
Subtítulo sem destaque; "nº" (não n° nem n.); travessão (–) na vinculação do TCC; `[S. l.: s. n.]` sem espaços; `maio`; citação em Maiúscula+minúsculas. Está explicado na tabela da página e na FAQ.

## Guardar dados
`sessionStorage` (chave `es-abnt-refs-v1`, sem cookies). A fonte (Arial/Times) é a mesma `es-abnt-v1` das outras ferramentas. "Limpar dados" apaga tudo (`apagaTudo()` em `estado.js`).

## Provas
- `pruebas/probar-referencias-modelo.mjs`: o motor contra 42 exemplos copiados de manuais (UFU, Unicamp, Unilab, UERN; ver `pruebas/ejemplos-referencias.mjs`, que diz o que foi ajustado), citações (UFV), ordem, letras a/b e regras gerais. Sem navegador.
- `pruebas/probar-referencias.mjs`: os mesmos 42 exemplos digitados no formulário real, a lista (editar, remover, copiar com negrito, guardar, "Limpar dados"), layout 320/390/1280 e PDF/Word contra a prévia (Word real oculto; `SEM_WORD=1` o pula).
- `pruebas/capturas-referencias.mjs`: capturas em `capturas/referencias/`.

## Para o futuro
Versão com IA (buscar os dados pelo link) fica para depois; o motor já recebe só dados estruturados.
