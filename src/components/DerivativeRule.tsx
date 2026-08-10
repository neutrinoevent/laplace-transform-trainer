import { useState } from 'react'
import {
  GENERAL_TEX,
  INSTANCES,
  INVARIANT,
  ORIGIN_STEPS,
  PURPOSE,
  RECURSION_STEPS,
  initialTex,
  primeTex,
} from '../data/derivatives'
import { lapTight } from '../lib/expr'
import { Derivation } from './Derivation'
import { Rich, Tex } from './Tex'
import { TheoremDialog } from './TheoremDialog'

const ORDERS = [1, 2, 3, 4, 5]

const sPow = (p: number): string => (p === 0 ? '' : p === 1 ? 's' : `s^{${p}}`)

/** The expansion at a chosen order, written out in full rather than with dots. */
function expansionTex(n: number): string {
  let out = `${lapTight(primeTex(n))} = ${sPow(n)}Y(s)`
  for (let k = 0; k < n; k++) {
    const p = sPow(n - 1 - k)
    out += ` - ${p}${p ? '\\,' : ''}${initialTex(k)}`
  }
  return out
}

/**
 * The rule, three ways: what it says, why it is true, and what it is for.
 *
 * The interactive expansion is the centre of it. Students who can recite
 * Theorem 7.2.2 still pair the wrong power of s with the wrong initial value,
 * because the statement's ellipsis hides the one fact that fixes the pairing:
 * the two indices always sum to n - 1. Choosing an order writes the sum out in
 * full and puts that arithmetic on screen next to it.
 */
export function DerivativeRule({ onDrill }: { onDrill: () => void }) {
  const [n, setN] = useState(2)
  const [quoted, setQuoted] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  return (
    <section>
      <div className="card">
        <h2 className="section-title">Transform of a derivative</h2>
        <p className="table-note">
          The statement is{' '}
          <button className="cite" onClick={() => setQuoted(true)}>
            Theorem 7.2.2
          </button>
          , the last thing §7.2 sets up before it starts solving equations with it.
        </p>
        <div className="rule-tex">
          <Tex tex={GENERAL_TEX} block />
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          <Rich text={PURPOSE} />
        </p>
      </div>

      <div className="card">
        <div className="mode-bar">
          <span className="eyebrow">Order</span>
          {ORDERS.map((k) => (
            <button
              key={k}
              className={n === k ? 'chip chip-active' : 'chip'}
              onClick={() => setN(k)}
              aria-pressed={n === k}
            >
              <Tex tex={`n = ${k}`} />
            </button>
          ))}
        </div>

        <div className="expansion">
          <Tex tex={expansionTex(n)} block />
        </div>

        <table className="data-table invariant">
          <thead>
            <tr>
              <th>Term</th>
              <th className="num">Power of <Tex tex="s" /></th>
              <th className="num">Order at 0</th>
              <th className="num">Sum</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n }, (_, k) => {
              const p = n - 1 - k
              return (
                <tr key={k}>
                  <td>
                    <Tex tex={`-\\,${sPow(p)}${p ? '\\,' : ''}${initialTex(k)}`} display />
                  </td>
                  <td className="num">{p}</td>
                  <td className="num">{k}</td>
                  <td className="num invariant-sum">{p + k}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <p className="muted" style={{ marginBottom: 0, fontSize: 13.5 }}>
          <Rich text={INVARIANT} />
        </p>

        <div className="actions">
          <button className="btn" onClick={onDrill}>
            Drill this →
          </button>
          <span className="meta-note">
            {n} subtracted term{n === 1 ? '' : 's'}, every one of them negative.
          </span>
        </div>
      </div>

      <div className="card">
        <div className="learn-head">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Where it comes from
          </h2>
          <button className="btn" onClick={() => setShowWhy((v) => !v)}>
            {showWhy ? 'Hide the working' : 'Show the working'}
          </button>
        </div>
        <p className="table-note" style={{ marginTop: 10 }}>
          <Rich text="The book states the rule for general $n$ and omits the proof, but the first two cases are worth seeing: one is a single integration by parts, and the second follows from the first without any integration at all." />
        </p>

        <div className="instances">
          {INSTANCES.map((inst) => (
            <div key={inst.label} className="instance">
              <span className="instance-label">({inst.label})</span>
              <span className="instance-tex">
                <Tex tex={inst.tex} display />
              </span>
            </div>
          ))}
        </div>

        {showWhy ? (
          <>
            <h3 className="eyebrow" style={{ display: 'block', marginTop: 18 }}>
              Equation (6), by parts
            </h3>
            <Derivation steps={ORIGIN_STEPS} />
            <h3 className="eyebrow" style={{ display: 'block', marginTop: 18 }}>
              Equation (7), from (6)
            </h3>
            <Derivation steps={RECURSION_STEPS} />
          </>
        ) : null}
      </div>

      {quoted ? <TheoremDialog id="7.2.2" onClose={() => setQuoted(false)} /> : null}
    </section>
  )
}
