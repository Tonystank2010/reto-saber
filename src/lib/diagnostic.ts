export const DIFFICULTY_LEVELS = ['Básico', 'Intermedio', 'Avanzado'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export interface DiagnosticQuestion {
  id: string;
  examen: string;
  area: string;
  nivel: string;
}

export interface DiagnosticSection {
  areaId: string;
  questionIds: string[];
}

export interface AreaAssessment {
  areaId: string;
  correct: number;
  total: number;
  suggestedLevel: DifficultyLevel;
  completedAt: string;
}

const sectionMix: ReadonlyArray<[DifficultyLevel, number]> = [
  ['Básico', 2],
  ['Intermedio', 2],
  ['Avanzado', 1],
];

export function selectDiagnosticSections(
  questions: readonly DiagnosticQuestion[],
  areaIds: readonly string[],
  examId = 'Saber 11',
): DiagnosticSection[] {
  return areaIds.map((areaId) => {
    const questionIds = sectionMix.flatMap(([level, count]) => {
      const candidates = questions
        .filter((question) => question.examen === examId && question.area === areaId && question.nivel === level)
        .map((question) => question.id)
        .sort((left, right) => left.localeCompare(right));
      if (candidates.length < count) {
        throw new Error(`Faltan preguntas de nivel ${level} para el diagnóstico de ${areaId}.`);
      }
      return candidates.slice(0, count);
    });
    return { areaId, questionIds };
  });
}

export function suggestStartingLevel(correct: number, total = 5): DifficultyLevel {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total !== 5 || correct < 0 || correct > total) {
    throw new Error('El resultado del diagnóstico debe estar entre 0 y 5 respuestas correctas.');
  }
  if (correct <= 2) return 'Básico';
  if (correct === 3) return 'Intermedio';
  return 'Avanzado';
}

export function createAreaAssessment(
  areaId: string,
  questionIds: readonly string[],
  answers: Readonly<Record<string, boolean>>,
  now = new Date(),
): AreaAssessment {
  if (questionIds.length !== 5 || questionIds.some((id) => typeof answers[id] !== 'boolean')) {
    throw new Error(`El diagnóstico de ${areaId} debe tener cinco respuestas registradas.`);
  }
  const correct = questionIds.filter((id) => answers[id]).length;
  return {
    areaId,
    correct,
    total: questionIds.length,
    suggestedLevel: suggestStartingLevel(correct),
    completedAt: now.toISOString(),
  };
}
