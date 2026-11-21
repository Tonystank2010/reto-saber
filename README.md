# Reto Saber

Proyecto de la Empresa 5.: experiencias de práctica con preguntas originales y retos breves para estudiantes que se preparan para Saber 11, Saber Pro y Saber TyT.

## Estado

Estamos en **planeación e ideación**. El demo web actual es un prototipo local; no es todavía un servicio publicado. El inicio de sesión y almacenamiento son simulados. No presentar puntajes como predicciones oficiales.

Las tres pruebas forman parte de la planeación, pero todavía no se ha decidido si se desarrollarán o lanzarán juntas ni cuál será la prioridad del piloto. A solicitud del usuario, el demo HTML adjunto se conserva en `web/index.html` para verlo en Vercel; esto no autoriza el desarrollo del producto, infraestructura ni un piloto.

## Estructura

- `PROYECTO.md`: brief, límites y alcance por acordar.
- `DECISIONES.md`: decisiones confirmadas por el equipo.
- `TAREAS.md`: registro de tareas y estado.
- `IDEAS.md`: propuestas pendientes de discusión y aprobación.
- `.github/copilot-instructions.md`: criterios de colaboración para cambios futuros.
- `web/index.html`: demo descargable adjunto, aislado como raíz de despliegue estático en Vercel.
- `contenido/PLANTILLA-PREGUNTA.md`: ficha de trabajo para redactar y revisar preguntas originales.
- `planning/business/`: plan de negocio, guía interna y hojas de trabajo.
- `marketing/drafts/`: textos e imágenes publicitarias de borrador, no aprobados para publicación.
- `docs/`: notas de lectura y orientación del paquete.

## Uso y cuidado de materiales

Las preguntas de práctica deben ser originales. Los documentos oficiales adjuntos se excluyeron de este repositorio: pueden servir para consulta, pero deben respetarse sus derechos y condiciones de uso. No copiar ni vender preguntas oficiales.

Los planes y precios visibles en piezas publicitarias de borrador no son una oferta vigente. No desarrollar cobros, promoción de planes ni funciones premium sin autorización expresa de la persona responsable del proyecto.

El repositorio es privado. Aun así, no agregar contraseñas, tokens, documentos de identidad, datos reales de estudiantes ni información sensible. Para las pruebas usar datos ficticios; cualquier piloto con menores requiere revisar privacidad y autorización apropiadas.

Abre `web/index.html` en un navegador moderno para probar el demo. No uses datos reales ni interpretes el prototipo como un sistema seguro de cuentas.

## Demo desplegable en Vercel

`web/index.html` contiene el demo adjunto como página estática independiente. Para conectarlo mediante Git, importa este repositorio en Vercel y configura **Root Directory** como `web`, **Framework Preset** como `Other` y deja vacíos los comandos de build e instalación y el directorio de salida. Vercel servirá `web/index.html` en `/` sin dependencias ni proceso de compilación. Mantener `web/` como raíz evita publicar accidentalmente documentos y materiales del resto del repositorio. Las actualizaciones de la rama conectada activarán nuevos despliegues. El registro y el progreso usan almacenamiento local del navegador; no son autenticación ni una cuenta sincronizada. No introduzcas datos personales reales.
