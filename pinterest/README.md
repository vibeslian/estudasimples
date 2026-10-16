# Pinterest (Etapa 13)

Aquí está todo lo necesario para publicar los pines de Estuda Simples. Detalles y pasos en `docs/pinterest.md`.

| Archivo | Para qué sirve |
|---|---|
| `pines.json` | La lista de los 20 pines: de qué guía sale el dibujo, título de la imagen, cápsulas, título y descripción del pin, palabras clave, tablero y enlace. Es la única fuente: de aquí salen las imágenes y el CSV. |
| `gerar-pines.mjs` | Dibuja las 20 imágenes (PNG 1000x1500) con Chrome sin ventana y las deja en `src/pins/`. |
| `gerar-csv.mjs` | Crea `pines.csv` con las columnas de la carga en masa de Pinterest y reparte los pines en 2–3 por día. |
| `pines.csv` | El archivo que se sube a Pinterest (Bulk create Pins). |
