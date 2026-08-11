import { useEffect, useRef } from 'react'
import type { Prefs } from '../store/prefs'

/**
 * The settings a student sets once and forgets, kept out of the drill's own
 * chip bars — those are for what you are drilling right now, not for how the
 * app behaves throughout.
 */
export function Settings({
  prefs,
  onPrefs,
  onClose,
}: {
  prefs: Prefs
  onPrefs: (next: Prefs) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // A panel opened from an icon should close the way every other one does:
  // click away, or press Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current
      if (el && !el.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Deferred, so the click that opened this does not immediately close it.
    const id = setTimeout(() => document.addEventListener('mousedown', onDown))
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="settings-panel" ref={ref} role="dialog" aria-label="Settings">
      <Toggle
        label="Hide which row it is"
        note="Drill without a label naming the row, theorem or method. Recognising the form is the skill, and nothing hands it over on an exam."
        checked={prefs.hideRowLabel}
        onChange={(hideRowLabel) => onPrefs({ ...prefs, hideRowLabel })}
      />
    </div>
  )
}

function Toggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string
  note: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="setting">
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        <span className="setting-note">{note}</span>
      </span>
      <input
        type="checkbox"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}
