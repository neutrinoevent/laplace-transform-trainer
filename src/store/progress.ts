/**
 * Local progress. One record per trainable item, where an item is a table row
 * in one direction (`sin:inverse`) or one of the two rule cards. Drills, the
 * match board, and the review deck all report into the same record, because
 * they are three ways of measuring the same thing — whether you can produce
 * that row right now — and because missing it in a drill should pull its card
 * forward.
 */

import { CARD_BY_ID, CARDS } from '../data/cards'
import type { SlipId } from '../data/slips'
import { facetKey, type Facet, type FacetStat } from '../lib/facets'
import { DERIV_ITEM } from '../generators/derivative'
import { FRACTION_ITEM_IDS } from '../generators/fraction'
import { SHIFT_ITEMS } from '../generators/shift'

/** Items that are drilled but never scheduled for review. */
const DRILL_ONLY = new Set<string>([
  DERIV_ITEM.transform,
  DERIV_ITEM.solve,
  ...SHIFT_ITEMS,
  ...FRACTION_ITEM_IDS,
])

export interface ItemStats {
  attempts: number
  correct: number
  streak: number
  /** Exponential moving average of recent results, 0..1 — the mastery score. */
  ema: number
  lastSeen: number | null
  // Review scheduling (SM-2 style).
  reps: number
  lapses: number
  ease: number
  intervalDays: number
  /** Next review timestamp; null until the card is first studied. */
  due: number | null
}

export interface ProgressState {
  version: 1
  byId: Record<string, ItemStats>
  totalAttempts: number
  totalCorrect: number
  currentStreak: number
  bestStreak: number
  /** New-card introductions today, to pace the review queue. */
  newDay: string
  newToday: number
  /** Best match-board time in milliseconds, per board size. */
  bestBoard: Record<string, number>
  /**
   * Position on the translation-theorem ladder, and the run of results at it.
   * Null until the ladder is first seeded from whatever evidence exists.
   */
  shiftRung: number | null
  shiftRun: number
  /** Position on the partial-fractions ladder. */
  fracRung: number | null
  fracRun: number
  /** Position on the initial-value-problem ladder. */
  ivpRung: number | null
  ivpRun: number
  /** Position on the derivatives-of-a-transform ladder. */
  dtRung: number | null
  dtRun: number
  /**
   * How often each named mistake has been made, and how recently — measured in
   * answers given rather than in days, so it means the same whether the work is
   * done in one sitting or twenty.
   */
  slips: Record<string, { count: number; lastAt: number }>
  /** Attempts and successes per `item#facet`, keyed by `lib/facets`. */
  facets: Record<string, FacetStat>
}

export type Grade = 'again' | 'good' | 'easy'

const KEY = 'laplace-trainer-progress-v1'
const EMA_ALPHA = 0.25
export const NEW_PER_DAY = 6
const MIN_EASE = 1.3
const MAX_EASE = 3.0
const DAY_MS = 24 * 60 * 60 * 1000
const AGAIN_DELAY_MS = 10 * 60 * 1000

export function emptyStats(): ItemStats {
  return {
    attempts: 0,
    correct: 0,
    streak: 0,
    ema: 0,
    lastSeen: null,
    reps: 0,
    lapses: 0,
    ease: 2.3,
    intervalDays: 0,
    due: null,
  }
}

function dayKey(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function emptyProgress(): ProgressState {
  return {
    version: 1,
    byId: {},
    totalAttempts: 0,
    totalCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
    newDay: dayKey(Date.now()),
    newToday: 0,
    bestBoard: {},
    shiftRung: null,
    shiftRun: 0,
    fracRung: null,
    fracRun: 0,
    ivpRung: null,
    ivpRun: 0,
    dtRung: null,
    dtRun: 0,
    slips: {},
    facets: {},
  }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as ProgressState
    if (parsed.version !== 1 || typeof parsed.totalAttempts !== 'number') return emptyProgress()
    return {
      ...emptyProgress(),
      ...parsed,
      bestBoard: parsed.bestBoard ?? {},
      shiftRung: parsed.shiftRung ?? null,
      shiftRun: parsed.shiftRun ?? 0,
      fracRung: parsed.fracRung ?? null,
      fracRun: parsed.fracRun ?? 0,
      ivpRung: parsed.ivpRung ?? null,
      ivpRun: parsed.ivpRun ?? 0,
      dtRung: parsed.dtRung ?? null,
      dtRun: parsed.dtRun ?? 0,
      slips: parsed.slips ?? {},
      facets: parsed.facets ?? {},
    }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage unavailable (private mode etc.) — training still works, just untracked
  }
}

export function statsFor(state: ProgressState, id: string): ItemStats {
  return state.byId[id] ?? emptyStats()
}

/** Mastery scores keyed by item id, for the adaptive picker. */
export function masteryMap(state: ProgressState): Map<string, number> {
  return new Map(Object.entries(state.byId).map(([id, s]) => [id, s.ema]))
}

/**
 * Record an answer against one or more items — a two-row problem credits both.
 * A miss on an item whose card is scheduled far out also pulls that review in;
 * being wrong today outranks yesterday's schedule.
 */
export interface AttemptDetail {
  /** The named mistake, when a wrong answer identified one. */
  slip?: SlipId
  /** Which harder variants this question actually exercised. */
  facets?: Facet[]
}

export function recordAttempt(
  state: ProgressState,
  ids: string[],
  correct: boolean,
  detail: AttemptDetail = {},
): ProgressState {
  const now = Date.now()
  const byId = { ...state.byId }
  for (const id of ids) {
    const prev = statsFor(state, id)
    const stats: ItemStats = {
      ...prev,
      attempts: prev.attempts + 1,
      correct: prev.correct + (correct ? 1 : 0),
      streak: correct ? prev.streak + 1 : 0,
      ema: prev.ema + EMA_ALPHA * ((correct ? 1 : 0) - prev.ema),
      lastSeen: now,
    }
    if (!correct && stats.due !== null && stats.due > now + DAY_MS) {
      stats.due = now + DAY_MS
      stats.intervalDays = 1
    }
    byId[id] = stats
  }
  const currentStreak = correct ? state.currentStreak + 1 : 0
  const totalAttempts = state.totalAttempts + 1

  // A named mistake is counted once however many items the question credited,
  // because it is one mistake.
  const slips = { ...state.slips }
  if (!correct && detail.slip) {
    const prev = slips[detail.slip] ?? { count: 0, lastAt: 0 }
    slips[detail.slip] = { count: prev.count + 1, lastAt: totalAttempts }
  }

  const facets = { ...state.facets }
  for (const id of ids) {
    for (const facet of detail.facets ?? []) {
      const key = facetKey(id, facet)
      const prev = facets[key] ?? { attempts: 0, correct: 0 }
      facets[key] = {
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
      }
    }
  }

  const next: ProgressState = {
    ...state,
    byId,
    slips,
    facets,
    totalAttempts,
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
  }
  saveProgress(next)
  return next
}

/** Record a self-grade on a review card and reschedule it. */
export function recordGrade(state: ProgressState, id: string, grade: Grade): ProgressState {
  const prev = statsFor(state, id)
  const now = Date.now()
  const wasNew = prev.due === null
  const stats: ItemStats = { ...prev, lastSeen: now }

  if (grade === 'again') {
    stats.lapses = prev.reps > 0 ? prev.lapses + 1 : prev.lapses
    stats.ease = Math.max(MIN_EASE, prev.ease - 0.2)
    stats.intervalDays = 0
    stats.due = now + AGAIN_DELAY_MS
    stats.ema = prev.ema + EMA_ALPHA * (0 - prev.ema)
  } else {
    const growth = grade === 'easy' ? prev.ease * 1.4 : prev.ease
    const first = grade === 'easy' ? 3 : 1
    stats.intervalDays =
      prev.intervalDays < 1
        ? first
        : Math.max(prev.intervalDays + 1, Math.round(prev.intervalDays * growth))
    stats.due = now + stats.intervalDays * DAY_MS
    stats.reps = prev.reps + 1
    if (grade === 'easy') stats.ease = Math.min(MAX_EASE, prev.ease + 0.05)
    stats.ema = prev.ema + EMA_ALPHA * (1 - prev.ema)
  }

  const today = dayKey(now)
  const next: ProgressState = {
    ...state,
    byId: { ...state.byId, [id]: stats },
    newDay: today,
    newToday: (state.newDay === today ? state.newToday : 0) + (wasNew ? 1 : 0),
  }
  saveProgress(next)
  return next
}

/** Move a ladder, keeping it beside the answer that moved it. */
export function recordRung(
  state: ProgressState,
  which: 'shift' | 'frac' | 'ivp' | 'dt',
  rung: number,
  run: number,
): ProgressState {
  const rungKey = ({ shift: 'shiftRung', frac: 'fracRung', ivp: 'ivpRung', dt: 'dtRung' } as const)[
    which
  ]
  const runKey = ({ shift: 'shiftRun', frac: 'fracRun', ivp: 'ivpRun', dt: 'dtRun' } as const)[which]
  if (state[rungKey] === rung && state[runKey] === run) return state
  const next: ProgressState = { ...state, [rungKey]: rung, [runKey]: run }
  saveProgress(next)
  return next
}

export function recordBoard(state: ProgressState, size: number, ms: number): ProgressState {
  const key = String(size)
  const best = state.bestBoard[key]
  if (best !== undefined && best <= ms) return state
  const next: ProgressState = { ...state, bestBoard: { ...state.bestBoard, [key]: ms } }
  saveProgress(next)
  return next
}

export interface CardQueue {
  due: string[]
  fresh: string[]
  freshRemaining: number
}

/** Cards to study now: everything due, then unseen cards up to the daily cap. */
export function cardQueue(
  state: ProgressState,
  scope: string[] | null,
  newPerDay: number = NEW_PER_DAY,
): CardQueue {
  const now = Date.now()
  const pool =
    scope && scope.length > 0
      ? CARDS.filter((c) => c.form === null || scope.includes(c.form))
      : CARDS
  const due: { id: string; at: number }[] = []
  const fresh: string[] = []
  for (const card of pool) {
    const s = state.byId[card.id]
    if (!s || s.due === null) fresh.push(card.id)
    else if (s.due <= now) due.push({ id: card.id, at: s.due })
  }
  due.sort((a, b) => a.at - b.at)
  const usedToday = state.newDay === dayKey(now) ? state.newToday : 0
  const freshRemaining = Math.max(0, newPerDay - usedToday)
  return { due: due.map((d) => d.id), fresh: fresh.slice(0, freshRemaining), freshRemaining }
}

export function dueCount(state: ProgressState): number {
  const now = Date.now()
  let n = 0
  for (const [id, s] of Object.entries(state.byId)) {
    if (CARD_BY_ID.has(id) && s.due !== null && s.due <= now) n++
  }
  return n
}

export function resetProgress(): ProgressState {
  const next = emptyProgress()
  saveProgress(next)
  return next
}

export const exportProgress = (state: ProgressState): string => JSON.stringify(state, null, 2)

/** Parse a backup, keeping only records for items that still exist. */
export function importProgress(json: string): ProgressState | null {
  try {
    const parsed = JSON.parse(json) as ProgressState
    if (parsed.version !== 1 || typeof parsed.byId !== 'object' || parsed.byId === null) return null
    const byId: Record<string, ItemStats> = {}
    for (const [id, s] of Object.entries(parsed.byId)) {
      const known = CARD_BY_ID.has(id) || DRILL_ONLY.has(id)
      if (known && typeof s.attempts === 'number') byId[id] = { ...emptyStats(), ...s }
    }
    const next: ProgressState = { ...emptyProgress(), ...parsed, byId, version: 1 }
    saveProgress(next)
    return next
  } catch {
    return null
  }
}
