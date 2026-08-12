/**
 * A mixed paper, drawn from everything the trainer covers.
 *
 * Drilling is deliberately narrow: a section at a time, one skill under the
 * lamp, with feedback the moment you answer. An exam is none of those things.
 * The questions arrive unlabelled and in no useful order, deciding *which*
 * method applies is most of the work, and nothing tells you how you did until
 * you have committed to all of it. That last part is the one worth building —
 * a student who is right only when told immediately whether they were right has
 * not finished learning the material.
 *
 * So a paper is generated whole, answered in any order, and marked at the end.
 * Each question keeps everything needed to grade it and to show its working, in
 * one shape, so the marking does not care which generator it came from.
 */

import { nextProblem } from './index'
import { nextShiftProblem } from './shift'
import { nextFractionProblem } from './fraction'
import { nextDerivProblem } from './derivative'
import { nextIvpProblem } from './ivp'
import { nextDtProblem } from './dtransform'
import { type Symbols } from '../lib/check'
import { makeRng, randomRng, type RNG } from '../lib/rng'
import type { Facet } from '../lib/facets'
import type { Choice, Step } from './types'

/** The sections a paper draws from, in the order the book meets them. */
export type Topic = 'rows' | 'shift' | 'dtransform' | 'fraction' | 'deriv' | 'ivp'

export const TOPIC_NAME: Record<Topic, string> = {
  rows: 'The table',
  shift: 'Translation',
  dtransform: 'Derivatives of a transform',
  fraction: 'Partial fractions',
  deriv: 'Transform of a derivative',
  ivp: 'Initial-value problem',
}

/** One question, in the single shape the exam knows how to mark. */
export interface ExamQuestion {
  topic: Topic
  /** Progress items this question reports into, so a paper still teaches. */
  itemIds: string[]
  statementTex: string
  /** Initial conditions, or anything else given beside the statement. */
  givenTex?: string
  question: string
  prefixTex: string
  symbols: Symbols
  target: (scope: Record<string, number>) => number
  points: Record<string, number>[]
  answerTex: string
  /** The distractors, so a wrong answer can be named the way a drill names it. */
  choices: Choice[]
  derivation: Step[]
  syntaxNote: string
  facets: Facet[]
}

export interface Paper {
  questions: ExamQuestion[]
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/**
 * Each generator has its own problem shape, grown around what its own drill
 * needs. Rather than force them all into one type — which would drag the exam's
 * concerns into six files that are fine as they are — each is adapted here.
 */
function fromRows(rng: RNG): ExamQuestion {
  const p = nextProblem({
    scope: null,
    direction: 'both',
    mastery: new Map(),
    allowCombo: rng.bool(0.45),
    allowShifts: false,
    seed: rng.int(1, 1e9),
  })
  const primary = p.variable
  return {
    topic: 'rows',
    itemIds: p.itemIds,
    statementTex: p.statementTex,
    question: p.question,
    prefixTex: `${p.promptTex} =`,
    symbols: { primary, allowed: [primary] },
    target: (o) => p.target(o[primary]),
    points: samplesFor(primary, p.poles),
    answerTex: p.answerTex,
    choices: p.choices,
    derivation: p.derivation,
    syntaxNote:
      primary === 's'
        ? 'Give a function of `s`. Any equivalent form is accepted.'
        : 'Give a function of `t`. Any equivalent form is accepted.',
    facets: p.facets,
  }
}

function fromShift(rng: RNG): ExamQuestion {
  const p = nextShiftProblem({ theorem: 'both', direction: 'both', rung: 3, seed: rng.int(1, 1e9) })
  return {
    topic: 'shift',
    itemIds: [p.itemId],
    statementTex: p.statementTex,
    question: p.question,
    prefixTex: p.prefixTex,
    symbols: p.symbols,
    target: p.target,
    points: p.points,
    answerTex: p.answerTex,
    choices: p.choices,
    derivation: p.derivation,
    syntaxNote: p.syntaxNote,
    facets: p.facets,
  }
}

function fromDtransform(rng: RNG): ExamQuestion {
  const p = nextDtProblem({ rung: 2, seed: rng.int(1, 1e9) })
  return {
    topic: 'dtransform',
    itemIds: [p.itemId],
    statementTex: p.statementTex,
    question: p.question,
    prefixTex: p.prefixTex,
    symbols: p.symbols,
    target: p.target,
    points: p.points,
    answerTex: p.answerTex,
    choices: p.choices,
    derivation: p.derivation,
    syntaxNote: p.syntaxNote,
    facets: p.facets,
  }
}

function fromFraction(rng: RNG): ExamQuestion {
  // The recognition task has no typed answer, so a paper does not ask it.
  let p = nextFractionProblem({ kind: 'auto', rung: 3, seed: rng.int(1, 1e9) })
  for (let i = 0; i < 20 && p.chooseOnly; i++) {
    p = nextFractionProblem({ kind: 'auto', rung: 3, seed: rng.int(1, 1e9) })
  }
  return {
    topic: 'fraction',
    itemIds: [p.itemId],
    statementTex: p.statementTex,
    question: p.question,
    prefixTex: p.prefixTex,
    symbols: p.symbols,
    target: p.target,
    points: p.points,
    answerTex: p.answerTex,
    choices: p.choices,
    derivation: p.derivation,
    syntaxNote: p.syntaxNote,
    facets: p.facets,
  }
}

function fromDeriv(rng: RNG): ExamQuestion {
  const p = nextDerivProblem({
    mode: rng.bool(0.6) ? 'solve' : 'transform',
    symbolic: rng.bool(0.5),
    seed: rng.int(1, 1e9),
  })
  return {
    topic: 'deriv',
    itemIds: [p.itemId],
    statementTex: p.statementTex,
    givenTex: p.givenTex,
    question: p.question,
    prefixTex: p.prefixTex,
    symbols: p.symbols,
    target: p.target,
    points: p.points,
    answerTex: p.answerTex,
    choices: p.choices,
    derivation: p.derivation,
    syntaxNote: p.syntaxNote,
    facets: p.facets,
  }
}

function fromIvp(rng: RNG): ExamQuestion {
  const p = nextIvpProblem({ rung: 3, seed: rng.int(1, 1e9) })
  return {
    topic: 'ivp',
    itemIds: [p.itemId],
    statementTex: p.statementTex,
    givenTex: p.givenTex,
    question: p.question,
    prefixTex: p.prefixTex,
    symbols: p.symbols,
    target: p.target,
    points: p.points,
    answerTex: p.answerTex,
    choices: p.choices,
    derivation: p.derivation,
    syntaxNote: p.syntaxNote,
    facets: p.facets,
  }
}

const BUILD: Record<Topic, (rng: RNG) => ExamQuestion> = {
  rows: fromRows,
  shift: fromShift,
  dtransform: fromDtransform,
  fraction: fromFraction,
  deriv: fromDeriv,
  ivp: fromIvp,
}

/** Sample points for a single-variable problem, clear of its poles. */
function samplesFor(primary: 's' | 't', poles: number[]): Record<string, number>[] {
  const ladder =
    primary === 's'
      ? [0.9, 1.7, 2.6, 3.8, 5.1, 6.7, 8.4, 10.9, 13.6, 17.2]
      : [0.11, 0.29, 0.47, 0.68, 0.93, 1.17, 1.44, 1.73, 2.05, 2.38]
  return ladder
    .filter((x) => poles.every((p) => Math.abs(x - p) > 0.7))
    .map((x) => ({ [primary]: x }))
}

// ---------------------------------------------------------------------------
// The paper
// ---------------------------------------------------------------------------

export interface ExamOptions {
  /** How many questions. Six by default, which is a sitting rather than a slog. */
  count?: number
  /** Sections to draw from; all of them by default. */
  topics?: Topic[]
  seed?: number
}

export const ALL_TOPICS: Topic[] = ['rows', 'shift', 'dtransform', 'fraction', 'deriv', 'ivp']

/**
 * A paper of `count` questions, spread across the sections rather than drawn
 * independently — six independent draws from six topics leaves a third of them
 * empty and something asked three times, which is a worse test of the same
 * length. Every topic appears before any topic repeats.
 */
export function makePaper(o: ExamOptions = {}): Paper {
  const rng = o.seed === undefined ? randomRng() : makeRng(o.seed)
  const count = Math.max(1, Math.min(12, o.count ?? 6))
  const pool = o.topics?.length ? o.topics : ALL_TOPICS

  const order: Topic[] = []
  while (order.length < count) {
    for (const t of rng.shuffle([...pool])) {
      if (order.length < count) order.push(t)
    }
  }

  return { questions: rng.shuffle(order).map((topic) => BUILD[topic](rng)) }
}
