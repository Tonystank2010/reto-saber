# Reto Saber

Demo local, ejecutable y editable de práctica gamificada para Saber 11, Saber Pro y Saber TyT. Las tres pruebas aparecen en la experiencia; el contenido ilustrativo está disponible únicamente para Saber 11.

## Alcance y estado

Esta implementación es un demo de alcance limitado, autorizado expresamente para esta entrega. **No inicia el desarrollo general, no aprueba un piloto y no cambia decisiones del equipo.** El proyecto sigue en planeación. Saber Pro y Saber TyT se muestran sin ruta disponible ni contenido inventado. Este repositorio no ofrece planes, pagos ni funciones premium.

Incluye cinco áreas abiertas de Saber 11, cada una con tres niveles de dificultad creciente y lecciones de cinco preguntas; explicación inmediata, XP, racha local, repaso espaciado, perfil local y liga semanal ilustrativa con apodos ficticios. Al crear el perfil se puede realizar una orientación inicial opcional de cinco preguntas por área; las sugerencias se calculan por área, se pueden repetir y no bloquean ningún nivel. El resultado es ilustrativo, no oficial, no predictivo y no depende del grado. El banco contiene 75 preguntas originales de ejemplo (cinco por cada combinación de área y nivel), no oficiales y pendientes de revisión curricular.

Se acepta un correo sintácticamente válido. Se guarda localmente en el navegador, no se transmite a un servidor ni se cifra; la interfaz advierte que el demo no es una cuenta segura y permite eliminar el perfil y progreso local. No se usa ni almacena contraseña. No hay servidor, base de datos, sincronización, autenticación real, chat, red social ni beta.

El stack elegido para este prototipo es Vite, React y TypeScript por su flujo sencillo de desarrollo local y soporte de tipos. **Es una decisión técnica provisional de este demo, no una decisión del equipo ni una confirmación del stack del producto.**

## Empezar

Requiere Node.js 22.12 o posterior (el runner usa la versión 24 indicada en `.nvmrc`) y npm.

```sh
npm ci
npm run dev
```

Abre la dirección local que imprime Vite. Para comprobar el proyecto antes de un cambio:

```sh
npm run lint
npm run typecheck
npm test
npm run content:validate
npm run build
```

El flujo de GitHub Actions instala desde el lockfile (`npm ci`) y ejecuta los cinco controles en cada pull request. Mantén `package-lock.json` junto con `package.json`; si cambian dependencias, ejecuta `npm install` y confirma ambos archivos.

El demo persiste perfil y progreso en el almacenamiento local del navegador. Al cargar, valida su estructura, recupera de forma explícita un archivo local dañado y limpia referencias a preguntas/áreas/niveles retirados. Si el navegador bloquea el almacenamiento o no puede guardar, muestra un aviso y conserva los cambios solo en memoria durante esa sesión. Usa el control de eliminación del perfil o elimina los datos del sitio `localhost` para empezar de nuevo. Aunque se permite ingresar cualquier correo, por seguridad de datos personales se recomienda usar uno ficticio en este demo.

## Despliegue del demo adjunto en Vercel

`web/index.html` contiene una versión HTML estática e independiente del demo adjunto. Para desplegar esa página, importa este repositorio en Vercel y configura **Root Directory** como `web`, **Framework Preset** como `Other` y deja vacíos los comandos de build e instalación y el directorio de salida. Vercel servirá ese archivo en `/` sin dependencias ni compilación. Mantener `web/` como raíz evita publicar accidentalmente documentos y materiales del resto del repositorio. La app Vite principal está en la raíz y es distinta de esta página estática. Las actualizaciones de la rama conectada activarán nuevos despliegues.

El registro y progreso del HTML adjunto usan almacenamiento local del navegador; no son autenticación ni una cuenta sincronizada. No introduzcas datos personales reales.

## Contenido editable

- `contenido/preguntas.json` y `contenido/preguntas-niveles.json`: banco de preguntas.
- `contenido/catalogo.json`: pruebas, áreas y niveles visibles en la navegación.
- `contenido/PLANTILLA-PREGUNTA.md`: referencia de campos y revisión editorial.

Cada pregunta lleva ID, examen, área, competencia, nivel, enunciado, cuatro opciones, respuesta, explicación, autor, dos marcadores de revisión, estado `ejemplo-demo`, fuente, `original: true` y la etiqueta `Pregunta de práctica, no oficial`. Los revisores están marcados como pendientes, por lo que ninguna pregunta aparece como aprobada.

Para añadir o editar contenido sin cambiar la interfaz:

1. Duplica una pregunta del archivo correspondiente, asigna un ID único y adapta todos los campos a la plantilla. Escribe contenido nuevo; no copies ni adaptes preguntas oficiales.
2. Conserva cinco preguntas por área y dificultad (`Básico`, `Intermedio`, `Avanzado`) para que cada lección tenga cinco ítems y la orientación inicial pueda seleccionar una mezcla de niveles. `preguntas-niveles.json` contiene el material de las rutas nuevas; valida ambos archivos en conjunto.
3. Para editar exámenes o áreas, actualiza `contenido/catalogo.json`. En esta demo, Saber Pro y Saber TyT permanecen no disponibles; añadirlos requiere contenido original y revisión adecuada antes de habilitarlos.
4. Ejecuta `npm run content:validate`. El validador revisa catálogo, niveles, cobertura de cinco preguntas por área y dificultad, campos requeridos, originalidad declarada, etiqueta de práctica no oficial, opciones, respuesta única y duplicados. Los errores de estructura se informan claramente.
5. Mantén los estados de ejemplo y revisores pendientes hasta que personas responsables del contenido realicen sus revisiones. El validador no certifica exactitud ni alineación curricular.

El catálogo es el punto de edición para las áreas y exámenes; los componentes se alimentan de estos archivos de contenido. Un examen añadido sigue requiriendo material original revisado y una configuración coherente antes de presentarse como disponible.

## Privacidad y límites

El aviso **«Demo: evita ingresar datos reales sensibles»** está visible en el formulario y durante el uso. Se solicitan apodo, grado o nivel y un correo sintácticamente válido. Se permite usar el correo que prefieras, pero este queda en texto legible en el almacenamiento local y no se envía; no ingreses información sensible ni un correo que no quieras dejar en este navegador. El perfil no es seguro y se puede borrar desde la pantalla de perfil. No se solicita ni guarda contraseña, documento de identidad, dirección, foto ni información de terceros. La liga y los demás participantes son ficticios y no permiten comunicarse.

Los ejercicios se identifican como **preguntas de práctica, no oficiales**. Reto Saber no presenta afiliación al ICFES, resultados oficiales ni pronósticos. El contenido es ilustrativo y aún requiere revisión humana antes de cualquier uso fuera del demo. No se han decidido el alcance curricular, el piloto, el stack definitivo ni la política de producción; esas preguntas siguen con el equipo.

## Organización del repositorio

- `PROYECTO.md`, `DECISIONES.md`, `TAREAS.md` e `IDEAS.md`: brief, decisiones humanas, pendientes y propuestas.
- `contenido/`: plantilla, catálogo y banco JSON del demo.
- `src/`: aplicación y lógica de práctica.
- `scripts/`: validación del banco de preguntas.
- `.github/workflows/demo-ci.yml`: verificaciones del pull request.
- `planning/`, `marketing/` y `docs/`: materiales de referencia. Los prototipos históricos de `prototypes/` fueron retirados a petición del usuario.
