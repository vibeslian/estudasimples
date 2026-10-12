# Publicar el sitio: GitHub + Cloudflare (Workers)

Idea general: tu proyecto vive en tu computador. **GitHub** guarda una copia de seguridad (privada) y **Cloudflare** lo publica. Cada vez que subes un cambio a la rama `main` de GitHub, Cloudflare vuelve a construir y publicar el sitio solo.

```
tu computador --(git push)--> GitHub (copia privada) --(automático)--> Cloudflare (Worker "estudasimples") --> estudasimples.com.br
```

> **Pages o Workers.** Cloudflare ahora crea los proyectos nuevos como **Workers** con archivos estáticos (el panel dice *Workers & Pages → Create application → Import a repository*). Es lo que usa este sitio. Funciona igual que Pages, pero el comportamiento del sitio (por ejemplo, qué se muestra en un 404) se define en el archivo **`wrangler.jsonc`** del proyecto, no en el panel. Las cabeceras de seguridad y de caché están en `dist/_headers`, que genera `build.mjs`, y Workers también las respeta.

## Estado actual (así está publicado hoy)
| Dato | Valor |
|---|---|
| Repositorio | https://github.com/vibeslian/estudasimples (privado) |
| Worker | `estudasimples` (Workers & Pages) |
| Rama de producción | `main` |
| Comando de build | `npm run build` |
| Comando de deploy | `npx wrangler deploy` |
| Configuración del Worker | `wrangler.jsonc` (en el repositorio) |
| Dirección oficial | https://estudasimples.com.br (sin www) |

## 1. Git
Ya está instalado (se comprueba con `git --version`). Si algún día usas otro computador: https://git-scm.com/download/win.
Git guarda cada cambio con tu nombre; en este proyecto ya está configurado:
```bash
git config user.name "Lian Martínez"
git config user.email "lianmarcosmartinez@gmail.com"
```
Ese correo queda visible en el historial. Mientras el repositorio sea privado no importa; si algún día lo haces público, activa en GitHub > Settings > Emails la opción "Keep my email addresses private" y usa el correo `noreply`.

## 2. Primer commit y subida
Un *commit* es una foto del proyecto en un momento dado.
```bash
git add -A
git commit -m "Primera versión del sitio"
git remote add origin https://github.com/TU-USUARIO/estudasimples.git
git push -u origin main
```
La primera vez se abre el navegador para autorizar a Git con tu cuenta de GitHub. (`.gitignore` evita subir `node_modules`, `dist`, `capturas`, `ejemplos` y los resultados de las pruebas.)

## 3. Crear el repositorio en GitHub (antes del paso 2)
1. https://github.com > **+** > **New repository**.
2. Nombre `estudasimples`, **Private**.
3. **No marques** README, .gitignore ni license (debe nacer vacío) > **Create repository**.

## 4. Conectar Cloudflare (Workers Builds)
1. https://dash.cloudflare.com > **Workers & Pages** > **Create application** > **Import a repository** (*Get started*).
2. Elige tu cuenta de GitHub (autoriza a Cloudflare solo el repositorio `estudasimples`) y selecciona el repositorio.
3. Configura:

| Campo | Valor |
|---|---|
| Project / Worker name | `estudasimples` (**debe ser igual** al `name` de `wrangler.jsonc`, o el build falla) |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | (vacío) |
| Variable de build (opcional) | `NODE_VERSION` = `22` (el archivo `.node-version` ya lo indica) |

4. **Save and Deploy**. Al terminar puedes abrir el sitio en su dirección `…workers.dev`.
Para cambiar estos valores después: tu Worker > **Settings** > **Builds**.

### Qué hace `wrangler.jsonc`
```jsonc
{
  "name": "estudasimples",
  "compatibility_date": "2026-10-12",
  "assets": {
    "directory": "./dist",            // la carpeta que construye npm run build
    "not_found_handling": "404-page", // direcciones inexistentes: 404 con dist/404.html
    "html_handling": "auto-trailing-slash" // /sobre/ se sirve desde sobre/index.html
  }
}
```
Sin `not_found_handling`, el Worker responde un 404 **vacío**. Si en el panel el *Deploy command* tuviera otro valor (por ejemplo con `--assets`), vuelve a `npx wrangler deploy` para que use este archivo.

## 5. Conectar el dominio
Tu Worker > **Settings** > **Domains & Routes** > **Add** > **Custom Domain**:
1. `estudasimples.com.br` > **Add Custom Domain**.
2. Repite con `www.estudasimples.com.br`.
Cloudflare crea los registros DNS y el certificado HTTPS. No crees registros DNS a mano para estos nombres.

## 6. Redirigir www → sin www
La dirección oficial es **sin www** porque es la que usan el sitemap, las etiquetas `canonical` y los metadatos. Un Worker con Custom Domain solo recibe el nombre exacto, así que la redirección se hace con una regla del dominio:
1. Panel > tu dominio `estudasimples.com.br` > **Rules** > **Redirect Rules** > **Create rule** (plantilla "Redirect from WWW to root").
2. *When incoming requests match*: **Wildcard pattern** sobre *Request URL* = `https://www.*`
3. *Then*: **URL redirect**, *Target URL* = `https://${1}`, código `301`, **Preserve query string** activado > **Deploy**.

## 7. Forzar HTTPS
Panel > tu dominio > **SSL/TLS** > **Edge Certificates** > activar **Always Use HTTPS** (el modo de cifrado SSL/TLS no puede estar en *Off*). Así `http://` redirige a `https://`.

## 8. Cosas de Cloudflare que cambian el sitio (revisar)
- **Web Analytics.** Cloudflare puede inyectar solo un script de medición (`static.cloudflareinsights.com`) en cada página. Eso contradice la Política de Privacidade (que dice que no hay analítica ni scripts de terceros). Para quitarlo: **Analytics & Logs** > **Web Analytics** > tu sitio > **Manage site** > desactivar. Si prefieres conservarlo, hay que declararlo en la Política de Privacidade.
- **robots.txt administrado.** Cloudflare agrega al `robots.txt` reglas que bloquean a rastreadores de IA de entrenamiento (GPTBot, ClaudeBot, Google-Extended, etc.). No afecta a Google ni a Bing para el buscador. Para cambiarlo: **Security > Settings** > filtrar por *Bot traffic* > **Configure AI bot policies**, o el menú **AI Crawl Control**.

## 9. Actualizar el sitio
Edita, prueba con `npm run dev`, y sube:
```bash
git add -A
git commit -m "Describe el cambio en pocas palabras"
git push
```
Cloudflare construye y publica en 1–2 minutos (Worker > **Deployments** > *View build history*). Para volver atrás: Worker > **Deployments** > elige una versión anterior > **Rollback**.

## 10. Verificar después de publicar
Con el sitio publicado, estos comandos del proyecto comprueban todo (la dirección va en `BASE_URL`):
```bash
cd pruebas
npm install
BASE_URL=https://estudasimples.com.br node probar-contenido.mjs
BASE_URL=https://estudasimples.com.br node probar-sitio.mjs
BASE_URL=https://estudasimples.com.br node probar-archivos.mjs
```
Y a mano: `curl -I https://estudasimples.com.br`, `curl -I https://www.estudasimples.com.br` (debe dar 301 a la versión sin www), `curl -I http://estudasimples.com.br` (301 a https), `/sitemap.xml`, `/robots.txt` y una dirección inexistente (404 con la página del sitio).

## 11. Problemas comunes
- *El build falla*: abre el build fallido y lee el registro. Casi siempre es el nombre del Worker (debe ser `estudasimples`) o el comando (`npm run build`).
- *Cambias algo y no se ve*: ¿hiciste `git push`? ¿terminó el build? Prueba con Ctrl+F5.
- *Error 522 o el dominio no resuelve*: añade el dominio desde **Domains & Routes** del Worker, no con registros DNS manuales.
- *Un 404 vacío*: falta `not_found_handling` en `wrangler.jsonc` (ver paso 4).

## 12. Google Search Console
1. https://search.google.com/search-console > **Añadir propiedad** > tipo **Dominio** > `estudasimples.com.br`.
2. Google da un texto `google-site-verification=...`. En Cloudflare > DNS > Records > **Add record**: Tipo `TXT`, Nombre `@`, Contenido = ese texto. Vuelve a Search Console y **Verificar**.
3. **Sitemaps** > escribe `sitemap.xml` > **Enviar**.
4. **Inspección de URL**: pega `https://estudasimples.com.br/` y la del generador, y pulsa **Solicitar indexación**.
5. A los pocos días revisa **Páginas** y **Core Web Vitals**.
Nota: desde 2023 Google solo muestra los desplegables de preguntas frecuentes en el buscador a sitios muy conocidos de gobierno y salud. El dato estructurado FAQPage sigue siendo válido, pero no esperes verlo desplegado.

## 13. Correo contato@estudasimples.com.br (Cloudflare Email Routing)
Reenvía lo que llegue a `contato@estudasimples.com.br` a tu Gmail (gratis).
1. Panel > tu dominio > **Email** > **Email Routing** (en el menú nuevo: **Compute > Email Service > Email Routing**) > **Get started**. Acepta que añada los registros MX y SPF.
2. **Destination addresses**: agrega tu Gmail, abre el correo de confirmación y pulsa "Verify email address". Hasta entonces la regla no funciona.
3. **Routing rules** > **Create routing rule**: *Email pattern* = `contato`, *Action* = **Send to an email**, *Destination* = tu Gmail > **Save**.
4. Prueba desde **otra** cuenta de correo (y revisa spam).
Limitación: Email Routing solo **recibe**. Si respondes desde Gmail, sale tu dirección de Gmail y no `contato@`; se puede hacer que salga como `contato@` con "Enviar como" de Gmail, pero no es necesario para empezar.
