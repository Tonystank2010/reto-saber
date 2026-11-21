import {
  calculateXp,
  getWeeklyRollover,
  updateDailyStreak,
  updateReview,
  type Division,
  type LeagueMovement,
  type ReviewItem,
} from './game';
import { isValidEmail } from './demo-profile';
import { DIFFICULTY_LEVELS, type AreaAssessment, type DifficultyLevel } from './diagnostic';

export interface Profile {
  nickname: string;
  grade: string;
  email: string;
}

export interface Progress {
  xp: number;
  weeklyXp: number;
  weekKey: string;
  division: Division;
  lastMovement: LeagueMovement;
  lastMovementWeek: string | null;
  streak: number;
  lastActiveDate: string | null;
  completedAreas: string[];
  completedLevels: string[];
  reviews: ReviewItem[];
  assessments: AreaAssessment[];
  diagnosticSkipped: boolean;
}

export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DemoState {
  profile: Profile | null;
  progress: Progress;
  warning: string | null;
}

export interface PracticeResult {
  areaId: string;
  source: 'lesson' | 'review';
  questionIds: string[];
  answers: Record<string, boolean>;
  levelId?: string;
  areaLevelIds?: string[];
}

export function getWeekKey(date: Date): string {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + 3 - ((day.getDay() + 6) % 7));
  const firstThursday = new Date(day.getFullYear(), 0, 4);
  const week = 1 + Math.round(((day.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${day.getFullYear()}-${String(week).padStart(2, '0')}`;
}

export function createInitialProgress(now = new Date()): Progress {
  return {
    xp: 0,
    weeklyXp: 0,
    weekKey: getWeekKey(now),
    division: 'Bronce',
    lastMovement: 'Se mantiene',
    lastMovementWeek: null,
    streak: 0,
    lastActiveDate: null,
    completedAreas: [],
    completedLevels: [],
    reviews: [],
    assessments: [],
    diagnosticSkipped: false,
  };
}

export function completePractice(
  progress: Progress,
  result: PracticeResult,
  now = new Date(),
  otherScores: number[] = [],
): Progress {
  const currentWeek = getWeekKey(now);
  const previousWeek = new Date(now);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const currentProgress = progress.weekKey === currentWeek
    ? progress
    : {
      ...progress,
      ...getWeeklyRollover(
        progress.division,
        progress.weeklyXp,
        progress.weekKey,
        currentWeek,
        getWeekKey(previousWeek),
        otherScores,
      ),
    };
  const correctAnswers = Object.values(result.answers).filter(Boolean).length;
  const isFirstLesson = result.source === 'lesson' && (
    result.levelId
      ? !currentProgress.completedLevels.includes(result.levelId)
      : !currentProgress.completedAreas.includes(result.areaId)
  );
  const gainedXp = isFirstLesson
    ? calculateXp(correctAnswers)
    : result.source === 'review' ? correctAnswers * 5 : 0;
  const completedLevels = isFirstLesson && result.levelId
    ? [...currentProgress.completedLevels, result.levelId]
    : currentProgress.completedLevels;
  const areaIsComplete = result.areaLevelIds?.length
    ? result.areaLevelIds.every((levelId) => completedLevels.includes(levelId))
    : isFirstLesson && !result.levelId;
  const reviews = new Map(currentProgress.reviews.map((item) => [item.questionId, item]));

  for (const questionId of result.questionIds) {
    const answer = result.answers[questionId];
    if (answer === undefined) continue;
    const updated = updateReview(reviews.get(questionId), questionId, answer, now);
    if (updated) reviews.set(questionId, updated);
    else reviews.delete(questionId);
  }

  return {
    ...currentProgress,
    xp: currentProgress.xp + gainedXp,
    weeklyXp: currentProgress.weeklyXp + gainedXp,
    completedAreas: areaIsComplete && !currentProgress.completedAreas.includes(result.areaId)
      ? [...currentProgress.completedAreas, result.areaId]
      : currentProgress.completedAreas,
    completedLevels,
    reviews: [...reviews.values()],
    ...updateDailyStreak(currentProgress.lastActiveDate, currentProgress.streak, now),
  };
}

export function recordDiagnostic(progress: Progress, assessments: AreaAssessment[]): Progress {
  const byArea = new Map(progress.assessments.map((assessment) => [assessment.areaId, assessment]));
  for (const assessment of assessments) byArea.set(assessment.areaId, assessment);
  return {
    ...progress,
    assessments: [...byArea.values()],
    diagnosticSkipped: false,
  };
}

export function skipDiagnostic(progress: Progress): Progress {
  return { ...progress, diagnosticSkipped: true };
}

export function parseProfile(serialized: string | null): Profile | null {
  if (serialized === null) return null;
  const value: unknown = JSON.parse(serialized);
  if (!isRecord(value) ||
      typeof value.nickname !== 'string' || !value.nickname.trim() ||
      typeof value.grade !== 'string' || !value.grade.trim() ||
      typeof value.email !== 'string' || !isValidEmail(value.email)) {
    throw new Error('El perfil guardado no tiene el formato esperado.');
  }
  return {
    nickname: value.nickname.trim(),
    grade: value.grade,
    email: value.email.trim().toLowerCase(),
  };
}

export function parseProgress(serialized: string | null, now = new Date(), otherScores: number[] = []): Progress {
  if (serialized === null) return createInitialProgress(now);
  const value: unknown = JSON.parse(serialized);
  if (!isRecord(value)) throw new Error('El progreso guardado no tiene el formato esperado.');

  if (
    !isNonNegativeInteger(value.xp) ||
    !isNonNegativeInteger(value.weeklyXp) ||
    !isWeekKey(value.weekKey) ||
    !isDivision(value.division) ||
    !isMovement(value.lastMovement) ||
    !(value.lastMovementWeek === null || isWeekKey(value.lastMovementWeek)) ||
    !isNonNegativeInteger(value.streak) ||
    !(value.lastActiveDate === null || isDateKey(value.lastActiveDate)) ||
    !Array.isArray(value.completedAreas) ||
    !value.completedAreas.every((area) => typeof area === 'string' && area.trim()) ||
    new Set(value.completedAreas).size !== value.completedAreas.length ||
    (value.completedLevels !== undefined && (
      !Array.isArray(value.completedLevels) ||
      !value.completedLevels.every((level) => typeof level === 'string' && level.trim()) ||
      new Set(value.completedLevels).size !== value.completedLevels.length
    )) ||
    !Array.isArray(value.reviews) ||
    !value.reviews.every(isReviewItem) ||
    new Set(value.reviews.map((item) => item.questionId)).size !== value.reviews.length ||
    (value.assessments !== undefined && (
      !Array.isArray(value.assessments) ||
      !value.assessments.every(isAreaAssessment) ||
      new Set(value.assessments.map((item) => item.areaId)).size !== value.assessments.length
    )) ||
    (value.diagnosticSkipped !== undefined && typeof value.diagnosticSkipped !== 'boolean')
  ) {
    throw new Error('El progreso guardado contiene datos inválidos.');
  }

  const progress: Progress = {
    xp: value.xp,
    weeklyXp: value.weeklyXp,
    weekKey: value.weekKey,
    division: value.division,
    lastMovement: value.lastMovement,
    lastMovementWeek: value.lastMovementWeek,
    streak: value.streak,
    lastActiveDate: value.lastActiveDate,
    completedAreas: value.completedAreas,
    completedLevels: value.completedLevels ?? [],
    reviews: value.reviews,
    assessments: value.assessments ?? [],
    diagnosticSkipped: value.diagnosticSkipped ?? false,
  };
  const currentWeek = getWeekKey(now);
  if (progress.weekKey !== currentWeek) {
    const previousWeek = new Date(now);
    previousWeek.setDate(previousWeek.getDate() - 7);
    return {
      ...progress,
      ...getWeeklyRollover(
        progress.division,
        progress.weeklyXp,
        progress.weekKey,
        currentWeek,
        getWeekKey(previousWeek),
        otherScores,
      ),
    };
  }
  return progress;
}

export function loadDemoState(
  storage: DemoStorage,
  now = new Date(),
  otherScores: number[] = [],
  validQuestionIds?: ReadonlySet<string>,
  validAreaIds?: ReadonlySet<string>,
  validLevelIds?: ReadonlySet<string>,
): DemoState {
  let profileValue: string | null;
  let progressValue: string | null;
  try {
    profileValue = storage.getItem('reto-saber.profile');
    progressValue = storage.getItem('reto-saber.progress');
  } catch {
    return {
      profile: null,
      progress: createInitialProgress(now),
      warning: 'No se pudo leer el almacenamiento local. El demo seguirá sin poder recuperar los datos guardados.',
    };
  }

  const warnings: string[] = [];
  let profile: Profile | null = null;
  let progress = createInitialProgress(now);
  try {
    profile = parseProfile(profileValue);
  } catch {
    warnings.push('El perfil guardado está dañado; se inició sin ese perfil.');
  }
  let progressNeedsSave = false;
  try {
    progress = parseProgress(progressValue, now, otherScores);
    const reviews = validQuestionIds
      ? progress.reviews.filter((item) => validQuestionIds.has(item.questionId))
      : progress.reviews;
    const completedAreas = validAreaIds
      ? progress.completedAreas.filter((area) => validAreaIds.has(area))
      : progress.completedAreas;
    const completedLevels = validLevelIds
      ? progress.completedLevels.filter((level) => validLevelIds.has(level))
      : progress.completedLevels;
    const assessments = validAreaIds
      ? progress.assessments.filter((item) => validAreaIds.has(item.areaId))
      : progress.assessments;
    if (
      reviews.length !== progress.reviews.length ||
      completedAreas.length !== progress.completedAreas.length ||
      completedLevels.length !== progress.completedLevels.length ||
      assessments.length !== progress.assessments.length
    ) {
      progress = { ...progress, reviews, completedAreas, completedLevels, assessments };
      progressNeedsSave = true;
      warnings.push('Se quitaron repasos o niveles que ya no existen en el catálogo local.');
    }
    if (progressValue !== null) {
      const previous: unknown = JSON.parse(progressValue);
      progressNeedsSave ||= isRecord(previous) && previous.weekKey !== progress.weekKey;
    }
  } catch {
    warnings.push('El progreso guardado está dañado; se inició con progreso vacío.');
  }

  if (progressNeedsSave) {
    try {
      storage.setItem('reto-saber.progress', JSON.stringify(progress));
    } catch {
      warnings.push('No se pudo guardar el cierre de la liga semanal. El progreso anterior se conserva en el almacenamiento.');
    }
  }
  return { profile, progress, warning: warnings.length ? warnings.join(' ') : null };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isWeekKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|[1-4]\d|5[0-3])$/.test(value);
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && getDateKey(date) === value;
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isDivision(value: unknown): value is Division {
  return value === 'Bronce' || value === 'Plata' || value === 'Oro';
}

function isMovement(value: unknown): value is LeagueMovement {
  return value === 'Ascenso' || value === 'Descenso' || value === 'Se mantiene';
}

function isReviewItem(value: unknown): value is ReviewItem {
  return isRecord(value) &&
    typeof value.questionId === 'string' && Boolean(value.questionId.trim()) &&
    isNonNegativeInteger(value.stage) && value.stage <= 2 &&
    typeof value.dueAt === 'string' && Number.isFinite(Date.parse(value.dueAt));
}

function isAreaAssessment(value: unknown): value is AreaAssessment {
  return isRecord(value) &&
    typeof value.areaId === 'string' && Boolean(value.areaId.trim()) &&
    isNonNegativeInteger(value.correct) && value.correct <= 5 &&
    value.total === 5 &&
    isDifficultyLevel(value.suggestedLevel) &&
    typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt));
}

function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'string' && (DIFFICULTY_LEVELS as readonly string[]).includes(value);
}
