import { CHECKING, METHOD, RULE_TEX, SHAPES, WHY, WORKED } from '../data/ivp'
import { Derivation } from './Derivation'
import { Rich, Tex } from './Tex'

/**
 * The method stated whole, before it is drilled in pieces. The four moves are
 * the same four every time, which is the thing worth internalising: what varies
 * between problems is only the arithmetic in the middle.
 */
export function IvpRule({ onDrill }: { onDrill: () => void }) {
  return (
    <>
      <div className="card">
        <h2 className="section-title">Solving an initial-value problem</h2>
        <p>
          <Rich text={WHY} />
        </p>
        <div className="rule-tex">
          <Tex tex={RULE_TEX} display />
        </div>
        <p className="meta-note">
          <Rich text="Theorem 7.2.2, which is what makes the whole thing work: it is the only step where the initial values are needed, and it is the first one." />
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">The four moves</h2>
        <Derivation steps={METHOD} />
      </div>

      <div className="card">
        <h2 className="section-title">All the way through</h2>
        <Derivation steps={WORKED} />
      </div>

      <div className="card table-card">
        <h2 className="section-title">What the denominator tells you</h2>
        <p className="meta-note" style={{ marginBottom: 12 }}>
          The shape of the answer is settled before any constant is worked out — the roots decide
          it. Reading them first tells you what you are aiming at.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Roots</th>
              <th>Pieces</th>
              <th>What comes out</th>
            </tr>
          </thead>
          <tbody>
            {SHAPES.map((s) => (
              <tr key={s.root}>
                <td style={{ fontWeight: 600 }}>{s.root}</td>
                <td>
                  <Tex tex={s.piece} />
                </td>
                <td className="meta-note">
                  <Rich text={s.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="section-title">Checking it</h2>
        <p>
          <Rich text={CHECKING} />
        </p>
        <div className="actions">
          <button className="btn btn-primary" onClick={onDrill}>
            Drill this →
          </button>
        </div>
      </div>
    </>
  )
}
