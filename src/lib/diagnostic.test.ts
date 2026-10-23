import { describe, expect, it } from 'vitest';
import {
  createAreaAssessment,
  selectDiagnosticSections,
  suggestStartingLevel,
  type DiagnosticQuestion,
} from './diagnostic';

const sampleQuestions: DiagnosticQuestion[] = [
  ...Array.from({ length: 5 }, (_, index) => ({ id: `base-${index}`, examen: 'Saber 11', area: 'Área', nivel: 'Básico' })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `medio-${index}`, examen: 'Saber 11', area: 'Área', nivel: 'Intermedio' })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `alto-${index}`, examen: 'Saber 11', area: 'Área', nivel: 'Avanzado' })),
];

describe('orientación de dificultad', () => {
  it('sugiere un punto de inicio por respuestas correctas, sin usar el grado', () => {
    expect([0, 1, 2].map((score) => suggestStartingLevel(score))).toEqual(['Básico', 'Básico', 'Básico']);
    expect(suggestStartingLevel(3)).toBe('Intermedio');
    expect([4, 5].map((score) => suggestStartingLevel(score))).toEqual(['Avanzado', 'Avanzado']);
    expect(() => suggestStartingLevel(6)).toThrow();
  });

  it('selecciona cinco preguntas por área con una mezcla de dificultad estable', () => {
    const [section] = selectDiagnosticSections(sampleQuestions, ['Área']);
    expect(section?.questionIds).toHaveLength(5);
    expect(section?.questionIds).toEqual(['base-0', 'base-1', 'medio-0', 'medio-1', 'alto-0']);
    expect(() => selectDiagnosticSections(sampleQuestions, ['Otra área'])).toThrow('Faltan preguntas');
  });

  it('registra una recomendación por área a partir de las respuestas', () => {
    const assessment = createAreaAssessment(
      'Área',
      ['q1', 'q2', 'q3', 'q4', 'q5'],
      { q1: true, q2: false, q3: true, q4: true, q5: false },
      new Date('2026-10-22T12:00:00.000Z'),
    );
    expect(assessment).toEqual({
      areaId: 'Área',
      correct: 3,
      total: 5,
      suggestedLevel: 'Intermedio',
      completedAt: '2026-10-22T12:00:00.000Z',
    });
    expect(() => createAreaAssessment('Área', ['q1'], { q1: true })).toThrow();
  });
});
