export type Division = 'Bronce' | 'Plata' | 'Oro';
export type LeagueMovement = 'Ascenso' | 'Descenso' | 'Se mantiene';

export interface ReviewItem {
  questionId: string;
  stage: number;
  dueAt: string;
}

export function calculateXp(correctAnswers: number): number {
  return Math.max(0, Math.floor(correctAnswers)) * 10;
}

export function updateDailyStreak(lastActiveDate: string | null, streak: number, now = new Date()): {
  lastActiveDate: string;
  streak: number;
} {
  const today = dateKey(now);
  if (lastActiveDate === today) return { lastActiveDate: today, streak };

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    lastActiveDate: today,
    streak: lastActiveDate === dateKey(yesterday) ? streak + 1 : 1,
  };
}

export function updateReview(
  current: ReviewItem | undefined,
  questionId: string,
  isCorrect: boolean,
  now = new Date(),
): ReviewItem | null {
  if (!isCorrect) {
    return { questionId, stage: 0, dueAt: addDays(now, 1).toISOString() };
  }
  if (!current || current.stage >= 2) return null;

  const stage = current.stage + 1;
  const intervals = [1, 3, 7];
  const interval = intervals[stage];
  if (interval === undefined) return null;
  return { questionId, stage, dueAt: addDays(now, interval).toISOString() };
}

export function getLeagueMovement(position: number, participantCount: number, division: Division): LeagueMovement {
  const promotionZone = Math.min(2, Math.floor(participantCount / 3));
  const demotionZone = Math.min(2, Math.floor(participantCount / 3));
  if (position <= promotionZone && division !== 'Oro') return 'Ascenso';
  if (position > participantCount - demotionZone && division !== 'Bronce') return 'Descenso';
  return 'Se mantiene';
}

export function advanceDivision(division: Division, movement: LeagueMovement): Division {
  if (movement === 'Ascenso') return division === 'Bronce' ? 'Plata' : division === 'Plata' ? 'Oro' : 'Oro';
  if (movement === 'Descenso') return division === 'Oro' ? 'Plata' : division === 'Plata' ? 'Bronce' : 'Bronce';
  return division;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
