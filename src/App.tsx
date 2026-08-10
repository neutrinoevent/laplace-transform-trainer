import { useEffect, useState } from 'react'
import { About } from './components/About'
import { Derivatives } from './components/Derivatives'
import { Drill } from './components/Drill'
import { Match } from './components/Match'
import { ProgressView } from './components/ProgressView'
import { Review } from './components/Review'
import { Table } from './components/Table'
import type { FormId } from './data/forms'
import {
  dueCount,
  importProgress,
  loadProgress,
  recordAttempt,
  recordBoard,
  recordGrade,
  resetProgress,
  type Grade,
  type ProgressState,
} from './store/progress'
import { loadPrefs, savePrefs, type Prefs } from './store/prefs'

type View = 'table' | 'drill' | 'match' | 'derivatives' | 'review' | 'progress' | 'about'
type Theme = 'light' | 'dark' | null

const THEME_KEY = 'laplace-trainer-theme'

const VIEWS: { id: View; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'drill', label: 'Drill' },
  { id: 'match', label: 'Match' },
  { id: 'derivatives', label: 'Derivatives' },
  { id: 'review', label: 'Review' },
  { id: 'progress', label: 'Progress' },
  { id: 'about', label: 'About' },
]

function initTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

export default function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())
  // The table is the anchor, so a first-time visitor lands on it; anyone with
  // history has already read it and wants the drill.
  const [view, setView] = useState<View>(() => (loadProgress().totalAttempts > 0 ? 'drill' : 'table'))
  const [theme, setTheme] = useState<Theme>(() => initTheme())

  useEffect(() => {
    const root = document.documentElement
    if (theme) {
      root.setAttribute('data-theme', theme)
      try {
        localStorage.setItem(THEME_KEY, theme)
      } catch {
        // storage unavailable — theme just won't persist
      }
    } else {
      root.removeAttribute('data-theme')
    }
  }, [theme])

  const toggleTheme = () => {
    const dark =
      theme === 'dark' ||
      (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setTheme(dark ? 'light' : 'dark')
  }

  const updatePrefs = (next: Prefs) => {
    setPrefs(next)
    savePrefs(next)
  }

  const onAnswer = (ids: string[], correct: boolean) =>
    setProgress((p) => recordAttempt(p, ids, correct))
  const onGrade = (id: string, grade: Grade) => setProgress((p) => recordGrade(p, id, grade))
  const onBoard = (size: number, ms: number) => setProgress((p) => recordBoard(p, size, ms))
  const onImport = (json: string): boolean => {
    const next = importProgress(json)
    if (next) setProgress(next)
    return next !== null
  }

  const drillRow = (form: FormId) => {
    updatePrefs({ ...prefs, scope: [form] })
    setView('drill')
  }

  const due = dueCount(progress)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ℒ
          </span>
          <span className="brand-name">Laplace Trainer</span>
        </div>
        <nav className="tabs" aria-label="Main">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={view === v.id ? 'tab tab-active' : 'tab'}
              onClick={() => setView(v.id)}
              aria-current={view === v.id ? 'page' : undefined}
            >
              {v.label}
              {v.id === 'review' && due > 0 ? <span className="due-dot">{due}</span> : null}
            </button>
          ))}
        </nav>
        <button className="btn icon-btn" onClick={toggleTheme} aria-label="Toggle color theme">
          ◐
        </button>
      </header>

      <main className="main">
        {view === 'table' ? <Table progress={progress} onDrill={drillRow} /> : null}
        {view === 'drill' ? (
          <Drill progress={progress} prefs={prefs} onPrefs={updatePrefs} onAnswer={onAnswer} />
        ) : null}
        {view === 'match' ? (
          <Match
            progress={progress}
            prefs={prefs}
            onPrefs={updatePrefs}
            onAnswer={onAnswer}
            onBoard={onBoard}
          />
        ) : null}
        {view === 'derivatives' ? (
          <Derivatives progress={progress} prefs={prefs} onPrefs={updatePrefs} onAnswer={onAnswer} />
        ) : null}
        {view === 'review' ? (
          <Review progress={progress} prefs={prefs} onPrefs={updatePrefs} onGrade={onGrade} />
        ) : null}
        {view === 'progress' ? (
          <ProgressView
            progress={progress}
            onReset={() => setProgress(resetProgress())}
            onImport={onImport}
          />
        ) : null}
        {view === 'about' ? <About /> : null}
      </main>

      <footer className="footer muted">© 2026 Alexander Nichols · Old Dominion University</footer>
    </div>
  )
}
