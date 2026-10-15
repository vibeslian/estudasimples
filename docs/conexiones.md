# Conectar las herramientas (Etapa 8.5)

Objetivo: que quien entra por una herramienta descubra las otras y el servicio de formatação, sin que el sitio moleste (nada de ventanas emergentes).

## Qué hay
| Pieza | Dónde se ve | Cómo se arma |
|---|---|---|
| **"Monte seu TCC passo a passo"** (indicador) | Portada (debajo de la portada) y las 3 herramientas (debajo de la herramienta, antes de la nota "Importante") | El build lo escribe en el HTML desde `site.config.json` → `percurso`. El JS (`assets/js/progresso.js`) solo marca con ✓ lo que se descargó en esa pestaña. |
| **Panel "Próximo passo"** | Dentro de la herramienta, justo debajo de los botones de descarga, después de descargar el PDF o el Word | Lo muestra `progresso.js` (`mostraProximo`); el HTML está en `src/partials/proximo-passo.html` y empieza oculto. |
| **Ofertas propias** | En algunos espacios de anuncio de las herramientas (hoy `capa-meio-1`, `folha-meio-1`, `sumario-meio-1`) | El build pone una oferta o un espacio libre según `site.config.json` → `anuncios`. |

## Cómo decide el panel qué sugerir
Después de descargar la parte X, sugiere **la primera parte posterior a X que todavía no se descargó**; si no queda ninguna, sugiere el servicio de formatação.
- Capa → folha de rosto ("Seus dados já estão preenchidos…"). Si la folha ya se descargó → sumário. Si también → servicio.
- Folha de rosto → sumário (o el servicio si el sumário ya está hecho).
- Sumário → servicio ("Prefere que eu formate o trabalho inteiro?").
- Un archivo con varias partes (capa + folha + sumário juntos) marca todas las partes que llevaba.
- Si el estudiante cierra el aviso (×), no vuelve a aparecer en esa pestaña para esa misma sugerencia (se recuerda solo la clave "capa>folha"). El foco vuelve al botón de descarga.
- El panel está en la página (no tapa los botones ni la lista del sumário) y se puede cerrar con un botón de 44 px.

## Qué se guarda y dónde
`sessionStorage`, clave `es-progresso-v1`: `{"baixados":{"capa":1},"dispensados":{"capa>folha":1}}`. Solo nombres de partes y de avisos cerrados: **nada de lo escrito, ni el nombre del archivo**. Es solo de esa pestaña (no es cookie, no se envía, desaparece al cerrar la pestaña). "Limpar dados" lo borra junto con los datos del formulario. Si el navegador bloquea el almacenamiento todo sigue funcionando (sin marcas). Está declarado en la Política de Privacidade (secciones 2.1, 3 y 6).

## Agregar una herramienta nueva (referências, kit, etc.)
1. Crear la página y su herramienta como las demás.
2. En `site.config.json` → `percurso.passos`, agregar al final `{ "id": "...", "nome": "...", "url": "/.../", "convite": "texto del panel", "botao": "Abrir ..." }`. El indicador, el panel y la lógica de "lo que falta" crecen solos.
3. Si la página tiene herramienta propia, que llame a `registraDownload([...])` y `mostraProximo(id)` de `progresso.js` cuando una descarga salga bien (como hace `ferramenta.js`), y que incluya el bloque `#percurso-dados` (`{{PERCURSO_DADOS}}`) y `{{PERCURSO_HTML}}`.
4. Para el seguimiento: agregar el id de página en `ORIGEM_POR_PAGINA` (`build.mjs`) y en `site.config.json` → `servico.origens.paginas`; los mensajes de WhatsApp de esa página salen del modelo.
5. Si quiere un espacio de anuncio u oferta: poner los 4 espacios (`<pagina>-abaixo-da-ferramenta`, `-meio-1`, `-meio-2`, `-lateral`) con `{{ESPACO:<slot>}}` en el HTML y agregarlos a `anuncios.espacos`.

## Medición: parámetro ?origem
Todo enlace nuevo lleva `?origem=<página>-<componente>`:
| Componente | Ejemplo | Quién lo pone |
|---|---|---|
| `percurso` (indicador) | `/gerador-de-folha-de-rosto-abnt/?origem=capa-percurso` | build |
| `proximo` (panel) | `/formatacao-abnt-tcc/?origem=sumario-proximo` | `progresso.js` |
| `oferta` (oferta propia) | `/formatacao-abnt-tcc/?origem=capa-oferta` | build |
| (bloque "Conheça meu serviço", aviso de la portada) | `...?origem=capa`, `...?origem=inicio` | HTML |

Páginas: `inicio`, `capa`, `folha`, `sumario`. La página del servicio lee `?origem=` y cambia el mensaje de WhatsApp ("Olá! Vim pelo site Estuda Simples (gerador de capa · próximo passo) e quero formatar…"), así que **cada pedido por WhatsApp dice de qué página y de qué componente vino**. Los mensajes salen de `servico.modeloMensagem` (se pueden sobrescribir uno por uno en `servico.mensagens`); las etiquetas, de `servico.origens`. Los clics entre herramientas (por ejemplo capa → folha) también llevan el parámetro, pero **no hay una cuenta propia**: solo se verá en lo que muestre el panel de estadísticas de Cloudflare (hay que comprobar en el panel si guarda la parte `?origem=` de la dirección). Lo que sí queda registrado con seguridad es el mensaje que llega por WhatsApp.

## Pruebas
`node probar-conexiones.mjs` (en `pruebas/`): indicador, panel (PDF y Word, una sola pestaña, qué sugiere según lo descargado, cierre, almacenamiento bloqueado, "Limpar dados"), ofertas, configuraciones de prueba (oferta desactivada, dos ofertas en una página, oferta pegada a la herramienta, paso nuevo), medición ?origem y Política. Los archivos se "descargan" en memoria: no se abre nada ni queda nada en Descargas.
