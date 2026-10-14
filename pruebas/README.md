# Pruebas automáticas de los generadores (capa y folha de rosto)

Estas pruebas abren el sitio en Chrome, llenan el formulario como un estudiante, hacen clic en **Baixar PDF** y **Baixar Word**, y comparan los archivos descargados con la vista previa. No forman parte del sitio (no se publican).

## Cómo ejecutarlas
1. Una sola vez: `npm install` dentro de esta carpeta (`pruebas/`).
2. Deja el sitio corriendo: en la carpeta principal, `npm run dev` (queda en http://localhost:3000).
3. En esta carpeta:

| Comando | Qué hace |
|---|---|
| `node probar-archivos.mjs` y luego `node resumen.cjs` | 5 casos (Arial/Times, estilo personalizado, tamaños 12/14/16, varios autores, signos de puntuación) + 1 caso bloqueado (falta el título). Compara posición, fuente, negrita, mayúsculas y tamaño palabra por palabra entre vista previa, PDF y Word. Si hay Microsoft Word instalado, abre el .docx en Word real y mide ahí. Para saltar Word: `SEM_WORD=1 node probar-archivos.mjs`. Resultados en `resultados/`. |
| `node probar-celular.mjs` | Celular emulado: pestañas, "Ampliar prévia" (zoom, cerrar con botón y con Esc), "Nova capa", descarga y avisos, y capa+folha juntas. Para la folha: `RUTA=/gerador-de-folha-de-rosto-abnt/ node probar-celular.mjs` (en Git Bash, antes `export MSYS_NO_PATHCONV=1`). |
| `node probar-folha.mjs` | Folha de rosto, capa+folha en un archivo, logo y modelo escolar (7 casos + 3 bloqueados). Mismas comparaciones, con Word real oculto (`SEM_WORD=1` lo salta; `SOLO=J1` corre un caso). Resultados en `../ejemplos/_pruebas/folha/`. |
| `node probar-sumario.mjs` | Sumário (1 y 2 páginas, 5 niveles, cursiva, Times/Arial, alineación y espaciado, lista pegada, sin páginas) y capa + folha + sumário en un archivo (con logo y viniendo desde otra herramienta), más 5 casos bloqueados o con aviso. Mismas comparaciones, con Word real oculto (`SEM_WORD=1` lo salta). Resultados en `../ejemplos/_pruebas/sumario/`. |
| `node probar-sumario-lista.mjs` | La lista editable del sumário: agregar, numeración automática, mover, niveles, tipos (apéndice, anexo, sin número), pegar una lista (con ignorados), estilos por nivel, opciones, foco del teclado y celular de 360 px. |
| `node probar-compartir.mjs` | Datos compartidos entre las dos herramientas (sessionStorage), "Limpar dados", pestañas, cookies y peticiones. |
| `node probar-contenido.mjs` | Estructura de cada página, FAQ vs. datos estructurados, cero terceros, anuncios (las dos herramientas). |
| `node probar-sitio.mjs` | Todas las páginas en 7 anchos: sin scroll horizontal, sin errores. |
| `node calibra-word.mjs` | Calibra los saltos de línea contra Word real (98 párrafos con el `.docx` del sitio). Usa `linhas-docx.ps1`. |
| `node probar-servico.mjs` | Página del servicio de formatación: enlace de WhatsApp y mensaje, precios y plazo tomados de `site.config.json` (ninguno escrito a mano), secciones pedidas, datos estructurados (`Service` + `FAQPage`), menú (9 anchos) y pie, sitemap, bloque "Conheça nosso serviço" en las tres herramientas (después de los botones y lejos de los anuncios, computador y celular), Política de Privacidade y Termos, celular 320–390 px. No abre WhatsApp. |
| `node probar-fuentes-cls.mjs` | Salto de diseño por la tipografía: retrasa las fuentes del sitio (red lenta simulada, `RETRASO=3000` para más) y mide el CLS de las 9 páginas en celular y computador (debe ser ~0), y comprueba que con red rápida se usa la letra del sitio (`RETRASO=0`). |
| `node capturas-servico.mjs` | Capturas de la página del servicio, del bloque en las herramientas y de la Política en `../capturas/servico/`. |
| `node capturas-sumario.mjs` | Capturas del sumário y de la portada (computador y celular) en `../capturas/sumario-*.png`. |
| `node capturas-folha.mjs` | Capturas de las dos herramientas y de la portada (computador y celular) en `../capturas/folha-*.png`. |
| `node ejemplos-finales.mjs` | Genera los ejemplos finales (PDF y Word) en `../ejemplos/` y los revisa convirtiéndolos a PNG (Word oculto). |
| `node pdf-a-png.mjs <pdf> <carpeta>` | Convierte un PDF en imágenes PNG para revisarlo sin abrir programas. |
| `node comparar-imagenes.mjs` | Genera `../capturas/comparacion-*.png` (vista previa · PDF · Word) a partir de `resultados/`. Ejecútalo después de `probar-archivos.mjs`. |
| `node capturas-sitio.mjs` | Capturas del sitio en celular y computador, y comprobación de movimiento reducido. |

## Qué se espera ver
- Mismo número de líneas, 1 sola página A4, tamaños de letra idénticos.
- Diferencia vertical menor a 1 pt y horizontal menor a 1 pt entre vista previa y archivos.
- Ningún texto gris de ejemplo ("NOME DO AUTOR", etc.) dentro de los archivos.
- Caso sin título: no descarga nada y muestra "Para baixar, preencha o título."

Si cambias algo en `src/assets/js/abnt/` o en las páginas de las herramientas, vuelve a ejecutar estas pruebas.

## Archivos de prueba: nunca se abren
Los archivos que generan las pruebas (PDF, Word, imágenes) se guardan en `ejemplos/_pruebas/` y **no se abren en ningún programa**: el clic de descarga se intercepta (no se guarda nada en Descargas) y Word se usa por COM oculto (`Visible = false`) y se cierra al terminar. Para mirar un PDF: `node pdf-a-png.mjs archivo.pdf carpeta` y abre el PNG.
