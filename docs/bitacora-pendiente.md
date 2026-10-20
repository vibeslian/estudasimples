# Bitácora pendiente (Notion no estaba conectado)

Entradas que deben pasar a la Bitácora de Notion (Cerebro REONDIAL → Bitácora, EstudaSimples) cuando el conector vuelva. Después de pasarlas, borrar este archivo.

## 2026-10-19 · Etapa 15: página /anuncie/ escondida + cartón "Parceiro recomendado" (sin publicar, a la espera de revisar capturas)
- Commit aparte `6db4aa3`: línea rota en `components.css` (`@media (min-width: 640px) { @media (min-width: 960px) {` sin cerrar, desde la Etapa 10). Dejaba sin estilo, por debajo de 960 px, el modelo de sumário de `/gerador-de-sumario-abnt/` y de 2 guías. Se quitó la línea. Capturas antes/después: `capturas/css-sumario/`. Script: `pruebas/capturas-css-sumario.mjs`.
- Nuevo: `build-anuncie.mjs`, `src/anuncie/index.html`, `src/assets/css/anuncie.css`, bloque `anuncie` en `site.config.json`, `.parceiro` en `components.css`, marca `{{ANUNCIE_LINK_RODAPE}}` en `partials/footer.html`, `build.mjs` (sitemap sin /anuncie/ si `ativo:false`), `build-guias.mjs` (cartón en "Guias relacionadas"), `indexnow.mjs` (no avisa /anuncie/ apagada). Doc: `docs/anuncie.md`.
- Apagada = noindex + fuera del sitemap + 0 enlaces; las otras 96 páginas/archivos quedan idénticos byte a byte (`BASE_REF=6db4aa3 node probar-anuncie.mjs`, desde `pruebas/`).
- Pruebas: `probar-anuncie` 107/107, `probar-sitio`, `contenido`, `guias`, `conexiones`, `servico`, `fuentes-cls` (CLS máx. 0.0052) todas OK.
- Los números del sitio están en `null` a propósito: el build se niega a encender la página sin números reales. Las capturas usan números de EJEMPLO.
