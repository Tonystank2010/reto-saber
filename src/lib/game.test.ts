import { describe, expect, it } from 'vitest';
import { advanceDivision, calculateXp, getLeagueMovement, getWeeklyRollover, updateDailyStreak, updateReview } from './game';

describe('progreso de práctica', () => {
  it('calcula XP sin permitir puntos negativos ni fracciones', () => {
    expect(calculateXp(3)).toBe(30);
    expect(calculateXp(-2)).toBe(0);
    expect(calculateXp(1.9)).toBe(10);
  });

  it('conserva la racha del mismo día, la incrementa al día siguiente y reinicia tras una pausa', () => {
    expect(updateDailyStreak('2026-10-21', 4, new Date(2026, 9, 21))).toEqual({
      lastActiveDate: '2026-10-21',
      streak: 4,
    });
    expect(updateDailyStreak('2026-10-20', 4, new Date(2026, 9, 21)).streak).toBe(5);
    expect(updateDailyStreak('2026-10-18', 4, new Date(2026, 9, 21)).streak).toBe(1);
  });
});

describe('repaso espaciado', () => {
  const now = new Date('2026-10-21T12:00:00.000Z');

  it('programa el primer error para mañana y aumenta el intervalo tras aciertos', () => {
    const first = updateReview(undefined, 'q1', false, now);
    expect(first?.stage).toBe(0);
    expect(first?.dueAt).toBe('2026-10-22T12:00:00.000Z');

    const second = updateReview(first ?? undefined, 'q1', true, now);
    expect(second?.stage).toBe(1);
    expect(second?.dueAt).toBe('2026-10-24T12:00:00.000Z');
  });

  it('reinicia el intervalo tras fallar y retira la pregunta después de tres repasos correctos', () => {
    const failedAgain = updateReview({ questionId: 'q1', stage: 2, dueAt: now.toISOString() }, 'q1', false, now);
    expect(failedAgain?.stage).toBe(0);
    const cleared = updateReview({ questionId: 'q1', stage: 2, dueAt: now.toISOString() }, 'q1', true, now);
    expect(cleared).toBeNull();
  });
});

describe('ligas', () => {
  it('aplica ascenso, permanencia y descenso según la división', () => {
    expect(getLeagueMovement(1, 9, 'Bronce')).toBe('Ascenso');
    expect(getLeagueMovement(5, 9, 'Plata')).toBe('Se mantiene');
    expect(getLeagueMovement(7, 9, 'Oro')).toBe('Se mantiene');
    expect(getLeagueMovement(9, 9, 'Plata')).toBe('Descenso');
    expect(advanceDivision('Bronce', 'Ascenso')).toBe('Plata');
    expect(advanceDivision('Plata', 'Ascenso')).toBe('Oro');
    expect(advanceDivision('Plata', 'Descenso')).toBe('Bronce');
    expect(advanceDivision('Oro', 'Ascenso')).toBe('Oro');
  });

  it('cierra una semana una sola vez, evita aplicar resultados obsoletos y resuelve empates de forma estable', () => {
    expect(getWeeklyRollover('Bronce', 82, '2026-42', '2026-43', '2026-42', [68, 52, 39, 28, 18, 9]).division).toBe('Plata');
    expect(getWeeklyRollover('Bronce', 82, '2026-40', '2026-43', '2026-42', [68, 52, 39, 28, 18, 9])).toEqual({
      division: 'Bronce',
      lastMovement: 'Se mantiene',
      lastMovementWeek: '2026-43',
      weekKey: '2026-43',
      weeklyXp: 0,
    });
    expect(getWeeklyRollover('Bronce', 68, '2026-42', '2026-43', '2026-42', [82, 68, 52, 39, 28, 18, 9]).division).toBe('Bronce');
  });
});
