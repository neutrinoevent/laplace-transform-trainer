import { useState } from 'react'
import { FORMS, type FormId } from '../data/forms'
import { fTex, invLap, lap, sTex } from '../lib/expr'
import { TIER_LABEL, tierFor } from '../lib/mastery'
import { itemId } from '../generators/types'
import { statsFor, type ProgressState } from '../store/progress'
import { Rich, Tex } from './Tex'
import { TheoremDialog } from './TheoremDialog'

interface TableProps {
  progress: ProgressState
  onDrill: (form: FormId) => void
}

/**
 * The reference, and the anchor for everything else. Theorems 7.1.1 and 7.2.1
 * are the same seven facts read in two directions, so they are shown as one
 * table of pairs rather than two lists — which is the whole point a student is
 * meant to take away.
 */
export function Table({ progress, onDrill }: TableProps) {
  const [open, setOpen] = useState<FormId | null>(null)
  const [quoted, setQuoted] = useState<string | null>(null)

  return (
    <section>
      <div className="card">
        <h2 className="section-title">The seven pairs</h2>
        <p className="table-note">
          <button className="cite" onClick={() => setQuoted('7.1.1')}>
            Theorem 7.1.1
          </button>{' '}
          reads this table left to right;{' '}
          <button className="cite" onClick={() => setQuoted('7.2.1')}>
            Theorem 7.2.1
          </button>{' '}
          reads it right to left. Every problem in this trainer is one of these rows with numbers in
          it. Open a row for what separates it from its neighbours.
        </p>
        <table className="pairs">
          <thead>
            <tr>
              <th />
              <th>
                <Tex tex="f(t)" />
              </th>
              <th>
                <Tex tex="F(s) = \mathcal{L}\{f(t)\}" />
              </th>
              <th className="pair-name">Row</th>
              <th className="pair-tier">Mastery</th>
            </tr>
          </thead>
          <tbody>
            {FORMS.map((f) => {
              const forward = statsFor(progress, itemId(f.id, 'forward'))
              const inverse = statsFor(progress, itemId(f.id, 'inverse'))
              const tier = tierFor({
                attempts: forward.attempts + inverse.attempts,
                reps: forward.reps + inverse.reps,
                ema: (forward.ema + inverse.ema) / 2,
              })
              const isOpen = open === f.id
              return [
                <tr
                  key={f.id}
                  className={isOpen ? 'pair-row pair-open' : 'pair-row'}
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    setOpen(isOpen ? null : f.id)
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isOpen}
                  aria-label={`${f.name} row — details`}
                >
                  <td className="pair-letter">({f.letter})</td>
                  <td className="pair-tex">
                    <Tex tex={f.genericF} display />
                    {f.condition ? (
                      <div className="pair-cond">
                        <Tex tex={f.condition} />
                      </div>
                    ) : null}
                  </td>
                  <td className="pair-tex">
                    <Tex tex={f.genericS} display />
                  </td>
                  <td className="pair-name">{f.name}</td>
                  <td className="pair-tier">
                    <span className={`tier-chip tier-${tier}`}>{TIER_LABEL[tier]}</span>
                  </td>
                </tr>,
                isOpen ? (
                  <tr key={`${f.id}-detail`} className="pair-detail">
                    <td />
                    <td colSpan={4}>
                      <div className="pair-detail-inner">
                        <p>
                          <Rich text={f.note} />
                        </p>
                        <p>
                          <span className="eyebrow">Watch for </span>
                          <Rich text={f.confusion} />
                        </p>
                        <div className="pair-example">
                          <Tex tex={`${lap(fTex([f.sample]))} = ${sTex([f.sample])}`} display />
                          <Tex tex={`${invLap(sTex([f.sample]))} = ${fTex([f.sample])}`} display />
                        </div>
                        <div>
                          <button
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDrill(f.id)
                            }}
                          >
                            Drill this row →
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null,
              ]
            })}
          </tbody>
        </table>
      </div>

      <div className="rule-grid" style={{ marginTop: 14 }}>
        <div className="card">
          <h2 className="section-title">Linearity</h2>
          <div className="rule-tex">
            <Tex tex="\mathcal{L}\{\alpha f(t) + \beta g(t)\} = \alpha F(s) + \beta G(s)" block />
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            <Rich text="This is what turns seven rows into every problem you will be set. It runs backwards too, so $\mathcal{L}^{-1}$ splits a sum and handles each piece on its own." />
          </p>
        </div>

        <div className="card">
          <h2 className="section-title">Fixing up the constant</h2>
          <div className="rule-tex">
            <Tex
              tex="\mathcal{L}^{-1}\!\left\{\frac{1}{s^2+9}\right\} = \frac{1}{3}\,\mathcal{L}^{-1}\!\left\{\frac{3}{s^2+9}\right\} = \frac{1}{3}\sin 3t"
              block
            />
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            <Rich text="No row has a bare 1 over $s^2+k^2$. When the numerator is not the one the row wants, multiply and divide by the one it does — the division comes out front by linearity. Rows (b), (d) and (f) are the ones that ask for this." />
          </p>
        </div>
      </div>

      {quoted ? <TheoremDialog id={quoted} onClose={() => setQuoted(null)} /> : null}
    </section>
  )
}
