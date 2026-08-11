import {
  COVER_UP,
  COVER_UP_EXAMPLE,
  METHOD,
  PIECE_TABLE,
  SQUARE_CHECK,
  SQUARE_METHOD,
  SQUARE_RULE,
  SQUARE_WHY,
  TOGETHER,
  WHY,
} from '../data/fractions'
import { Derivation } from './Derivation'
import { Rich, Tex } from './Tex'

/**
 * The method, and the sub-method it leans on, on one page.
 *
 * The piece table is the centre of it. Choosing the right shape is not an
 * arbitrary convention — each shape is chosen precisely because it inverts to a
 * row, and seeing the two columns beside each other is what makes the rule for
 * repeated factors and quadratic numerators look inevitable rather than
 * arbitrary.
 */
export function FractionRule({ onDrill }: { onDrill: (kind: 'square' | 'linear') => void }) {
  return (
    <section>
      <div className="card">
        <h2 className="section-title">Why it is needed</h2>
        <p className="table-note" style={{ marginBottom: 0 }}>
          <Rich text={WHY} />
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">The method</h2>
        <Derivation steps={METHOD} />

        <h3 className="eyebrow" style={{ display: 'block', marginTop: 18 }}>
          Why those shapes
        </h3>
        <p className="table-note" style={{ marginTop: 6 }}>
          Each shape is the one that inverts to a row. That is the whole reason
          for the rule about repeated factors and for the linear numerator over a quadratic.
        </p>
        <table className="data-table piece-table">
          <thead>
            <tr>
              <th>Piece</th>
              <th>Inverts to</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {PIECE_TABLE.map((row) => (
              <tr key={row.piece}>
                <td className="piece-tex">
                  <Tex tex={row.piece} display />
                </td>
                <td className="piece-tex">
                  <Tex tex={row.inverse} display />
                </td>
                <td className="meta-note">
                  <Rich text={row.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="section-title">Finding the constants</h2>
        <p className="table-note">
          <Rich text={COVER_UP} />
        </p>
        <Derivation steps={COVER_UP_EXAMPLE} />
        <div className="actions">
          <button className="btn" onClick={() => onDrill('linear')}>
            Drill this →
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Completing the square</h2>
        <p className="table-note">
          <Rich text={SQUARE_WHY} />
        </p>
        <div className="rule-tex">
          <Tex tex={SQUARE_RULE} block />
        </div>
        <Derivation steps={SQUARE_METHOD} />
        <div className="hint" style={{ marginTop: 14 }}>
          <Rich text={SQUARE_CHECK} />
        </div>
        <div className="actions">
          <button className="btn" onClick={() => onDrill('square')}>
            Drill this →
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Together</h2>
        <p className="table-note" style={{ marginBottom: 0 }}>
          <Rich text={TOGETHER} />
        </p>
      </div>
    </section>
  )
}
