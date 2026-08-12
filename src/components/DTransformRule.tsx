import { ORIGIN, PAIRS, PATTERN, RULE_TEX, TWO_ROUTES, WHY, WORKED } from '../data/dtransform'
import { Derivation } from './Derivation'
import { Rich, Tex } from './Tex'

/**
 * Theorem 7.4.1, with its origin shown rather than asserted. The factor of `t`
 * falls out of differentiating `e^{-st}` under the integral, and seeing that
 * once is worth more than memorising the sign.
 */
export function DTransformRule({ onDrill }: { onDrill: () => void }) {
  return (
    <>
      <div className="card">
        <h2 className="section-title">Derivatives of a transform</h2>
        <p>
          <Rich text={WHY} />
        </p>
        <div className="rule-tex">
          <Tex tex={RULE_TEX} display />
        </div>
        <p className="meta-note">
          <Rich text="Theorem 7.4.1. Not to be confused with Theorem 7.2.2, which differentiates the *function*; this one differentiates the *transform*." />
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">Where it comes from</h2>
        <Derivation steps={ORIGIN} />
      </div>

      <div className="card">
        <h2 className="section-title">The book’s example</h2>
        <Derivation steps={WORKED} />
        <p className="meta-note" style={{ marginTop: 12 }}>
          <Rich text={PATTERN} />
        </p>
      </div>

      <div className="card table-card">
        <h2 className="section-title">Worth knowing on sight</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>f(t)</th>
              <th>F(s)</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {PAIRS.map((p) => (
              <tr key={p.f}>
                <td>
                  <Tex tex={p.f} />
                </td>
                <td>
                  <Tex tex={p.F} />
                </td>
                <td className="meta-note">
                  <Rich text={p.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="section-title">Two routes to the same place</h2>
        <p>
          <Rich text={TWO_ROUTES} />
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
