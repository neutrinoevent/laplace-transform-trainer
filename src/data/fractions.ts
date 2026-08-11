/**
 * Partial fractions, and completing the square.
 *
 * Neither is a Laplace theorem. Both are algebra the chapter leans on entirely:
 * without them the table applies to almost nothing you are actually handed, and
 * with them it applies to everything. That is the case the reference makes.
 *
 * Completing the square gets its own section rather than a footnote inside the
 * quadratic case, because it is needed in two different places — here, and in
 * the first translation theorem — and a sub-method used twice deserves to be
 * learned once, properly.
 */

export interface Worked {
  label: string
  tex?: string
  text?: string
}

export const WHY =
  'Every inverse transform in the table has a particular shape, and a rational function handed to you almost never has one of them. Partial fractions is what turns the one you were given into a sum of the ones you know. It is the last step of solving a differential equation by transform, and the step most answers are lost on.'

export const METHOD: Worked[] = [
  {
    label: 'Factor',
    text: 'Factor the denominator as far as it goes over the reals: linear factors, repeated linear factors, and quadratics with no real roots.',
  },
  {
    label: 'Write the shape',
    text: 'One term for each factor, before any constants are known. A repeated factor takes one term for *each* power up to its multiplicity; an irreducible quadratic takes a linear numerator.',
    tex: '\\dfrac{N(s)}{(s-a)(s-b)^2\\left(s^2+ps+q\\right)} = \\dfrac{A}{s-a} + \\dfrac{B}{s-b} + \\dfrac{C}{(s-b)^2} + \\dfrac{Ds+E}{s^2+ps+q}',
  },
  {
    label: 'Find the constants',
    text: 'For a distinct linear factor, cover it up and set $s$ to its root — the other terms vanish and the constant falls out. Otherwise multiply through and match coefficients.',
  },
  {
    label: 'Invert each piece',
    text: 'Every piece is now a row of the table, possibly translated. That is the whole point of the shape you chose.',
  },
]

/** Which row each shape of piece inverts to, which is what the shape is for. */
export const PIECE_TABLE: { piece: string; inverse: string; note: string }[] = [
  {
    piece: '\\dfrac{A}{s-a}',
    inverse: 'Ae^{at}',
    note: 'Row (c), straight off.',
  },
  {
    piece: '\\dfrac{A}{(s-a)^{n}}',
    inverse: '\\dfrac{A}{(n-1)!}\\,t^{\\,n-1}e^{at}',
    note: 'Row (b) translated — Theorem 7.3.1 is why a repeated factor produces a power of $t$.',
  },
  {
    piece: '\\dfrac{As+B}{s^2+k^2}',
    inverse: 'A\\cos kt + \\dfrac{B}{k}\\sin kt',
    note: 'Split it: the $s$ goes with cosine, the constant with sine, and the sine needs its usual fix-up.',
  },
  {
    piece: '\\dfrac{A(s-a)+B}{(s-a)^2+k^2}',
    inverse: 'Ae^{at}\\cos kt + \\dfrac{B}{k}e^{at}\\sin kt',
    note: 'The same split, translated. Getting the denominator into this form is what completing the square is for.',
  },
]

export const COVER_UP =
  'Cover-up is worth the minute it takes to learn. To find the constant over $(s-a)$, put your finger over that factor in the original and evaluate everything left at $s = a$. Every other term had an $(s-a)$ in its numerator after clearing, so every other term is zero there, and the constant is simply what remains.'

export const COVER_UP_EXAMPLE: Worked[] = [
  {
    label: 'The shape',
    tex: '\\dfrac{3s+5}{(s-1)(s+2)} = \\dfrac{A}{s-1} + \\dfrac{B}{s+2}',
  },
  {
    label: 'Cover and evaluate',
    tex: 'A = \\left.\\dfrac{3s+5}{s+2}\\right|_{s=1} = \\dfrac{8}{3}, \\qquad B = \\left.\\dfrac{3s+5}{s-1}\\right|_{s=-2} = \\dfrac{1}{3}',
    text: 'Cover $(s-1)$ and set $s=1$; then cover $(s+2)$ and set $s=-2$. No system to solve.',
  },
  {
    label: 'Invert',
    tex: '\\mathcal{L}^{-1}\\left\\{\\dfrac{3s+5}{(s-1)(s+2)}\\right\\} = \\dfrac{8}{3}e^{t} + \\dfrac{1}{3}e^{-2t}',
  },
]

// ---------------------------------------------------------------------------
// Completing the square
// ---------------------------------------------------------------------------

export const SQUARE_WHY =
  'A quadratic with no real roots cannot be broken into linear pieces, so no amount of partial-fraction work will reach the table by that route. Completing the square reaches it by the other route: it rewrites the quadratic as $(s-a)^2 + k^2$, which is rows (d) and (e) translated, and Theorem 7.3.1 does the rest.'

export const SQUARE_RULE =
  's^2 + bs + c = \\left(s + \\tfrac{b}{2}\\right)^{2} + \\left(c - \\tfrac{b^{2}}{4}\\right)'

export const SQUARE_METHOD: Worked[] = [
  {
    label: 'Halve and square',
    text: 'Half the coefficient of $s$ goes inside the bracket. Its square is what the bracket adds, so the same amount comes back off the constant.',
    tex: 's^{2} + 6s + 13 = \\left(s^{2} + 6s + 9\\right) + 13 - 9',
  },
  {
    label: 'Read it off',
    text: 'The bracket is a perfect square and what is left is the constant. Here $k^2 = 4$, so $k = 2$, and the translation is $a = -3$.',
    tex: '= (s+3)^{2} + 4',
  },
  {
    label: 'Now it is a row',
    text: 'Row (d) translated by $-3$. The constant fix-up happens exactly as it always does — the translation changes nothing about it.',
    tex: '\\mathcal{L}^{-1}\\left\\{\\dfrac{1}{(s+3)^{2}+4}\\right\\} = \\dfrac{1}{2}\\,\\mathcal{L}^{-1}\\left\\{\\dfrac{2}{(s+3)^{2}+4}\\right\\} = \\dfrac{1}{2}e^{-3t}\\sin 2t',
  },
]

export const SQUARE_CHECK =
  'Check the discriminant before reaching for it: if $b^2 - 4c \\ge 0$ the quadratic *does* factor, and factoring is easier. Completing the square is for the case where it does not.'

/** Where the two sub-methods meet, which is the thing worth carrying away. */
export const TOGETHER =
  'The two halves of this page are one workflow. Factor what factors, decompose over those factors, and complete the square on whatever is left — at which point every piece is a row of Theorem 7.2.1, translated where the algebra translated it.'
