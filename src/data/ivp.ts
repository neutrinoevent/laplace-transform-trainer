/**
 * The method, stated once.
 *
 * §7.2.2 in Zill: the transform turns an initial-value problem into an algebra
 * problem, because Theorem 7.2.2 converts each derivative into `Y(s)` plus the
 * initial values, and the initial values are already in hand. The pay-off is
 * that the initial conditions go in at the *start* rather than being fitted to
 * a general solution at the end, which is the difference students notice first.
 */

export interface Worked {
  label: string
  tex?: string
  text?: string
}

export const WHY =
  'Every other method for a constant-coefficient equation asks for the general solution first — homogeneous part, particular part, arbitrary constants — and only then makes the initial conditions fit. The transform does the opposite. $y(0)$ and $y^{\\prime}(0)$ enter in the very first step, carried in by Theorem 7.2.2, and what comes out at the end is already *the* solution. There is no general solution and no constants to determine.'

export const RULE_TEX =
  '\\mathcal{L}\\{y^{(n)}\\} = s^{n}Y(s) - s^{n-1}y(0) - s^{n-2}y^{\\prime}(0) - \\cdots - y^{(n-1)}(0)'

/** The four moves, in the order they are made. */
export const METHOD: Worked[] = [
  {
    label: 'Transform',
    tex: '\\mathcal{L}\\{y^{\\prime\\prime}\\} = s^2Y(s) - sy(0) - y^{\\prime}(0), \\qquad \\mathcal{L}\\{y^{\\prime}\\} = sY(s) - y(0)',
    text: 'Apply the transform to both sides. Each derivative becomes a power of $s$ times $Y(s)$, minus the initial values it was started from. This is the step that stops it being a differential equation.',
  },
  {
    label: 'Solve',
    tex: '\\left(s^2 + bs + c\\right)Y(s) = \\text{(initial values)} + G(s) \\;\\Longrightarrow\\; Y(s) = \\dfrac{\\cdots}{s^2 + bs + c}',
    text: 'Collect every $Y(s)$ on one side and divide. One line of algebra — the polynomial doing the dividing is the characteristic polynomial, the same one the other methods use.',
  },
  {
    label: 'Decompose',
    text: 'The result is one rational function, and the table has no row for it. Partial fractions take it apart into pieces that are rows: a constant over a linear factor, a constant over a repeated one, a linear numerator over an irreducible quadratic.',
  },
  {
    label: 'Invert',
    text: 'Read each piece off the table right to left and add them up. That sum *is* $y(t)$ — no constants left to determine, because the initial values went in at step one.',
  },
]

/** One problem worked all the way through, at the size the drill poses. */
export const WORKED: Worked[] = [
  {
    label: 'The problem',
    tex: 'y^{\\prime\\prime} - y^{\\prime} - 6y = 0, \\qquad y(0) = 1,\\; y^{\\prime}(0) = 2',
  },
  {
    label: 'Transform',
    tex: '\\left(s^2Y - s(1) - 2\\right) - \\left(sY - 1\\right) - 6Y = 0',
    text: 'Each derivative brings its own initial values across.',
  },
  {
    label: 'Solve',
    tex: '\\left(s^2 - s - 6\\right)Y = s + 1 \\;\\Longrightarrow\\; Y(s) = \\dfrac{s + 1}{s^2 - s - 6}',
    text: 'Collect the $Y$s and divide. The denominator factors as $(s-3)(s+2)$.',
  },
  {
    label: 'Decompose',
    tex: 'Y(s) = \\dfrac{\\frac{4}{5}}{s - 3} + \\dfrac{\\frac{1}{5}}{s + 2}',
    text: 'Cover up $s-3$ and read $s = 3$: $(3+1)/(3+2) = 4/5$. Cover up $s+2$ and read $s = -2$: $(-2+1)/(-2-3) = 1/5$.',
  },
  {
    label: 'Invert',
    tex: 'y(t) = \\tfrac{4}{5}e^{3t} + \\tfrac{1}{5}e^{-2t}',
    text: 'Both pieces are row (c). Check it: at $t = 0$ this is $4/5 + 1/5 = 1$, which is $y(0)$, as it must be.',
  },
]

export const CHECKING =
  'The cheapest check there is: put $t = 0$ into your answer and see whether you get $y(0)$ back. It costs a few seconds and catches a wrong constant, a dropped piece, or a sign that slipped somewhere in the decomposition. Differentiating once and checking $y^{\\prime}(0)$ catches most of the rest.'

/** What the denominator's shape tells you before any arithmetic. */
export const SHAPES: { root: string; piece: string; note: string }[] = [
  {
    root: 'Distinct real roots',
    piece: '\\dfrac{A}{s-a} + \\dfrac{B}{s-b}',
    note: 'Exponentials, $Ae^{at} + Be^{bt}$. Cover-up finds each constant in one substitution.',
  },
  {
    root: 'A repeated root',
    piece: '\\dfrac{A}{s-a} + \\dfrac{B}{(s-a)^2}',
    note: 'The squared piece inverts through Theorem 7.3.1 to $Bte^{at}$ — the $t$ is what a repeated root always produces.',
  },
  {
    root: 'A complex pair',
    piece: '\\dfrac{A(s-\\alpha) + B}{(s-\\alpha)^2 + \\beta^2}',
    note: 'Oscillation: $e^{\\alpha t}\\left(A\\cos\\beta t + \\tfrac{B}{\\beta}\\sin\\beta t\\right)$. Complete the square first; never factor it over the reals.',
  },
  {
    root: 'A forcing function',
    piece: '\\dfrac{\\cdots}{(s^2+bs+c)\\,q(s)}',
    note: 'Its own poles join the characteristic ones. If they coincide — forcing at a natural frequency — the pole repeats and a $t$ appears in the answer.',
  },
]
