import { useState } from 'react'
import { FORMS } from '../data/forms'
import { CARD_BY_ID, RULE_CARDS } from '../data/cards'
import { DERIV_ITEM } from '../generators/derivative'
import { IVP_ITEM } from '../generators/ivp'
import { SLIP_BY_ID } from '../data/slips'
import { FACET_LABEL, hardFacet } from '../lib/facets'
import { FRACTION_ITEMS } from '../generators/fraction'
import { shiftItemId } from '../generators/shift'
import { itemId } from '../generators/types'
import { TIER_LABEL, heldBack, overallScore, tierFor } from '../lib/mastery'
import {
  dueCount,
  exportProgress,
  statsFor,
  type ProgressState,
} from '../store/progress'
import { Rich, Tex } from './Tex'

/**
 * What keeps going wrong, counted once wherever it happens.
 *
 * The same slip made on three different rows is one problem, not three weak
 * rows — and this is the only place in the app that can say so.
 */
function SlipReport({ progress }: { progress: ProgressState }) {
  const ranked = Object.entries(progress.slips)
    .map(([id, s]) => ({ slip: SLIP_BY_ID.get(id as never), ...s }))
    .filter((r) => r.slip)
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
    .slice(0, 5)

  if (!ranked.length) {
    return (
      <div className="card">
        <h2 className="section-title">Where the marks go</h2>
        <p className="meta-note" style={{ marginBottom: 0 }}>
          Nothing to report yet. Wrong answers are recorded by the mistake they represent, so the
          same slip made across different rows is counted once rather than as several weak rows.
        </p>
      </div>
    )
  }

  const total = ranked.reduce((n, r) => n + r.count, 0)
  return (
    <div className="card">
      <h2 className="section-title">Where the marks go</h2>
      <p className="meta-note" style={{ marginBottom: 12 }}>
        Counted by the mistake rather than by the row it happened on — {total} of them so far.
      </p>
      <ul className="slip-list">
        {ranked.map((r) => (
          <li key={r.slip!.id} className="slip">
            <div className="slip-head">
              <span className="slip-name">{r.slip!.name}</span>
              <span className="slip-count">
                {r.count}
                <span className="meta-note"> ×</span>
              </span>
            </div>
            <p className="slip-what">
              <Rich text={r.slip!.what} />
            </p>
            <p className="slip-fix">
              <Rich text={r.slip!.fix} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Given the item it measures, a meter also says when the number is not the
 * whole story: a skill with a harder variant it has not met yet is being scored
 * on its easy half, and is held below proficient until it has.
 */
function Meter({
  value,
  progress,
  id,
}: {
  value: number
  progress?: ProgressState
  id?: string
}) {
  const held = progress && id ? heldBack(progress, id) : false
  return (
    <>
      <span className="meter">
        <span className="meter-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="meter-num">{Math.round(value * 100)}%</span>
      {held ? (
        <div className="meta-note held">capped until {FACET_LABEL[hardFacet(id!)!]} is met</div>
      ) : null}
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

      <SlipReport progress={progress} />

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
                    <Meter value={inv.ema} progress={progress} id={itemId(f.id, 'inverse')} />
                  </td>
                  <td className="num">{fwd.attempts + inv.attempts}</td>
                </tr>
              )
            })}
            {RULE_CARDS.filter((c) => !c.id.startsWith('rule:') || c.id === 'rule:linearity' || c.id === 'rule:fixup').map((c) => {
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

      </div>

      <div className="card table-card">
        <h2 className="section-title">Partial fractions</h2>
        <p className="meta-note" style={{ marginBottom: 12 }}>
          The method and the sub-method it leans on, scored separately — completing the square is
          needed here and again for the first translation theorem.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Mastery</th>
              <th className="num">Seen</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                [FRACTION_ITEMS.square, 'Completing the square', 'An irreducible quadratic to $(s-a)^2 + k^2$'],
                [FRACTION_ITEMS.form, 'The shape', 'Which decomposition a denominator calls for'],
                [FRACTION_ITEMS.linear, 'Distinct factors', 'Decompose and invert over distinct linear factors'],
                [FRACTION_ITEMS.hard, 'Repeated & quadratic', 'The cases needing Theorem 7.3.1 or the square completed'],
              ] as const
            ).map(([id, name, blurb]) => {
              const st = statsFor(progress, id)
              return (
                <tr key={id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    <div className="meta-note">
                      <Rich text={blurb} />
                    </div>
                  </td>
                  <td>
                    <Meter value={st.ema} progress={progress} id={id} />
                  </td>
                  <td className="num">{st.attempts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card table-card">
        <h2 className="section-title">Translation theorems</h2>
        <p className="meta-note" style={{ marginBottom: 12 }}>
          A shift in one domain is a multiplier in the other. Each theorem is scored in both
          directions, since spotting a translation in a given transform is the harder half.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Theorem</th>
              <th>
                <Tex tex="\\mathcal{L}" /> forward
              </th>
              <th>
                <Tex tex="\\mathcal{L}^{-1}" /> inverse
              </th>
              <th className="num">Seen</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['first', '7.3.1 · on the s-axis', '\\mathcal{L}\\{e^{at}f(t)\\} = F(s-a)'],
                ['second', '7.3.2 · on the t-axis', '\\mathcal{L}\\{f(t-a)\\,\\mathcal{U}(t-a)\\} = e^{-as}F(s)'],
              ] as const
            ).map(([theorem, name, tex]) => {
              const fwd = statsFor(progress, shiftItemId(theorem, 'forward'))
              const inv = statsFor(progress, shiftItemId(theorem, 'inverse'))
              return (
                <tr key={theorem}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    <div className="meta-note">
                      <Tex tex={tex} />
                    </div>
                  </td>
                  <td>
                    <Meter value={fwd.ema} progress={progress} id={shiftItemId(theorem, 'forward')} />
                  </td>
                  <td>
                    <Meter value={inv.ema} progress={progress} id={shiftItemId(theorem, 'inverse')} />
                  </td>
                  <td className="num">{fwd.attempts + inv.attempts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card table-card">
        <h2 className="section-title">Transforms of derivatives</h2>
        <p className="meta-note" style={{ marginBottom: 12 }}>
          Theorem 7.2.2, drilled two ways: producing the expansion, and using it to turn an
          initial-value problem into a formula for <Tex tex="Y(s)" />.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Mastery</th>
              <th className="num">Seen</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                id: DERIV_ITEM.transform,
                name: 'Transform',
                blurb: 'Write $\\mathcal{L}\\{y^{(n)}\\}$ in terms of $Y(s)$',
              },
              {
                id: DERIV_ITEM.solve,
                name: 'Solve',
                blurb: 'An initial-value problem to a formula for $Y(s)$',
              },
              {
                id: IVP_ITEM,
                name: 'All the way through',
                blurb: 'An initial-value problem to a function of $t$: transform, solve, decompose, invert',
              },
            ].map((row) => {
              const st = statsFor(progress, row.id)
              return (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.name}</div>
                    <div className="meta-note">
                      <Rich text={row.blurb} />
                    </div>
                  </td>
                  <td>
                    <Meter value={st.ema} progress={progress} id={row.id} />
                  </td>
                  <td className="num">{st.attempts}</td>
                </tr>
              )
            })}
            {(() => {
              const card = CARD_BY_ID.get('rule:derivative')
              const st = statsFor(progress, 'rule:derivative')
              return card ? (
                <tr>
                  <td>
                    <div style={{ fontWeight: 600 }}>{card.label}</div>
                    <div className="meta-note">Review card only</div>
                  </td>
                  <td>
                    <span className={`tier-chip tier-${tierFor(st)}`}>{TIER_LABEL[tierFor(st)]}</span>
                  </td>
                  <td className="num">{st.reps}</td>
                </tr>
              ) : null
            })()}
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
