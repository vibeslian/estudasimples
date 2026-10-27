# Ferramentas do ENEM e da escola (Fase 3)

Quatro ferramentas gratuitas, sem cadastro e sem enviar nada: tudo roda no navegador.

| Ferramenta | URL | Arquivos |
|---|---|---|
| Contador de linhas da redação | `/contador-de-linhas-enem/` | `src/contador-de-linhas-enem/index.html`, `src/assets/js/enem/contador.js`, `conteudo/faq-contador-enem.json` |
| Cronograma de estudos | `/cronograma-de-estudos-enem/` | `src/cronograma-de-estudos-enem/index.html`, `src/assets/js/enem/cronograma.js`, `conteudo/faq-cronograma-enem.json` |
| Calculadora de média | `/calculadora-de-media/` | `src/calculadora-de-media/index.html`, `src/assets/js/enem/media.js`, `conteudo/faq-media.json` |
| Folha de redação para imprimir (26/10/2026) | `/folha-de-redacao-enem/` | `src/folha-de-redacao-enem/index.html`, `src/assets/js/enem/folha.js`, `src/assets/css/folha.css`, `conteudo/faq-folha-enem.json`, `src/partials/veja-tambem-folha.html` |

Comum: `src/assets/css/enem.css` (só estas páginas), `src/assets/js/enem/calculos.js` (todas as contas, sem DOM, testável no Node). Os cartões da portada (`.enem-cartao`) estão em `components.css`. O desenho veio do lienzo de Design aprovado por Lian em 22/10/2026 («caderno pautado»: folha com linhas e margem coral).

## Regra oficial das linhas (fonte: Inep)
Cartilha do Participante «A redação no Enem 2025» (download.inep.gov.br/publicacoes/institucionais/avaliacoes_e_exames_da_educacao_basica/a_redacao_no_enem_2025_cartilha_do_participante.pdf):
- O texto definitivo vai na folha própria, **até 30 linhas**.
- Recebe **nota zero** a redação que tiver **até 7 linhas escritas** («texto insuficiente»). Então o mínimo para não zerar por tamanho é **8 linhas**. (A frase «de 7 a 30» que estava na portada estava errada; foi corrigida.)
- Linhas com trecho copiado dos textos da prova **não contam** para o mínimo.
- O título conta como linha escrita (a cartilha diz «embora seja considerado linha escrita», e que ele é opcional e não é avaliado nas competências): quem cola o texto com o título já o tem na contagem.
As constantes estão em `calculos.js` (`LIMITE_LINHAS`, `MAX_SEM_ZERO`, `MIN_LINHAS`). **Todo ano, conferir a cartilha nova do Inep** e ajustar se mudar.

## O que é estimativa (e o que é dado)
- Caracteres por linha: **70 é só um ponto de partida, não é regra do Inep** (não existe fonte oficial). O usuário ajusta (30 a 120). A página também mostra o resultado com a letra 15 % maior e 15 % menor.
- Cada parágrafo começa em linha nova com recuo de 4 caracteres; linhas em branco não contam; palavra maior que a linha é partida.
- Cronograma: rodízio entre as 5 áreas, peso 2 nas áreas de reforço, sem repetir a área no mesmo dia, 1 dia livre por semana (se marcar os 7 dias, o último vira livre), semanas de segunda a domingo, do dia de hoje até a data da prova (máx. 400 dias). **A data do ENEM não vem pronta** (muda todo ano): o usuário escolhe. «Salvar em PDF» usa o botão de imprimir do navegador (a impressão mostra todas as semanas).
- Média: aritmética simples ou ponderada (pesos opcionais), nota máxima ajustável; a média da escola **não vem preenchida** (cada escola define a sua). Resultado sobe para 1 casa decimal.

## Privacidade (Política de Privacidade, seção 2.1)
Nada é enviado. O texto da redação e as notas **não são guardados**. Só ficam no `localStorage`: `es-enem-caracteres` (contador) e `es-enem-cronograma` (data, horas, dias, reforços).

## Testes
- `node pruebas/probar-enem-calculos.mjs`: contas (74 comprobaciones, sem navegador).
- `node pruebas/probar-enem.mjs`: as 3 páginas no navegador (funções, privacidade/rede, impressão, axe, CLS, 320/375/768/1366 px, alvos de 44 px).
- `node pruebas/capturas-enem.mjs`: capturas em `capturas/auditoria/enem-*.png`.

## Folha de redação para imprimir (26/10/2026)
- Desenho aprovado por Lian em 26/10/2026 (lienzo de Design: computador, celular e a folha A4). Folha de **treino**: não é a folha oficial do Inep e não copia o tamanho das linhas da oficial (o texto diz isso na página e no rodapé do PDF).
- Opções: 1, 3, 5 ou 10 folhas; numerar de 1 a 30; campos de nome e tema; linhas mais claras. **Nada é guardado** (nem no navegador) nem enviado.
- Medidas em milímetros, em dois lugares que precisam ficar iguais: `MEDIDAS` em `folha.js` (PDF com jsPDF, carregado de `/assets/js/vendor/`) e as `em` de `folha.css` (1em = 1 mm na impressão). Margens 19/15/15/12 mm, 30 linhas de 8 mm.
- Imprimir: o JS clona a folha N vezes em `#folhasImpressas`; `folha.css` (só esta página) tem o `@page { size: A4; margin: 0 }` e esconde o resto do site na impressão.
- A FAQ responde também «posso usar IA para escrever a redação?» (no dia da prova não; treinar à mão; confira o edital do ano).
- Teste: `node probar-folha-enem.mjs` (117 comprobaciones, incluida la comparação em mm entre PDF e impressão: PDF baixado e lido com pdf.js, impressão com `page.pdf`, medidas em mm, privacidade, 320/375/768/1366 px, axe, CLS, teclado, sem JavaScript). Capturas: `node capturas-folha-enem.mjs`.
