import { useEffect, useRef } from 'react'

export interface AnswerKeys {
  /** False while no question is on screen. */
  active: boolean
  settled: boolean
  mode: 'choose' | 'type'
  optionCount: number
  onPick: (index: number) => void
  onAdvance: () => void
}

/**
 * The keyboard for a drill: digits pick an option, Enter advances once the
 * question is settled.
 *
 * Enter is the whole difficulty, because the answer field wants it too, and a
 * single press must never both check an answer and skip past the result. Three
 * things guard that:
 *
 *   - the listener subscribes once and reads state through a ref, so a
 *     re-render mid-dispatch can never slip a fresh listener into the same
 *     event and see the answer as already settled;
 *   - Enter that originates inside the answer field belongs to the field;
 *   - and the key has to come back up before it can advance, which also stops
 *     a held Enter from auto-repeating straight through the feedback.
 */
export function useAnswerKeys(opts: AnswerKeys): void {
  const latest = useRef(opts)
  latest.current = opts
  /** An Enter press that has not been released yet. */
  const held = useRef(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const o = latest.current
      if (!o.active) return

      if (e.key === 'Enter') {
        const inField =
          e.target instanceof Element && e.target.closest('.answer-input') !== null
        if (inField) {
          // The field submits on its own; remember the press so releasing it is
          // required before the next one can advance.
          held.current = true
          return
        }
        if (e.repeat || held.current) return
        held.current = true
        if (o.settled) o.onAdvance()
        return
      }

      if (o.mode === 'choose' && !o.settled) {
        const n = Number(e.key)
        if (n >= 1 && n <= o.optionCount) o.onPick(n - 1)
      }
    }

    const up = (e: KeyboardEvent) => {
      if (e.key === 'Enter') held.current = false
    }
    // A key released while the window is not focused never reports a keyup.
    const clear = () => {
      held.current = false
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])
}
