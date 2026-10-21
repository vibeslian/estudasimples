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

## Modo de trabajo con Lian (regla fija, desde el 20/10/2026)
Lian trabaja directo conmigo: soy su asesor y su programador a la vez. Estas reglas valen en todas las conversaciones futuras.

### Reglas
1. Hablar en **español simple**. Lian es principiante: explicar QUÉ se hace y PARA QUÉ antes de hacerlo.
2. No dejar nada para después: lo que se pueda hacer ahora, se hace ahora.
3. Trabajar por **etapas**. Antes de una etapa grande, dar el plan en 3-5 líneas y empezar. Preguntar solo si una decisión no se puede deshacer (pagos, borrar cosas, publicar algo sensible).
4. Usar **subagentes** cuando ayude (investigar, revisar, probar en paralelo) para ahorrar tokens.
5. **Revisar el trabajo antes de decir que terminó**: pruebas, verificación en vivo y capturas.
6. Al final de cada etapa, **antes de decir que está lista**, lanzar un subagente revisor que NO haya visto el trabajo. Debe revisar el código, la verificación en vivo, los textos en portugués, las normas ABNT y los datos (enlaces, precios, fechas) contra sus fuentes. Corregir lo que encuentre. Al subagente se le da un encargo completo y autosuficiente, y se le prohíbe hacer clic en enlaces de afiliado con tag y escribir la clave de IndexNow.
7. Al final de cada respuesta separar siempre:
   - **Lo que hice** (corto).
   - **Tareas manuales para ti**: solo lo que Lian debe hacer (capturas, claves, cuentas, pagos), paso a paso y completo, sin suponer que se acuerda de nada.
   - **Próximo paso**.
8. Al terminar cada etapa, dar un bloque de código titulado **"INFORME PARA CLAUDE"**, de máximo 25 líneas, para que Lian lo copie a su asesor y haga una segunda revisión. Incluye: qué se hizo, commits, URLs afectadas, resultado de pruebas, lo que encontró el revisor, lo que no se pudo verificar y el próximo paso. Sin relleno.
9. Si el asesor de Lian pide correcciones y Lian las pega tal cual: aplicarlas y dar un nuevo informe corto.
10. Nunca escribir contraseñas, CPF, datos bancarios ni la clave de IndexNow (las contraseñas las escribe Lian). No abrir programas visibles ni dejar archivos en Descargas. Los archivos del Kit TCC nunca se publican.
11. Cada cosa importante (se probó, se decidió, se rompió, se publicó) se apunta sola en la Bitácora del Cerebro REONDIAL (ver la sección "Bitácora"), con comandos, errores, rutas y enlaces.
12. Para indexar en Google, dar como máximo **3 URLs**: solo las importantes y que no estén ya indexadas.
13. Cuando una etapa termine, recordar a Lian que abra una **conversación nueva** para ahorrar tokens.
14. Lo que Lian diga en la conversación actual manda sobre estas reglas.

### Lista de espera (en este orden)
a) Cursos de Hotmart en el bloque de afiliados (cuando le aprueben): TCC Sem Desespero, Defender TCC, Como fazer TCCs em Direito. Hay que sacar sus hotlinks. Cómo se agregan: `docs/afiliados.md`.
b) Sitios para backlinks (investigar + mensajes de contacto).
c) Mensajes para grupos de estudiantes.
d) Post de LinkedIn.
e) Folha de redação ENEM.
f) Kit TCC.
g) Plan mensual con IA.
h) Videos del canal acheiunsite (ya hay 5 guiones).

### Pendientes fijos
- Encender `/anuncie/` cuando el sitio pase de 10 mil visitas al mes (ver `docs/anuncie.md`).
- Revisar AdSense el **27/10/2026**.
- Revisar Search Console y Cloudflare **una vez por semana**.
- Si el libro de Cervo (`8576050471`) se agota en Amazon, reemplazarlo (ver `docs/afiliados.md`).
