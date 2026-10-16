# Pinterest: imágenes, CSV y verificación del dominio

Pinterest trae visitas con imágenes. Cada pin es una imagen vertical (1000x1500 px) hecha con el dibujo de una guía, que al tocarla lleva a la guía o a la herramienta con `?origem=pinterest`.

## Qué hace cada parte
- **Imágenes:** `src/pins/<id>.png` (20 archivos, unos 2,3 MB en total). Se publican en `https://estudasimples.com.br/pins/<id>.png`, que es lo que Pinterest lee (columna *Media URL*).
- **Escondidas a propósito:** `/pins/` no tiene página, no está en `sitemap.xml` y ninguna página del sitio enlaza a ella. La prueba `probar-pins.mjs` lo comprueba.
- **CSV:** `pinterest/pines.csv`, con las 8 columnas del formato de Pinterest en este orden: `Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords`.
- **Verificación del dominio:** la etiqueta `p:domain_verify` sale en el `<head>` de todas las páginas (`{{PINTEREST_META}}` en `src/partials/head-common.html`) con el código de `pinterestVerificacao` en `site.config.json`. Si ese campo se vacía, no se escribe nada.

## Los 4 tableros (se crean con estos nombres exactos)
`Capas ABNT` (7 pines) · `Normas ABNT` (7) · `TCC passo a passo` (3) · `Trabalhos escolares` (3). El nombre del tablero en el CSV debe ser igual al que creaste en Pinterest.

## Reglas del CSV (help.pinterest.com, "Bulk upload Pins")
| Campo | Regla |
|---|---|
| Title | hasta 100 caracteres |
| Description | hasta 500 caracteres (aquí 3–5 palabras clave dentro del texto) |
| Media URL | enlace público al PNG |
| Thumbnail | solo para video: queda vacío |
| Link | página de destino, con `?origem=pinterest` |
| Publish date | UTC, formato `2026-10-19T11:00:00` (si queda vacío, se publica al subir) |
| Keywords | separadas por coma (por eso ninguna palabra clave lleva coma) |
| Tamaño | hasta 200 pines por archivo |

Horarios: 3 pines por día a las 08h, 14h y 20h (Brasília; en el CSV van en UTC: 11:00, 17:00, 23:00). Versión actual: primer pin el 17/10/2026 a las 14h (ese primer día salen 2: 14h y 20h), después 3 por día hasta el 23/10. Para cambiarlo: `node pinterest/gerar-csv.mjs --inicio AAAA-MM-DD --hora 14` (`--hora` puede ser 8, 14 o 20). **Hay que subir el CSV antes del primer día programado**; si la fecha ya pasó, Pinterest da error o publica de inmediato.

## Paso a paso (lo que hace Lian)
1. Crear la cuenta de empresa y los 4 tableros con los nombres de arriba.
2. En Pinterest: *Configuración → Reclamar* (claim) el sitio. Pinterest muestra una etiqueta `<meta name="p:domain_verify" content="CODIGO">`. Pasar **solo el código** (el valor de `content`).
3. Claude pone el código en `site.config.json` (`pinterestVerificacao`), construye, publica y comprueba en vivo. Después se pulsa *Verificar* en Pinterest. (Ya hecho el 16/10/2026.)
4. *Configuración → Crear Pines en masa* (Bulk create Pins) y subir `pinterest/pines.csv`.

## Para regenerar
```bash
npm run dev                          # el sitio local debe estar en :3000
node pinterest/gerar-pines.mjs       # imágenes → src/pins/ (o: gerar-pines.mjs id1 id2)
node pinterest/gerar-csv.mjs         # CSV
npm run build && cd pruebas && node probar-pins.mjs
```
`MUESTRA=carpeta node pinterest/gerar-pines.mjs` deja las imágenes en otra carpeta para revisarlas sin tocar `src/pins/`.

## Cómo se dibujan
`gerar-pines.mjs` abre la página de la guía en Chrome sin ventana, toma el dibujo (SVG, franjas de colores, tabla de estructura, fichas o una foto de la vista previa de la herramienta) y lo coloca en una plantilla con los colores y letras del sitio: título grande arriba, dibujo al centro con papel sobre fondo verde, dos cápsulas con datos y la barra `estudasimples.com.br` abajo. El título baja de tamaño solo si no cabe en 3 líneas.

## Datos de las cápsulas
Salen de lo que ya dicen las guías (medidas, orden, qué lleva cada capa). Si una guía cambia, hay que revisar su pin en `pines.json`.
