import { rungProgress, topRung, type Ladder, type LadderState } from '../lib/ladder'
import { Rich } from './Tex'

/**
 * Where the questions are coming from, said plainly. The ladder moves without
 * being asked to, so the least it can do is show its working — which rung, what
 * changes at it, and how close the next one is.
 */
export function LadderStrip({ ladder, state }: { ladder: Ladder; state: LadderState }) {
  const top = topRung(ladder)
  const rung = ladder.rungs[Math.max(0, Math.min(top, state.rung))]
  const atTop = state.rung >= top
  return (
    <div className="ladder">
      <div className="ladder-head">
        <span className="eyebrow">Building up</span>
        <span className="ladder-rungs" aria-hidden="true">
          {ladder.rungs.map((r) => (
            <i
              key={r.id}
              className={
                r.id < state.rung
                  ? 'ladder-pip ladder-pip-done'
                  : r.id === state.rung
                    ? 'ladder-pip ladder-pip-now'
                    : 'ladder-pip'
              }
            />
          ))}
        </span>
        <span className="ladder-name">{rung.name}</span>
        <span className="meta-note ladder-count">
          {atTop
            ? 'everything in this section'
            : `${rung.id + 1} of ${ladder.rungs.length} · ${Math.round(rungProgress(ladder, state) * 100)}% to the next`}
        </span>
      </div>
      <p className="ladder-blurb">
        <Rich text={rung.blurb} />
      </p>
    </div>
  )
}
