/**
 * The three adaptations that decide what a student meets next, and what the app
 * concludes from how they did: counting mistakes by name, refusing to call a
 * skill mastered on its easy half, and sequencing a run so nothing is drilled in
 * a block.
 */

import { describe, expect, it } from 'vitest'
import { FORM_IDS, type FormId } from '../data/forms'
import { SLIP_BY_ID, SLIPS } from '../data/slips'
import { itemId, nextProblem } from '../generators'
import { DERIV_ITEM, nextDerivProblem } from '../generators/derivative'
import { FRACTION_ITEMS, nextFractionProblem } from '../generators/fraction'
import { nextShiftProblem, shiftItemId } from '../generators/shift'
import { facetKey, hardFacet, isCovered, uncoveredItems, type Facet } from './facets'
import { effectiveTier, heldBack, tierFor } from './mastery'
import { GAP, STEPS, dueNow, emptyQueue, recordServed, tooRecent } from './queue'
import { diagnose } from './diagnose'
import { emptyProgress, emptyStats, recordAttempt } from '../store/progress'

// ---------------------------------------------------------------------------
// Counting mistakes by name
// ---------------------------------------------------------------------------

describe('mistakes are counted by what they are', () => {
  it('adds the same slip up across different rows', () => {
    let p = emptyProgress()
    // The fix-up dropped on sine, then on hyperbolic sine, then on a delayed
    // inverse: one problem, met three times.
    p = recordAttempt(p, ['sin:inverse'], false, { slip: 'fixup' })
    p = recordAttempt(p, ['sinh:inverse'], false, { slip: 'fixup' })
    p = recordAttempt(p, ['shift:second:inverse'], false, { slip: 'fixup' })
    expect(p.slips.fixup.count).toBe(3)
    // ...and it is one entry, not three weak rows.
    expect(Object.keys(p.slips)).toEqual(['fixup'])
  })

  it('counts a slip once however many items the question credited', () => {
    let p = emptyProgress()
    p = recordAttempt(p, ['sin:inverse', 'cos:inverse'], false, { slip: 'row-marker' })
    expect(p.slips['row-marker'].count).toBe(1)
  })

  it('records nothing for a right answer', () => {
    let p = emptyProgress()
    p = recordAttempt(p, ['sin:inverse'], true, { slip: 'fixup' })
    expect(p.slips).toEqual({})
  })

  it('marks position in answers given, never in wall-clock time', () => {
    let p = emptyProgress()
    p = recordAttempt(p, ['a'], true)
    p = recordAttempt(p, ['a'], true)
    p = recordAttempt(p, ['a'], false, { slip: 'family' })
    expect(p.slips.family.lastAt).toBe(3)
  })

  it('has a remedy for every slip it can record', () => {
    for (const slip of SLIPS) {
      expect(SLIP_BY_ID.get(slip.id)).toBe(slip)
      expect(slip.fix.length).toBeGreaterThan(30)
      expect(slip.what.length).toBeGreaterThan(20)
    }
  })
})

describe('a typed wrong answer is named too', () => {
  const options = [
    { why: null },
    {
      why: 'That is the transform of cosine.',
      slip: 'row-marker' as const,
      value: (o: Record<string, number>) => o.s / (o.s * o.s + 9),
    },
    {
      why: 'The fix-up is missing.',
      slip: 'fixup' as const,
      value: (o: Record<string, number>) => 1 / (o.s * o.s + 9),
    },
  ]
  const symbols = { primary: 's' as const, allowed: ['s'] }

  it('matches a typed answer to the distractor it agrees with', () => {
    const named = diagnose('s/(s^2+9)', symbols, options)
    expect(named?.slip).toBe('row-marker')
  })

  it('recognises an equivalent form, not just the same string', () => {
    const named = diagnose('1/(9 + s*s)', symbols, options)
    expect(named?.slip).toBe('fixup')
  })

  it('says nothing when the answer is wrong in an unlisted way', () => {
    expect(diagnose('1/(s-4)', symbols, options)).toBeNull()
    expect(diagnose('not an expression @@', symbols, options)).toBeNull()
  })

  /**
   * Why the drills diagnose against `problem.choices` and not the trimmed list
   * they render: a multiple-choice list has room for three or four, and a typed
   * answer that landed on a dropped one would be told nothing.
   */
  it('has more distractors than a trimmed option list can show', () => {
    let richer = 0
    for (let seed = 1; seed <= 60; seed++) {
      const p = nextProblem({
        scope: null,
        direction: 'inverse',
        mastery: new Map(),
        allowCombo: false,
        seed,
      })
      if (p.choices.length > 3) richer++
    }
    expect(richer).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Measuring the right thing
// ---------------------------------------------------------------------------

describe('a skill is not mastered on its easy half', () => {
  const strong = { ...emptyStats(), attempts: 12, correct: 12, ema: 0.95 }

  /** One row of the ordinary drill, inverse, with nothing else in the way. */
  const row = (form: FormId, uncovered: Set<string>, seed: number) =>
    nextProblem({
      scope: [form],
      direction: 'inverse',
      mastery: new Map(),
      allowCombo: false,
      uncovered,
      seed,
    })

  it('holds an inverse row below proficient until the fix-up has been met', () => {
    const p = { ...emptyProgress(), byId: { 'sin:inverse': strong } }
    expect(tierFor(strong)).toBe('mastered')
    expect(effectiveTier(p, 'sin:inverse')).toBe('familiar')
    expect(heldBack(p, 'sin:inverse')).toBe(true)
  })

  it('releases it once the hard variant has actually been faced', () => {
    const p = {
      ...emptyProgress(),
      byId: { 'sin:inverse': strong },
      facets: { [facetKey('sin:inverse', 'fixup')]: { attempts: 2, correct: 2 } },
    }
    expect(isCovered('sin:inverse', p.facets)).toBe(true)
    expect(effectiveTier(p, 'sin:inverse')).toBe('mastered')
    expect(heldBack(p, 'sin:inverse')).toBe(false)
  })

  it('leaves skills with no harder variant alone', () => {
    const p = { ...emptyProgress(), byId: { 'sin:forward': strong } }
    expect(hardFacet('sin:forward')).toBeNull()
    expect(effectiveTier(p, 'sin:forward')).toBe('mastered')
  })

  /**
   * The trap this guards: claiming a harder half that cannot be generated caps
   * the row at `familiar` forever, so the multiple choice never comes off it.
   * Only three rows supply a constant of their own — `5/s`, `5/(s-3)` and
   * `5s/(s^2+9)` are linearity, with nothing to manufacture.
   */
  it('claims a fix-up only for the rows that can owe one', () => {
    for (const f of ['power', 'sin', 'sinh']) {
      expect(hardFacet(`${f}:inverse`), f).toBe('fixup')
    }
    for (const f of ['one', 'exp', 'cos', 'cosh']) {
      expect(hardFacet(`${f}:inverse`), f).toBeNull()
    }
  })

  it('every claimed facet is one its generator can actually produce', () => {
    const cases: [string, (uncovered: Set<string>, seed: number) => { facets: Facet[] }][] = [
      ['power:inverse', (uncovered, seed) => row('power', uncovered, seed)],
      ['sin:inverse', (uncovered, seed) => row('sin', uncovered, seed)],
      ['sinh:inverse', (uncovered, seed) => row('sinh', uncovered, seed)],
      [
        shiftItemId('first', 'inverse'),
        (uncovered, seed) =>
          nextShiftProblem({ theorem: 'first', direction: 'inverse', uncovered, seed }),
      ],
      [
        shiftItemId('second', 'inverse'),
        (uncovered, seed) =>
          nextShiftProblem({ theorem: 'second', direction: 'inverse', uncovered, seed }),
      ],
      [FRACTION_ITEMS.hard, (uncovered, seed) => nextFractionProblem({ kind: 'hard', uncovered, seed })],
      [DERIV_ITEM.solve, (uncovered, seed) => nextDerivProblem({ mode: 'solve', uncovered, seed })],
      [
        DERIV_ITEM.transform,
        (uncovered, seed) => nextDerivProblem({ mode: 'transform', uncovered, seed }),
      ],
    ]

    for (const [id, gen] of cases) {
      const want = hardFacet(id)!
      const uncovered = uncoveredItems([id], {})
      expect(uncovered.has(id), id).toBe(true)

      // Owed, it arrives every time — coverage is reached in a known number of
      // questions rather than whenever the draw happens to oblige.
      for (let seed = 1; seed <= 60; seed++) {
        expect(gen(uncovered, seed).facets, `${id} forced, seed ${seed}`).toContain(want)
      }

      // Not owed, it is still only one of the shapes on offer, so forcing it is
      // a real intervention and not the ordinary mix renamed.
      let natural = 0
      for (let seed = 1; seed <= 60; seed++) {
        if (gen(new Set(), seed).facets.includes(want)) natural++
      }
      expect(natural, `${id} unforced`).toBeGreaterThan(0)
      expect(natural, `${id} unforced`).toBeLessThan(60)
    }
  })

  it('forces the fix-up even when combinations and translations are in play', () => {
    for (const f of ['power', 'sin', 'sinh'] as const) {
      const id = itemId(f, 'inverse')
      for (let seed = 1; seed <= 40; seed++) {
        const p = nextProblem({
          scope: null,
          direction: 'inverse',
          mastery: new Map(),
          allowCombo: true,
          allowShifts: true,
          uncovered: new Set([id]),
          prefer: [id],
          seed,
        })
        expect(p.fixup, `${id}: ${p.statementTex}`).toBe(true)
      }
    }
  })
})

describe('mixing translations into the ordinary drill', () => {
  const shifted = (mastery: Map<string, number>) => {
    let delayed = 0
    let shifted = 0
    for (let seed = 1; seed <= 200; seed++) {
      const p = nextProblem({
        scope: null,
        direction: 'both',
        mastery,
        allowCombo: false,
        allowShifts: true,
        seed,
      })
      if (p.terms.some((t) => t.delay)) delayed++
      if (p.terms.some((t) => t.shift)) shifted++
    }
    return { delayed, shifted }
  }

  it('offers the s-axis shift but not the unit step, until the first holds', () => {
    const seen = shifted(new Map())
    expect(seen.delayed).toBe(0)
    expect(seen.shifted).toBeGreaterThan(0)
  })

  it('mixes both in once it does', () => {
    const seen = shifted(new Map([['shift:first:forward', 0.8]]))
    expect(seen.delayed).toBeGreaterThan(0)
    expect(seen.shifted).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Sequencing a run
// ---------------------------------------------------------------------------

describe('a run is interleaved, not blocked', () => {
  it('keeps the last few items out of the ordinary draw', () => {
    let q = emptyQueue()
    q = recordServed(q, 'a', true)
    q = recordServed(q, 'b', true)
    expect(tooRecent(q)).toEqual(['a', 'b'])
    for (const id of ['c', 'd', 'e']) q = recordServed(q, id, true)
    // The window slides; it never grows.
    expect(tooRecent(q)).toHaveLength(GAP)
    expect(tooRecent(q)).not.toContain('a')
  })

  it('does not serve a row twice in a row', () => {
    const mastery = new Map<string, number>([['sin:inverse', 0]])
    const seen: string[] = []
    let q = emptyQueue()
    for (let seed = 1; seed <= 30; seed++) {
      const p = nextProblem({
        scope: null,
        direction: 'both',
        mastery,
        allowCombo: false,
        avoid: tooRecent(q),
        prefer: dueNow(q),
        seed,
      })
      seen.push(p.itemIds[0])
      q = recordServed(q, p.itemIds[0], true)
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
  })

  it('brings a missed item back at a widening gap', () => {
    let q = emptyQueue()
    q = recordServed(q, 'sin:inverse', false)
    expect(q.pending[0].at).toBe(1 + STEPS[0])

    // Not yet owed.
    for (let i = 0; i < STEPS[0] - 1; i++) q = recordServed(q, 'other', true)
    expect(dueNow(q)).toEqual([])
    q = recordServed(q, 'other', true)
    expect(dueNow(q)).toEqual(['sin:inverse'])

    // Answered right, it goes to the next interval rather than disappearing.
    const at = q.served
    q = recordServed(q, 'sin:inverse', true)
    expect(q.pending[0].at).toBe(at + 1 + STEPS[1])
  })

  it('retires an item after the last interval is survived', () => {
    let q = emptyQueue()
    q = recordServed(q, 'x', false)
    for (let i = 0; i < STEPS.length; i++) q = recordServed(q, 'x', true)
    expect(q.pending).toEqual([])
  })

  it('restarts the schedule when a review is failed', () => {
    let q = emptyQueue()
    q = recordServed(q, 'x', false)
    q = recordServed(q, 'x', true)
    expect(q.pending[0].step).toBe(1)
    q = recordServed(q, 'x', false)
    expect(q.pending[0].step).toBe(0)
  })

  it('serves an owed item ahead of the weighted draw', () => {
    const mastery = new Map(FORM_IDS.map((f) => [itemId(f, 'forward'), 1] as const))
    const p = nextProblem({
      scope: null,
      direction: 'forward',
      mastery,
      allowCombo: false,
      prefer: ['cosh:forward'],
      seed: 7,
    })
    expect(p.itemIds).toContain('cosh:forward')
  })
})
