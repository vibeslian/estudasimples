# Estuda Simples

Ferramentas gratuitas para trabalhos acadêmicos (**gerador de capa**, **de folha de rosto** y **de sumário ABNT**) y un servicio pago de formatación de TCC atendido por WhatsApp. Sitio estático: HTML, CSS y JavaScript, sin servidor ni base de datos. Todo funciona en el navegador del estudiante.

- Sitio: https://estudasimples.com.br

## Cómo trabajar en el proyecto
Necesitas [Node.js](https://nodejs.org) (versión 22; el archivo `.node-version` la indica).

| Quiero... | Comando |
|---|---|
| Ver el sitio en mi computador | `npm run dev` y abrir http://localhost:3000 |
| Generar la versión final (carpeta `dist/`) | `npm run build` |

El nombre del sitio, el dominio, el correo y los datos del servicio de formatación (número de WhatsApp, mensaje, plazo y precios) se cambian en un solo lugar: `site.config.json`.

## Estructura
```
src/                      ← el sitio (una carpeta por página/herramienta)
  gerador-de-capa-abnt/   ← página de la capa (HTML y texto explicativo)
  gerador-de-folha-de-rosto-abnt/ ← página de la folha de rosto
  gerador-de-sumario-abnt/ ← página del sumário (lista de ítems, estilos por nivel)
  formatacao-abnt-tcc/    ← página del servicio pago (WhatsApp, precios, FAQ); ver docs/servico-formatacao.md
  assets/                 ← estilos, fuentes y librerías (jsPDF y docx, alojadas aquí)
    js/abnt/              ← el código de las tres herramientas (modelo, layout, sumario, exporta, estado, ferramenta)
    css/ferramenta.css    ← estilos del formulario y de la vista previa
  partials/               ← cabecera, pie y bloques compartidos
conteudo/faq-*.json       ← preguntas frecuentes de cada herramienta (de aquí salen el texto y los datos para Google)
site.config.json          ← nombre, dominio, correo, servicio de formatación (WhatsApp, plazo, precios), "Monte seu TCC" (pasos) y espacios de anuncio / ofertas propias
build.mjs                 ← arma la carpeta dist/ (lo que se publica)
build-conexoes.mjs       ← arma el indicador, las ofertas y los mensajes de origen (los pide build.mjs)
docs/                     ← notas: norma ABNT, diseño, exportación, anuncios, contenido, publicación
wrangler.jsonc            ← configuración del Worker de Cloudflare (404, carpeta dist)
pruebas/                  ← pruebas automáticas (no se publican)
```

## Publicación
El sitio se publica con Cloudflare (Workers con archivos estáticos). Cada vez que subes un cambio a la rama `main` de GitHub, Cloudflare construye y publica solo:
- Comando de build: `npm run build` (genera la carpeta `dist/`)
- Comando de deploy: `npx wrangler deploy` (usa `wrangler.jsonc`)
- Nombre del Worker: `estudasimples` (debe coincidir con `wrangler.jsonc`)

Guía completa (GitHub, Cloudflare, dominio, www, HTTPS, Search Console y correo): `docs/publicar.md`.
