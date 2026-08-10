/**
 * Wrong answers worth offering.
 *
 * Every distractor here is a specific, nameable slip — a swapped numerator, a
 * missing factorial, a fix-up applied upside down — expressed as a *mutated
 * term*, so the same machinery renders it in either domain and the explanation
 * that comes back is about the reasoning, not about the letters on the screen.
 */

import { type Term } from '../data/forms'
import { factorial, frac, mulF } from '../lib/frac'

export interface Mutation {
  term: Term
  why: string
}

const scale = (t: Term, n: number, d = 1): Term => ({ ...t, coef: mulF(t.coef, frac(n, d)) })

// ---------------------------------------------------------------------------
// Forward: the answer is F(s), so a mutation is a wrong transform.
// ---------------------------------------------------------------------------

export function forwardMutations(t: Term): Mutation[] {
  const k = t.k ?? 0
  const n = t.n ?? 0
  const a = t.a ?? 0

  switch (t.form) {
    case 'one':
      return [
        {
          term: { form: 'power', coef: t.coef, n: 1 },
          why: 'One power of $s$ too many: that is $\\mathcal{L}\\{ct\\}$. A constant gives $c/s$.',
        },
        {
          term: { form: 'exp', coef: t.coef, a: 1 },
          why: 'Nothing here shifts the pole off the origin — row (a) puts it at $s = 0$.',
        },
        {
          term: { form: 'cos', coef: t.coef, k: 1 },
          why: 'That denominator belongs to the oscillating rows; a constant has only $s$ below.',
        },
      ]

    case 'power': {
      const out: Mutation[] = []
      if (n >= 2) {
        out.push({
          term: scale(t, n, factorial(n)),
          why: `The numerator is $n! = ${factorial(n)}$, not $n = ${n}$.`,
        })
        out.push({
          term: scale(t, 1, factorial(n)),
          why: 'The factorial went missing — $\\mathcal{L}\\{t^n\\} = n!/s^{\\,n+1}$.',
        })
      }
      out.push(
        n === 1
          ? {
              term: { form: 'one', coef: t.coef },
              why: 'The power downstairs is $n+1$, one more than the power on $t$.',
            }
          : {
              // numerator c·n! over s^n: one power short downstairs
              term: { form: 'power', coef: scale(t, n).coef, n: n - 1 },
              why: 'The power downstairs is $n+1$, one more than the power on $t$.',
            },
      )
      return out
    }

    case 'exp': {
      const out: Mutation[] = [
        {
          term: { ...t, a: -a },
          why: `Sign: $\\mathcal{L}\\{e^{at}\\} = 1/(s-a)$, so $a = ${a}$ puts $s ${a < 0 ? '+ ' + -a : '- ' + a}$ downstairs.`,
        },
      ]
      if (Math.abs(a) !== 1) {
        out.push({
          term: scale(t, Math.abs(a)),
          why: 'The numerator stays 1 — the rate $a$ lives only in the denominator.',
        })
      }
      return out
    }

    case 'sin':
    case 'sinh': {
      const circular = t.form === 'sin'
      const out: Mutation[] = [
        {
          term: { ...t, form: circular ? 'cos' : 'cosh' },
          why: `An $s$ on top is the ${circular ? 'cosine' : 'hyperbolic cosine'} row; ${circular ? '$\\sin kt$' : '$\\sinh kt$'} carries $k$ on top.`,
        },
        {
          term: { ...t, form: circular ? 'sinh' : 'sin' },
          why: circular
            ? '$s^2-k^2$ is the hyperbolic row. $\\sin kt$ sits over $s^2+k^2$.'
            : '$s^2+k^2$ is the circular row. $\\sinh kt$ sits over $s^2-k^2$.',
        },
      ]
      if (k !== 1) out.push({ term: scale(t, 1, k), why: `The numerator is $k = ${k}$, not 1.` })
      return out
    }

    case 'cos':
    case 'cosh': {
      const circular = t.form === 'cos'
      const out: Mutation[] = [
        {
          term: { ...t, form: circular ? 'sin' : 'sinh' },
          why: `That numerator $k$ belongs to ${circular ? '$\\sin kt$' : '$\\sinh kt$'}; cosine keeps the $s$.`,
        },
        {
          term: { ...t, form: circular ? 'cosh' : 'cos' },
          why: circular
            ? '$s^2-k^2$ is the hyperbolic row. $\\cos kt$ sits over $s^2+k^2$.'
            : '$s^2+k^2$ is the circular row. $\\cosh kt$ sits over $s^2-k^2$.',
        },
      ]
      if (k !== 1) {
        out.push({
          term: scale(t, k),
          why: 'Cosine’s numerator is just $s$ — no $k$ rides along with it.',
        })
      }
      return out
    }
  }
}

// ---------------------------------------------------------------------------
// Inverse: the answer is f(t), so a mutation is a wrong function of t.
// ---------------------------------------------------------------------------

export function inverseMutations(t: Term): Mutation[] {
  const k = t.k ?? 0
  const n = t.n ?? 0
  const a = t.a ?? 0

  switch (t.form) {
    case 'one':
      return [
        {
          term: { form: 'power', coef: t.coef, n: 1 },
          why: 'That transforms to $c/s^2$ — one more power of $s$ than you were handed.',
        },
        {
          term: { form: 'exp', coef: t.coef, a: 1 },
          why: 'An exponential needs a shifted pole, $1/(s-a)$. This pole is at $s = 0$.',
        },
        {
          term: { form: 'cos', coef: t.coef, k: 1 },
          why: 'Cosine sits over $s^2+k^2$, not over a bare $s$.',
        },
      ]

    case 'power': {
      const out: Mutation[] = [
        {
          term: { ...t, n: n + 1 },
          why: 'The power on $t$ is one less than the power on $s$, not one more.',
        },
      ]
      if (n >= 2) {
        out.push({
          term: scale(t, factorial(n)),
          why: `You still owe the division by $n! = ${factorial(n)}$ — the row supplies that factorial for free in the other direction.`,
        })
      }
      if (n >= 3) {
        out.push({
          term: scale(t, factorial(n), n),
          why: `Divide by $n! = ${factorial(n)}$, not by $n = ${n}$.`,
        })
      }
      return out
    }

    case 'exp': {
      const out: Mutation[] = [
        {
          term: { ...t, a: -a },
          why: `The pole is at $s = ${a}$, and the pole *is* the rate: $e^{${a}t}$.`,
        },
      ]
      if (Math.abs(a) !== 1) {
        out.push({
          term: scale(t, Math.abs(a)),
          why: 'Nothing needs fixing up — $1/(s-a)$ already has the numerator the row wants.',
        })
      }
      return out
    }

    case 'sin':
    case 'sinh': {
      const circular = t.form === 'sin'
      const out: Mutation[] = [
        {
          term: { ...t, form: circular ? 'cos' : 'cosh' },
          why: 'There is no $s$ upstairs, so this is not a cosine row.',
        },
        {
          term: { ...t, form: circular ? 'sinh' : 'sin' },
          why: circular
            ? 'The denominator is $s^2+k^2$ — circular, not hyperbolic.'
            : 'The denominator is $s^2-k^2$ — hyperbolic, not circular.',
        },
      ]
      if (k !== 1) {
        out.push({
          term: scale(t, k),
          why: `The row needs $k = ${k}$ on top before it applies. Multiply and divide by ${k} — the division is what survives out front.`,
        })
        out.push({
          term: scale(t, k * k),
          why: `The fix-up divides by $k = ${k}$; this multiplied by it instead.`,
        })
      }
      return out
    }

    case 'cos':
    case 'cosh': {
      const circular = t.form === 'cos'
      const out: Mutation[] = [
        {
          term: { ...t, form: circular ? 'sin' : 'sinh' },
          why: 'The $s$ upstairs is exactly what marks this as a cosine row.',
        },
        {
          term: { ...t, form: circular ? 'cosh' : 'cos' },
          why: circular
            ? 'The denominator is $s^2+k^2$ — circular, not hyperbolic.'
            : 'The denominator is $s^2-k^2$ — hyperbolic, not circular.',
        },
      ]
      if (k !== 1) {
        out.push({
          term: scale(t, 1, k),
          why: 'No fix-up is owed here: the numerator $s$ is already what the row asks for.',
        })
      }
      return out
    }
  }
}
