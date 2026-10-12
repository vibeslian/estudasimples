# Pruebas automáticas del generador de capa

Estas pruebas abren el sitio en Chrome, llenan el formulario como un estudiante, hacen clic en **Baixar PDF** y **Baixar Word**, y comparan los archivos descargados con la vista previa. No forman parte del sitio (no se publican).

## Cómo ejecutarlas
1. Una sola vez: `npm install` dentro de esta carpeta (`pruebas/`).
2. Deja el sitio corriendo: en la carpeta principal, `npm run dev` (queda en http://localhost:3000).
3. En esta carpeta:

| Comando | Qué hace |
|---|---|
| `node probar-archivos.mjs` y luego `node resumen.cjs` | 5 casos (Arial/Times, estilo personalizado, tamaños 12/14/16, varios autores, signos de puntuación) + 1 caso bloqueado (falta el título). Compara posición, fuente, negrita, mayúsculas y tamaño palabra por palabra entre vista previa, PDF y Word. Si hay Microsoft Word instalado, abre el .docx en Word real y mide ahí. Para saltar Word: `SEM_WORD=1 node probar-archivos.mjs`. Resultados en `resultados/`. |
| `node probar-celular.mjs` | Celular emulado: pestañas, "Ampliar prévia" (zoom, cerrar con botón y con Esc), "Nova capa", descarga y avisos. |
| `node comparar-imagenes.mjs` | Genera `../capturas/comparacion-*.png` (vista previa · PDF · Word) a partir de `resultados/`. Ejecútalo después de `probar-archivos.mjs`. |
| `node capturas-sitio.mjs` | Capturas del sitio en celular y computador, y comprobación de movimiento reducido. |

## Qué se espera ver
- Mismo número de líneas, 1 sola página A4, tamaños de letra idénticos.
- Diferencia vertical menor a 1 pt y horizontal menor a 1 pt entre vista previa y archivos.
- Ningún texto gris de ejemplo ("NOME DO AUTOR", etc.) dentro de los archivos.
- Caso sin título: no descarga nada y muestra "Para baixar, preencha o título."

Si cambias algo en `src/gerador-de-capa-abnt/`, vuelve a ejecutar estas pruebas.
