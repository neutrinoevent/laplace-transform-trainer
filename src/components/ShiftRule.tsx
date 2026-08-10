import { useState } from 'react'
import {
  FIRST_ALT_TEX,
  FIRST_EXAMPLES,
  FIRST_GRAPH,
  FIRST_IDEA,
  FIRST_INVERSE,
  FIRST_INVERSE_EXAMPLE,
  FIRST_TEX,
  PAIR_NOTE,
  SECOND_CAUTION,
  SECOND_IDEA,
  SECOND_INVERSE,
  SECOND_STEP_TEX,
  SECOND_TEX,
  STEP_CONVERSIONS,
  STEP_IDEA,
  STEP_PIECEWISE,
  STEP_TEX,
} from '../data/shifts'
import { Derivation } from './Derivation'
import { DelayFigure, StepFigure } from './ShiftFigure'
import { Rich, Tex } from './Tex'
import { TheoremDialog } from './TheoremDialog'

const DELAYS = [1, 2, 3]

/**
 * Both theorems in one page, deliberately: they are the same idea in the two
 * domains, and a student who meets them a week apart learns two unrelated
 * formulas and then picks the wrong one under pressure. The pairing note at the
 * top is the thing worth carrying away.
 */
export function ShiftRule({ onDrill }: { onDrill: (theorem: 'first' | 'second') => void }) {
  const [quoted, setQuoted] = useState<string | null>(null)
  const [a, setA] = useState(2)

  return (
    <section>
      <div className="card">
        <h2 className="section-title">A shift in one domain is a multiplier in the other</h2>
        <div className="pair-grid">
          <div className="pair-half">
            <span className="eyebrow">§7.3.1 · on the s-axis</span>
            <div className="rule-tex">
              <Tex tex={FIRST_TEX} block />
            </div>
            <p className="muted">
              <Rich text="Multiply by an exponential in $t$, and the transform slides." />
            </p>
          </div>
          <div className="pair-half">
            <span className="eyebrow">§7.3.2 · on the t-axis</span>
            <div className="rule-tex">
              <Tex tex={SECOND_TEX} block />
            </div>
            <p className="muted">
              <Rich text="Delay the function, and the transform picks up an exponential in $s$." />
            </p>
          </div>
        </div>
        <p className="table-note" style={{ marginTop: 14, marginBottom: 0 }}>
          <Rich text={PAIR_NOTE} />
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">Translation on the s-axis</h2>
        <p className="table-note">
          <button className="cite" onClick={() => setQuoted('7.3.1')}>
            Theorem 7.3.1
          </button>{' '}
          <Rich text={FIRST_IDEA} />
        </p>
        <div className="rule-tex">
          <Tex tex={FIRST_ALT_TEX} block />
        </div>
        <p className="muted" style={{ fontSize: 13.5 }}>
          <Rich text={FIRST_GRAPH} />
        </p>
        <Derivation steps={FIRST_EXAMPLES} />

        <h3 className="eyebrow" style={{ display: 'block', marginTop: 18 }}>
          Backwards
        </h3>
        <p className="table-note" style={{ marginTop: 6 }}>
          <Rich text={FIRST_INVERSE} />
        </p>
        <Derivation steps={FIRST_INVERSE_EXAMPLE} />

        <div className="actions">
          <button className="btn" onClick={() => onDrill('first')}>
            Drill this →
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">The unit step</h2>
        <p className="table-note">
          <button className="cite" onClick={() => setQuoted('D7.3.1')}>
            Definition 7.3.1
          </button>{' '}
          <Rich text={STEP_IDEA} />
        </p>
        <div className="rule-tex">
          <Tex tex={STEP_TEX} block />
        </div>

        <div className="mode-bar" style={{ marginTop: 16 }}>
          <span className="eyebrow">Switch on at</span>
          {DELAYS.map((d) => (
            <button
              key={d}
              className={a === d ? 'chip chip-active' : 'chip'}
              onClick={() => setA(d)}
              aria-pressed={a === d}
            >
              <Tex tex={`a = ${d}`} />
            </button>
          ))}
        </div>
        <div className="figure-row">
          <StepFigure a={a} />
          <DelayFigure a={a} />
        </div>

        <p className="table-note" style={{ marginTop: 4 }}>
          <Rich text={STEP_PIECEWISE} />
        </p>
        <Derivation steps={STEP_CONVERSIONS} />
      </div>

      <div className="card">
        <h2 className="section-title">Translation on the t-axis</h2>
        <p className="table-note">
          <button className="cite" onClick={() => setQuoted('7.3.2')}>
            Theorem 7.3.2
          </button>{' '}
          <Rich text={SECOND_IDEA} />
        </p>
        <div className="rule-tex">
          <Tex tex={SECOND_STEP_TEX} block />
        </div>
        <p className="muted" style={{ fontSize: 13.5 }}>
          <Rich text="Taking $f(t) = 1$ gives the transform of a bare step, which is the one worth knowing by heart." />
        </p>

        <h3 className="eyebrow" style={{ display: 'block', marginTop: 18 }}>
          Backwards
        </h3>
        <p className="table-note" style={{ marginTop: 6 }}>
          <Rich text={SECOND_INVERSE} />
        </p>

        <div className="diagnosis" style={{ borderLeftColor: 'var(--accent)' }}>
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>
            Watch the argument
          </span>
          <Rich text={SECOND_CAUTION} />
        </div>

        <div className="actions">
          <button className="btn" onClick={() => onDrill('second')}>
            Drill this →
          </button>
        </div>
      </div>

      {quoted ? <TheoremDialog id={quoted} onClose={() => setQuoted(null)} /> : null}
    </section>
  )
}
