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
import { isValidEmail } from './lib/demo-profile';
import rawQuestions from '../contenido/preguntas.json';
import additionalQuestions from '../contenido/preguntas-niveles.json';
import catalog from '../contenido/catalogo.json';
import {
  getLeagueMovement,
  type ReviewItem,
} from './lib/game';
import {
  completePractice,
  createInitialProgress,
  loadDemoState,
  parseProfile,
  recordDiagnostic,
  skipDiagnostic as markDiagnosticSkipped,
  type Profile,
  type Progress,
} from './lib/demo-state';
import {
  createAreaAssessment,
  selectDiagnosticSections,
  type AreaAssessment,
  type DiagnosticSection,
} from './lib/diagnostic';

type Question = (typeof rawQuestions)[number];
type Page = 'inicio' | 'camino' | 'repaso' | 'ligas' | 'perfil';
type Quiz = {
  areaId: string;
  levelId?: string;
  questionIds: string[];
  source: 'lesson' | 'review' | 'diagnostic';
  index: number;
  selected: string | null;
  answers: Record<string, boolean>;
  sections?: DiagnosticSection[];
  sectionIndex?: number;
  sectionAnswers?: Record<string, Record<string, boolean>>;
};
type Summary =
  | { kind: 'practice'; correct: number; total: number; source: 'lesson' | 'review' }
  | { kind: 'diagnostic'; assessments: AreaAssessment[] };

const exams = catalog.examenes.map((item) => ({
  id: item.id,
  label: item.id,
  note: item.nota,
  active: item.disponible,
}));
const levels = catalog.niveles.map((item) => ({
  id: item.id,
  name: item.nombre,
  difficulty: item.dificultad,
  description: item.descripcion,
}));

const allAreas = catalog.areas.map((item) => ({
  exam: item.examen,
  id: item.id,
  mark: item.marca,
  hue: item.tono,
  description: item.descripcion,
}));
const questions = [...rawQuestions, ...additionalQuestions] as Question[];
const allLevelIds = new Set(
  allAreas.flatMap((area) => levels.map((level) => levelKey(area.id, level.id))),
);

function areasFor(examId: string) {
  return allAreas.filter((area) => area.exam === examId);
}

function levelKey(areaId: string, levelId: string): string {
  return `${areaId}::${levelId}`;
}

function createDiagnosticQuiz(): Quiz {
  const sections = selectDiagnosticSections(
    questions,
    areasFor('Saber 11').map((area) => area.id),
  );
  const firstSection = sections[0];
  if (!firstSection) throw new Error('El catálogo no contiene áreas para el diagnóstico.');
  return {
    areaId: firstSection.areaId,
    questionIds: firstSection.questionIds,
    source: 'diagnostic',
    index: 0,
    selected: null,
    answers: {},
    sections,
    sectionIndex: 0,
    sectionAnswers: {},
  };
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

function App() {
  const [initialState] = useState(() => {
    try {
      return loadDemoState(
        window.localStorage,
        new Date(),
        fakeLeague.map((person) => person.weeklyXp),
        new Set(questions.map((question) => question.id)),
        new Set(catalog.areas.map((area) => area.id)),
        allLevelIds,
      );
    } catch {
      return {
        profile: null,
        progress: createInitialProgress(),
        warning: 'El almacenamiento local no está disponible. El demo no podrá recuperar ni guardar los datos del navegador.',
      };
    }
  });
  const [profile, setProfile] = useState<Profile | null>(initialState.profile);
  const [progress, setProgress] = useState<Progress>(initialState.progress);
  const [storageWarning, setStorageWarning] = useState(initialState.warning);
  const [page, setPage] = useState<Page>('inicio');
  const [exam, setExam] = useState('Saber 11');
  const [quiz, setQuiz] = useState<Quiz | null>(() => (
    initialState.profile &&
    !initialState.progress.diagnosticSkipped &&
    initialState.progress.assessments.length === 0
      ? createDiagnosticQuiz()
      : null
  ));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authError, setAuthError] = useState('');

  const reviewDue = useMemo(
    () => progress.reviews.filter((item) => new Date(item.dueAt).getTime() <= Date.now()),
    [progress.reviews],
  );

  function persistProfile(next: Profile | null) {
    try {
      if (next) localStorage.setItem('reto-saber.profile', JSON.stringify(next));
      else localStorage.removeItem('reto-saber.profile');
      setStorageWarning(null);
    } catch {
      setStorageWarning('El perfil está abierto solo en memoria y no pudo guardarse en este navegador.');
    }
    setProfile(next);
  }

  function saveProgress(next: Progress) {
    try {
      localStorage.setItem('reto-saber.progress', JSON.stringify(next));
      setStorageWarning(null);
    } catch {
      setStorageWarning('El progreso cambió en esta sesión, pero el navegador no permitió guardarlo localmente.');
    }
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
    if (!next.nickname || !next.grade || !isValidEmail(next.email)) {
      setAuthError('Completa los campos y escribe un correo electrónico válido.');
      return;
    }
    persistProfile(next);
    setExam('Saber 11');
    setPage('camino');
    setQuiz(createDiagnosticQuiz());
    setSummary(null);
    setAuthError('');
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('loginEmail')).trim().toLowerCase();
    if (!isValidEmail(email)) {
      setAuthError('Escribe un correo electrónico válido.');
      return;
    }
    let storedProfile: Profile | null;
    try {
      storedProfile = parseProfile(localStorage.getItem('reto-saber.profile'));
    } catch {
      setAuthError('No se pudo leer el perfil guardado. El dato local puede estar dañado.');
      return;
    }
    if (storedProfile?.email !== email) {
      setAuthError('No hay un perfil local con ese correo en este navegador.');
      return;
    }
    setProfile(storedProfile);
    if (!progress.diagnosticSkipped && progress.assessments.length === 0) {
      setPage('camino');
      setQuiz(createDiagnosticQuiz());
    }
    setAuthError('');
  }

  function startDiagnostic() {
    setExam('Saber 11');
    setPage('camino');
    setSummary(null);
    setQuiz(createDiagnosticQuiz());
  }

  function skipDiagnostic() {
    saveProgress(markDiagnosticSkipped(progress));
    setQuiz(null);
    setPage('camino');
  }

  function startLesson(areaId: string, levelId: string) {
    const selectedLevel = levels.find((item) => item.id === levelId);
    if (!selectedLevel) return;
    const areaQuestions = questions.filter((question) => (
      question.examen === exam && question.area === areaId && question.nivel === selectedLevel.difficulty
    ));
    if (!areaQuestions.length) return;
    setSummary(null);
    setQuiz({
      areaId,
      levelId: levelKey(areaId, levelId),
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

    const completed = quiz;
    const now = new Date();
    if (completed.source === 'diagnostic') {
      const sections = completed.sections ?? [];
      const sectionIndex = completed.sectionIndex ?? 0;
      const sectionAnswers = {
        ...completed.sectionAnswers,
        [completed.areaId]: completed.answers,
      };
      const nextSection = sections[sectionIndex + 1];
      if (nextSection) {
        setQuiz({
          ...completed,
          areaId: nextSection.areaId,
          questionIds: nextSection.questionIds,
          index: 0,
          selected: null,
          answers: {},
          sectionIndex: sectionIndex + 1,
          sectionAnswers,
        });
        return;
      }
      const assessments = sections.map((section) => createAreaAssessment(
        section.areaId,
        section.questionIds,
        sectionAnswers[section.areaId] ?? {},
        now,
      ));
      saveProgress(recordDiagnostic(progress, assessments));
      setSummary({ kind: 'diagnostic', assessments });
      setQuiz(null);
      setPage('camino');
      return;
    }
    const correct = Object.values(completed.answers).filter(Boolean).length;
    const nextProgress = completePractice(
      progress,
      {
        areaId: completed.areaId,
        source: completed.source,
        questionIds: completed.questionIds,
        answers: completed.answers,
        levelId: completed.levelId,
        areaLevelIds: levels.map((level) => levelKey(completed.areaId, level.id)),
      },
      now,
      fakeLeague.map((person) => person.weeklyXp),
    );
    saveProgress(nextProgress);
    setSummary({ kind: 'practice', correct, total: completed.questionIds.length, source: completed.source });
    setQuiz(null);
    setPage(completed.source === 'review' ? 'repaso' : 'camino');
  }

  function signOut() {
    setProfile(null);
    setAuthMode('login');
    setPage('inicio');
    setQuiz(null);
  }

  function deleteProfile() {
    if (!window.confirm('¿Eliminar el perfil y todo el progreso guardado en este navegador?')) return;
    try {
      localStorage.removeItem('reto-saber.profile');
      localStorage.removeItem('reto-saber.progress');
      setStorageWarning(null);
    } catch {
      setStorageWarning('No se pudo borrar el almacenamiento local. El perfil se cerrará, pero los datos guardados podrían seguir en este navegador.');
    }
    setProfile(null);
    setProgress(createInitialProgress());
    setQuiz(null);
    setSummary(null);
    setAuthMode('register');
    setPage('inicio');
  }

  if (!profile) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        onRegister={handleRegister}
        onLogin={handleLogin}
        error={authError}
        storageWarning={storageWarning}
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
        <div className="privacy-banner"><ShieldAlert size={18} /><span><strong>Demo: evita ingresar datos reales sensibles.</strong> El correo que elijas queda solo en este navegador, sin cifrar ni enviarse; esto no es una cuenta segura.</span></div>
        {storageWarning && <div className="storage-warning" role="status"><ShieldAlert size={17} /><span>{storageWarning}</span></div>}

        {quiz ? (
          <QuizView
            quiz={quiz}
            questions={questions}
            onChoose={chooseAnswer}
            onAdvance={advanceQuiz}
            onExit={() => setQuiz(null)}
            onSkipDiagnostic={skipDiagnostic}
          />
        ) : (
          <div className="page-content">
            {page === 'inicio' && <HomeView profile={profile} progress={progress} exam={exam} areas={areasFor(exam)} setExam={setExam} setPage={setPage} />}
            {page === 'camino' && (
              <PathView
                completed={progress.completedLevels}
                areas={areasFor(exam)}
                startLesson={startLesson}
                exam={exam}
                summary={summary}
                dismissSummary={() => setSummary(null)}
                assessments={progress.assessments}
                startDiagnostic={startDiagnostic}
              />
            )}
            {page === 'repaso' && (
              <ReviewView
                reviews={progress.reviews}
                due={reviewDue}
                questions={questions}
                onStart={startReview}
                summary={summary?.kind === 'practice' && summary.source === 'review' ? summary : null}
                dismissSummary={() => setSummary(null)}
              />
            )}
            {page === 'ligas' && <LeagueView progress={progress} />}
            {page === 'perfil' && <ProfileView profile={profile} progress={progress} areas={areasFor(exam)} onSignOut={signOut} onDeleteProfile={deleteProfile} />}
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
  if (quiz) {
    if (quiz.source === 'review') return 'Un repaso a la vez';
    if (quiz.source === 'diagnostic') return 'Orientación inicial por áreas';
    return quiz.areaId;
  }
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
  storageWarning,
}: {
  mode: 'register' | 'login';
  setMode: (mode: 'register' | 'login') => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
  storageWarning: string | null;
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
          <p className="muted">El perfil existe únicamente en este navegador. Al registrarte, podrás hacer u omitir una orientación inicial por materia.</p>
          <div className="auth-tabs">
            <button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Crear perfil</button>
            <button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Iniciar demo</button>
          </div>
          {mode === 'register' ? (
            <form onSubmit={onRegister}>
              <label>Apodo<input name="nickname" required minLength={2} maxLength={20} placeholder="BrújulaAzul" autoComplete="off" /></label>
              <label>Grado o nivel<select name="grade" defaultValue="" required><option value="" disabled>Selecciona una opción</option><option>9.º</option><option>10.º</option><option>11.º</option><option>Universitario (referencia)</option><option>Técnico o tecnológico (referencia)</option></select></label>
              <label>Correo electrónico<input name="email" type="email" required maxLength={254} placeholder="tu-correo@ejemplo.com" autoComplete="email" /></label>
              <p className="auth-email-note">Puedes usar un correo que ya tengas; no se envía a ningún servidor. Solo sirve para encontrar este perfil en este navegador.</p>
              <button className="button primary full" type="submit">Crear perfil local <ChevronRight size={18} /></button>
            </form>
          ) : (
            <form onSubmit={onLogin}>
              <label>Correo usado al crear el perfil<input name="loginEmail" type="email" required maxLength={254} placeholder="tu-correo@ejemplo.com" autoComplete="email" /></label>
              <p className="login-note"><LockKeyhole size={16} /> No hay contraseña ni autenticación real. El correo solo localiza el perfil guardado en este navegador.</p>
              <button className="button primary full" type="submit">Entrar al demo <ChevronRight size={18} /></button>
            </form>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {storageWarning && <div className="storage-warning" role="status"><ShieldAlert size={17} /><span>{storageWarning}</span></div>}
          <div className="privacy-note"><ShieldAlert size={18} /><span><strong>Demo: evita ingresar datos reales sensibles.</strong> El correo que elijas queda solo en este navegador, sin cifrar ni enviarse; este perfil no es una cuenta segura. No incluyas documentos, direcciones ni fotos.</span></div>
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
  assessments,
  startDiagnostic,
}: {
  completed: string[];
  startLesson: (areaId: string, levelId: string) => void;
  exam: string;
  areas: typeof allAreas;
  summary: Summary | null;
  dismissSummary: () => void;
  assessments: AreaAssessment[];
  startDiagnostic: () => void;
}) {
  const selectedExam = exams.find((item) => item.id === exam);
  if (!selectedExam?.active) {
    return <div className="empty-state"><LockKeyhole size={26} /><h2>Este recorrido todavía no está disponible</h2><p>El demo incluye ejemplos solo para Saber 11. No hay una ruta de práctica publicada para {exam}.</p></div>;
  }
  return (
    <>
      {summary?.kind === 'practice' && summary.source === 'lesson' && <SummaryCard summary={summary} dismiss={dismissSummary} />}
      {summary?.kind === 'diagnostic' ? (
        <DiagnosticResults assessments={summary.assessments} onStart={startDiagnostic} onDismiss={dismissSummary} refreshed />
      ) : assessments.length > 0 ? (
        <DiagnosticResults assessments={assessments} onStart={startDiagnostic} />
      ) : (
        <section className="diagnostic-invite">
          <div><p className="eyebrow">ORIENTACIÓN INICIAL</p><h2>Explora tu punto de partida por área</h2><p>Son cinco preguntas breves por materia. Puedes omitirlas o volver a hacerlas cuando quieras.</p></div>
          <button className="button secondary" onClick={startDiagnostic}>Hacer diagnóstico orientador <ChevronRight size={17} /></button>
        </section>
      )}
      <div className="path-intro"><div><p className="eyebrow">{exam.toUpperCase()} · RECORRIDO DE EJEMPLO</p><h2>Elige un área y avanza a tu ritmo</h2><p>Todos los módulos y niveles están abiertos. Cada nivel tiene cinco preguntas originales con dificultad creciente.</p></div><span className="path-total"><BookOpen size={18} /> {examAreas.length} áreas · {levels.length} niveles</span></div>
      <div className="path-grid">
        {examAreas.map((area, index) => {
          const assessment = assessments.find((item) => item.areaId === area.id);
          const areaLevelKeys = levels.map((level) => levelKey(area.id, level.id));
          const isDone = areaLevelKeys.every((id) => completed.includes(id));
          return (
            <article className={`area-card ${area.hue} ${isDone ? 'done' : ''}`} key={area.id}>
              <div className="area-top"><span className="area-number">MÓDULO {String(index + 1).padStart(2, '0')}</span>{isDone && <span className="done-label"><Check size={15} /> Completado</span>}</div>
              <div className="area-art" aria-hidden="true"><span>{area.mark}</span></div>
              <h3>{area.id}</h3><p>{area.description}</p>
              <div className="level-list">
                {levels.map((level) => {
                  const key = levelKey(area.id, level.id);
                  const isLevelDone = completed.includes(key);
                  const recommended = assessment?.suggestedLevel === level.difficulty;
                  return (
                    <div className={`level-row ${isLevelDone ? 'level-done' : ''}`} key={level.id}>
                      <div className="level-copy"><strong>{level.name}</strong><small>{level.description}</small>{recommended && <span className="recommendation-tag">Inicio sugerido · {assessment.correct}/5</span>}</div>
                      <button className="button area-button" onClick={() => startLesson(area.id, level.id)} aria-label={`${isLevelDone ? 'Repetir' : 'Empezar'} ${level.name} de ${area.id}`}>{isLevelDone ? 'Repetir' : 'Empezar'} <ChevronRight size={16} /></button>
                    </div>
                  );
                })}
              </div>
              <span className="level-length"><Clock3 size={15} /> 5 preguntas por nivel · alrededor de 5 min</span>
            </article>
          );
        })}
      </div>
      <div className="content-label"><CircleHelp size={16} /> La recomendación orienta el nivel inicial según este ejercicio breve; no depende del grado ni predice una calificación. Preguntas de práctica, no oficiales y pendientes de revisión curricular.</div>
    </>
  );
}

function SummaryCard({ summary, dismiss }: { summary: { correct: number; total: number }; dismiss: () => void }) {
  return <section className="summary-card"><div className="summary-medal"><Medal size={27} /></div><div><p className="eyebrow">LECCIÓN COMPLETADA</p><h3>¡Buen trabajo! {summary.correct} de {summary.total} correctas</h3><p>Las respuestas falladas aparecerán en tus repasos.</p></div><button className="icon-button" onClick={dismiss} aria-label="Cerrar resumen">×</button></section>;
}

function DiagnosticResults({
  assessments,
  onStart,
  onDismiss,
  refreshed = false,
}: {
  assessments: AreaAssessment[];
  onStart: () => void;
  onDismiss?: () => void;
  refreshed?: boolean;
}) {
  return (
    <section className="diagnostic-results">
      <div className="diagnostic-heading">
        <div><p className="eyebrow">{refreshed ? 'ORIENTACIÓN ACTUALIZADA' : 'TU PUNTO DE PARTIDA'}</p><h2>Una sugerencia para cada área</h2></div>
        <div className="diagnostic-actions"><button className="button secondary" onClick={onStart}>Repetir orientación</button>{onDismiss && <button className="icon-button" onClick={onDismiss} aria-label="Cerrar resultados">×</button>}</div>
      </div>
      <p className="diagnostic-disclaimer">Orientación ilustrativa basada en cinco respuestas por materia. Puedes elegir cualquier nivel; no es una calificación oficial ni una predicción.</p>
      <div className="assessment-grid">
        {assessments.map((assessment) => <article className="assessment-card" key={assessment.areaId}><strong>{assessment.areaId}</strong><span>{assessment.correct}/{assessment.total} correctas</span><small>Inicio sugerido: <b>{assessment.suggestedLevel}</b></small></article>)}
      </div>
    </section>
  );
}

function QuizView({
  quiz,
  questions,
  onChoose,
  onAdvance,
  onExit,
  onSkipDiagnostic,
}: {
  quiz: Quiz;
  questions: Question[];
  onChoose: (optionId: string) => void;
  onAdvance: () => void;
  onExit: () => void;
  onSkipDiagnostic: () => void;
}) {
  const question = questions.find((item) => item.id === quiz.questionIds[quiz.index]);
  if (!question) return <div className="empty-state"><h2>Pregunta no disponible</h2><button className="button secondary" onClick={onExit}>Volver</button></div>;
  const correct = quiz.selected === question.respuesta;
  const progressPercent = ((quiz.index + 1) / quiz.questionIds.length) * 100;
  const diagnosticSection = (quiz.sectionIndex ?? 0) + 1;
  const diagnosticSectionCount = quiz.sections?.length ?? 0;
  const diagnosticLastSection = diagnosticSection === diagnosticSectionCount;
  const diagnosticLastQuestion = quiz.index === quiz.questionIds.length - 1;
  const nextLabel = quiz.source === 'diagnostic'
    ? diagnosticLastQuestion
      ? diagnosticLastSection ? 'Ver orientación' : 'Siguiente área'
      : 'Continuar'
    : quiz.index === quiz.questionIds.length - 1 ? 'Terminar' : 'Continuar';
  return (
    <section className="quiz-wrap">
      <div className="quiz-toolbar">
        <button className="back-button" onClick={onExit}><ArrowLeft size={18} /> {quiz.source === 'diagnostic' ? 'Salir' : 'Salir de la lección'}</button>
        <span>{quiz.source === 'diagnostic' ? `Materia ${diagnosticSection}/${diagnosticSectionCount} · ${quiz.areaId} · ` : ''}{quiz.index + 1} / {quiz.questionIds.length}</span>
        {quiz.source === 'diagnostic' && <button className="text-button skip-diagnostic" onClick={onSkipDiagnostic}>Omitir diagnóstico</button>}
      </div>
      <div className="quiz-progress"><span style={{ width: `${progressPercent}%` }} /></div>
      <div className="question-card">
        <div className="question-label"><span className="question-area">{question.area} · {question.nivel}</span><span>Pregunta de práctica, no oficial</span></div>
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
        <div className="quiz-footer"><span>{quiz.source === 'review' ? 'Repaso espaciado' : quiz.source === 'diagnostic' ? 'Orientación, no calificación' : 'Tómate tu tiempo'}</span><button className="button primary" onClick={onAdvance} disabled={!quiz.selected}>{nextLabel} <ChevronRight size={18} /></button></div>
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

function ProfileView({ profile, progress, areas: examAreas, onSignOut, onDeleteProfile }: { profile: Profile; progress: Progress; areas: typeof allAreas; onSignOut: () => void; onDeleteProfile: () => void }) {
  const stats = [
    { label: 'XP acumulados', value: progress.xp, icon: Sparkles },
    { label: 'Racha actual', value: `${progress.streak} días`, icon: Flame },
    { label: 'Áreas completadas', value: `${progress.completedAreas.length}/${examAreas.length}`, icon: BookOpen },
  ];
  return (
    <>
      <section className="profile-hero"><div className="profile-avatar">{profile.nickname.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">PERFIL DE ESTE NAVEGADOR</p><h2>{profile.nickname}</h2><p>{profile.grade} · Correo guardado solo localmente</p></div><span className="local-only">Solo local</span></section>
      <div className="profile-stats">{stats.map(({ label, value, icon: Icon }) => <article className="profile-stat" key={label}><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>)}</div>
      <section className="profile-note"><ShieldAlert size={21} /><div><strong>Recuerda: es un perfil de demostración</strong><p>El correo y el progreso se guardan localmente en texto legible y no se envían a un servidor. No hay sincronización, contraseña, cifrado ni autenticación segura.</p></div></section>
      <button className="button secondary profile-exit" onClick={onSignOut}><LogOut size={17} /> Cerrar perfil local</button>
      <button className="button delete-profile" onClick={onDeleteProfile}>Eliminar perfil y progreso de este navegador</button>
    </>
  );
}

function daysUntil(date: string): number {
  return Math.max(1, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}

export default App;
