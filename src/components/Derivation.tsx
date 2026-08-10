import type { Step } from '../generators/types'
import { Rich, Tex } from './Tex'

export function Derivation({ steps }: { steps: Step[] }) {
  if (!steps.length) return null
  return (
    <div className="derivation-wrap">
      <ol className="derivation">
        {steps.map((s, i) => (
          <li key={i} className="derivation-step">
            <span className="derivation-label">{s.label}</span>
            <div className="derivation-body">
              {s.tex ? (
                <div className="derivation-tex">
                  <Tex tex={s.tex} display />
                </div>
              ) : null}
              {s.text ? (
                <div className="derivation-text">
                  <Rich text={s.text} />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
