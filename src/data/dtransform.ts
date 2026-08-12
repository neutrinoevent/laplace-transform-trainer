/**
 * §7.4.1, derivatives of a transform.
 *
 * The theorem that runs the other way. Everything before it takes a function and
 * produces a transform; this one says an operation on the transform corresponds
 * to an operation on the function, and that the correspondence is
 * differentiation against multiplication by `t`.
 */

export interface Worked {
  label: string
  tex?: string
  text?: string
}

export const RULE_TEX = '\\mathcal{L}\\{t^{n}f(t)\\} = (-1)^{n}\\,\\dfrac{d^{n}}{ds^{n}}F(s)'

export const WHY =
  'Every row of the table so far reads left to right: a function goes in, a transform comes out. This theorem reads the other way. It says that *differentiating the transform* is the same as *multiplying the function by* $t$ — and once you have it, $t\\sin kt$ becomes reachable, which nothing in the table can produce and which every resonant spring problem lands on.'

/** Where it comes from: differentiating under the integral sign. */
export const ORIGIN: Worked[] = [
  {
    label: 'Start from the definition',
    tex: '\\dfrac{d}{ds}F(s) = \\dfrac{d}{ds}\\displaystyle\\int_0^{\\infty} e^{-st}f(t)\\,dt',
    text: 'Assume $F(s)$ exists and that the derivative may be taken inside the integral.',
  },
  {
    label: 'Differentiate inside',
    tex: '= \\displaystyle\\int_0^{\\infty} \\dfrac{\\partial}{\\partial s}\\left[e^{-st}f(t)\\right] dt = -\\displaystyle\\int_0^{\\infty} e^{-st}\\,t\\,f(t)\\,dt',
    text: 'Only $e^{-st}$ depends on $s$, and differentiating it brings down a factor of $-t$. That factor is the whole theorem.',
  },
  {
    label: 'Read it off',
    tex: '\\mathcal{L}\\{t\\,f(t)\\} = -\\dfrac{d}{ds}\\mathcal{L}\\{f(t)\\}',
    text: 'The integral on the right is the transform of $t\\,f(t)$, so one factor of $t$ costs one derivative and one change of sign.',
  },
  {
    label: 'Do it again',
    tex: '\\mathcal{L}\\{t^{2}f(t)\\} = -\\dfrac{d}{ds}\\mathcal{L}\\{t f(t)\\} = \\dfrac{d^{2}}{ds^{2}}\\mathcal{L}\\{f(t)\\}',
    text: 'Each further factor of $t$ costs another derivative and another sign, which is where the $(-1)^{n}$ comes from.',
  },
]

/** The book's Example 1, and the pattern to take from it. */
export const WORKED: Worked[] = [
  {
    label: 'The problem',
    tex: '\\mathcal{L}\\{t\\sin kt\\}',
    text: 'Set the $t$ aside and start from the row.',
  },
  {
    label: 'The row',
    tex: '\\mathcal{L}\\{\\sin kt\\} = \\dfrac{k}{s^{2}+k^{2}}',
    text: 'Row (d), with nothing done to it yet.',
  },
  {
    label: 'Differentiate, and negate',
    tex: '\\mathcal{L}\\{t\\sin kt\\} = -\\dfrac{d}{ds}\\left(\\dfrac{k}{s^{2}+k^{2}}\\right) = \\dfrac{2ks}{\\left(s^{2}+k^{2}\\right)^{2}}',
    text: 'The quotient rule puts one more power on the denominator. That extra power is the fingerprint of a factor of $t$, and it is what to look for going the other way.',
  },
]

export const PATTERN =
  'Reading it backwards is the part worth practising. A denominator raised to a power — $(s^{2}+k^{2})^{2}$ rather than $s^{2}+k^{2}$ — is what a factor of $t$ looks like from the $s$-side. One extra power, one factor of $t$.'

/** The results worth recognising on sight. */
export const PAIRS: { f: string; F: string; note: string }[] = [
  {
    f: 't\\sin kt',
    F: '\\dfrac{2ks}{\\left(s^{2}+k^{2}\\right)^{2}}',
    note: 'The one that matters: it is what a spring driven at its own frequency does.',
  },
  {
    f: 't\\cos kt',
    F: '\\dfrac{s^{2}-k^{2}}{\\left(s^{2}+k^{2}\\right)^{2}}',
    note: 'Same denominator, and a numerator that changes sign at $s = k$.',
  },
  {
    f: 't\\sinh kt',
    F: '\\dfrac{2ks}{\\left(s^{2}-k^{2}\\right)^{2}}',
    note: 'The hyperbolic pair, differing only in the sign downstairs, as always.',
  },
  {
    f: 't^{2}\\sin kt',
    F: '\\dfrac{6ks^{2}-2k^{3}}{\\left(s^{2}+k^{2}\\right)^{3}}',
    note: 'Two factors of $t$, so two differentiations, a third power downstairs — and the sign back where it started.',
  },
]

export const TWO_ROUTES =
  'For $t^{n}e^{at}$ there are two routes, and the book shows both. Theorem 7.3.1 reads $\\mathcal{L}\\{te^{3t}\\}$ as $\\mathcal{L}\\{t\\}$ with $s$ replaced by $s-3$, giving $1/(s-3)^{2}$. Theorem 7.4.1 differentiates $1/(s-3)$ and negates, giving $1/(s-3)^{2}$. They agree, and they must: the theorems describe the same function, not two different ones. For the oscillating rows there is only the one route, which is why this theorem earns its place.'
