import { useEffect, useState } from 'react'
import { About } from './components/About'
import { Derivatives } from './components/Derivatives'
import { Drill } from './components/Drill'
import { Fractions } from './components/Fractions'
import { Match } from './components/Match'
import { ProgressView } from './components/ProgressView'
import { Review } from './components/Review'
import { Settings } from './components/Settings'
import { Shifts } from './components/Shifts'
import { Table } from './components/Table'
import type { FormId } from './data/forms'
import {
  dueCount,
  importProgress,
  loadProgress,
  recordAttempt,
  type AttemptDetail,
  recordBoard,
  recordGrade,
  recordRung,
  resetProgress,
  type Grade,
  type ProgressState,
} from './store/progress'
import { loadPrefs, savePrefs, type Prefs } from './store/prefs'

type View =
  | 'table'
  | 'drill'
  | 'match'
  | 'shifts'
  | 'fractions'
  | 'derivatives'
  | 'review'
  | 'progress'
  | 'about'
type Theme = 'light' | 'dark' | null

/** Drawn rather than an emoji, so it matches the theme glyph's weight exactly. */
function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 5.4A2.6 2.6 0 1 0 8 10.6 2.6 2.6 0 0 0 8 5.4Zm0 1.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"
      />
      <path
        fill="currentColor"
        d="m6.9 1 -.2 1.5a5.4 5.4 0 0 0-1 .6L4.3 2.5l-1.8 3 1.2 1a5.6 5.6 0 0 0 0 1.1l-1.2 1 1.8 3 1.4-.6q.5.4 1 .6L6.9 15h2.2l.2-1.5q.5-.2 1-.6l1.4.6 1.8-3-1.2-1a5.6 5.6 0 0 0 0-1.1l1.2-1-1.8-3-1.4.6a5.4 5.4 0 0 0-1-.6L9.1 1Zm1 1.3h.2l.2 1.3.7.2q.5.2.9.5l.6.4 1.2-.5.6 1-1 .8.1.7a4.3 4.3 0 0 1 0 .6l-.1.7 1 .8-.6 1-1.2-.5-.6.4a4.1 4.1 0 0 1-.9.5l-.7.2-.2 1.3H7.7l-.2-1.3-.7-.2a4.1 4.1 0 0 1-.9-.5l-.6-.4-1.2.5-.6-1 1-.8-.1-.7a4.3 4.3 0 0 1 0-.6l.1-.7-1-.8.6-1 1.2.5.6-.4q.4-.3.9-.5l.7-.2.2-1.3Z"
      />
    </svg>
  )
}

const THEME_KEY = 'laplace-trainer-theme'

const VIEWS: { id: View; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'drill', label: 'Drill' },
  { id: 'match', label: 'Match' },
  { id: 'shifts', label: 'Shifts' },
  { id: 'fractions', label: 'Fractions' },
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
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const onAnswer = (ids: string[], correct: boolean, detail?: AttemptDetail) =>
    setProgress((p) => recordAttempt(p, ids, correct, detail))
  const onGrade = (id: string, grade: Grade) => setProgress((p) => recordGrade(p, id, grade))
  const onBoard = (size: number, ms: number) => setProgress((p) => recordBoard(p, size, ms))
  const onRung = (which: 'shift' | 'frac') => (rung: number, run: number) =>
    setProgress((p) => recordRung(p, which, rung, run))
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
        <div className="header-tools">
          <div className="settings-anchor">
            <button
              className={settingsOpen ? 'btn icon-btn icon-btn-active' : 'btn icon-btn'}
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label="Settings"
              aria-expanded={settingsOpen}
              title="Settings"
            >
              <GearIcon />
            </button>
            {settingsOpen ? (
              <Settings
                prefs={prefs}
                onPrefs={updatePrefs}
                onClose={() => setSettingsOpen(false)}
              />
            ) : null}
          </div>
          <button className="btn icon-btn" onClick={toggleTheme} aria-label="Toggle color theme">
            ◐
          </button>
        </div>
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
        {view === 'shifts' ? (
          <Shifts
            progress={progress}
            prefs={prefs}
            onPrefs={updatePrefs}
            onAnswer={onAnswer}
            onRung={onRung('shift')}
          />
        ) : null}
        {view === 'fractions' ? (
          <Fractions
            progress={progress}
            prefs={prefs}
            onPrefs={updatePrefs}
            onAnswer={onAnswer}
            onRung={onRung('frac')}
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
