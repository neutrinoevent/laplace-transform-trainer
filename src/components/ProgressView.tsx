import { useState } from 'react'
import { FORMS } from '../data/forms'
import { RULE_CARDS } from '../data/cards'
import { itemId } from '../generators/types'
import { TIER_LABEL, overallScore, tierFor } from '../lib/mastery'
import {
  dueCount,
  exportProgress,
  statsFor,
  type ProgressState,
} from '../store/progress'
import { Tex } from './Tex'

function Meter({ value }: { value: number }) {
  return (
    <>
      <span className="meter">
        <span className="meter-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="meter-num">{Math.round(value * 100)}%</span>
    </>
  )
}

interface ProgressViewProps {
  progress: ProgressState
  onReset: () => void
  onImport: (json: string) => boolean
}

export function ProgressView({ progress, onReset, onImport }: ProgressViewProps) {
  const [backup, setBackup] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const accuracy =
    progress.totalAttempts > 0
      ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100)
      : 0

  return (
    <section>
      <div className="stat-row">
        <div className="card stat-tile">
          <div className="stat-value">{Math.round(overallScore(progress) * 100)}%</div>
          <div className="stat-label">Mastery</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{progress.totalAttempts}</div>
          <div className="stat-label">Answered</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{progress.bestStreak}</div>
          <div className="stat-label">Best streak</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{dueCount(progress)}</div>
          <div className="stat-label">Cards due</div>
        </div>
      </div>

      <div className="card table-card">
        <h2 className="section-title">Row by row, in both directions</h2>
        <p className="meta-note" style={{ marginBottom: 12 }}>
          Reading a row backwards is scored separately — it is where the fix-up lives, and it is
          usually the weaker of the two.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th />
              <th>Row</th>
              <th>
                <Tex tex="\mathcal{L}" /> forward
              </th>
              <th>
                <Tex tex="\mathcal{L}^{-1}" /> inverse
              </th>
              <th className="num">Seen</th>
            </tr>
          </thead>
          <tbody>
            {FORMS.map((f) => {
              const fwd = statsFor(progress, itemId(f.id, 'forward'))
              const inv = statsFor(progress, itemId(f.id, 'inverse'))
              return (
                <tr key={f.id}>
                  <td style={{ color: 'var(--accent)', fontWeight: 650 }}>({f.letter})</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div className="meta-note">
                      <Tex tex={`${f.genericF} \\;\\leftrightarrow\\; ${f.genericS}`} />
                    </div>
                  </td>
                  <td>
                    <Meter value={fwd.ema} />
                  </td>
                  <td>
                    <Meter value={inv.ema} />
                  </td>
                  <td className="num">{fwd.attempts + inv.attempts}</td>
                </tr>
              )
            })}
            {RULE_CARDS.map((c) => {
              const s = statsFor(progress, c.id)
              return (
                <tr key={c.id}>
                  <td />
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.label}</div>
                    <div className="meta-note">Review card only</div>
                  </td>
                  <td colSpan={2}>
                    <span className={`tier-chip tier-${tierFor(s)}`}>{TIER_LABEL[tierFor(s)]}</span>
                  </td>
                  <td className="num">{s.reps}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="reset-row">
          <button
            className="btn"
            onClick={() => {
              setBackup(exportProgress(progress))
              setMessage('Copy this out, or paste a backup over it and press Restore.')
            }}
          >
            Backup
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Erase all progress on this browser?')) {
                onReset()
                setBackup(null)
                setMessage('Progress cleared.')
              }
            }}
          >
            Reset progress
          </button>
        </div>

        {backup !== null ? (
          <>
            <textarea
              className="backup-box"
              value={backup}
              spellCheck={false}
              onChange={(e) => setBackup(e.target.value)}
              aria-label="Progress backup"
            />
            <div className="reset-row" style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => setBackup(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setMessage(onImport(backup) ? 'Backup restored.' : 'That is not a valid backup.')}
              >
                Restore
              </button>
            </div>
          </>
        ) : null}

        {message ? (
          <p className="meta-note" style={{ marginTop: 10, marginBottom: 0 }}>
            {message}
          </p>
        ) : null}
      </div>
    </section>
  )
}
