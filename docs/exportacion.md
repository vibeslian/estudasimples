# Exportación a PDF y Word (capa, folha de rosto y sumário)

## Cómo funciona
Todo ocurre en el navegador del estudiante; no se envía ningún dato a un servidor.

| Archivo (`src/assets/js/abnt/`) | Para qué sirve |
|---|---|
| `modelo.js` | Toma lo escrito en el formulario y arma la lista de bloques de la **capa** (`montaCapa`) o de la **folha de rosto** (`montaFolha`): mayúsculas, negrita, tamaños, alineación y recuo ya aplicados. También monta el texto de la natureza del trabajo (`textoNatureza`). Sin DOM. |
| `layout.js` | Calcula dónde va cada línea en la hoja A4: márgenes, saltos de línea, centrado vertical del título, bloque de la derecha. |
| `sumario.js` | Calcula las líneas del sumário en una o varias páginas (sangría francesa, puntos, número de página). |
| `exporta.js` | Genera el PDF (con **jsPDF**) y el Word (con **docx**) de una, dos o tres piezas (capa, folha, sumário). Descarga las librerías solo cuando el estudiante se acerca al botón o lo toca. |
| `estado.js` | Guarda lo escrito en `sessionStorage` (solo esa pestaña) para pasar de una herramienta a la otra, y procesa el logo. |
| `ferramenta.js` | La interfaz de las dos páginas (`<body data-modo="capa">` o `"folha"`): formulario, vista previa, "Ampliar prévia", botones y avisos. |

La vista previa, el PDF y el Word usan el mismo modelo y el mismo cálculo de líneas. **La vista previa dibuja cada línea exactamente donde la calculó `layout.js`** (la misma posición que usa el PDF), no deja que el navegador corte las líneas por su cuenta. Así vista previa y PDF salen iguales por construcción. El Word, que corta las líneas por sí mismo, es la comprobación independiente (ver abajo).

## Librerías (alojadas en el propio sitio)
- jsPDF 4.2.1 → `src/assets/js/vendor/jspdf-4.2.1.umd.min.js`
- docx 9.10.0 → `src/assets/js/vendor/docx-9.10.0.iife.js`
- Licencias MIT en `src/assets/js/vendor/LICENSES.txt`.
- **Ningún dato ni petición sale hacia terceros** (salvo el script de estadísticas de Cloudflare que inyecta el borde, declarado en la Política de Privacidade): la página, las fuentes y estas librerías salen de estudasimples.com.br. Se comprobó cargando todas las páginas y generando PDF y Word.
- Se descargan solo cuando el estudiante se acerca al botón o lo toca. El nombre lleva la versión, por eso se cachean un año (`_headers`).
- Para actualizar una librería: descargar la nueva versión a `vendor/`, cambiar el nombre en `LIBS` de `exporta.js`, borrar la vieja y repetir las pruebas de `pruebas/`.

## Decisiones de formato
- A4, márgenes 3 cm (izquierda y arriba) y 2 cm (derecha y abajo), color negro.
- Interlineado "1,5 líneas" real de Word (1,5 × 1,15 del tamaño de la fuente = 1,725). La **natureza del trabajo** va en espacio simple (1,15), como manda la norma (5.2).
- **Folha de rosto:** autor(es) arriba, título centrado en el espacio libre, bloque de la derecha (natureza + orientador/coorientador) que empieza a 8 cm del margen izquierdo (el medio de la mancha gráfica de 16 cm) y llega al margen derecho, y cidade y ano abajo. Detalle y fuentes en `docs/norma-abnt-folha-de-rosto.md`.
- **Texto justificado** (natureza): se reparte la sobra entre los espacios. Word además **aprieta los espacios hasta ~25 %** para meter una palabra más en la línea; el modelo hace lo mismo (`COMPRESSAO_JUSTIFICADO` en `layout.js`), y las líneas que Word aprieta se dibujan apretadas en la vista previa y el PDF. El valor se ajustó contra Word real (ver abajo).
- **Medidas:** el PDF, el Word y la vista previa miden el texto con el mismo método (canvas con Arial/Times reales o Arimo/Tinos). No se usa `getStringUnitWidth` de jsPDF: **redondea hacia abajo el ancho de cada letra** (0,556 → 0,55) y dejaba las líneas ~0,5 % más cortas, así que el PDF cortaba algunas líneas en otro sitio que la vista previa y el Word.
- Sin "kerning": es lo normal en un `.docx` sin esa opción y hace que PDF, Word y vista previa midan igual.
- La vista previa usa el Arial / Times New Roman del aparato; si no existen (Android, Linux) usa Arimo / Tinos (mismas medidas). El medidor del Word y del PDF usa la misma lista de familias (antes le faltaba la de respaldo).
- Word: el espacio extra del interlineado 1,5 queda debajo del texto (en la vista previa se reparte arriba y abajo). Se compensa 3,3 pt en los párrafos con interlineado 1,5 (medido en Word real); con espacio simple no hace falta. Si la página está casi llena, la compensación se reduce para que la última línea no pase a otra página.
- **Capa + folha en un solo archivo:** PDF de 2 páginas; Word con 2 secciones (cada una empieza en página nueva y tiene sus propios márgenes).
- **Logo:** se lee y se reduce en el navegador (máx. 1000 px; PNG/WebP con transparencia siguen PNG, el resto pasa a JPEG). Altura 1,5 / 2,5 / 3,5 cm, ancho máximo 8 cm, centrado arriba. En el Word va como imagen en línea.
- Para descargar hacen falta autor, título, cidade y ano (y, en la folha, la instituição o un texto de natureza escrito a mano). Si el texto no cabe en la página, no se descarga y se avisa.
- Nombres de archivo: `capa-abnt-<título>`, `folha-de-rosto-abnt-<título>`, `capa-e-folha-de-rosto-abnt-<título>` (`.pdf` / `.docx`).

## Sumário (NBR 6027 y NBR 6024): cómo se calcula y se exporta
Archivos: `modelo.js` (`montaSumario`, `numeraSumario`, `interpretaLista`), `sumario.js` (`calculaSumario`) y `exporta.js`.
- **Numeración automática:** `numeraSumario` recalcula 1, 1.1, 1.1.1… (hasta 5 niveles) cada vez que cambia la lista. Un nivel nunca salta (una subseção solo existe después de una seção del nivel anterior): se corrige solo al máximo permitido. Apéndices y anexos llevan letra (A, B… y, agotado el alfabeto, AA, BB) y los ítems "sin número" no cuentan.
- **Varias páginas:** el motor llena la página 1 (después del título SUMÁRIO y una línea en blanco) y sigue en las siguientes. Un ítem nunca se corta entre dos páginas (`keepLines` en Word). Con interlineado 1,5 caben unas 33 líneas por página; Word deja que el espacio extra del 1,5 pase del margen inferior, y el motor lo reproduce (`folgaFundo`).
- **Sangría francesa:** el número va en el margen y el título empieza a `xt` (a la altura del número más largo o justo después de su número, según la opción); las líneas siguientes quedan bajo la primera letra del título. En Word son un recuo izquierdo con "hanging" más una tabulación entre número y título.
- **Número de página y puntos:** en Word, una tabulación derecha con *leader* de puntos al borde del margen, y un recuo derecho que reserva la faja del número para que el título haga el salto antes. En el PDF y en la vista previa, los puntos son una fila de "." en una grilla anclada al margen derecho (como el Word), del fin del texto hasta antes del número.
- **Texto sin "espacio antes":** a diferencia de la capa y la folha, el sumário no usa "espacio antes" en Word (en las páginas 2 y siguientes lo ignoraría). En su lugar, el PDF y la vista previa suben el texto 3,3 pt (el mismo desfase medido en Word con interlineado 1,5).
- **Cursiva:** `medir` y `quebraLinhas` aceptan cursiva; hay Arimo y Tinos cursiva alojadas en el sitio (`assets/fonts`) para los aparatos sin Arial/Times. Sin ellas, el navegador inventaría una cursiva con las medidas de la letra recta y el PDF y el Word (con la cursiva real) saldrían distintos.
- **Archivo con varias piezas:** capa, folha y sumário van siempre en ese orden; en Word cada pieza es una sección. El nombre del archivo lista las piezas (`capa-folha-de-rosto-e-sumario-abnt-…`). Con las páginas en blanco se puede descargar (con aviso); sin ningún ítem, no.

## Datos compartidos entre las tres herramientas
`sessionStorage` (claves `es-abnt-v1` y `es-abnt-logo-v1`): vive solo en esa pestaña, no es una cookie, nunca se envía y desaparece al cerrar la pestaña. "Limpar dados" (con confirmación en dos clics) lo borra. Si el navegador bloquea el almacenamiento, la herramienta sigue funcionando sin guardar. Está declarado en la Política de Privacidade (secciones 2.1, 3 y 6).

## Límites conocidos
- El PDF usa las fuentes estándar de PDF (Helvetica = Arial, Times). Solo admite letras de Windows-1252 (todo el portugués, español, francés, etc.); otras letras se reemplazan por la más parecida o por "?".
- Si el Word se abre en una computadora sin Arial o Times New Roman (raro), Word sustituye la fuente.
- Las constantes de Word (3,3 pt y compresión 25 %) se midieron en Microsoft Word 16 para Windows. En Word para Mac, LibreOffice o Google Docs puede haber diferencias pequeñas. No se probó con Google Docs real.
- Por la naturaleza de Word (corta las líneas por su cuenta), en un porcentaje pequeño de párrafos justificados puede mover una palabra a otra línea respecto de la vista previa (en la muestra de 35 párrafos reales, 1 no coincidió). El texto, los márgenes y el espaciado son los mismos.
- La ficha catalográfica (verso de la folha de rosto) no se genera: la elabora la biblioteca de cada institución.

## Qué se probó (carpeta `pruebas/`, archivos de prueba en `ejemplos/_pruebas/`, nunca abiertos en pantalla)
- **Sumário** (6 casos + capa+folha+sumário desde otra herramienta + 5 bloqueados o con aviso): vista previa, PDF y Word real iguales (vertical ≤ 0,6 pt, horizontal ≤ 0,3 pt; mismas líneas por página y mismo número de páginas, también en 2 páginas y en el archivo de 3 piezas).
- **Capa** (5 casos + 1 bloqueado) y **folha de rosto / capa+folha / logo / modelo escolar** (7 casos + 3 bloqueados): mismo número de líneas en vista previa, PDF y Word real (abierto oculto con `Visible = false`).
- Texto, mayúsculas, negrita, tamaño y fuente: idénticos palabra por palabra en PDF y Word.
- Posición: PDF ≤ 0,6 pt vertical y ≤ 0,1 pt horizontal; Word real ≤ 0,7 pt vertical y ≤ 0,25 pt horizontal; logos a ≤ 0,04 pt (1 pt = 0,35 mm).
- Páginas: 1 (capa o folha) o 2 (juntas) en PDF y en Word real; márgenes del `.docx` = 1701/1134 twips.
- El texto gris de ejemplo no aparece en ningún archivo.
- Calibración de la compresión del justificado: `pruebas/calibra-word.mjs` (98 párrafos con el `.docx` real; con 0,25 coinciden 34/35 de natureza justificada, 34/35 a la izquierda y 28/28 de títulos).
- Datos compartidos, privacidad y "Limpar dados": `pruebas/probar-compartir.mjs`.
- Lista del sumário (agregar, mover, niveles, tipos, pegar, estilos, foco): `pruebas/probar-sumario-lista.mjs`.
- Celular emulado en las tres herramientas: "Ampliar prévia" con 1 y 2 páginas, "Nova", descargas y avisos.
