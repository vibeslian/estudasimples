# Guías ABNT (/guias/) — cómo están hechas (Etapa 10)

## Qué hay
32 guías (29 de ABNT + 3 de «ENEM e escola», ver el final de este archivo) + el índice `/guias/`. Todo se define en **`conteudo/guias.json`** (una entrada por guía: slug, título ~60 caracteres, descripción ~155, h1, lead, norma, fecha de actualización, botón de la herramienta, 2–3 guías relacionadas y lista de fuentes). `build-guias.mjs` valida el archivo y arma el `<head>` (title, meta, canonical, Open Graph, Article + BreadcrumbList), el encabezado, la caja de la herramienta, las guías relacionadas y las "Fontes".

Orden de prioridad (campo `prioridad`): normas-abnt, margens-abnt, como-fazer-referencia-abnt, referencia-de-site-abnt, citacao-abnt, normas-abnt-no-word, modelos-de-capa-abnt, sumario-automatico-word, resumo-abnt, normas-abnt-tcc, titulos-e-subtitulos-abnt, numeracao-de-paginas-abnt, fonte-e-espacamento-abnt.

## Cómo agregar o cambiar una guía
1. Entrada nueva en `conteudo/guias.json` (el build avisa si falta algo).
2. `src/guias/<slug>/index.html` copiando una guía existente (marcas `{{GUIA_HEAD}}`, `{{GUIA_HERO}}`, `{{GUIA_FERRAMENTA}}`, `{{GUIA_RELACIONADAS}}`, `{{GUIA_FONTES}}`, `{{ESPACO:guia-meio-1|guia-meio-2|guia-lateral}}`).
3. Preguntas en `conteudo/faq-guia-<slug>.json` (el FAQPage sale de ahí y se muestra igual en la página: `{{FAQ_JSONLD:…}}` y `{{FAQ_HTML:…}}`).
4. `node build.mjs`: el sitemap se actualiza solo. Después, `node probar-guias.mjs` (en `pruebas/`).
- Las herramientas muestran sus guías con `{{GUIAS_DA_FERRAMENTA:capa|folha|sumario|referencias|contador|cronograma|media}}` (según el campo `ferramentas` de cada guía). La portada usa `{{GUIAS_DESTAQUE:n}}`.
- Los botones hacia las herramientas llevan `?origem=guia-<slug>`, y el servicio usa el mensaje de WhatsApp `guia-<slug>`.

## Reglas de contenido
- Respuesta directa al comienzo, dibujo de la hoja (SVG o HTML), pasos, errores comunes y FAQ real. Sin textos repetidos entre guías (la prueba lo revisa).
- Cada regla sale de manuales de bibliotecas (UFV 2025, UERN 2025, UNISA 2025, Unifesp 2024, Unicamp, UFU, UNESP/NBR 6028:2021, UFSCar/FURB para la NBR 10520:2023). Donde los manuales se contradicen, la guía lo dice con una tabla "Onde os manuais divergem". Las fuentes con enlace van al final de cada guía.
- Las normas completas son pagas: se explica con palabras propias y no se copian pasajes.

## Anuncios
Tres espacios por guía: `guia-meio-1`, `guia-meio-2`, `guia-lateral` (en `site.config.json`, `anuncios.espacos`). Lejos de los botones, igual que en las herramientas.

## Pruebas
`pruebas/probar-guias.mjs`: títulos y descripciones únicos, JSON-LD válido (Article, BreadcrumbList, FAQPage solo con preguntas visibles), enlaces internos y anclas, sitemap, enlaces guía ↔ herramienta con `?origem`, guías relacionadas, fuentes con `rel="noopener"`, párrafos no repetidos, y en navegador (320/390/1280 px) sin scroll horizontal ni errores. Con `LIVE=1 BASE_URL=https://estudasimples.com.br` la parte A corre contra el sitio publicado.

## Etapas 11 y 12 (guías de TCC y de trabajos del semestre)
- `conteudo/guias.json` ahora tiene 29 guías en 6 categorías (`CATEGORIAS` en `build-guias.mjs`): «TCC passo a passo» (10 guías, Etapa 11), «Trabalhos do semestre» (6 guías, Etapa 12: resenha-critica, fichamento, relatorio-abnt, slides-abnt, modelo-de-artigo-cientifico-abnt, trabalho-escolar-abnt) y las 4 de la Etapa 10.
- `prioridade` ordena las tarjetas de cada categoría (el orden de búsqueda pedido) y la portada muestra las 3 primeras (`como-fazer-tcc` = 1,5).
- Fuentes nuevas: Gerhardt y Silveira (UFRGS, 2009) para tipos de pesquisa y proyecto; UTFPR «10 passos do TCC»; tutorial del Unisagrado (listas en Word); FURG y eduCAPES/UERJ (fichamento y resenha); informativo Unesp de la NBR 6028:2021; NBR 10719 (cópia 2011 de la UFG) y roteiro UniFACHA 2024 (basado en la edición 2015); UFRGS y USP/ESALQ (slides); UFMG y Metodista (NBR 6022:2018); guía del Colégio La Salle (trabajo escolar).
- Ejemplos de textos con obras de dominio público (Dom Casmurro, O Cortiço): citas literales solo cuando se confirmaron en dos fuentes; los demás textos son originales. Las epígrafes con autores inventados llevan la etiqueta «Exemplo fictício» (`.ficticio`) y las reales «Citação real» (`.real`).
- Donde no hay norma (slides, relatório de estágio, trabalho escolar) la guía lo dice y no inventa reglas.

## Categoría «ENEM e escola» (22/10/2026)
- `conteudo/guias.json` tiene ahora **32 guías en 7 categorías**. La séptima, «ENEM e escola» (`CATEGORIA_ENEM` en `build-guias.mjs`), tiene 3 guías (prioridad 30 a 32, para no entrar en las 3 de la portada): `quantas-linhas-tem-a-redacao-do-enem` (herramienta `contador`), `como-calcular-a-media-para-passar-de-ano` (`media`) y `como-montar-um-cronograma-de-estudos-para-o-enem` (`cronograma`). Cada página de herramienta (`src/contador-de-linhas-enem/`, `src/calculadora-de-media/`, `src/cronograma-de-estudos-enem/`) muestra su guía con `{{GUIAS_DA_FERRAMENTA:<id>}}`, y cada guía lleva el botón hacia su herramienta (`?origem=guia-<slug>`).
- Lo que cambia para las guías que no son de ABNT (`build-guias.mjs`): la etiqueta del encabezado dice «Guia ENEM e escola»; la línea de fuente puede usar `metaTexto` en lugar de `norma` (por ejemplo «Cada escola define a sua média: vale o regimento»); el aviso del final habla del Inep, del MEC y del regimento de la escuela, no de la ABNT. Las migas y el JSON-LD dicen «Guias» (antes «Guias ABNT»), y el menú y el pie dicen «Guias».
- Las guías de ABNT existentes no cambiaron de contenido; la guía principal (`normas-abnt`) sigue enlazando solo a las 28 de ABNT (la prueba lo tiene en cuenta).
- Reglas de contenido de estas 3 guías: primera persona («eu»), sin cifras inventadas. Linhas del ENEM: hechos de la Cartilha del Inep (30 líneas; hasta 7 líneas escritas = cero; las líneas con trechos copiados no cuentan para el mínimo); **no está confirmado si el título cuenta como línea** y la guía lo dice; no hay regla oficial de palabras. Media: la media y la recuperación las define cada escuela (LDB, art. 24, remite al reglamento). Cronograma: sin fecha del ENEM (cambia cada año) y sin promesa de nota. Los ejemplos con números están marcados como inventados.
- Todo año, revisar la cartilla nueva del Inep (misma tarea que en `docs/enem.md`) y subir `atualizado` si cambia algo.

