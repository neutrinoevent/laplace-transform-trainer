import { describe, expect, it } from 'vitest'
import { SHIFT_LADDER, seedRung, stepLadder, topRung, type LadderState } from './ladder'
import { shiftItemId } from '../generators/shift'
import { emptyProgress, emptyStats, type ProgressState } from '../store/progress'
import { nextShiftProblem } from '../generators/shift'

function withMastery(ema: number, attempts = 8): ProgressState {
  const p = emptyProgress()
  for (const t of ['first', 'second'] as const) {
    for (const d of ['forward', 'inverse'] as const) {
      p.byId[shiftItemId(t, d)] = { ...emptyStats(), ema, attempts }
    }
  }
  return p
}

/** Answer `results` in order and report where the ladder ends up. */
function climb(results: boolean[], from: LadderState = { rung: 0, run: 0 }): LadderState {
  return results.reduce((state, correct) => stepLadder(SHIFT_LADDER, state, correct), from)
}

describe('seeding from evidence', () => {
  it('starts a newcomer at the bottom', () => {
    expect(seedRung(SHIFT_LADDER, emptyProgress())).toBe(0)
  })

  it('does not judge on one or two answers', () => {
    expect(seedRung(SHIFT_LADDER, withMastery(0.9, 0))).toBe(0)
  })

  it('starts a fluent returning student at the top', () => {
    expect(seedRung(SHIFT_LADDER, withMastery(0.9))).toBe(topRung(SHIFT_LADDER))
  })

  it('places a partly fluent student partway up', () => {
    expect(seedRung(SHIFT_LADDER, withMastery(0.65))).toBe(2)
    expect(seedRung(SHIFT_LADDER, withMastery(0.4))).toBe(1)
    expect(seedRung(SHIFT_LADDER, withMastery(0.1))).toBe(0)
  })
})

describe('moving on evidence', () => {
  it('reaches the full section in nine right answers', () => {
    const end = climb(Array(9).fill(true))
    expect(end.rung).toBe(topRung(SHIFT_LADDER))
  })

  it('does not promote on a broken run', () => {
    // Right, right, wrong, right, right — never three in a row.
    const end = climb([true, true, false, true, true])
    expect(end.rung).toBe(0)
  })

  it('drops back after two wrong, and no further than the bottom', () => {
    const top = climb(Array(9).fill(true))
    expect(stepLadder(SHIFT_LADDER, stepLadder(SHIFT_LADDER, top, false), false).rung).toBe(topRung(SHIFT_LADDER) - 1)
    const floor = climb(Array(10).fill(false))
    expect(floor.rung).toBe(0)
  })

  it('never climbs past the top', () => {
    expect(climb(Array(40).fill(true)).rung).toBe(topRung(SHIFT_LADDER))
  })

  it('recovers as fast as it fell', () => {
    let state = climb(Array(9).fill(true))
    state = climb([false, false], state) // demoted
    expect(state.rung).toBe(topRung(SHIFT_LADDER) - 1)
    state = climb([true, true, true], state)
    expect(state.rung).toBe(topRung(SHIFT_LADDER))
  })
})

describe('what each rung serves', () => {
  const sample = (rung: number, n = 120, mastery?: Map<string, number>) =>
    Array.from({ length: n }, (_, i) =>
      nextShiftProblem({ theorem: 'auto', direction: 'auto', rung, mastery, seed: i + 1 }),
    )

  /** Someone who has the s-axis shift, so the unit step is reachable. */
  const past7_3_1 = new Map([['shift:first:forward', 0.8]])

  it('anchors every problem at the first rung, and nowhere else', () => {
    expect(sample(0).every((p) => p.anchorTex)).toBe(true)
    for (const rung of [1, 2, 3]) {
      expect(sample(rung).every((p) => !p.anchorTex), `rung ${rung}`).toBe(true)
    }
  })

  it('keeps a hidden translation for the top rung only', () => {
    for (const rung of [0, 1, 2]) {
      expect(sample(rung).some((p) => p.completeSquare), `rung ${rung}`).toBe(false)
    }
    expect(sample(3).some((p) => p.completeSquare)).toBe(true)
  })

  it('interleaves both theorems at the mixing rungs, once both are reachable', () => {
    for (const rung of [2, 3]) {
      const kinds = new Set(sample(rung, 120, past7_3_1).map((p) => p.theorem))
      expect(kinds.size, `rung ${rung}`).toBe(2)
    }
  })

  it('serves the s-axis theorem alone until it holds, at any rung', () => {
    // A rung is seeded from evidence, and that evidence can be entirely s-axis
    // work met in the ordinary drill — so reaching the mixing rung is not on its
    // own a reason to hand someone the unit step.
    for (const rung of [0, 1, 2, 3]) {
      const kinds = new Set(sample(rung).map((p) => p.theorem))
      expect([...kinds], `rung ${rung}`).toEqual(['first'])
    }
  })

  it('leads with the forward direction while the student is anchored', () => {
    const forward = sample(0).filter((p) => p.direction === 'forward')
    expect(forward.length).toBe(120)
  })

  it('asks for no constant fix-up below the mixing rung', () => {
    for (const rung of [0, 1]) {
      const inverse = sample(rung).filter(
        (p) => p.theorem === 'second' && p.direction === 'inverse',
      )
      for (const p of inverse) {
        expect(p.terms[0].coef, `rung ${rung}: ${p.answerTex}`).toEqual({ n: 1, d: 1 })
      }
    }
  })

  it('describes every rung it can be on', () => {
    expect(SHIFT_LADDER.rungs).toHaveLength(topRung(SHIFT_LADDER) + 1)
    for (const r of SHIFT_LADDER.rungs) {
      expect(r.name.length).toBeGreaterThan(0)
      expect(r.blurb.length).toBeGreaterThan(20)
    }
  })
})

describe('a request from the Learn page', () => {
  it('is honoured while the ladder is still scaffolding', () => {
    const picks = Array.from({ length: 30 }, (_, i) =>
      nextShiftProblem({ theorem: 'second', direction: 'auto', rung: 0, seed: i + 1 }),
    )
    expect(picks.every((p) => p.theorem === 'second')).toBe(true)
    // And the scaffolding is still in place.
    expect(picks.every((p) => p.anchorTex)).toBe(true)
  })
})

describe('the weaker theorem comes up first', () => {
  it('picks the one going worse when the two differ', () => {
    const mastery = new Map<string, number>([
      [shiftItemId('first', 'forward'), 0.9],
      [shiftItemId('first', 'inverse'), 0.9],
      [shiftItemId('second', 'forward'), 0.1],
      [shiftItemId('second', 'inverse'), 0.1],
    ])
    const picks = Array.from({ length: 40 }, (_, i) =>
      nextShiftProblem({ theorem: 'auto', direction: 'auto', rung: 1, mastery, seed: i + 1 }),
    )
    expect(picks.every((p) => p.theorem === 'second')).toBe(true)
  })
})
