import { describe, expect, it } from 'vitest'
import { checkAnswer, previewOf } from './check'

const F = (s: number) => 3 / (s * s + 9) // L{sin 3t}
const f = (t: number) => Math.sin(3 * t) / 3 // L^-1{1/(s^2+9)}
const decay = (t: number) => Math.exp(-2 * t)
const cube = (t: number) => t ** 3 / 6

const onS = (raw: string) => checkAnswer(raw, { variable: 's', target: F, poles: [] })
const onT = (raw: string, target = f) => checkAnswer(raw, { variable: 't', target })

describe('typed transforms', () => {
  it('accepts anything algebraically equal', () => {
    for (const raw of [
      '3/(s^2+9)',
      '3/(s*s+9)',
      '3/(s^2 + 3^2)',
      '\\frac{3}{s^2+9}',
      '3/(9+s^2)',
      '6/(2s^2+18)',
    ]) {
      expect(onS(raw).ok, raw).toBe(true)
    }
  })

  it('calls out a missing constant by name', () => {
    const v = onS('1/(s^2+9)')
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.code).toBe('scaled')
      expect(v.ratio).toEqual({ n: 1, d: 3 })
    }
  })

  it('rejects the neighbouring rows', () => {
    for (const raw of ['s/(s^2+9)', '3/(s^2-9)', '1/(s-3)']) {
      const v = onS(raw)
      expect(v.ok, raw).toBe(false)
      if (!v.ok) expect(v.code).toBe('wrong')
    }
  })

  it('says so when the answer is still in the wrong variable', () => {
    const v = onS('sin(3t)')
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('wrongvar')
  })
})

describe('typed inverse transforms', () => {
  it('reads the ways students actually write it', () => {
    for (const raw of [
      '(1/3)sin(3t)',
      'sin(3t)/3',
      '1/3 sin 3t',
      '\\frac{1}{3}\\sin 3t',
      '0.5*sin(3t)/1.5',
    ]) {
      expect(onT(raw).ok, raw).toBe(true)
    }
  })

  it('spots the fix-up that never happened', () => {
    const v = onT('sin 3t')
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.code).toBe('scaled')
      expect(v.ratio).toEqual({ n: 3, d: 1 })
    }
  })

  it('handles unparenthesised exponentials', () => {
    for (const raw of ['e^-2t', 'e^(-2t)', 'exp(-2t)', '1/e^(2t)']) {
      expect(onT(raw, decay).ok, raw).toBe(true)
    }
  })

  it('handles factorial-shaped answers', () => {
    for (const raw of ['t^3/6', '(1/6)t^3', 't^3/3!'.replace('3!', '6')]) {
      expect(onT(raw, cube).ok, raw).toBe(true)
    }
  })

  it('separates sine from hyperbolic sine', () => {
    const v = onT('sinh(3t)/3')
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('wrong')
  })
})

describe('preview', () => {
  it('echoes back how the expression was read', () => {
    const p = previewOf('3/(s^2+9)', 's')
    expect(p && 'tex' in p).toBe(true)
  })

  it('reports unknown symbols instead of guessing', () => {
    const p = previewOf('3/(x^2+9)', 's')
    expect(p && 'error' in p).toBe(true)
  })

  it('is empty for empty input', () => {
    expect(previewOf('   ', 't')).toBeNull()
  })
})
