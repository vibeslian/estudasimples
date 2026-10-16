# EstudaSimples: instrucciones para Claude

## Bitácora (regla fija)
Mientras trabajamos, cada vez que terminemos algo importante (algo se probó, se decidió, se rompió, se publicó) apúntalo tú solo en la Bitácora del Cerebro REONDIAL, sin que Lian te lo pida. Incluye comandos que funcionaron, errores exactos, rutas y enlaces. Nunca guardes contraseñas ni claves.

La Bitácora está en Notion: página "Cerebro REONDIAL", subpágina "Bitácora" (https://app.notion.com/p/3fa6f3cf411681f19918d9e5eca11b63). Al apuntar, indica de qué proyecto se trata (EstudaSimples).

## Publicar: IndexNow es un paso fijo (regla fija)
Cada vez que publiques algo en EstudaSimples (push a `main`), el orden es: publicar, esperar el deploy, verificar en vivo (URLs 200, pruebas) y **después ejecutar tú mismo IndexNow**, sin que Lian lo pida:
- `node indexnow.mjs --cambiadas`: avisa las URLs nuevas o cambiadas del último commit (HEAD~1 → HEAD).
- `node indexnow.mjs --todas`: si cambiaste el menú, el CSS, el JS, partials, `build*.mjs` o `site.config.json` (cambios que afectan a todas las páginas). El script avisa cuando pasa esto.
- Si un solo push junta varios commits, usa `node indexnow.mjs --cambiadas <commit-anterior-al-push> HEAD`.
- Pon el resultado (código 200/202 y cuántas URLs) en el reporte a Lian, en español simple, y en la Bitácora.
- Nunca escribas el valor de la clave en chats, Bitácora ni documentos; en esos lugares di solo "archivo de clave". Detalles: `docs/indexnow.md`.
- Google no usa IndexNow: Search Console y la lista de URLs para pedir indexación se siguen entregando aparte.
