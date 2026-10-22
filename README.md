# Reto Saber

Demo local, ejecutable y editable de práctica gamificada para Saber 11, Saber Pro y Saber TyT. Las tres pruebas aparecen en la experiencia; el contenido ilustrativo está disponible únicamente para Saber 11.

## Alcance y estado

Esta implementación es un demo de alcance limitado, autorizado expresamente para esta entrega. **No inicia el desarrollo general, no aprueba un piloto y no cambia decisiones del equipo.** El proyecto sigue en planeación; `DECISIONES.md` no se modifica. Saber Pro y Saber TyT se muestran sin ruta disponible ni contenido inventado. Este repositorio no ofrece planes, pagos ni funciones premium.

Incluye cinco recorridos configurables, sesiones cortas de cuatro preguntas, explicación inmediata, XP, racha local, niveles progresivos, repaso espaciado, perfil local y liga semanal ilustrativa con apodos ficticios. Contiene 20 preguntas originales de ejemplo, no oficiales y pendientes de revisión curricular. No hay servidor, base de datos, sincronización, autenticación real, chat, red social ni beta. El inicio de sesión de demo solo recupera el perfil de este navegador por correo `.invalid`; no usa ni almacena contraseñas. No es un sistema seguro de cuentas.

El stack elegido para este prototipo es Vite, React y TypeScript por su flujo sencillo de desarrollo local y soporte de tipos. **Es una decisión técnica provisional de este demo, no una decisión del equipo ni una confirmación del stack del producto.**

## Empezar

Requiere Node.js 20 o posterior y npm.

```sh
npm install
npm run dev
```

Abre la dirección local que imprime Vite. Para validar el proyecto:

```sh
npm test
```

También están disponibles `npm run lint`, `npm run typecheck`, `npm run content:validate` y `npm run build`. El flujo de GitHub Actions ejecuta los cinco controles en cada pull request.

El demo persiste perfil y progreso en el almacenamiento local del navegador. Para empezar de nuevo, elimina los datos del sitio `localhost` en el navegador. No ingreses información real.

## Contenido editable

- `contenido/preguntas.json`: banco de preguntas.
- `contenido/catalogo.json`: pruebas y áreas visibles en la navegación.
- `contenido/PLANTILLA-PREGUNTA.md`: referencia de campos y revisión editorial.

Cada pregunta lleva ID, examen, área, competencia, nivel, enunciado, cuatro opciones, respuesta, explicación, autor, dos marcadores de revisión, estado `ejemplo-demo`, fuente, `original: true` y la etiqueta `Pregunta de práctica, no oficial`. Los revisores están marcados como pendientes, por lo que ninguna pregunta aparece como aprobada.

Para añadir o editar contenido sin cambiar la interfaz:

1. Duplica una pregunta en `contenido/preguntas.json`, asigna un ID único y adapta todos los campos a la plantilla. Escribe una pregunta nueva; no copies ni adaptes preguntas oficiales.
2. Para abrir un área o examen nuevo, añade su entrada a `contenido/catalogo.json` y agrega preguntas para ese mismo examen y área. El material solo debe marcarse disponible cuando exista contenido de práctica correspondiente; Saber Pro y Saber TyT permanecen no disponibles en este demo.
3. Ejecuta `npm run content:validate`. El validador revisa campos requeridos, originalidad declarada, cantidad de opciones, respuesta única, duplicados y el rango de 15–20 preguntas de ejemplo de este demo.
4. Mantén los estados de ejemplo y revisores pendientes hasta que personas responsables del contenido realicen sus revisiones. El validador no certifica exactitud ni alineación curricular.

El catálogo es el punto de edición para las áreas y exámenes; los componentes se alimentan de estos archivos de contenido. Un examen añadido sigue requiriendo material original revisado y una configuración coherente antes de presentarse como disponible.

## Privacidad y límites

El aviso **«Demo: no uses datos reales»** está visible en el formulario y durante el uso. Solo se solicitan apodo, grado o nivel y correo ficticio terminado en `.invalid`; el correo queda únicamente en el navegador. No se solicita ni guarda contraseña, documento de identidad, dirección, foto ni información de terceros. La liga y los demás participantes son ficticios y no permiten comunicarse.

Los ejercicios se identifican como **preguntas de práctica, no oficiales**. Reto Saber no presenta afiliación al ICFES, resultados oficiales ni pronósticos. El contenido es ilustrativo y aún requiere revisión humana antes de cualquier uso fuera del demo. No se han decidido el alcance curricular, el piloto, el stack definitivo ni la política de producción; esas preguntas siguen con el equipo.

La interfaz se comprobó en navegador para registro e inicio de sesión en retrato 360×780, 390×844, 768×1024 y 1024×1366; y en paisaje 780×360, 844×390, 1024×768 y 1366×1024. Se verificaron ambas navegaciones, los tamaños táctiles, ausencia de desbordamiento horizontal y flujos de lección y repaso.

## Organización del repositorio

- `PROYECTO.md`, `DECISIONES.md`, `TAREAS.md` e `IDEAS.md`: brief, decisiones humanas, pendientes y propuestas.
- `contenido/`: plantilla, catálogo y banco JSON del demo.
- `src/`: aplicación y lógica de práctica.
- `scripts/`: validación del banco de preguntas.
- `.github/workflows/demo-ci.yml`: verificaciones del pull request.
- `prototypes/`, `planning/`, `marketing/` y `docs/`: materiales existentes de referencia; no son una oferta ni decisiones del producto.
