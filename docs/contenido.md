# Cómo editar el contenido (Etapa 4)

## Preguntas frecuentes
Hay **un archivo por herramienta**: `conteudo/faq-capa.json`, `conteudo/faq-folha.json` y `conteudo/faq-sumario.json` (en la página se insertan con `{{FAQ_HTML:capa}}` / `{{FAQ_JSONLD:capa}}` y los equivalentes con `folha`). Cada pregunta tiene `p` (pregunta) y `r` (lista de párrafos; se permite `<a href>` y `<strong>`).
Al ejecutar `npm run build` (o `npm run dev`) salen de ahí dos cosas: las preguntas desplegables de la página y el dato estructurado `FAQPage` para Google. Como las dos salen del mismo archivo, nunca pueden quedar distintas. Google pide que el dato estructurado coincida con el texto visible.

## Texto de la página del generador
`src/gerador-de-capa-abnt/index.html`, `src/gerador-de-folha-de-rosto-abnt/index.html` y `src/gerador-de-sumario-abnt/index.html`, debajo del aviso "Importante". Usa los bloques de `/_guia-de-estilo/`: `ol.passos`, `.comparar` (erro comum x forma certa), `.dica`, `.regras`, `.dif` (capa x folha de rosto).

## Páginas legales
`src/sobre/`, `src/contato/`, `src/politica-de-privacidade/`, `src/termos-de-uso/`. La fecha "Última atualização" está escrita a mano al comienzo de la Política y de los Términos; actualízala cuando cambies algo de fondo.

## Qué hay que revisar si cambia la norma
- Lista de elementos de la capa: sección "O que vai na capa" y `docs/norma-abnt-capa.md`. De la folha de rosto: `docs/norma-abnt-folha-de-rosto.md`. Del sumário: `docs/norma-abnt-sumario.md` (NBR 6027 y NBR 6024).
- Márgenes, tamaño de letra y espaciado: sección "Margens, fonte e espaçamento" y las constantes de `src/assets/js/abnt/modelo.js`.
- Textos de la natureza del trabajo (TCC, dissertação, tese...): función `textoNatureza` de `modelo.js`.
- Estilo por nivel del sumário (qué nivel va en mayúsculas, negrita o cursiva): `ESTILO_NIVEL_PADRAO` de `modelo.js`; reglas de numeración: `numeraSumario`; lista pegada: `interpretaLista`.
- Texto del aviso "Importante" del generador.

## Datos estructurados que incluye la página del generador
`WebApplication` (herramienta gratuita), `BreadcrumbList` y `FAQPage`. Se pueden validar en https://search.google.com/test/rich-results una vez publicada la página (esa prueba necesita la dirección pública).

## Términos de búsqueda
La página de la folha de rosto usa "contra capa" de forma natural (título, encabezados, FAQ) y aclara siempre que el nombre que usa la norma es folha de rosto (la NBR 14724 no usa la palabra "contracapa"). La página de la capa menciona trabajo en grupo, uso en el celular y Google Docs.

## Imagen para compartir (WhatsApp, redes)
`src/assets/og.png` (1200×630). Se regenera con `node pruebas/generar-og.mjs` si cambias el nombre o los colores.
