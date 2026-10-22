const requiredText = ['id', 'examen', 'area', 'competencia', 'nivel', 'enunciado', 'explicacion', 'autor', 'estado', 'fuente', 'marcaContenido'];

export function validateContent(questions, catalog) {
  const errors = [];
  if (!catalog || !Array.isArray(catalog.examenes) || !Array.isArray(catalog.areas)) {
    return ['El catálogo debe contener listas de exámenes y áreas.'];
  }
  if (!Array.isArray(questions)) return ['El archivo debe contener una lista de preguntas.'];
  const ids = new Set();
  const prompts = new Set();
  const examIds = new Set(catalog.examenes.map((exam) => exam.id));
  const areaIds = new Set(catalog.areas.map((area) => `${area.examen}\u0000${area.id}`));

  if (new Set(catalog.examenes.map((exam) => exam.id)).size !== catalog.examenes.length) {
    errors.push('El catálogo tiene identificadores de examen duplicados.');
  }
  if (new Set(catalog.areas.map((area) => `${area.examen}\u0000${area.id}`)).size !== catalog.areas.length) {
    errors.push('El catálogo tiene áreas duplicadas para un examen.');
  }
  for (const [index, exam] of catalog.examenes.entries()) {
    if (typeof exam.id !== 'string' || !exam.id.trim() || typeof exam.nota !== 'string' || typeof exam.disponible !== 'boolean') {
      errors.push(`Examen ${index + 1}: se requieren ID, nota y estado disponible.`);
    }
  }
  for (const [index, area] of catalog.areas.entries()) {
    if (
      typeof area.examen !== 'string' || !examIds.has(area.examen) ||
      typeof area.id !== 'string' || !area.id.trim() ||
      typeof area.marca !== 'string' || !area.marca.trim() ||
      typeof area.tono !== 'string' || !area.tono.trim() ||
      typeof area.descripcion !== 'string' || !area.descripcion.trim()
    ) {
      errors.push(`Área ${index + 1}: faltan campos de catálogo válidos o el examen no existe.`);
    }
  }

  for (const [index, question] of questions.entries()) {
    const row = index + 1;
    for (const field of requiredText) {
      if (typeof question[field] !== 'string' || !question[field].trim()) {
        errors.push(`Pregunta ${row}: falta el campo obligatorio "${field}".`);
      }
    }
    if (question.original !== true) errors.push(`Pregunta ${row}: debe declarar original: true.`);
    if (question.marcaContenido !== 'Pregunta de práctica, no oficial') {
      errors.push(`Pregunta ${row}: debe identificarse como pregunta de práctica, no oficial.`);
    }
    if (question.estado !== 'ejemplo-demo') errors.push(`Pregunta ${row}: el estado debe conservarse como "ejemplo-demo".`);
    if (!examIds.has(question.examen)) errors.push(`Pregunta ${row}: examen "${question.examen}" no declarado en el catálogo.`);
    if (!areaIds.has(`${question.examen}\u0000${question.area}`)) {
      errors.push(`Pregunta ${row}: el área "${question.area}" no está declarada para ${question.examen}.`);
    }
    if (!Array.isArray(question.opciones) || question.opciones.length !== 4) {
      errors.push(`Pregunta ${row}: se requieren exactamente cuatro opciones.`);
    } else {
      const optionIds = question.opciones.map((option) => option.id);
      if (new Set(optionIds).size !== optionIds.length) errors.push(`Pregunta ${row}: hay identificadores de opción duplicados.`);
      if (question.opciones.some((option) => typeof option.texto !== 'string' || !option.texto.trim())) {
        errors.push(`Pregunta ${row}: cada opción debe tener texto.`);
      }
      if (optionIds.filter((optionId) => optionId === question.respuesta).length !== 1) {
        errors.push(`Pregunta ${row}: la respuesta debe coincidir con una única opción.`);
      }
    }
    if (!Array.isArray(question.revisores) || question.revisores.length !== 2 || question.revisores.some((reviewer) => typeof reviewer !== 'string' || !reviewer.trim())) {
      errors.push(`Pregunta ${row}: se requieren dos revisores identificados (se permiten marcadores pendientes).`);
    }
    if (ids.has(question.id)) errors.push(`Pregunta ${row}: ID duplicado "${question.id}".`);
    ids.add(question.id);
    const normalizedPrompt = question.enunciado?.trim().toLocaleLowerCase('es');
    if (normalizedPrompt && prompts.has(normalizedPrompt)) errors.push(`Pregunta ${row}: enunciado duplicado.`);
    if (normalizedPrompt) prompts.add(normalizedPrompt);
  }

  for (const exam of catalog.examenes) {
    if (exam.disponible) {
      const examAreas = catalog.areas.filter((area) => area.examen === exam.id);
      if (!examAreas.length) errors.push(`El examen disponible "${exam.id}" no tiene áreas declaradas.`);
      for (const area of examAreas) {
        if (!questions.some((question) => question.examen === exam.id && question.area === area.id)) {
          errors.push(`El área disponible "${area.id}" de ${exam.id} no tiene preguntas.`);
        }
      }
    }
  }
  if (questions.length < 15 || questions.length > 20) {
    errors.push(`Se requieren entre 15 y 20 preguntas de ejemplo; se encontraron ${questions.length}.`);
  }

  return errors;
}
