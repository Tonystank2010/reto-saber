import { describe, expect, it } from 'vitest';
import {
  createInitialProgress,
  completePractice,
  getWeekKey,
  loadDemoState,
  parseProfile,
  parseProgress,
  recordDiagnostic,
  skipDiagnostic,
  type DemoStorage,
} from './demo-state';

function createProgress(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ ...createInitialProgress(new Date(2026, 9, 21)), ...overrides });
}

class MemoryStorage implements DemoStorage {
  values = new Map<string, string>();
  failWrites = false;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota exceeded');
    this.values.set(key, value);
  }
}

describe('persistencia del demo', () => {
  it('calcula semanas ISO de forma estable al cruzar el año', () => {
    expect(getWeekKey(new Date(2021, 0, 1))).toBe('2020-53');
    expect(getWeekKey(new Date(2021, 0, 4))).toBe('2021-01');
  });

  it('aplica XP, racha, desbloqueo y repasos de una sesión de práctica de forma determinista', () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const first = completePractice(
      createInitialProgress(now),
      {
        areaId: 'Matemáticas',
        source: 'lesson',
        questionIds: ['mat-01', 'mat-02'],
        answers: { 'mat-01': true, 'mat-02': false },
      },
      now,
    );
    expect(first.xp).toBe(10);
    expect(first.weeklyXp).toBe(10);
    expect(first.completedAreas).toEqual(['Matemáticas']);
    expect(first.streak).toBe(1);
    expect(first.reviews).toEqual([{
      questionId: 'mat-02',
      stage: 0,
      dueAt: '2026-10-22T12:00:00.000Z',
    }]);

    const repeat = completePractice(first, {
      areaId: 'Matemáticas',
      source: 'lesson',
      questionIds: ['mat-01', 'mat-02'],
      answers: { 'mat-01': true, 'mat-02': true },
    }, now);
    expect(repeat.xp).toBe(10);
    expect(repeat.reviews[0]?.stage).toBe(1);

    const review = completePractice(first, {
      areaId: 'Mi error de hoy',
      source: 'review',
      questionIds: ['mat-02'],
      answers: { 'mat-02': true },
    }, now);
    expect(review.xp).toBe(15);
    expect(review.weeklyXp).toBe(15);
    expect(review.reviews[0]?.stage).toBe(1);
    expect(review.streak).toBe(1);
  });

  it('rechaza perfil JSON malformado y acepta un correo sintácticamente válido', () => {
    expect(() => parseProfile('{')).toThrow();
    expect(parseProfile(JSON.stringify({ nickname: ' Luna ', grade: '11.º', email: 'LUNA@EXAMPLE.COM' }))).toEqual({
      nickname: 'Luna',
      grade: '11.º',
      email: 'luna@example.com',
    });
    expect(parseProfile(JSON.stringify({ nickname: ' Luna ', grade: '11.º', email: 'LUNA@DEMO.INVALID' }))).toEqual({
      nickname: 'Luna',
      grade: '11.º',
      email: 'luna@demo.invalid',
    });
  });

  it('guarda orientaciones por área, permite actualizarlas y conserva la omisión explícita', () => {
    const initial = createInitialProgress(new Date('2026-10-21T12:00:00.000Z'));
    const assessment = {
      areaId: 'Matemáticas',
      correct: 4,
      total: 5 as const,
      suggestedLevel: 'Avanzado' as const,
      completedAt: '2026-10-21T12:00:00.000Z',
    };
    const completed = recordDiagnostic(initial, [assessment]);
    expect(completed.assessments).toEqual([assessment]);
    expect(completed.diagnosticSkipped).toBe(false);
    expect(parseProgress(JSON.stringify(completed), new Date('2026-10-21T12:00:00.000Z')).assessments).toEqual([assessment]);
    expect(skipDiagnostic(initial).diagnosticSkipped).toBe(true);
  });

  it('solo marca el área completa cuando sus tres niveles se han completado', () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const firstLevel = completePractice(createInitialProgress(now), {
      areaId: 'Matemáticas',
      levelId: 'Matemáticas::base',
      areaLevelIds: ['Matemáticas::base', 'Matemáticas::intermedio', 'Matemáticas::avanzado'],
      source: 'lesson',
      questionIds: ['mat-01'],
      answers: { 'mat-01': true },
    }, now);
    expect(firstLevel.completedLevels).toEqual(['Matemáticas::base']);
    expect(firstLevel.completedAreas).toEqual([]);
    const lastLevel = completePractice(firstLevel, {
      areaId: 'Matemáticas',
      levelId: 'Matemáticas::avanzado',
      areaLevelIds: ['Matemáticas::base', 'Matemáticas::intermedio', 'Matemáticas::avanzado'],
      source: 'lesson',
      questionIds: ['mat-02'],
      answers: { 'mat-02': true },
    }, now);
    expect(lastLevel.completedAreas).toEqual([]);
    const allLevels = completePractice(lastLevel, {
      areaId: 'Matemáticas',
      levelId: 'Matemáticas::intermedio',
      areaLevelIds: ['Matemáticas::base', 'Matemáticas::intermedio', 'Matemáticas::avanzado'],
      source: 'lesson',
      questionIds: ['mat-03'],
      answers: { 'mat-03': true },
    }, now);
    expect(allLevels.completedAreas).toEqual(['Matemáticas']);
    expect(allLevels.xp).toBe(30);
  });

  it('inicia con progreso limpio y rechaza JSON o campos corruptos', () => {
    expect(parseProgress(null, new Date(2026, 9, 21))).toEqual(createInitialProgress(new Date(2026, 9, 21)));
    expect(() => parseProgress('null', new Date(2026, 9, 21))).toThrow();
    expect(() => parseProgress(createProgress({ xp: -1 }), new Date(2026, 9, 21))).toThrow();
    expect(() => parseProgress(createProgress({ reviews: [{ questionId: 'q', stage: 9, dueAt: 'not a date' }] }), new Date(2026, 9, 21))).toThrow();
  });

  it('persiste el cierre semanal una sola vez y conserva las promociones/descuentos', () => {
    const now = new Date(2026, 9, 26);
    const previousWeek = new Date(now);
    previousWeek.setDate(previousWeek.getDate() - 7);
    const storage = new MemoryStorage();
    storage.values.set('reto-saber.progress', createProgress({
      weekKey: getWeekKey(previousWeek),
      weeklyXp: 82,
    }));
    storage.values.set('reto-saber.profile', JSON.stringify({
      nickname: 'BrújulaAzul',
      grade: '11.º',
      email: 'brujula@demo.invalid',
    }));

    const firstLoad = loadDemoState(storage, now, [68, 52, 39, 28, 18, 9]);
    expect(firstLoad.progress.division).toBe('Plata');
    expect(firstLoad.progress.weeklyXp).toBe(0);
    expect(firstLoad.progress.lastMovement).toBe('Ascenso');
    expect(firstLoad.warning).toBeNull();
    const saved = storage.getItem('reto-saber.progress');
    const secondLoad = loadDemoState(storage, now, [68, 52, 39, 28, 18, 9]);
    expect(secondLoad.progress.division).toBe('Plata');
    expect(secondLoad.progress.lastMovement).toBe('Ascenso');
    expect(storage.getItem('reto-saber.progress')).toBe(saved);
  });

  it('no aplica una promoción atrasada tras varias semanas sin actividad y muestra aviso de recuperación', () => {
    const storage = new MemoryStorage();
    storage.values.set('reto-saber.profile', '{');
    storage.values.set('reto-saber.progress', createProgress({
      weekKey: '2026-40',
      weeklyXp: 82,
    }));
    storage.failWrites = true;

    const result = loadDemoState(storage, new Date(2026, 9, 26), [68, 52, 39, 28, 18, 9]);
    expect(result.profile).toBeNull();
    expect(result.progress.division).toBe('Bronce');
    expect(result.progress.weeklyXp).toBe(0);
    expect(result.warning).toContain('perfil guardado está dañado');
    expect(result.warning).toContain('No se pudo guardar el cierre');
  });

  it('maneja la API de almacenamiento bloqueada sin dejar de informar al usuario', () => {
    const unavailableStorage: DemoStorage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    const result = loadDemoState(unavailableStorage, new Date(2026, 9, 21));
    expect(result.profile).toBeNull();
    expect(result.progress.xp).toBe(0);
    expect(result.warning).toContain('No se pudo leer el almacenamiento local');
  });

  it('retira referencias a preguntas o áreas que ya no existen y guarda el progreso saneado', () => {
    const storage = new MemoryStorage();
    storage.values.set('reto-saber.progress', createProgress({
      completedAreas: ['Matemáticas', 'Área retirada'],
      reviews: [
        { questionId: 'mat-01', stage: 0, dueAt: '2026-10-22T12:00:00.000Z' },
        { questionId: 'pregunta-retirada', stage: 0, dueAt: '2026-10-22T12:00:00.000Z' },
      ],
    }));

    const result = loadDemoState(
      storage,
      new Date(2026, 9, 21),
      [],
      new Set(['mat-01']),
      new Set(['Matemáticas']),
    );
    expect(result.progress.completedAreas).toEqual(['Matemáticas']);
    expect(result.progress.reviews.map((item) => item.questionId)).toEqual(['mat-01']);
    expect(result.warning).toContain('Se quitaron repasos o niveles');
    expect(JSON.parse(storage.getItem('reto-saber.progress') ?? '{}').reviews).toHaveLength(1);
  });
});
