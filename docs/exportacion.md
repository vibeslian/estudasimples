# Exportación a PDF y Word (Etapa 3)

## Cómo funciona
Todo ocurre en el navegador del estudiante; no se envía ningún dato a un servidor.

| Archivo | Para qué sirve |
|---|---|
| `src/gerador-de-capa-abnt/capa-model.js` | Toma lo escrito en el formulario y arma la lista de líneas de la capa (mayúsculas, negrita y tamaños ya aplicados). |
| `src/gerador-de-capa-abnt/capa-layout.js` | Calcula dónde va cada línea en la hoja A4 (márgenes, saltos de línea, centrado vertical del título). |
| `src/gerador-de-capa-abnt/capa-export.js` | Genera el PDF (con **jsPDF**) y el Word (con **docx**). Descarga las librerías solo cuando el estudiante se acerca al botón o lo toca. |
| `src/gerador-de-capa-abnt/capa.js` | La página: formulario, vista previa, "Ampliar prévia", botones de descarga y avisos. |

La vista previa, el PDF y el Word usan el mismo modelo, por eso salen iguales.

## Librerías (alojadas en el propio sitio)
- jsPDF 4.2.1 → `src/assets/js/vendor/jspdf-4.2.1.umd.min.js`
- docx 9.10.0 → `src/assets/js/vendor/docx-9.10.0.iife.js`
- Licencias MIT en `src/assets/js/vendor/LICENSES.txt`.
- **Ningún dato ni petición sale hacia terceros**: la página, las fuentes y estas librerías salen todas de estudasimples.com.br. Se comprobó cargando todas las páginas y generando PDF y Word: cero peticiones externas.
- Se descargan solo cuando el estudiante se acerca al botón o lo toca (~130 KB y ~280 KB comprimidas). El nombre lleva la versión, por eso se cachean un año (`_headers`).
- El `build.mjs` copia la carpeta `vendor` sin tocar su contenido.
- Para actualizar una librería: descargar la nueva versión a `vendor/`, cambiar el nombre en `LIBS` de `capa-export.js`, borrar la vieja y repetir las pruebas de `pruebas/`.
- Sin conexión, el PDF/Word aún funcionan si el navegador ya cargó las librerías; si no, la página avisa.

## Decisiones de formato
- A4, márgenes 3 cm (izquierda y arriba) y 2 cm (derecha y abajo), color negro.
- Interlineado "1,5 líneas" real de Word (1,5 × 1,15 del tamaño de la fuente = 1,725). Así, en Word el estudiante ve "Espaciado: 1,5 líneas".
- Sin "kerning" (ajuste fino de pares de letras): es lo normal en Word y hace que PDF, Word y vista previa midan igual.
- La vista previa usa el Arial / Times New Roman del aparato; si no existen (Android, Linux) usa Arimo / Tinos, que tienen las mismas medidas.
- Word: el espacio extra del interlineado queda debajo del texto (en la vista previa se reparte arriba y abajo). Se compensa con 3,3 pt, medido en Word real, para que el texto quede en el mismo sitio. Si la capa está casi llena, la compensación se reduce para que la última línea no pase a una 2.ª página.
- Para descargar hacen falta autor, título, ciudad y año. Si el texto no cabe en la página, no se descarga y se avisa.
- Nombre del archivo: `capa-abnt-<título>.pdf` / `.docx`.

## Límites conocidos
- El PDF usa las fuentes estándar de PDF (Helvetica = Arial, Times). Solo admite letras de Windows-1252 (todo el portugués, español, francés, etc.); otras letras se reemplazan por la más parecida o por "?".
- Si el Word se abre en una computadora sin Arial o Times New Roman (raro), Word sustituye la fuente.
- La compensación de 3,3 pt se midió en Microsoft Word 16 para Windows. En Word para Mac, LibreOffice o Google Docs la diferencia puede ser de ~1 mm.

## Qué se probó (carpeta `pruebas/`)
5 capas distintas (Arial y Times, estilo por defecto y personalizado, tamaños 12/14/16, 1 a 3 autores, subtítulo largo, volumen, signos como “ ” ’ – —) + 1 caso bloqueado.
- Mismo número de líneas en vista previa, PDF y Word real (abierto en Microsoft Word y exportado).
- Texto, mayúsculas, negrita, tamaño y fuente: idénticos palabra por palabra en PDF y Word.
- Diferencia de posición: PDF ≤ 0,6 pt vertical y ≤ 1 pt horizontal; Word real ≤ 0,5 pt vertical y ≤ 0,25 pt horizontal (1 pt = 0,35 mm).
- 1 página A4 en todos; márgenes del .docx = 1701/1134 twips (3 cm / 2 cm).
- El texto gris de ejemplo no aparece en ningún archivo.
- Celular emulado: "Ampliar prévia" (zoom, cerrar con botón y Esc), "Nova capa", descargas y avisos.
