/**
 * Smoke test for the shell: every tab mounts, a drill question can be answered,
 * and answering moves the stored progress. Covers the wiring that the corpus
 * and checker tests cannot see.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../App'
import { loadProgress } from '../store/progress'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    root = createRoot(container)
    root.render(<App />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const tab = (label: string): HTMLButtonElement => {
  const el = [...container.querySelectorAll<HTMLButtonElement>('.tab')].find((b) =>
    b.textContent?.startsWith(label),
  )
  if (!el) throw new Error(`no tab labelled ${label}`)
  return el
}

const button = (label: string): HTMLButtonElement => {
  const el = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === label,
  )
  if (!el) throw new Error(`no button labelled ${label}`)
  return el
}

/** A chip inside a mode bar — distinct from a tab that may share its label. */
const chip = (label: string): HTMLButtonElement => {
  const el = [...container.querySelectorAll<HTMLButtonElement>('.scope-bar .chip')].find(
    (b) => b.textContent?.trim() === label,
  )
  if (!el) throw new Error(`no chip labelled ${label}`)
  return el
}

const click = (el: HTMLElement) =>
  act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

/** Type into a controlled input the way React sees it. */
function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
  })

const release = (key: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }))
  })

describe('app shell', () => {
  it('opens on the table, with all seven rows', () => {
    expect(container.querySelector('.brand-name')?.textContent).toBe('Laplace Trainer')
    expect(container.querySelectorAll('.pair-row')).toHaveLength(7)
  })

  it('expands a row and can send it to the drill', () => {
    click(container.querySelectorAll<HTMLElement>('.pair-row')[3])
    expect(container.querySelector('.pair-detail')).not.toBeNull()
    click(button('Drill this row →'))
    expect(container.querySelector('.problem-card')).not.toBeNull()
    // Scoping to one row leaves exactly that chip active in the rows bar.
    expect(
      container.querySelectorAll('.scope-bar .mode-bar:first-of-type .chip-active'),
    ).toHaveLength(1)
  })

  it('quotes each theorem in a dialog, and closes it again', () => {
    for (const [label, marker] of [
      ['Theorem 7.1.1', 'Transforms of Some Basic Functions'],
      ['Theorem 7.2.1', 'Some Inverse Transforms'],
    ] as const) {
      click(button(label))
      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog, label).not.toBeNull()
      expect(dialog?.textContent).toContain(marker)
      // All seven parts, quoted.
      expect(container.querySelectorAll('.theorem-letter')).toHaveLength(7)
      click(button('×'))
      expect(container.querySelector('[role="dialog"]')).toBeNull()
    }
  })

  it('closes the quoted theorem on Escape', () => {
    click(button('Theorem 7.2.1'))
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('mounts every tab', () => {
    for (const [label, selector] of [
      ['Drill', '.problem-card'],
      ['Match', '.board'],
      ['Shifts', '.pair-half'],
      ['Derivatives', '.expansion'],
      ['Review', '.problem-card'],
      ['Progress', '.stat-row'],
      ['About', '.about'],
      ['Table', '.pairs'],
    ] as const) {
      click(tab(label))
      expect(container.querySelector(selector), label).not.toBeNull()
    }
  })

  it('teaches both translation theorems on one page, with the figures', () => {
    click(tab('Shifts'))
    // The pairing is the point: both statements, side by side.
    expect(container.querySelectorAll('.pair-half')).toHaveLength(2)
    expect(container.querySelectorAll('.figure')).toHaveLength(2)

    for (const [label, marker] of [
      ['Theorem 7.3.1', 'First Translation Theorem'],
      ['Definition 7.3.1', 'Unit Step Function'],
      ['Theorem 7.3.2', 'Second Translation Theorem'],
    ] as const) {
      click(button(label))
      expect(container.querySelector('[role="dialog"]')?.textContent, label).toContain(marker)
      click(button('×'))
    }

    click(button('Drill this →'))
    expect(container.querySelector('.problem-card')).not.toBeNull()
  })

  it('answers a translation question against its own item', () => {
    click(tab('Shifts'))
    click(chip('Drill'))
    click(container.querySelectorAll<HTMLElement>('.option')[0])
    expect(container.querySelector('.feedback')).not.toBeNull()
    expect(container.querySelectorAll('.derivation-step').length).toBeGreaterThan(0)
    const ids = Object.keys(loadProgress().byId)
    expect(ids).toHaveLength(1)
    expect(ids[0]).toMatch(/^shift:(first|second):(forward|inverse)$/)
  })

  it('mixes translated rows into the ordinary drill only when asked', () => {
    click(tab('Drill'))
    const toggle = chip('+ Shifts')
    expect(toggle.className).not.toContain('chip-active')
    click(toggle)
    expect(chip('+ Shifts').className).toContain('chip-active')
    // Still a working question after the switch.
    expect(container.querySelector('.problem-tex')).not.toBeNull()
  })

  it('walks the derivative rule from statement to drill', () => {
    click(tab('Derivatives'))
    // The expansion writes out n subtracted terms and the invariant beside them.
    expect(container.querySelectorAll('.invariant tbody tr')).toHaveLength(2)
    const sums = [...container.querySelectorAll('.invariant-sum')].map((e) => e.textContent)
    expect(new Set(sums).size).toBe(1)

    // Order five gives five terms, and the invariant still holds down the column.
    const orderChips = [...container.querySelectorAll<HTMLElement>('.mode-bar')]
      .find((bar) => bar.textContent?.startsWith('Order'))!
      .querySelectorAll<HTMLElement>('.chip')
    click(orderChips[4])
    expect(container.querySelectorAll('.invariant tbody tr')).toHaveLength(5)
    expect(new Set([...container.querySelectorAll('.invariant-sum')].map((e) => e.textContent)).size).toBe(1)

    click(button('Theorem 7.2.2'))
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      'Transform of a Derivative',
    )
    click(button('×'))

    click(button('Drill this →'))
    expect(container.querySelector('.problem-card')).not.toBeNull()
  })

  it('answers a derivative question and records it against its own item', () => {
    click(tab('Derivatives'))
    click(button('Transform'))
    const options = container.querySelectorAll<HTMLElement>('.option')
    expect(options.length).toBeGreaterThanOrEqual(2)
    click(options[0])
    expect(container.querySelector('.feedback')).not.toBeNull()
    expect(container.querySelectorAll('.derivation-step').length).toBeGreaterThan(0)
    expect(Object.keys(loadProgress().byId)).toEqual(['deriv:transform'])
  })

  it('solves an initial-value problem for Y(s)', () => {
    click(tab('Derivatives'))
    click(button('Solve'))
    expect(container.querySelector('.given-row')).not.toBeNull()
    click(container.querySelectorAll<HTMLElement>('.option')[0])
    // The worked solution ends by isolating Y(s).
    const steps = [...container.querySelectorAll('.derivation-label')].map((e) => e.textContent)
    expect(steps.at(-1)).toContain('Solve')
    expect(Object.keys(loadProgress().byId)).toEqual(['deriv:solve'])
  })

  it('answers a drill question and records it', () => {
    click(tab('Drill'))
    const options = container.querySelectorAll<HTMLElement>('.option')
    expect(options.length).toBeGreaterThanOrEqual(2)
    click(options[0])
    expect(container.querySelector('.feedback')).not.toBeNull()
    // The worked solution only appears once the question is settled.
    expect(container.querySelectorAll('.derivation-step').length).toBeGreaterThan(0)
    expect(loadProgress().totalAttempts).toBe(1)
  })

  it('advances to a fresh question', () => {
    click(tab('Drill'))
    const first = container.querySelector('.problem-tex')?.textContent
    click(container.querySelectorAll<HTMLElement>('.option')[0])
    click(button('Next →'))
    expect(container.querySelector('.feedback')).toBeNull()
    // Not a strict inequality — the generator may legitimately repeat a row —
    // but the answered state must be gone.
    expect(container.querySelector('.derivation-step')).toBeNull()
    expect(typeof first).toBe('string')
  })

  it('never lets one Enter press both check an answer and skip the result', () => {
    click(tab('Drill'))
    click(button('Type'))
    const input = container.querySelector<HTMLInputElement>('.answer-input')!

    // Enter inside the field checks the answer. The same press must not also
    // reach the advance handler on its way up to the window.
    type(input, 'nonsense_expression')
    press(input, 'Enter')
    expect(container.querySelector('.feedback')).not.toBeNull()
    const shown = container.querySelector('.problem-tex')?.textContent

    // Reveal, so the question is settled and Enter would ordinarily advance.
    click(button('Show answer'))
    expect(container.querySelector('.solution')).not.toBeNull()

    // That same Enter is still held down: auto-repeat must not blow past the
    // worked solution the student has not read yet.
    press(document.body, 'Enter', { repeat: true })
    expect(container.querySelector('.solution'), 'repeat advanced').not.toBeNull()
    press(document.body, 'Enter')
    expect(container.querySelector('.solution'), 'held key advanced').not.toBeNull()
    expect(container.querySelector('.problem-tex')?.textContent).toBe(shown)

    // Released and pressed again, it advances as documented.
    release('Enter')
    press(document.body, 'Enter')
    expect(container.querySelector('.solution')).toBeNull()
  })

  it('advances on a fresh Enter once a choice is made', () => {
    click(tab('Drill'))
    click(button('Choose'))
    click(container.querySelectorAll<HTMLElement>('.option')[0])
    expect(container.querySelector('.solution')).not.toBeNull()
    press(document.body, 'Enter')
    expect(container.querySelector('.solution')).toBeNull()
  })

  it('reveals a review card and grades it', () => {
    click(tab('Review'))
    click(button('Show answer'))
    expect(container.querySelector('.card-answer')).not.toBeNull()
    click(button('Good'))
    expect(container.querySelector('.card-answer')).toBeNull()
    expect(Object.keys(loadProgress().byId)).toHaveLength(1)
  })

  it('pairs two tiles on the match board', () => {
    click(tab('Match'))
    const tiles = container.querySelectorAll<HTMLElement>('.tile')
    expect(tiles).toHaveLength(10)
    click(tiles[0])
    expect(container.querySelector('.tile-picked')).not.toBeNull()
    click(tiles[5])
    // Either a pairing or a miss, but the board must have reacted.
    expect(container.querySelectorAll('.tile-done, .tile-wrong').length).toBeGreaterThan(0)
    expect(loadProgress().totalAttempts).toBe(1)
  })
})
