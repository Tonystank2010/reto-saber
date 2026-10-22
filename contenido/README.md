# Edición de contenido del demo

Edita `preguntas.json` para crear preguntas originales de ejemplo. Sigue los campos descritos en `PLANTILLA-PREGUNTA.md`; cada objeto debe incluir examen, área, competencia, nivel, enunciado, cuatro opciones con IDs únicos, respuesta, explicación, autor, dos revisores, estado, fuente y `original: true`. Usa `estado: "ejemplo-demo"` y deja explícito que los revisores están pendientes hasta que se realice una revisión humana.

Cada pregunta mostrada se marca en la interfaz como **pregunta de práctica, no oficial**. No copies ni adaptes preguntas oficiales. El contenido actual es ilustrativo y no está aprobado curricularmente.

Edita `catalogo.json` para agregar áreas o exámenes sin tocar los componentes de la interfaz. Usa IDs de área que coincidan exactamente con el campo `area` de las preguntas. Antes de declarar disponible un examen, incorpora contenido original para las áreas correspondientes; la aplicación no fabrica contenido faltante.

El validador de este demo espera entre 15 y 20 preguntas ilustrativas. Comprueba campos obligatorios, IDs y enunciados duplicados, cuatro opciones, coincidencia con una única opción como respuesta correcta y estado de ejemplo. Ejecuta `npm run content:validate`. La validación automática no sustituye revisión factual, editorial, de accesibilidad ni curricular por dos personas.
