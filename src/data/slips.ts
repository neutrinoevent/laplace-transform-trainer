/**
 * The named ways of getting these problems wrong.
 *
 * Every distractor in the app already carries a sentence explaining the mistake
 * it represents. What that sentence could not do is add up: dropping the
 * constant fix-up on `sin`, on `sinh`, and on a delayed inverse is *one*
 * problem, and reporting it as three weak rows tells a student to practise the
 * wrong thing. Tagging each distractor with the slip it embodies is what lets
 * the same error be counted once, wherever it turns up.
 *
 * The taxonomy is deliberately coarse. A tag earns its place only if the advice
 * that follows from it differs from the advice that follows from its
 * neighbours — otherwise it is a finer name for the same remedy.
 */

export type SlipId =
  | 'fixup'
  | 'row-choice'
  | 'row-marker'
  | 'family'
  | 'factorial'
  | 'power-index'
  | 'exp-sign'
  | 'linearity'
  | 'translation-choice'
  | 'translation-sign'
  | 'translation-missing'
  | 'derivative-pairing'
  | 'derivative-terms'
  | 'decomposition-shape'
  | 'decomposition-constants'
  | 'derivative-sign'
  | 'derivative-count'
  | 'derivative-shape'
  | 'square'

export interface Slip {
  id: SlipId
  /** Short label, for a table row. */
  name: string
  /** What the mistake is, in the student's terms. */
  what: string
  /** What to do about it — the reason for naming it at all. */
  fix: string
}

export const SLIPS: Slip[] = [
  {
    id: 'fixup',
    name: 'The constant fix-up',
    what: 'The row’s own constant mishandled — not manufactured when the row needs it, or invented when it does not.',
    fix: 'Ask what numerator the row actually wants. Rows (b), (d) and (f) demand one and you must build it; rows (a), (c), (e) and (g) already have theirs and need nothing.',
  },
  {
    id: 'row-choice',
    name: 'The wrong row',
    what: 'A different row of the table applied — one whose denominator is not the shape in front of you.',
    fix: 'Read the denominator first and let it pick the row: a bare $s$, one linear factor, or $s^2 \\pm k^2$. Only then look at the numerator.',
  },
  {
    id: 'row-marker',
    name: 'Sine against cosine',
    what: 'Reading the numerator marker the wrong way round — an $s$ on top means cosine, a constant means sine.',
    fix: 'The denominators are identical. The numerator is the only thing separating rows (d) and (e), and likewise (f) and (g).',
  },
  {
    id: 'family',
    name: 'Circular against hyperbolic',
    what: 'Missing the sign on $k^2$, so a circular row is read as hyperbolic or the reverse.',
    fix: '$s^2 + k^2$ is sine and cosine; $s^2 - k^2$ is their hyperbolic pair. The sign downstairs is the whole difference.',
  },
  {
    id: 'factorial',
    name: 'The factorial',
    what: 'Row (b) mishandled: $n$ used in place of $n!$, or the factorial dropped, or divided by $n$ rather than $n!$.',
    fix: '$\\mathcal{L}\\{t^n\\} = n!/s^{\\,n+1}$. Going the other way you owe a division by $n!$, not by $n$.',
  },
  {
    id: 'power-index',
    name: 'The power of s',
    what: 'Off by one between the power on $t$ and the power on $s$.',
    fix: 'The power downstairs is always one more than the power on $t$: $t^3$ sits over $s^4$.',
  },
  {
    id: 'exp-sign',
    name: 'The exponential’s sign',
    what: 'The sign of $a$ flipped between $e^{at}$ and $1/(s-a)$.',
    fix: 'The pole is the rate: $e^{-3t}$ has its pole at $s = -3$, so the denominator reads $s + 3$.',
  },
  {
    id: 'linearity',
    name: 'A term lost or gained',
    what: 'One piece of a sum dropped, duplicated, or left untransformed.',
    fix: 'Transform each piece separately and add. Count the pieces you started with against the pieces you finished with.',
  },
  {
    id: 'translation-choice',
    name: 'Which translation theorem',
    what: 'Answering with the other one — $e^{-as}F(s)$ where $F(s-a)$ was wanted, or the reverse.',
    fix: 'Ask which domain the exponential lives in. One in $t$ slides the transform along the $s$-axis; one in $s$ delays the function along the $t$-axis.',
  },
  {
    id: 'translation-sign',
    name: 'The translation’s sign',
    what: 'Translating the wrong way: $F(s+a)$ for $F(s-a)$, or $e^{as}$ for $e^{-as}$.',
    fix: 'Theorem 7.3.1 reads $F(s-a)$ and Theorem 7.3.2 reads $e^{-as}$. Write the theorem out before substituting.',
  },
  {
    id: 'translation-missing',
    name: 'A translation left out',
    what: 'The exponential, the delay, or the unit step dropped — including translating a denominator but leaving the $s$ upstairs alone.',
    fix: 'Every $s$ in the transform moves, not only the ones downstairs. A delayed answer needs the argument shifted *and* the step attached.',
  },
  {
    id: 'derivative-pairing',
    name: 'Pairing s with the initial value',
    what: 'The powers of $s$ attached to the wrong initial values in $\\mathcal{L}\\{y^{(n)}\\}$.',
    fix: 'In every subtracted term the power of $s$ and the order of the derivative add to $n-1$. That one fact fixes the whole pairing.',
  },
  {
    id: 'derivative-terms',
    name: 'The initial-value terms',
    what: 'Wrong number of subtracted terms, or added where they should be subtracted.',
    fix: 'One subtracted term per derivative, from $y(0)$ up to $y^{(n-1)}(0)$, and every one of them negative.',
  },
  {
    id: 'decomposition-shape',
    name: 'The decomposition’s shape',
    what: 'The wrong form written down: a repeated factor given one term instead of one per power, or a quadratic given a constant numerator.',
    fix: 'Each shape is chosen because it inverts to a row. A repeated factor needs every power; an irreducible quadratic needs $As+B$.',
  },
  {
    id: 'decomposition-constants',
    name: 'The decomposition’s constants',
    what: 'Constants attached to the wrong factor, signed wrongly, or a piece missing from the sum.',
    fix: 'Cover up the factor you want and set $s$ to its root. It is faster than a system and harder to get backwards.',
  },
  {
    id: 'derivative-sign',
    name: 'The sign on $(-1)^n$',
    what: 'Theorem 7.4.1 applied without its sign, so every term of the answer comes out backwards.',
    fix: 'One factor of $t$ costs one derivative *and* one change of sign. Odd powers of $t$ flip; even ones do not.',
  },
  {
    id: 'derivative-count',
    name: 'How many times to differentiate',
    what: 'The transform differentiated once too often or not often enough for the power of $t$ in the question.',
    fix: 'The power of $t$ and the number of differentiations are the same number, and it is also what the denominator’s power records: $t^n$ raises it by $n$.',
  },
  {
    id: 'derivative-shape',
    name: 'Differentiating against multiplying',
    what: 'Multiplying by $t$ treated as an operation *on* the transform rather than as differentiating it.',
    fix: 'Theorem 7.4.1 says $\\mathcal{L}\\{t^nf(t)\\} = (-1)^n F^{(n)}(s)$. The quotient rule changes the numerator as well as the denominator.',
  },
  {
    id: 'square',
    name: 'Completing the square',
    what: 'Half the middle coefficient mishandled, or the wrong amount taken back off the constant.',
    fix: 'Half of $b$ goes inside the bracket, and its square comes back off $c$. What is left is $k^2$.',
  },
]

export const SLIP_BY_ID = new Map(SLIPS.map((s) => [s.id, s]))
