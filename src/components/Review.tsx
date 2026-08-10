import { useEffect, useMemo, useState } from 'react'
import { CARD_BY_ID } from '../data/cards'
import { TIER_LABEL, tierFor } from '../lib/mastery'
import { cardQueue, statsFor, type Grade, type ProgressState } from '../store/progress'
import type { Prefs } from '../store/prefs'
import { Rail } from './Rail'
import { ScopeBar } from './ScopeBar'
import { Rich, Tex } from './Tex'

interface ReviewProps {
  progress: ProgressState
  prefs: Prefs
  onPrefs: (next: Prefs) => void
  onGrade: (id: string, grade: Grade) => void
}

/**
 * Spaced review of the rows themselves, stated generically. The drill proves
 * you can use a row today; this is what keeps it available in three weeks.
 */
export function Review({ progress, prefs, onPrefs, onGrade }: ReviewProps) {
  const [shown, setShown] = useState(false)

  const queue = useMemo(() => cardQueue(progress, prefs.scope), [progress, prefs.scope])
  const currentId = queue.due[0] ?? queue.fresh[0] ?? null
  const card = currentId ? CARD_BY_ID.get(currentId) : null

  useEffect(() => setShown(false), [currentId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setShown(true)
        return
      }
      if (!shown) return
      if (e.key === '1') onGrade(card.id, 'again')
      if (e.key === '2') onGrade(card.id, 'good')
      if (e.key === '3') onGrade(card.id, 'easy')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, shown, onGrade])

  if (!card) {
    return (
      <section>
        <ScopeBar scope={prefs.scope} onScope={(scope) => onPrefs({ ...prefs, scope })} />
        <div className="card empty-state">
          <p className="empty-title">Nothing due here</p>
          <p className="muted">
            {queue.freshRemaining === 0
              ? 'Today’s new cards are done. Reviews come back on their own schedule — Drill and Match are always open.'
              : 'Every card in this scope is scheduled ahead. Widen the rows, or go and drill.'}
          </p>
        </div>
      </section>
    )
  }

  const stats = statsFor(progress, card.id)
  const isNew = stats.due === null

  return (
    <section>
      <ScopeBar scope={prefs.scope} onScope={(scope) => onPrefs({ ...prefs, scope })} />
      <div className="card problem-card">
        <div className="problem-meta">
          <span className={isNew ? 'badge badge-section' : 'badge'}>{isNew ? 'New' : 'Review'}</span>
          <span className="badge badge-section">{card.section}</span>
          {card.direction ? <Rail direction={card.direction} /> : null}
          <span className="meta-note">{card.label}</span>
          <span className="meta-note" style={{ marginLeft: 'auto' }}>
            {queue.due.length} due · {queue.fresh.length} new left · {TIER_LABEL[tierFor(stats)]}
          </span>
        </div>

        <div className="card-prompt">
          <Tex tex={card.promptTex} block />
        </div>

        <div className="divider" style={{ marginTop: 14 }} />

        {shown ? (
          <>
            <div className="card-answer">
              <Tex tex={card.answerTex} block />
            </div>
            {card.note ? (
              <div className="hint">
                <Rich text={card.note} />
              </div>
            ) : null}
            <div className="actions grade-row">
              <button className="btn btn-danger" onClick={() => onGrade(card.id, 'again')}>
                Again
              </button>
              <button className="btn" onClick={() => onGrade(card.id, 'good')}>
                Good
              </button>
              <button className="btn btn-primary" onClick={() => onGrade(card.id, 'easy')}>
                Easy
              </button>
              <span className="meta-note">Keys 1 / 2 / 3</span>
            </div>
          </>
        ) : (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setShown(true)}>
              Show answer
            </button>
            <span className="meta-note">Space or Enter</span>
          </div>
        )}

        <p className="meta-note" style={{ marginTop: 14, marginBottom: 0 }}>
          Intervals follow an SM-2 style schedule. Missing a row in Drill pulls its card forward.
        </p>
      </div>
    </section>
  )
}
