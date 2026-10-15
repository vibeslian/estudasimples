# Guías ABNT (/guias/) — cómo están hechas (Etapa 10)

## Qué hay
13 guías + el índice `/guias/`. Todo se define en **`conteudo/guias.json`** (una entrada por guía: slug, título ~60 caracteres, descripción ~155, h1, lead, norma, fecha de actualización, botón de la herramienta, 2–3 guías relacionadas y lista de fuentes). `build-guias.mjs` valida el archivo y arma el `<head>` (title, meta, canonical, Open Graph, Article + BreadcrumbList), el encabezado, la caja de la herramienta, las guías relacionadas y las "Fontes".

Orden de prioridad (campo `prioridad`): normas-abnt, margens-abnt, como-fazer-referencia-abnt, referencia-de-site-abnt, citacao-abnt, normas-abnt-no-word, modelos-de-capa-abnt, sumario-automatico-word, resumo-abnt, normas-abnt-tcc, titulos-e-subtitulos-abnt, numeracao-de-paginas-abnt, fonte-e-espacamento-abnt.

## Cómo agregar o cambiar una guía
1. Entrada nueva en `conteudo/guias.json` (el build avisa si falta algo).
2. `src/guias/<slug>/index.html` copiando una guía existente (marcas `{{GUIA_HEAD}}`, `{{GUIA_HERO}}`, `{{GUIA_FERRAMENTA}}`, `{{GUIA_RELACIONADAS}}`, `{{GUIA_FONTES}}`, `{{ESPACO:guia-meio-1|guia-meio-2|guia-lateral}}`).
3. Preguntas en `conteudo/faq-guia-<slug>.json` (el FAQPage sale de ahí y se muestra igual en la página: `{{FAQ_JSONLD:…}}` y `{{FAQ_HTML:…}}`).
4. `node build.mjs`: el sitemap se actualiza solo. Después, `node probar-guias.mjs` (en `pruebas/`).
- Las herramientas muestran sus guías con `{{GUIAS_DA_FERRAMENTA:capa|folha|sumario}}` (según el campo `ferramentas` de cada guía). La portada usa `{{GUIAS_DESTAQUE:n}}`.
- Los botones hacia las herramientas llevan `?origem=guia-<slug>`, y el servicio usa el mensaje de WhatsApp `guia-<slug>`.

## Reglas de contenido
- Respuesta directa al comienzo, dibujo de la hoja (SVG o HTML), pasos, errores comunes y FAQ real. Sin textos repetidos entre guías (la prueba lo revisa).
- Cada regla sale de manuales de bibliotecas (UFV 2025, UERN 2025, UNISA 2025, Unifesp 2024, Unicamp, UFU, UNESP/NBR 6028:2021, UFSCar/FURB para la NBR 10520:2023). Donde los manuales se contradicen, la guía lo dice con una tabla "Onde os manuais divergem". Las fuentes con enlace van al final de cada guía.
- Las normas completas son pagas: se explica con palabras propias y no se copian pasajes.

## Anuncios
Tres espacios por guía: `guia-meio-1`, `guia-meio-2`, `guia-lateral` (en `site.config.json`, `anuncios.espacos`). Lejos de los botones, igual que en las herramientas.

## Pruebas
`pruebas/probar-guias.mjs`: títulos y descripciones únicos, JSON-LD válido (Article, BreadcrumbList, FAQPage solo con preguntas visibles), enlaces internos y anclas, sitemap, enlaces guía ↔ herramienta con `?origem`, guías relacionadas, fuentes con `rel="noopener"`, párrafos no repetidos, y en navegador (320/390/1280 px) sin scroll horizontal ni errores. Con `LIVE=1 BASE_URL=https://estudasimples.com.br` la parte A corre contra el sitio publicado.
