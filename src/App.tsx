import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Home,
  LockKeyhole,
  LogOut,
  Medal,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
import { isFictionalEmail } from './lib/demo-profile';
import rawQuestions from '../contenido/preguntas.json';
import catalog from '../contenido/catalogo.json';
import {
  calculateXp,
  getLeagueMovement,
  updateDailyStreak,
  updateReview,
  advanceDivision,
  type Division,
  type LeagueMovement,
  type ReviewItem,
} from './lib/game';

type Question = (typeof rawQuestions)[number];
type Page = 'inicio' | 'camino' | 'repaso' | 'ligas' | 'perfil';
type Profile = { nickname: string; grade: string; email: string };
type Progress = {
  xp: number;
  weeklyXp: number;
  weekKey: string;
  division: Division;
  lastMovement: LeagueMovement;
  lastMovementWeek: string | null;
  streak: number;
  lastActiveDate: string | null;
  completedAreas: string[];
  reviews: ReviewItem[];
};
type Quiz = {
  areaId: string;
  questionIds: string[];
  source: 'lesson' | 'review';
  index: number;
  selected: string | null;
  answers: Record<string, boolean>;
};

const exams = catalog.examenes.map((item) => ({
  id: item.id,
  label: item.id,
  note: item.nota,
  active: item.disponible,
}));

const allAreas = catalog.areas.map((item) => ({
  exam: item.examen,
  id: item.id,
  mark: item.marca,
  hue: item.tono,
  description: item.descripcion,
}));

function areasFor(examId: string) {
  return allAreas.filter((area) => area.exam === examId);
}

const fakeLeague = [
  { nickname: 'LunaNaranja', weeklyXp: 82 },
  { nickname: 'MapaDeNubes', weeklyXp: 68 },
  { nickname: 'CaféConLibros', weeklyXp: 52 },
  { nickname: 'PixelAndino', weeklyXp: 39 },
  { nickname: 'BrújulaAzul', weeklyXp: 28 },
  { nickname: 'RíoDeIdeas', weeklyXp: 18 },
  { nickname: 'GatoAstral', weeklyXp: 9 },
];

const initialProgress: Progress = {
  xp: 0,
  weeklyXp: 0,
  weekKey: weekKey(new Date()),
  division: 'Bronce',
  lastMovement: 'Se mantiene',
  lastMovementWeek: null,
  streak: 0,
  lastActiveDate: null,
  completedAreas: [],
  reviews: [],
};

function readProfile(): Profile | null {
  const stored = localStorage.getItem('reto-saber.profile');
  if (!stored) return null;
  const parsed: unknown = JSON.parse(stored);
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'nickname' in parsed &&
    'grade' in parsed &&
    'email' in parsed &&
    typeof parsed.nickname === 'string' &&
    typeof parsed.grade === 'string' &&
    typeof parsed.email === 'string'
  ) {
    return { nickname: parsed.nickname, grade: parsed.grade, email: parsed.email };
  }
  return null;
}

function readProgress(): Progress {
  const stored = localStorage.getItem('reto-saber.progress');
  if (!stored) return initialProgress;
  const parsed = JSON.parse(stored) as Partial<Progress>;
  const currentWeek = weekKey(new Date());
  const division = parsed.division === 'Plata' || parsed.division === 'Oro' ? parsed.division : 'Bronce';
  let currentDivision: Division = division;
  let lastMovement: LeagueMovement = parsed.lastMovement === 'Ascenso' || parsed.lastMovement === 'Descenso' ? parsed.lastMovement : 'Se mantiene';
  let lastMovementWeek = typeof parsed.lastMovementWeek === 'string' ? parsed.lastMovementWeek : null;
  let weeklyXp = Number.isFinite(parsed.weeklyXp) ? Math.max(0, parsed.weeklyXp ?? 0) : 0;
  if (typeof parsed.weekKey === 'string' && parsed.weekKey !== currentWeek) {
    const standings = [...fakeLeague, { nickname: 'Tú · demo', weeklyXp, current: true }]
      .sort((left, right) => right.weeklyXp - left.weeklyXp);
    const position = standings.findIndex((person) => 'current' in person && person.current) + 1;
    lastMovement = getLeagueMovement(position, standings.length, currentDivision);
    currentDivision = advanceDivision(currentDivision, lastMovement);
    lastMovementWeek = currentWeek;
    weeklyXp = 0;
  }
  return {
    ...initialProgress,
    ...parsed,
    weekKey: currentWeek,
    weeklyXp,
    division: currentDivision,
    lastMovement,
    lastMovementWeek,
    completedAreas: Array.isArray(parsed.completedAreas) ? parsed.completedAreas : [],
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
  };
}

function weekKey(date: Date): string {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + 3 - ((day.getDay() + 6) % 7));
  const firstThursday = new Date(day.getFullYear(), 0, 4);
  const week = 1 + Math.round(((day.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${day.getFullYear()}-${String(week).padStart(2, '0')}`;
}

function App() {
  const [profile, setProfile] = useState<Profile | null>(readProfile);
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [page, setPage] = useState<Page>('inicio');
  const [exam, setExam] = useState('Saber 11');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [summary, setSummary] = useState<{ correct: number; total: number; source: Quiz['source'] } | null>(null);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authError, setAuthError] = useState('');

  const questions = rawQuestions as Question[];
  const reviewDue = useMemo(
    () => progress.reviews.filter((item) => new Date(item.dueAt).getTime() <= Date.now()),
    [progress.reviews],
  );

  function persistProfile(next: Profile | null) {
    if (next) localStorage.setItem('reto-saber.profile', JSON.stringify(next));
    else localStorage.removeItem('reto-saber.profile');
    setProfile(next);
  }

  function saveProgress(next: Progress) {
    localStorage.setItem('reto-saber.progress', JSON.stringify(next));
    setProgress(next);
  }

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Profile = {
      nickname: String(data.get('nickname')).trim(),
      grade: String(data.get('grade')),
      email: String(data.get('email')).trim().toLowerCase(),
    };
    if (!next.nickname || !next.grade || !isFictionalEmail(next.email)) {
      setAuthError('Completa los campos y usa un correo ficticio cuyo dominio termine en .invalid.');
      return;
    }
    persistProfile(next);
    setAuthError('');
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('loginEmail')).trim().toLowerCase();
    if (!isFictionalEmail(email)) {
      setAuthError('Para este demo, el dominio del correo debe terminar en .invalid.');
      return;
    }
    const storedProfile = readProfile();
    if (storedProfile?.email !== email) {
      setAuthError('No hay un perfil local con ese correo ficticio en este navegador.');
      return;
    }
    setProfile(storedProfile);
    setAuthError('');
  }

  function startLesson(areaId: string) {
    const areaQuestions = questions.filter((question) => question.examen === exam && question.area === areaId);
    if (!areaQuestions.length) return;
    setSummary(null);
    setQuiz({
      areaId,
      questionIds: areaQuestions.map((question) => question.id),
      source: 'lesson',
      index: 0,
      selected: null,
      answers: {},
    });
  }

  function startReview() {
    if (!reviewDue.length) return;
    setSummary(null);
    setQuiz({
      areaId: 'Mi error de hoy',
      questionIds: reviewDue.map((item) => item.questionId),
      source: 'review',
      index: 0,
      selected: null,
      answers: {},
    });
  }

  function chooseAnswer(optionId: string) {
    if (!quiz || quiz.selected) return;
    const question = questions.find((item) => item.id === quiz.questionIds[quiz.index]);
    if (!question) return;
    setQuiz({
      ...quiz,
      selected: optionId,
      answers: { ...quiz.answers, [question.id]: optionId === question.respuesta },
    });
  }

  function advanceQuiz() {
    if (!quiz || !quiz.selected) return;
    if (quiz.index < quiz.questionIds.length - 1) {
      setQuiz({ ...quiz, index: quiz.index + 1, selected: null });
      return;
    }

    const correct = Object.values(quiz.answers).filter(Boolean).length;
    const completed = quiz;
    const now = new Date();
    const currentWeek = weekKey(now);
    const nextProgress: Progress = {
      ...progress,
      xp: progress.xp + (completed.source === 'lesson' && !progress.completedAreas.includes(completed.areaId)
        ? calculateXp(correct)
        : completed.source === 'review' ? correct * 5 : 0),
      weeklyXp: (progress.weekKey === currentWeek ? progress.weeklyXp : 0) +
        (completed.source === 'lesson' && !progress.completedAreas.includes(completed.areaId)
          ? calculateXp(correct)
          : completed.source === 'review' ? correct * 5 : 0),
      weekKey: currentWeek,
      completedAreas: completed.source === 'lesson' && !progress.completedAreas.includes(completed.areaId)
        ? [...progress.completedAreas, completed.areaId]
        : progress.completedAreas,
      reviews: progress.reviews.flatMap((item) => {
        const answer = completed.answers[item.questionId];
        if (answer === undefined) return [item];
        const updated = updateReview(item, item.questionId, answer, now);
        return updated ? [updated] : [];
      }).concat(completed.source === 'lesson'
        ? completed.questionIds.flatMap((questionId) => {
          const answer = completed.answers[questionId];
          if (answer !== false || progress.reviews.some((item) => item.questionId === questionId)) return [];
          const updated = updateReview(undefined, questionId, false, now);
          return updated ? [updated] : [];
        })
        : []),
      ...updateDailyStreak(progress.lastActiveDate, progress.streak, now),
    };
    saveProgress(nextProgress);
    setSummary({ correct, total: completed.questionIds.length, source: completed.source });
    setQuiz(null);
    setPage(completed.source === 'review' ? 'repaso' : 'camino');
  }

  function signOut() {
    setProfile(null);
    setAuthMode('login');
    setPage('inicio');
    setQuiz(null);
  }

  if (!profile) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        onRegister={handleRegister}
        onLogin={handleLogin}
        error={authError}
      />
    );
  }

  const navItems: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'camino', label: 'Camino', icon: BookOpen },
    { id: 'repaso', label: 'Repasos', icon: RotateCcw },
    { id: 'ligas', label: 'Ligas', icon: Trophy },
    { id: 'perfil', label: 'Perfil', icon: UserRound },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('inicio'); }}>
          <span className="brand-mark">R</span>
          <span>reto saber<small>aprende a tu ritmo</small></span>
        </a>
        <div className="demo-flag"><ShieldAlert size={17} /> Demo local</div>
        <nav aria-label="Navegación principal">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={`nav-link ${page === id ? 'active' : ''}`} key={id} onClick={() => { setPage(id); setQuiz(null); setSummary(null); }}>
              <Icon size={19} strokeWidth={2.2} /> <span>{label}</span>
              {id === 'repaso' && progress.reviews.length > 0 && <span className="nav-count">{progress.reviews.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini"><ShieldAlert size={16} /> No uses datos reales</div>
          <button className="nav-link logout" onClick={signOut}><LogOut size={18} /> <span>Salir del demo</span></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">MI ESPACIO DE PRÁCTICA</p>
            <h1>{greeting(page, quiz)}</h1>
          </div>
          <div className="top-stats" aria-label="Progreso">
            <span className="stat-pill"><Sparkles size={17} /> {progress.xp} XP</span>
            <span className="stat-pill streak"><Flame size={17} /> {progress.streak} días</span>
            <button className="avatar-button" onClick={() => setPage('perfil')} aria-label="Abrir perfil">{profile.nickname.slice(0, 1).toUpperCase()}</button>
          </div>
        </header>
        <div className="privacy-banner"><ShieldAlert size={18} /><span><strong>Demo: no uses datos reales.</strong> Tu perfil y progreso se guardan solo en este navegador; esto no es una cuenta segura.</span></div>

        {quiz ? (
          <QuizView
            quiz={quiz}
            questions={questions}
            onChoose={chooseAnswer}
            onAdvance={advanceQuiz}
            onExit={() => setQuiz(null)}
          />
        ) : (
          <div className="page-content">
            {page === 'inicio' && <HomeView profile={profile} progress={progress} exam={exam} areas={areasFor(exam)} setExam={setExam} setPage={setPage} />}
            {page === 'camino' && (
              <PathView
                completed={progress.completedAreas}
                areas={areasFor(exam)}
                startLesson={startLesson}
                exam={exam}
                summary={summary}
                dismissSummary={() => setSummary(null)}
              />
            )}
            {page === 'repaso' && (
              <ReviewView
                reviews={progress.reviews}
                due={reviewDue}
                questions={questions}
                onStart={startReview}
                summary={summary?.source === 'review' ? summary : null}
                dismissSummary={() => setSummary(null)}
              />
            )}
            {page === 'ligas' && <LeagueView progress={progress} />}
            {page === 'perfil' && <ProfileView profile={profile} progress={progress} areas={areasFor(exam)} onSignOut={signOut} />}
          </div>
        )}
      </main>
      <nav className="mobile-nav" aria-label="Navegación principal">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setQuiz(null); setSummary(null); }}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function greeting(page: Page, quiz: Quiz | null): string {
  if (quiz) return quiz.source === 'review' ? 'Un repaso a la vez' : quiz.areaId;
  return {
    inicio: '¡Qué bueno verte!',
    camino: 'Tu camino de aprendizaje',
    repaso: 'Mi error de hoy',
    ligas: 'Liga semanal de práctica',
    perfil: 'Tu perfil de demo',
  }[page];
}

function AuthScreen({
  mode,
  setMode,
  onRegister,
  onLogin,
  error,
}: {
  mode: 'register' | 'login';
  setMode: (mode: 'register' | 'login') => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="brand auth-brand"><span className="brand-mark">R</span><span>reto saber<small>práctica con propósito</small></span></div>
        <div className="auth-copy">
          <span className="tagline">UN PASO CORTO, UN GRAN AVANCE</span>
          <h1>Aprender también puede sentirse como un camino.</h1>
          <p>Retos breves, explicaciones claras y un lugar para volver a intentarlo.</p>
          <div className="auth-art" aria-hidden="true"><span className="sun-dot" /><span className="path-shape" /><span className="art-card">¡Cada paso cuenta!</span></div>
        </div>
        <p className="auth-footnote">Demo de práctica · sin afiliación al ICFES</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h2>{mode === 'register' ? 'Crea tu perfil de demo' : 'Entra a tu demo'}</h2>
          <p className="muted">Usa solo información ficticia. Este perfil existe únicamente en este navegador.</p>
          <div className="auth-tabs">
            <button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Crear perfil</button>
            <button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Iniciar demo</button>
          </div>
          {mode === 'register' ? (
            <form onSubmit={onRegister}>
              <label>Apodo<input name="nickname" required minLength={2} maxLength={20} placeholder="BrújulaAzul" autoComplete="off" /></label>
              <label>Grado o nivel<select name="grade" defaultValue="" required><option value="" disabled>Selecciona una opción</option><option>9.º</option><option>10.º</option><option>11.º</option><option>Universitario (referencia)</option><option>Técnico o tecnológico (referencia)</option></select></label>
              <label>Correo ficticio<input name="email" type="email" required pattern="[^@]+@[^@]+[.]invalid" title="Usa un dominio ficticio terminado en .invalid" placeholder="estudiante@demo.invalid" autoComplete="off" /></label>
              <button className="button primary full" type="submit">Crear perfil local <ChevronRight size={18} /></button>
            </form>
          ) : (
            <form onSubmit={onLogin}>
              <label>Correo ficticio usado en este navegador<input name="loginEmail" type="email" required pattern="[^@]+@[^@]+[.]invalid" title="Usa un dominio ficticio terminado en .invalid" placeholder="estudiante@demo.invalid" autoComplete="off" /></label>
              <p className="login-note"><LockKeyhole size={16} /> No hay contraseña ni autenticación real. El correo solo localiza el perfil guardado en este navegador.</p>
              <button className="button primary full" type="submit">Entrar al demo <ChevronRight size={18} /></button>
            </form>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="privacy-note"><ShieldAlert size={18} /><span><strong>Demo: no uses datos reales.</strong> No guardamos contraseñas. No incluyas documentos, direcciones ni fotos.</span></div>
          <p className="not-official">Preguntas de práctica, no oficiales. Sin afiliación al ICFES.</p>
        </div>
      </section>
    </main>
  );
}

function HomeView({
  profile,
  progress,
  exam,
  areas,
  setExam,
  setPage,
}: {
  profile: Profile;
  progress: Progress;
  exam: string;
  areas: typeof allAreas;
  setExam: (exam: string) => void;
  setPage: (page: Page) => void;
}) {
  return (
    <>
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="tagline">HOLA, {profile.nickname.toUpperCase()}</span>
          <h2>Pequeños retos,<br />grandes descubrimientos.</h2>
          <p>Elige una prueba para explorar tu ruta de práctica.</p>
          <button className="button primary" onClick={() => setPage('camino')}>Ver mi camino <ChevronRight size={18} /></button>
        </div>
        <div className="welcome-illustration" aria-hidden="true"><div className="hill hill-one" /><div className="hill hill-two" /><div className="flag">✦</div><div className="step step-one" /><div className="step step-two" /><div className="step step-three" /></div>
      </section>
      <section className="exam-section">
        <div className="section-heading"><div><p className="eyebrow">ESCOGE TU RECORRIDO</p><h2>¿Qué vas a practicar?</h2></div><span className="small-note">Puedes cambiar de prueba cuando quieras</span></div>
        <div className="exam-grid">
          {exams.map((item) => (
            <button key={item.id} className={`exam-card ${exam === item.id ? 'chosen' : ''} ${!item.active ? 'unavailable' : ''}`} onClick={() => setExam(item.id)} aria-pressed={exam === item.id} disabled={!item.active}>
              <span className={`exam-icon ${item.active ? 'ready' : ''}`}>{item.active ? <BookOpen size={23} /> : <LockKeyhole size={22} />}</span>
              <span className="exam-text"><strong>{item.label}</strong><small>{item.note}</small></span>
              {exam === item.id && <Check className="exam-check" size={20} />}
            </button>
          ))}
        </div>
      </section>
      <section className="home-lower">
        <div className="streak-card">
          <div className="streak-icon"><Flame size={24} /></div>
          <div><p className="eyebrow">TU RITMO</p><h3>{progress.streak} {progress.streak === 1 ? 'día' : 'días'} de racha</h3><p>Una práctica al día mantiene el hábito vivo.</p></div>
        </div>
        <div className="progress-card">
          <div className="section-heading compact"><div><p className="eyebrow">TU AVANCE</p><h3>{progress.completedAreas.length} de {areas.length} áreas</h3></div><span className="progress-percent">{areas.length ? Math.round(progress.completedAreas.length / areas.length * 100) : 0}%</span></div>
          <div className="progress-track"><span style={{ width: `${areas.length ? progress.completedAreas.length / areas.length * 100 : 0}%` }} /></div>
          <button className="text-button" onClick={() => setPage('camino')}>Continuar recorrido <ChevronRight size={16} /></button>
        </div>
      </section>
    </>
  );
}

function PathView({
  completed,
  startLesson,
  exam,
  areas: examAreas,
  summary,
  dismissSummary,
}: {
  completed: string[];
  startLesson: (areaId: string) => void;
  exam: string;
  areas: typeof allAreas;
  summary: { correct: number; total: number; source: Quiz['source'] } | null;
  dismissSummary: () => void;
}) {
  const selectedExam = exams.find((item) => item.id === exam);
  if (!selectedExam?.active) {
    return <div className="empty-state"><LockKeyhole size={26} /><h2>Este recorrido todavía no está disponible</h2><p>El demo incluye ejemplos solo para Saber 11. No hay una ruta de práctica publicada para {exam}.</p></div>;
  }
  return (
    <>
      {summary?.source === 'lesson' && <SummaryCard summary={summary} dismiss={dismissSummary} />}
      <div className="path-intro"><div><p className="eyebrow">{exam.toUpperCase()} · RECORRIDO DE EJEMPLO</p><h2>Un área a la vez</h2><p>Cada nivel es una lección corta con preguntas originales y explicación inmediata.</p></div><span className="path-total"><BookOpen size={18} /> {examAreas.length} niveles</span></div>
      <div className="path-grid">
        {examAreas.map((area, index) => {
          const isDone = completed.includes(area.id);
          const isLocked = index > 0 && !completed.includes(examAreas[index - 1]?.id ?? '');
          return (
            <article className={`area-card ${area.hue} ${isLocked ? 'locked' : ''} ${isDone ? 'done' : ''}`} key={area.id}>
              <div className="area-top"><span className="area-number">{isDone ? <Check size={17} /> : `NIVEL ${area.mark}`}</span>{isLocked && <LockKeyhole size={17} aria-label="Bloqueado" />}{isDone && <span className="done-label">Completado</span>}</div>
              <div className="area-art" aria-hidden="true"><span>{area.mark}</span></div>
              <h3>{area.id}</h3><p>{area.description}</p>
              <div className="area-footer"><span><Clock3 size={15} /> 4 preguntas · ~4 min</span><button className={isLocked ? 'button disabled' : 'button area-button'} disabled={isLocked} onClick={() => startLesson(area.id)}>{isDone ? 'Repetir' : isLocked ? 'Bloqueado' : 'Empezar'} {!isLocked && <ChevronRight size={16} />}</button></div>
            </article>
          );
        })}
      </div>
      <div className="content-label"><CircleHelp size={16} /> Preguntas de práctica, no oficiales. Contenido de ejemplo sin revisión curricular final.</div>
    </>
  );
}

function SummaryCard({ summary, dismiss }: { summary: { correct: number; total: number }; dismiss: () => void }) {
  return <section className="summary-card"><div className="summary-medal"><Medal size={27} /></div><div><p className="eyebrow">LECCIÓN COMPLETADA</p><h3>¡Buen trabajo! {summary.correct} de {summary.total} correctas</h3><p>Las respuestas falladas aparecerán en tus repasos.</p></div><button className="icon-button" onClick={dismiss} aria-label="Cerrar resumen">×</button></section>;
}

function QuizView({
  quiz,
  questions,
  onChoose,
  onAdvance,
  onExit,
}: {
  quiz: Quiz;
  questions: Question[];
  onChoose: (optionId: string) => void;
  onAdvance: () => void;
  onExit: () => void;
}) {
  const question = questions.find((item) => item.id === quiz.questionIds[quiz.index]);
  if (!question) return <div className="empty-state"><h2>Pregunta no disponible</h2><button className="button secondary" onClick={onExit}>Volver</button></div>;
  const correct = quiz.selected === question.respuesta;
  const progressPercent = ((quiz.index + 1) / quiz.questionIds.length) * 100;
  return (
    <section className="quiz-wrap">
      <div className="quiz-toolbar"><button className="back-button" onClick={onExit}><ArrowLeft size={18} /> Salir de la lección</button><span>{quiz.index + 1} / {quiz.questionIds.length}</span></div>
      <div className="quiz-progress"><span style={{ width: `${progressPercent}%` }} /></div>
      <div className="question-card">
        <div className="question-label"><span className="question-area">{question.area}</span><span>Pregunta de práctica, no oficial</span></div>
        <h2>{question.enunciado}</h2>
        <div className="option-list">
          {question.opciones.map((option) => {
            const selected = quiz.selected === option.id;
            const isAnswer = option.id === question.respuesta;
            const stateClass = quiz.selected ? (isAnswer ? ' correct-option' : selected ? ' wrong-option' : ' muted-option') : '';
            return <button key={option.id} className={`option-button${stateClass}`} onClick={() => onChoose(option.id)} disabled={Boolean(quiz.selected)}><span className="option-letter">{option.id}</span><span>{option.texto}</span>{quiz.selected && isAnswer && <Check className="option-check" size={19} />}</button>;
          })}
        </div>
        {quiz.selected && <div className={`answer-feedback ${correct ? 'feedback-correct' : 'feedback-wrong'}`} role="status"><span className="feedback-icon">{correct ? '✓' : '↻'}</span><div><strong>{correct ? '¡Así es!' : 'Sigue practicando'}</strong><p>{question.explicacion}</p></div></div>}
        <div className="quiz-footer"><span>{quiz.source === 'review' ? 'Repaso espaciado' : 'Tómate tu tiempo'}</span><button className="button primary" onClick={onAdvance} disabled={!quiz.selected}>{quiz.index === quiz.questionIds.length - 1 ? 'Terminar' : 'Continuar'} <ChevronRight size={18} /></button></div>
      </div>
      <p className="not-official quiz-disclaimer">Este ejercicio es material original de práctica y no representa una pregunta oficial.</p>
    </section>
  );
}

function ReviewView({
  reviews,
  due,
  questions,
  onStart,
  summary,
  dismissSummary,
}: {
  reviews: ReviewItem[];
  due: ReviewItem[];
  questions: Question[];
  onStart: () => void;
  summary: { correct: number; total: number } | null;
  dismissSummary: () => void;
}) {
  const dueIds = new Set(due.map((item) => item.questionId));
  const preview = reviews
    .map((item) => ({ item, question: questions.find((question) => question.id === item.questionId) }))
    .filter((row) => row.question);
  return (
    <>
      {summary && <SummaryCard summary={summary} dismiss={dismissSummary} />}
      <section className="review-hero"><div className="review-graphic"><RotateCcw size={30} /><span>↗</span></div><div><p className="eyebrow">REPASO ESPACIADO</p><h2>Volver a intentarlo ayuda a recordar.</h2><p>Las preguntas que fallaste regresan después de un intervalo. Si aciertas, el tiempo hasta el siguiente repaso aumenta.</p><button className="button primary" onClick={onStart} disabled={!due.length}>{due.length ? `Empezar repaso (${due.length})` : 'No hay repasos para hoy'}</button></div></section>
      {preview.length > 0 ? <section className="review-list"><div className="section-heading"><div><p className="eyebrow">TU LISTA</p><h2>Preguntas por repasar</h2></div><span className="small-note">{due.length} disponibles hoy</span></div>
        {preview.map(({ item, question }) => question && <article className="review-row" key={item.questionId}><span className={`review-status ${dueIds.has(item.questionId) ? 'is-due' : ''}`}>{dueIds.has(item.questionId) ? 'Hoy' : `En ${daysUntil(item.dueAt)} días`}</span><div><strong>{question.area}</strong><p>{question.enunciado}</p></div><span className="review-stage">Repaso {item.stage + 1}</span></article>)}
      </section> : <div className="empty-state compact-empty"><Sparkles size={27} /><h3>Tu lista está despejada</h3><p>Cuando una respuesta se te resista, aparecerá aquí para practicarla de nuevo.</p></div>}
      <p className="content-label"><CircleHelp size={16} /> El repaso es una ayuda de estudio del demo, no una medición oficial del aprendizaje.</p>
    </>
  );
}

function LeagueView({ progress }: { progress: Progress }) {
  const division = progress.division;
  const participants = [...fakeLeague, { nickname: 'Tú · demo', weeklyXp: progress.weeklyXp, current: true }]
    .sort((left, right) => right.weeklyXp - left.weeklyXp);
  const position = participants.findIndex((person) => 'current' in person && person.current) + 1;
  const movement = getLeagueMovement(position, participants.length, division);
  const movementLabel = progress.lastMovementWeek === progress.weekKey ? progress.lastMovement : movement;
  return (
    <>
      <section className="league-hero"><div className="league-medal"><Trophy size={31} /></div><div><p className="eyebrow">LIGA SEMANAL FICTICIA</p><h2>División {division}</h2><p>Un ranking ilustrativo con apodos inventados. No hay conexiones ni mensajes entre participantes.</p></div><div className="league-move"><span>{movementLabel === 'Ascenso' ? '↑' : movementLabel === 'Descenso' ? '↓' : '·'}</span><strong>{movementLabel}</strong><small>{progress.lastMovementWeek === progress.weekKey ? 'semana anterior' : 'al cierre de semana'}</small></div></section>
      <section className="league-board"><div className="league-heading"><div><p className="eyebrow">ESTA SEMANA</p><h2>Tabla de práctica</h2></div><span className="weekly-score"><Sparkles size={16} /> {progress.weeklyXp} XP tuyos</span></div>
        <div className="league-rows">{participants.map((person, index) => <div className={`league-row ${'current' in person && person.current ? 'self-row' : ''}`} key={person.nickname}><span className={`rank rank-${index + 1}`}>{index + 1}</span><span className="league-avatar">{person.nickname.slice(0, 1)}</span><strong>{person.nickname}</strong>{'current' in person && person.current && <span className="you-tag">TÚ</span>}<span className="league-xp">{person.weeklyXp} XP</span></div>)}</div>
      </section>
      <div className="fake-note"><ShieldAlert size={17} /> Todas las posiciones y puntuaciones de otras personas son ficticias. No existe una liga en línea.</div>
    </>
  );
}

function ProfileView({ profile, progress, areas: examAreas, onSignOut }: { profile: Profile; progress: Progress; areas: typeof allAreas; onSignOut: () => void }) {
  const stats = [
    { label: 'XP acumulados', value: progress.xp, icon: Sparkles },
    { label: 'Racha actual', value: `${progress.streak} días`, icon: Flame },
    { label: 'Áreas completadas', value: `${progress.completedAreas.length}/${examAreas.length}`, icon: BookOpen },
  ];
  return (
    <>
      <section className="profile-hero"><div className="profile-avatar">{profile.nickname.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">PERFIL DE ESTE NAVEGADOR</p><h2>{profile.nickname}</h2><p>{profile.grade} · {profile.email}</p></div><span className="local-only">Solo local</span></section>
      <div className="profile-stats">{stats.map(({ label, value, icon: Icon }) => <article className="profile-stat" key={label}><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>)}</div>
      <section className="profile-note"><ShieldAlert size={21} /><div><strong>Recuerda: es un perfil de demostración</strong><p>El apodo, nivel, correo ficticio y progreso se guardan localmente. No hay servidor, sincronización, contraseña ni autenticación segura.</p></div></section>
      <button className="button secondary profile-exit" onClick={onSignOut}><LogOut size={17} /> Cerrar perfil local</button>
    </>
  );
}

function daysUntil(date: string): number {
  return Math.max(1, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}

export default App;
