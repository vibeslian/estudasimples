# IndexNow (Bing y otros buscadores)

IndexNow es un aviso: después de publicar, le decimos a Bing (y a Yandex, Naver, Seznam, etc.) cuáles páginas son nuevas o cambiaron. **Google no lo usa**: para Google sigue valiendo Search Console (sitemap + "Solicitar indexación"). No cambia nada en Search Console.

## Cómo está armado
- **Archivo de clave:** `src/<clave>.txt` (un solo archivo, el nombre es la clave y el contenido es la misma clave). `build.mjs` lo copia a la raíz del sitio, así queda en `https://estudasimples.com.br/<clave>.txt`. Es público por diseño (los buscadores lo leen para comprobar que el sitio es tuyo). No lo borres ni lo cambies sin avisar: si se cambia, hay que volver a publicar el sitio antes de enviar avisos.
- **Script:** `indexnow.mjs` (en la raíz). Lee la clave de ese archivo; nunca la imprime ni la guarda en otro lugar. Antes de enviar comprueba que el archivo de clave esté en vivo y coincida.
- **Envío:** `POST https://api.indexnow.org/IndexNow` (reparte el aviso a todos los buscadores que participan).

## Después de cada publicación
Cuando el deploy ya esté en vivo (la página nueva responde 200):
```bash
node indexnow.mjs --cambiadas          # URLs cambiadas en el último commit (HEAD~1 → HEAD)
node indexnow.mjs --cambiadas ab12cd3 HEAD   # entre dos commits
node indexnow.mjs --todas              # todas las URLs del sitemap en vivo
node indexnow.mjs https://estudasimples.com.br/guias/fichamento/   # una URL concreta
```
Agrega `--probar` para ver la lista sin enviar nada.

`--cambiadas` detecta: páginas `src/**/index.html` nuevas o modificadas, FAQs `conteudo/faq-guia-*.json`, y las guías cuya entrada cambió en `conteudo/guias.json` (más `/guias/`). Si cambió algo global (partials, CSS, JS, `build*.mjs`, `site.config.json`) avisa en pantalla y conviene usar `--todas`.

## Respuestas
| Código | Significa |
|---|---|
| 200 | Aceptado. |
| 202 | Aceptado; el buscador aún valida la clave (normal justo después de publicar). |
| 403 | La clave no coincide con el archivo. |
| 422 | URLs que no son del sitio, o clave inválida. |
| 429 | Demasiados envíos: espera. |

Un 200/202 solo dice que el aviso fue recibido; el buscador decide cuándo rastrear. No hay que enviar la misma URL muchas veces: solo cuando cambia.
