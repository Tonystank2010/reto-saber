const requiredText = ['id', 'examen', 'area', 'competencia', 'nivel', 'enunciado', 'explicacion', 'autor', 'estado', 'fuente', 'marcaContenido'];

export function validateContent(questions, catalog) {
  const errors = [];
  const expectedDifficulties = ['Básico', 'Intermedio', 'Avanzado'];
  if (!catalog || !Array.isArray(catalog.examenes) || !Array.isArray(catalog.areas) || !Array.isArray(catalog.niveles)) {
    return ['El catálogo debe contener listas de exámenes, áreas y niveles.'];
  }
  if (!Array.isArray(questions)) return ['El archivo debe contener una lista de preguntas.'];
  const exams = catalog.examenes.filter(isRecord);
  const areas = catalog.areas.filter(isRecord);
  const levels = catalog.niveles.filter(isRecord);
  const ids = new Set();
  const prompts = new Set();
  const examIds = new Set(exams.map((exam) => exam.id));
  const areaIds = new Set(areas.map((area) => `${area.examen}\u0000${area.id}`));

  if (exams.length !== catalog.examenes.length) errors.push('El catálogo contiene un examen sin formato de objeto.');
  if (areas.length !== catalog.areas.length) errors.push('El catálogo contiene un área sin formato de objeto.');
  if (levels.length !== catalog.niveles.length) errors.push('El catálogo contiene un nivel sin formato de objeto.');
  if (new Set(exams.map((exam) => exam.id)).size !== exams.length) {
    errors.push('El catálogo tiene identificadores de examen duplicados.');
  }
  if (new Set(areas.map((area) => `${area.examen}\u0000${area.id}`)).size !== areas.length) {
    errors.push('El catálogo tiene áreas duplicadas para un examen.');
  }
  for (const [index, exam] of exams.entries()) {
    if (typeof exam.id !== 'string' || !exam.id.trim() || typeof exam.nota !== 'string' || typeof exam.disponible !== 'boolean') {
      errors.push(`Examen ${index + 1}: se requieren ID, nota y estado disponible.`);
    }
  }
  for (const [index, area] of areas.entries()) {
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
  if (
    levels.length !== expectedDifficulties.length ||
    expectedDifficulties.some((difficulty) => !levels.some((level) => level.dificultad === difficulty)) ||
    levels.some((level) => (
      typeof level.id !== 'string' || !level.id.trim() ||
      typeof level.nombre !== 'string' || !level.nombre.trim() ||
      typeof level.descripcion !== 'string' || !level.descripcion.trim() ||
      !expectedDifficulties.includes(level.dificultad)
    ))
  ) {
    errors.push('El catálogo debe definir los tres niveles: Básico, Intermedio y Avanzado.');
  }
  if (new Set(levels.map((level) => level.id)).size !== levels.length) {
    errors.push('El catálogo tiene identificadores de nivel duplicados.');
  }

  for (const [index, question] of questions.entries()) {
    const row = index + 1;
    if (!isRecord(question)) {
      errors.push(`Pregunta ${row}: debe ser un objeto JSON.`);
      continue;
    }
    for (const field of requiredText) {
      if (typeof question[field] !== 'string' || !question[field].trim()) {
        errors.push(`Pregunta ${row}: falta el campo obligatorio "${field}".`);
      }
    }
    if (question.original !== true) errors.push(`Pregunta ${row}: debe declarar original: true.`);
    if (question.marcaContenido !== 'Pregunta de práctica, no oficial') {
      errors.push(`Pregunta ${row}: debe identificarse como pregunta de práctica, no oficial.`);
    }
    if (!expectedDifficulties.includes(question.nivel)) {
      errors.push(`Pregunta ${row}: el nivel debe corresponder a Básico, Intermedio o Avanzado.`);
    }
    if (question.estado !== 'ejemplo-demo') errors.push(`Pregunta ${row}: el estado debe conservarse como "ejemplo-demo".`);
    if (!examIds.has(question.examen)) errors.push(`Pregunta ${row}: examen "${question.examen}" no declarado en el catálogo.`);
    if (!areaIds.has(`${question.examen}\u0000${question.area}`)) {
      errors.push(`Pregunta ${row}: el área "${question.area}" no está declarada para ${question.examen}.`);
    }
    if (!Array.isArray(question.opciones) || question.opciones.length !== 4) {
      errors.push(`Pregunta ${row}: se requieren exactamente cuatro opciones.`);
    } else {
      const options = question.opciones.filter(isRecord);
      if (options.length !== question.opciones.length) errors.push(`Pregunta ${row}: cada opción debe ser un objeto.`);
      const optionIds = options.map((option) => option.id);
      if (new Set(optionIds).size !== optionIds.length) errors.push(`Pregunta ${row}: hay identificadores de opción duplicados.`);
      if (options.some((option) => typeof option.id !== 'string' || !option.id.trim() || typeof option.texto !== 'string' || !option.texto.trim())) {
        errors.push(`Pregunta ${row}: cada opción debe tener texto.`);
      }
      if (optionIds.filter((optionId) => optionId === question.respuesta).length !== 1) {
        errors.push(`Pregunta ${row}: la respuesta debe coincidir con una única opción.`);
      }
    }
    if (!Array.isArray(question.revisores) || question.revisores.length !== 2 || question.revisores.some((reviewer) => typeof reviewer !== 'string' || !reviewer.trim())) {
      errors.push(`Pregunta ${row}: se requieren dos revisores identificados (se permiten marcadores pendientes).`);
    }
    if (typeof question.id === 'string') {
      if (ids.has(question.id)) errors.push(`Pregunta ${row}: ID duplicado "${question.id}".`);
      ids.add(question.id);
    }
    const normalizedPrompt = typeof question.enunciado === 'string'
      ? question.enunciado.trim().toLocaleLowerCase('es')
      : '';
    if (normalizedPrompt && prompts.has(normalizedPrompt)) errors.push(`Pregunta ${row}: enunciado duplicado.`);
    if (normalizedPrompt) prompts.add(normalizedPrompt);
  }

  for (const exam of exams) {
    if (exam.disponible) {
      const examAreas = areas.filter((area) => area.examen === exam.id);
      if (!examAreas.length) errors.push(`El examen disponible "${exam.id}" no tiene áreas declaradas.`);
      for (const area of examAreas) {
        if (!questions.some((question) => isRecord(question) && question.examen === exam.id && question.area === area.id)) {
          errors.push(`El área disponible "${area.id}" de ${exam.id} no tiene preguntas.`);
        }
      }
    }
  }
  for (const area of areas.filter((item) => item.examen === 'Saber 11')) {
    for (const difficulty of expectedDifficulties) {
      const count = questions.filter((question) => (
        isRecord(question) &&
        question.examen === area.examen &&
        question.area === area.id &&
        question.nivel === difficulty
      )).length;
      if (count !== 5) {
        errors.push(`El área "${area.id}" debe tener exactamente cinco preguntas de nivel ${difficulty}; se encontraron ${count}.`);
      }
    }
  }
  if (questions.length !== 75) {
    errors.push(`El banco ilustrativo debe incluir 75 preguntas de Saber 11; se encontraron ${questions.length}.`);
  }

  return errors;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
