/** UI preferences that should survive a reload: what you were drilling, and how. */

import type { FormId } from '../data/forms'
import type { Direction } from '../generators/types'

export type Response = 'auto' | 'choose' | 'type'

export interface Prefs {
  /** Rows in play; null means all seven. */
  scope: FormId[] | null
  direction: Direction | 'both'
  response: Response
}

const KEY = 'laplace-trainer-prefs-v1'

export const defaultPrefs = (): Prefs => ({ scope: null, direction: 'both', response: 'auto' })

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultPrefs()
    return { ...defaultPrefs(), ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    return defaultPrefs()
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — preferences just won't persist
  }
}
