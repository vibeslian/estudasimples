# Espacios para anuncios (AdSense)

## Cómo están ahora
Los espacios existen en las páginas, pero **no hay ningún anuncio activo ni ningún script de publicidad**. Son bloques vacíos que reservan altura para que, cuando lleguen los anuncios reales, el contenido no se mueva.

- Para ver dónde están, agrega `?ads=preview` al final de la dirección (por ejemplo `http://localhost:3000/gerador-de-capa-abnt/?ads=preview`). Aparecen como cajas con borde punteado y el texto "Anúncio". Con esa opción la altura de la página no cambia (comprobado en las pruebas).
- El script que lee `?ads=preview` está en `src/partials/head-common.html`; los estilos, en `src/assets/css/components.css` (sección "Espaços para anúncios").

## Dónde están
| Página | Espacio (`data-slot`) | Dónde |
|---|---|---|
| Generador | `capa-abaixo-da-ferramenta` | Debajo del aviso "Importante", con 64 px de margen. Los botones de descarga quedan a más de 200 px de distancia. |
| Generador | `capa-meio-1`, `capa-meio-2` | Entre las secciones de la explicación. |
| Generador | `capa-lateral` | Columna lateral de 300×600 que sigue al hacer scroll, solo en pantallas de 1180 px o más. Oculta en celular. |
| Inicio | `inicio-entre-secoes` | Entre "Como funciona" y "Vem aí". |

Reglas que se cumplen (y que verifica `pruebas/probar-contenido.mjs`): ningún anuncio encima del formulario, ninguno junto a los botones de descarga ni dentro de la herramienta, ninguno en la portada. Las páginas legales, Sobre y Contacto no tienen anuncios.

## Alturas reservadas
280 px en los espacios de contenido (cabe 300×250, 336×280 y 728×90) y 600 px en la columna lateral (300×600). Si el anuncio real es más bajo, quedará aire; si es más alto, el contenido se moverá: por eso conviene no usar tamaños mayores a estos.

## Antes de activar AdSense (lista de tareas, no hechas todavía)
1. **Cuenta y aprobación** en Google AdSense con el dominio `estudasimples.com.br`. AdSense revisa que haya contenido propio, Política de Privacidade, Sobre y Contato (ya existen).
2. **Aviso de cookies con opción de recusar anúncios personalizados.** La Política de Privacidade ya promete que se mostrará antes de los anuncios personalizados (sección 4). Hay que implementarlo (por ejemplo con la herramienta de consentimiento de Google, o una propia) **antes** de poner el script de AdSense.
3. **Archivo `ads.txt`** en la raíz del sitio con tu ID de editor (`src/ads.txt`; AdSense te dice qué línea poner).
4. **Script de AdSense** en `head-common.html` y, dentro de cada `<div class="anuncio" data-slot="...">`, el bloque `<ins class="adsbygoogle" ...>` con su propio ID de bloque. Quita `aria-hidden="true"` de esos `div` cuando tengan un anuncio real.
5. Actualizar la Política de Privacidade (fecha y, si usas una herramienta de consentimiento, su nombre).
6. Volver a medir con Lighthouse: los anuncios bajarán el Performance (es normal).

Políticas de AdSense a tener presentes: no colocar anuncios cerca de botones que puedan inducir a clics accidentales (por eso están lejos de "Baixar PDF/Word"), no pedir ni insinuar clics, y no hacer clic en tus propios anuncios.
