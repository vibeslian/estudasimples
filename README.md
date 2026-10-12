# Estuda Simples

Ferramentas gratuitas para trabalhos acadêmicos (primeira ferramenta: **gerador de capa ABNT**). Sitio estático: HTML, CSS y JavaScript, sin servidor ni base de datos. Todo funciona en el navegador del estudiante.

- Sitio: https://estudasimples.com.br

## Cómo trabajar en el proyecto
Necesitas [Node.js](https://nodejs.org) (versión 22; el archivo `.node-version` la indica).

| Quiero... | Comando |
|---|---|
| Ver el sitio en mi computador | `npm run dev` y abrir http://localhost:3000 |
| Generar la versión final (carpeta `dist/`) | `npm run build` |

El nombre del sitio, el dominio y el correo se cambian en un solo lugar: `site.config.json`.

## Estructura
```
src/                      ← el sitio (una carpeta por página/herramienta)
  gerador-de-capa-abnt/   ← la herramienta de capa (formulario, vista previa, PDF y Word)
  assets/                 ← estilos, fuentes y librerías (jsPDF y docx, alojadas aquí)
  partials/               ← cabecera, pie y bloques compartidos
conteudo/faq-capa.json    ← preguntas frecuentes (de aquí salen el texto y los datos para Google)
site.config.json          ← nombre, dominio y correo
build.mjs                 ← arma la carpeta dist/ (lo que se publica)
docs/                     ← notas: norma ABNT, diseño, exportación, anuncios, contenido, publicación
```

## Publicación
Cloudflare Pages construye el sitio automáticamente con cada cambio subido a la rama `main`:
- Comando de build: `npm run build`
- Carpeta de salida: `dist`
- Variable: `NODE_VERSION` = `22`

Guía completa en `docs/publicar.md`.
