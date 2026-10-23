import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateContent } from './content-validation.mjs';

async function loadQuestions() {
  const [base, additional] = await Promise.all([
    readFile(new URL('../contenido/preguntas.json', import.meta.url), 'utf8'),
    readFile(new URL('../contenido/preguntas-niveles.json', import.meta.url), 'utf8'),
  ]);
  return [...JSON.parse(base), ...JSON.parse(additional)];
}

describe('contenido ilustrativo', () => {
  it('incluye 75 preguntas originales, cinco por dificultad y área, con revisores pendientes', async () => {
    const questions = await loadQuestions();
    const catalog = JSON.parse(await readFile(new URL('../contenido/catalogo.json', import.meta.url), 'utf8'));
    expect(validateContent(questions, catalog)).toEqual([]);
    expect(questions).toHaveLength(75);
    for (const area of catalog.areas) {
      for (const level of catalog.niveles) {
        expect(questions.filter((question) => question.area === area.id && question.nivel === level.dificultad)).toHaveLength(5);
      }
    }
    for (const question of questions) {
      expect(question.original).toBe(true);
      expect(question.marcaContenido).toBe('Pregunta de práctica, no oficial');
      expect(question.estado).toBe('ejemplo-demo');
      expect(question.opciones).toHaveLength(4);
      expect(question.opciones.filter((option) => option.id === question.respuesta)).toHaveLength(1);
      expect(question.revisores).toHaveLength(2);
    }
  });

  it('detecta IDs, enunciados y opciones repetidos y rechaza respuestas no listadas', async () => {
    const questions = await loadQuestions();
    const catalog = JSON.parse(await readFile(new URL('../contenido/catalogo.json', import.meta.url), 'utf8'));
    const changed = structuredClone(questions);
    changed[1].id = changed[0].id;
    changed[1].enunciado = changed[0].enunciado;
    changed[1].opciones[0].id = changed[1].opciones[1].id;
    changed[1].respuesta = 'Z';
    const errors = validateContent(changed, catalog).join('\n');
    expect(errors).toContain('ID duplicado');
    expect(errors).toContain('enunciado duplicado');
    expect(errors).toContain('identificadores de opción duplicados');
    expect(errors).toContain('respuesta debe coincidir con una única opción');
  });

  it('informa estructuras malformadas sin lanzar excepciones', async () => {
    const catalog = JSON.parse(await readFile(new URL('../contenido/catalogo.json', import.meta.url), 'utf8'));
    expect(validateContent([null], catalog).join('\n')).toContain('debe ser un objeto JSON');
    const questions = await loadQuestions();
    const malformedQuestions = structuredClone(questions);
    malformedQuestions[0].opciones[0] = null;
    expect(validateContent(malformedQuestions, catalog).join('\n')).toContain('cada opción debe ser un objeto');
    const malformedCatalog = structuredClone(catalog);
    malformedCatalog.examenes.push(null);
    malformedCatalog.areas.push(null);
    const errors = validateContent([], malformedCatalog).join('\n');
    expect(errors).toContain('examen sin formato de objeto');
    expect(errors).toContain('área sin formato de objeto');
  });
});
