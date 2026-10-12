# Publicar el sitio: GitHub + Cloudflare Pages

Idea general: tu proyecto vive en tu computador. **GitHub** guarda una copia de seguridad (privada) y **Cloudflare Pages** lo publica. Cada vez que subes un cambio a GitHub, Cloudflare vuelve a construir y publicar el sitio solo.

```
tu computador  --(git push)-->  GitHub (copia privada)  --(automático)-->  Cloudflare Pages  -->  estudasimples.com.br
```

## 1. Git
Ya está instalado (se comprueba con `git --version`). Si algún día usas otro computador: https://git-scm.com/download/win (instalar con las opciones por defecto).

Git guarda cada cambio con tu nombre. En este proyecto ya está configurado (solo para este proyecto):
```bash
git config user.name "Lian Martínez"
git config user.email "lianmarcosmartinez@gmail.com"
```
Ese correo queda visible en el historial del repositorio. Mientras sea privado no importa. Si algún día lo haces público, en GitHub > Settings > Emails puedes activar "Keep my email addresses private" y usar el correo `noreply` que te dan.

## 2. Primer commit (guardar la versión actual)
Un *commit* es una foto del proyecto en un momento dado.
```bash
git add -A
git commit -m "Primera versión del sitio"
```
(`.gitignore` evita que entren `node_modules`, `dist`, `capturas`, `pruebas` y la guía de estilo.)

## 3. Crear el repositorio en GitHub
1. Entra a https://github.com (si no tienes cuenta: Sign up).
2. Arriba a la derecha: **+** > **New repository**.
3. *Repository name*: `estudasimples`.
4. Elige **Private**.
5. **No marques** "Add a README", ".gitignore" ni "license" (el repositorio debe nacer vacío).
6. **Create repository**. GitHub te muestra una dirección como `https://github.com/TU-USUARIO/estudasimples.git`.

## 4. Subir el proyecto
En la carpeta del proyecto:
```bash
git remote add origin https://github.com/TU-USUARIO/estudasimples.git
git push -u origin main
```
La primera vez se abre una ventana del navegador para que inicies sesión en GitHub y autorices a Git. Después, ya no pide nada. Cuando termine, actualiza la página del repositorio en GitHub: verás los archivos.

## 5. Conectar Cloudflare Pages
1. https://dash.cloudflare.com > **Workers & Pages**.
2. **Create application** > pestaña **Pages** > **Import an existing Git repository** (si ves un enlace del tipo "Looking to deploy Pages? Get started", usa ese).
3. **Connect GitHub**, autoriza a Cloudflare y elige solo el repositorio `estudasimples`.
4. **Begin setup** y completa:

| Campo | Valor |
|---|---|
| Project name | `estudasimples` (da la dirección provisoria `estudasimples.pages.dev`) |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (vacío) |
| Variables de entorno (opcional) | `NODE_VERSION` = `22` (el archivo `.node-version` ya lo indica) |

5. **Save and Deploy**. En 1–2 minutos aparece "Success" y puedes abrir `https://estudasimples.pages.dev`.

## 6. Conectar el dominio
Tu dominio ya está en Cloudflare, así que es automático.
1. En el proyecto: **Custom domains** > **Set up a domain**.
2. Escribe `estudasimples.com.br` > **Continue** > confirma. Cloudflare crea el registro DNS y el certificado HTTPS.
3. Repite con `www.estudasimples.com.br`.
4. Espera unos minutos hasta que ambos digan "Active".

## 7. Redirigir www → sin www (recomendado)
Elegimos **sin www** (`https://estudasimples.com.br`) como dirección oficial porque ya es la que usan el sitemap, las etiquetas `canonical` y los metadatos. Quien escriba `www.` termina en la versión sin www.
1. Dashboard > tu dominio `estudasimples.com.br` > **Rules** > **Redirect Rules** > **Create rule** (o la plantilla "Redirect from WWW to root").
2. *When incoming requests match*: **Wildcard pattern**, *Request URL* = `https://www.*`
3. *Then*: **URL redirect**, *Target URL* = `https://${1}`, *Status code* = `301`, y marca **Preserve query string**.
4. **Deploy**.
5. En **SSL/TLS > Edge Certificates**, activa **Always Use HTTPS**.

## 8. Cómo actualizar el sitio después
Edita lo que quieras en tu computador, pruébalo con `npm run dev` y sube:
```bash
git add -A
git commit -m "Describe el cambio en pocas palabras"
git push
```
Cloudflare publica solo. Cada commit queda guardado: se puede volver atrás.

## 9. Problemas comunes
- *El build falla en Cloudflare*: abre el despliegue fallido y lee el registro. Casi siempre es el comando o la carpeta de salida (`npm run build` y `dist`).
- *La página cambia en tu computador pero no en internet*: ¿hiciste `git push`? ¿terminó el despliegue en Cloudflare?
- *Error 522 o "no resuelve" en el dominio*: no crees registros DNS a mano para el dominio de Pages; hay que añadirlo desde **Custom domains**.
- *Quieres volver a la versión anterior*: en Cloudflare > Deployments > elige un despliegue anterior > **Rollback**.

## 10. Google Search Console
1. https://search.google.com/search-console > **Añadir propiedad** > tipo **Dominio** > `estudasimples.com.br`.
2. Google te da un texto `google-site-verification=...`. En Cloudflare > DNS > Records > **Add record**: Tipo `TXT`, Nombre `@`, Contenido = ese texto. Vuelve a Search Console y **Verificar** (puede tardar unos minutos).
3. **Sitemaps** > escribe `sitemap.xml` > **Enviar**.
4. **Inspección de URL**: pega `https://estudasimples.com.br/` y la del generador, y pulsa **Solicitar indexación**.
5. A los pocos días revisa **Páginas** (qué está indexado) y **Experiencia > Core Web Vitals**.
Nota: desde 2023 Google solo muestra los desplegables de preguntas frecuentes en el buscador a sitios muy conocidos de gobierno y salud. El dato estructurado FAQPage sigue siendo válido y ayuda a entender la página, pero no esperes ver las preguntas desplegadas en Google.

## 11. Correo contato@estudasimples.com.br con Cloudflare Email Routing
Hace que lo que llegue a `contato@estudasimples.com.br` se reenvíe a tu Gmail (gratis).
1. Dashboard > tu dominio > **Email** > **Email Routing** (en el menú nuevo: **Compute > Email Service > Email Routing**) > **Get started / Enable**.
2. Cloudflare te propone añadir registros **MX** y **SPF** al DNS: acepta.
3. **Destination addresses**: añade tu Gmail. Te llega un correo con un enlace "Verify email address": ábrelo y confirma. Hasta entonces la regla no funciona.
4. **Routing rules** > **Create routing rule**: *Email pattern* = `contato`, *Action* = **Send to an email**, *Destination* = tu Gmail > **Save**.
5. Prueba: desde **otra** cuenta de correo, escribe a `contato@estudasimples.com.br` y revisa Gmail (y la carpeta spam).
Limitación: Email Routing solo **recibe**. Si respondes desde Gmail, la respuesta sale con tu dirección de Gmail, no con `contato@`. Se puede hacer que salga como `contato@` con la opción "Enviar como" de Gmail, pero requiere más configuración y no es necesario para empezar.
