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

const click = (el: HTMLElement) =>
  act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

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
