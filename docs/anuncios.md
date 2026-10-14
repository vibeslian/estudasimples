# Espacios para anuncios (AdSense)

## Cómo están ahora
Los espacios existen en las páginas, pero **no hay ningún anuncio activo ni ningún script de publicidad**. Son bloques vacíos que reservan altura para que, cuando lleguen los anuncios reales, el contenido no se mueva.

- Para ver dónde están, agrega `?ads=preview` al final de la dirección (por ejemplo `http://localhost:3000/gerador-de-capa-abnt/?ads=preview`). Aparecen como cajas con borde punteado y el texto "Anúncio". Con esa opción la altura de la página no cambia (comprobado en las pruebas).
- El script que lee `?ads=preview` está en `src/partials/head-common.html`; los estilos, en `src/assets/css/components.css` (sección "Espaços para anúncios").

## Dónde están
| Página | Espacio (`data-slot`) | Dónde |
|---|---|---|
| Generador de capa | `capa-abaixo-da-ferramenta` | Debajo del aviso "Importante", con 64 px de margen. Los botones de descarga quedan a más de 300 px de distancia. |
| Generador de capa | `capa-meio-1`, `capa-meio-2` | Entre las secciones de la explicación. |
| Generador de capa | `capa-lateral` | Columna lateral de 300×600 que sigue al hacer scroll, solo en pantallas de 1180 px o más. Oculta en celular. |
| Generador de folha de rosto | `folha-abaixo-da-ferramenta`, `folha-meio-1`, `folha-meio-2`, `folha-lateral` | Mismas reglas y mismos tamaños que la capa. |
| Generador de sumário | `sumario-abaixo-da-ferramenta`, `sumario-meio-1`, `sumario-meio-2`, `sumario-lateral` | Mismas reglas y mismos tamaños. Esta herramienta tiene una lista editable larga: los anuncios van siempre después del aviso "Importante", nunca entre los ítems ni junto a los botones. |
| Inicio | `inicio-entre-secoes` | Entre "Como funciona" y "Vem aí". |
| Formatação ABNT de TCC | (ninguno) | Es una página comercial con botón de WhatsApp: sin anuncios. |

Reglas que se cumplen en las tres herramientas (y que verifica `pruebas/probar-contenido.mjs`): ningún anuncio encima del formulario, ninguno junto a los botones de descarga (mínimo 150 px; hoy más de 300 px) ni dentro de la herramienta, ninguno en la portada. Las páginas legales, Sobre y Contacto no tienen anuncios.

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

## Observaciones para AdSense (anotadas al terminar la Etapa 6; no se hizo nada de esto todavía)
Cosas de la estructura actual que conviene decidir o ajustar al activar AdSense:

1. **Anuncios automáticos.** En el panel de AdSense, desactiva los *auto ads* (o excluye las dos páginas de herramientas) y usa solo los bloques manuales de arriba. Los automáticos pueden insertar un anuncio entre el formulario y la vista previa o junto a "Baixar PDF/Word", y eso rompe nuestra regla de distancia y la política de AdSense contra clics accidentales. Lo mismo para los formatos *anchor* (barra fija abajo) y *vignette* (pantalla completa): en una herramienta que se usa en el celular molestan y pueden tapar los botones.
2. **Huecos si no hay anuncio.** Los espacios reservan 280 px (600 px en la columna lateral) aunque AdSense no llene el bloque, y un hueco vacío de 280 px se ve raro. Al activar, decide: dejar el hueco (sin saltos de diseño) o colapsarlo solo cuando AdSense marque `data-ad-status="unfilled"` (por ejemplo con `.anuncio:has(ins[data-ad-status="unfilled"]) { display: none; }`). Colapsar mueve una vez el contenido de abajo, pero solo a quien no recibe anuncio.
3. **Alturas.** Para que no haya saltos, usa tamaños fijos que quepan en 280 px de alto (300×250, 336×280, 728×90) o bloques adaptables con `min-height` igual al reservado. Nada más alto, salvo la columna lateral (300×600).
4. **Columna lateral "pegada" (`position: sticky`).** Es un recurso de CSS de la página, no un formato de AdSense. Antes de activarla, revisa en el Centro de políticas de AdSense que los anuncios que acompañan el scroll estén permitidos; si hay duda, quita el `sticky` de `.anuncio--lateral` en `components.css` (la columna queda igual, pero fija en su lugar).
5. **`aria-hidden="true"`.** Los `div.anuncio` lo llevan mientras están vacíos. Quítalo de cada bloque que tenga un anuncio real y deja la etiqueta "Anúncio" visible encima (AdSense lo pide en varios formatos).
6. **Contenido para el rastreador de AdSense.** La explicación de cada herramienta está en el HTML estático (no depende de JavaScript) y la herramienta se dibuja con JavaScript: es lo correcto para la política de "contenido propio y suficiente". Las páginas legales, Sobre, Contacto y la 404 siguen sin anuncios y así deben quedar (poco texto).
7. **`robots.txt` y el rastreador de AdSense.** El `robots.txt` administrado por Cloudflare bloquea solo rastreadores de IA y deja `User-agent: *` con `Allow: /`, así que `Mediapartners-Google` (el rastreador de AdSense) y Googlebot pasan (verificado el 13/10/2026). Si cambias la política de bots de IA en Cloudflare, vuelve a mirar `https://estudasimples.com.br/robots.txt`.
8. **`ads.txt`.** Ponlo en `src/ads.txt`; `build.mjs` copia los `.txt`. Tras publicar, comprueba que `https://estudasimples.com.br/ads.txt` devuelva 200 con la línea de AdSense.
9. **Consentimiento y política.** El aviso de cookies sigue pendiente (ver arriba). La Política de Privacidade ya declara las estadísticas de Cloudflare y el `sessionStorage` de las herramientas; al activar AdSense hay que añadir el nombre de la herramienta de consentimiento y actualizar la fecha.
10. **Carga y rendimiento.** Carga el script de AdSense con `async`, solo después del consentimiento, y considera cargar los bloques de más abajo cuando el visitante se acerque (IntersectionObserver) para no tocar el LCP de las herramientas. Vuelve a medir con Lighthouse después de activar.
11. **Cabecera `X-Frame-Options: DENY`** (en `_headers`). No afecta a los anuncios (ellos van dentro de nuestra página, no al revés). Si una herramienta de AdSense necesitara mostrar tu página dentro de un marco, habría que relajarla solo para eso.
12. **Content-Security-Policy.** Hoy no hay. Si algún día se agrega, hay que incluir los dominios de AdSense.
13. **Interacción de la lista del sumário.** La lista de ítems tiene botones pequeños (subir, bajar, nivel, quitar) que se usan muchas veces seguidas. Por eso ningún anuncio puede ir cerca de ellos ni dentro del formulario; los anuncios automáticos (punto 1) deben quedar excluidos de esta página.
14. **Páginas nuevas.** Cada herramienta nueva debe copiar las cuatro posiciones de anuncio (debajo de la herramienta, dos en el texto y una lateral) y añadirse a la lista de herramientas de la sección de anuncios de `probar-contenido.mjs`.
15. **Bloque del servicio.** En las tres herramientas, el texto "Prefere receber o trabalho inteiro formatado? Conheça nosso serviço" va dentro del formulario, después de la nota sobre los datos guardados (que separa el bloque de los botones de descarga). No es un anuncio y no debe confundirse con uno: nunca pegarlo a un espacio de anuncio (la prueba exige ≥ 150 px).
