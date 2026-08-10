/**
 * Worked solutions.
 *
 * The point of showing work here is narrow and deliberate: make the *fix-up*
 * visible. A student who can recite the seven rows still stalls on
 * `L^{-1}{1/(s^2+9)}`, because the row wants a 3 upstairs and the problem
 * refuses to supply one. Every inverse derivation therefore shows the
 * multiply-and-divide as its own line, and every forward derivation shows
 * linearity pulling the coefficient out before the row is applied.
 */

import {
  FORM_BY_ID,
  termBodyTex,
  termDenomTex,
  termFTex,
  termNumer,
  termSTex,
  type Term,
} from '../data/forms'
import { factorial, frac, isOne, texFrac } from '../lib/frac'
import { fTex, invLap, lap, sTex } from '../lib/expr'
import type { Step } from './types'

const signed = (x: { neg: boolean; tex: string }): string => (x.neg ? `-${x.tex}` : x.tex)

const unit = (t: Term): Term => ({ ...t, coef: frac(1) })

/** The row's own numerator, as the table writes it: `3!`, `4`, `s`, or `1`. */
function rowNumeratorTex(t: Term): string {
  switch (t.form) {
    case 'power':
      return `${t.n}!`
    case 'sin':
    case 'sinh':
      return String(t.k)
    case 'cos':
    case 'cosh':
      return 's'
    default:
      return '1'
  }
}

/** The table row instantiated at this problem's parameters, coefficient 1. */
const rowFracTex = (t: Term): string => `\\dfrac{${rowNumeratorTex(t)}}{${termDenomTex(t)}}`

/** How the pulled-out constant should read: `\frac{1}{3!}` beats `\frac{1}{6}`. */
function factorTex(t: Term): string {
  const c = t.coef
  if (t.form === 'power' && c.n === 1 && c.d === factorial(t.n!) && c.d > 1) {
    return `\\frac{1}{${t.n}!}`
  }
  return texFrac(c)
}

/** "Row (d), with k = 3" — the sentence that names what you are looking at. */
export function identify(t: Term, direction: 'forward' | 'inverse'): string {
  const form = FORM_BY_ID.get(t.form)!
  const row = `Row (${form.letter})`
  if (direction === 'forward') {
    switch (t.form) {
      case 'one':
        return `${row}: a constant, and $\\mathcal{L}\\{1\\} = 1/s$.`
      case 'power':
        return `${row}, $\\mathcal{L}\\{t^n\\} = n!/s^{\\,n+1}$, with $n = ${t.n}$.`
      case 'exp':
        return `${row}, $\\mathcal{L}\\{e^{at}\\} = 1/(s-a)$, with $a = ${t.a}$.`
      default:
        return `${row}, $\\mathcal{L}\\{${form.genericF}\\} = ${form.genericS}$, with $k = ${t.k}$.`
    }
  }
  switch (t.form) {
    case 'one':
      return `A constant over $s$ and nothing else — ${row.toLowerCase()}, $\\mathcal{L}^{-1}\\{1/s\\} = 1$.`
    case 'power':
      return `$s^{${t.n! + 1}}$ downstairs is $s^{\\,n+1}$ with $n+1 = ${t.n! + 1}$, so ${row.toLowerCase()} with $n = ${t.n}$.`
    case 'exp':
      return `One linear factor downstairs, $${termDenomTex(t)}$, so ${row.toLowerCase()} with $a = ${t.a}$.`
    // Naming k means reading the constant as a square; at k = 1 there is
    // nothing to read and saying "1^2" only muddies it.
    case 'sin':
    case 'sinh': {
      const sign = t.form === 'sin' ? '+' : '-'
      const den =
        t.k === 1
          ? `s^2 ${sign} 1`
          : `s^2 ${sign} ${t.k! ** 2} = s^2 ${sign} ${t.k}^2`
      return `$${den}$ with a constant on top — ${row.toLowerCase()}, $k = ${t.k}$.`
    }
    case 'cos':
    case 'cosh':
      return `$s^2 ${t.form === 'cos' ? '+' : '-'} ${t.k! ** 2}$ downstairs and an $s$ on top — ${row.toLowerCase()}, $k = ${t.k}$.`
  }
}

/** True when the row's own constant has to be manufactured out of thin air. */
export function needsFixup(t: Term): boolean {
  const rowNumer = termNumer(unit(t)).coef
  return rowNumer.n !== 1 && !isOne(t.coef)
}

function forwardStep(t: Term): Step {
  const form = FORM_BY_ID.get(t.form)!
  const chain: string[] = [lap(signed(termFTex(t)))]
  if (!isOne(t.coef)) chain.push(`${texFrac(t.coef)}\\,${lap(termBodyTex(t) || '1')}`)
  // The n!/s^{n+1} line is the whole content of row (b); show it before it collapses.
  if (t.form === 'power' && t.n! >= 2) {
    chain.push(isOne(t.coef) ? rowFracTex(t) : `${texFrac(t.coef)}\\cdot ${rowFracTex(t)}`)
  }
  chain.push(signed(termSTex(t)))
  return {
    label: `Row (${form.letter})`,
    text: identify(t, 'forward'),
    tex: chain.join(' = '),
  }
}

function inverseStep(t: Term): Step {
  const form = FORM_BY_ID.get(t.form)!
  const chain: string[] = [invLap(signed(termSTex(t)))]
  if (!isOne(t.coef)) chain.push(`${factorTex(t)}\\,${invLap(rowFracTex(t))}`)
  chain.push(signed(termFTex(t)))
  const fix = needsFixup(t)
  return {
    label: `Row (${form.letter})`,
    text: fix
      ? `${identify(t, 'inverse')} The row needs $${rowNumeratorTex(t)}$ on top, so multiply and divide by it — the division is what comes out front.`
      : identify(t, 'inverse'),
    tex: chain.join(' = '),
  }
}

const LINEARITY_TEXT =
  'Linearity first: the transform of a sum is the sum of the transforms, and constants come straight out.'

export function deriveForward(terms: Term[]): Step[] {
  const steps: Step[] = []
  if (terms.length > 1) {
    steps.push({
      label: 'Linearity',
      text: LINEARITY_TEXT,
      tex: `${lap(fTex(terms))} = ${terms
        .map((t, i) => {
          const c = isOne(t.coef) ? '' : `${texFrac({ ...t.coef, n: Math.abs(t.coef.n) })}\\,`
          const piece = `${c}${lap(termBodyTex(t) || '1')}`
          return i === 0 ? (t.coef.n < 0 ? `-${piece}` : piece) : t.coef.n < 0 ? ` - ${piece}` : ` + ${piece}`
        })
        .join('')}`,
    })
  }
  steps.push(...terms.map(forwardStep))
  if (terms.length > 1) {
    steps.push({ label: 'Result', tex: `${lap(fTex(terms))} = ${sTex(terms)}` })
  }
  return steps
}

export function deriveInverse(terms: Term[], splitFrom?: string): Step[] {
  const steps: Step[] = []
  if (splitFrom) {
    steps.push({
      label: 'Split it',
      text: 'Both pieces sit over the same denominator, so break the numerator apart and read each piece off its own row.',
      tex: `${splitFrom} = ${sTex(terms)}`,
    })
  } else if (terms.length > 1) {
    steps.push({ label: 'Linearity', text: LINEARITY_TEXT })
  }
  steps.push(...terms.map(inverseStep))
  if (terms.length > 1) {
    steps.push({
      label: 'Result',
      tex: `${invLap(splitFrom ?? sTex(terms))} = ${fTex(terms)}`,
    })
  }
  return steps
}
