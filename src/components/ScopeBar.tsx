import { FORMS, type FormId } from '../data/forms'
import { Tex } from './Tex'

interface ScopeBarProps {
  scope: FormId[] | null
  onScope: (next: FormId[] | null) => void
  /** A second row of chips (direction, response mode) rendered under the rows. */
  children?: React.ReactNode
}

/**
 * Which rows are in play. Clicking a row on its own narrows to it; clicking it
 * again while it is the only one selected goes back to all seven, so drilling
 * one row and returning is a two-click round trip.
 */
export function ScopeBar({ scope, onScope, children }: ScopeBarProps) {
  const active = (id: FormId) => scope !== null && scope.includes(id)
  const toggle = (id: FormId) => {
    if (scope === null) return onScope([id])
    if (scope.length === 1 && scope[0] === id) return onScope(null)
    const next = active(id) ? scope.filter((f) => f !== id) : [...scope, id]
    onScope(next.length === 0 || next.length === FORMS.length ? null : next)
  }

  return (
    <div className="scope-bar">
      <div className="mode-bar">
        <span className="eyebrow">Rows</span>
        <button
          className={scope === null ? 'chip chip-active' : 'chip'}
          onClick={() => onScope(null)}
        >
          All seven
        </button>
        {FORMS.map((f) => (
          <button
            key={f.id}
            className={active(f.id) ? 'chip chip-active' : 'chip'}
            onClick={() => toggle(f.id)}
            title={f.name}
            aria-pressed={active(f.id)}
          >
            <Tex tex={f.chipTex} />
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
