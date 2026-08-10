/**
 * Transform of a derivative — Zill 9e, §7.2.2, equations (6)–(8) and
 * Theorem 7.2.2.
 *
 * One rule, but three things have to land for it to be usable, and they are
 * different things:
 *
 *   the pattern   — n subtracted terms, all minus, in which the power of s and
 *                   the order of the derivative always sum to n - 1;
 *   the origin    — integration by parts, once per derivative, each pass paying
 *                   out one initial value, which is why the rule is recursive;
 *   the purpose   — it is what turns a differential equation into an algebraic
 *                   one, so an IVP in y becomes a formula for Y(s).
 *
 * This file holds the stated instances and the prose. Generation lives in
 * `generators/derivative.ts`.
 */

export interface Instance {
  /** The equation number the book gives it. */
  label: string
  order: number
  tex: string
}

/** Equations (6), (7) and (8), verbatim. */
export const INSTANCES: Instance[] = [
  {
    label: '6',
    order: 1,
    tex: "\\mathcal{L}\\{f^{\\prime}(t)\\} = sF(s) - f(0)",
  },
  {
    label: '7',
    order: 2,
    tex: "\\mathcal{L}\\{f^{\\prime\\prime}(t)\\} = s^2F(s) - sf(0) - f^{\\prime}(0)",
  },
  {
    label: '8',
    order: 3,
    tex: "\\mathcal{L}\\{f^{\\prime\\prime\\prime}(t)\\} = s^3F(s) - s^2f(0) - sf^{\\prime}(0) - f^{\\prime\\prime}(0)",
  },
]

export const GENERAL_TEX =
  '\\mathcal{L}\\{f^{(n)}(t)\\} = s^n F(s) - s^{n-1}f(0) - s^{n-2}f^{\\prime}(0) - \\cdots - f^{(n-1)}(0)'

/** The integration-by-parts computation the book shows for n = 1. */
export const ORIGIN_STEPS: { label: string; tex?: string; text?: string }[] = [
  {
    label: 'By parts',
    tex: "\\mathcal{L}\\{f^{\\prime}(t)\\} = \\int_0^{\\infty} e^{-st}f^{\\prime}(t)\\,dt = e^{-st}f(t)\\Big|_0^{\\infty} + s\\int_0^{\\infty} e^{-st}f(t)\\,dt",
    text: 'Integrate by parts with $u = e^{-st}$ and $dv = f^{\\prime}(t)\\,dt$. The boundary term is where the initial value comes from.',
  },
  {
    label: 'The boundary',
    tex: "= -f(0) + s\\mathcal{L}\\{f(t)\\}",
    text: 'Assuming $e^{-st}f(t) \\to 0$ as $t \\to \\infty$, the upper limit contributes nothing and the lower limit leaves $-f(0)$.',
  },
  {
    label: 'Equation (6)',
    tex: '\\mathcal{L}\\{f^{\\prime}(t)\\} = sF(s) - f(0)',
    text: 'One derivative peeled off costs one power of $s$ upstairs and one initial value.',
  },
]

/** How (7) falls out of (6) — the recursion, which is what makes the rule memorable. */
export const RECURSION_STEPS: { label: string; tex?: string; text?: string }[] = [
  {
    label: 'Start from (6)',
    tex: "\\mathcal{L}\\{f^{\\prime\\prime}(t)\\} = s\\mathcal{L}\\{f^{\\prime}(t)\\} - f^{\\prime}(0)",
    text: 'Treat $f^{\\prime\\prime}$ as the derivative of $f^{\\prime}$ and use the rule you already have.',
  },
  {
    label: 'Substitute (6)',
    tex: "= s\\left[sF(s) - f(0)\\right] - f^{\\prime}(0)",
    text: 'Now expand $\\mathcal{L}\\{f^{\\prime}\\}$ by (6). Every term inside the bracket picks up a factor of $s$.',
  },
  {
    label: 'Equation (7)',
    tex: "\\mathcal{L}\\{f^{\\prime\\prime}(t)\\} = s^2F(s) - sf(0) - f^{\\prime}(0)",
    text: 'That is why the powers of $s$ descend while the order of the derivative climbs: each round of the recursion multiplies the old terms by $s$ and adds one new initial value at the bottom.',
  },
]

/**
 * The invariant worth carrying away. Every subtracted term in the expansion of
 * order n has (power of s) + (order of the derivative at 0) = n - 1, which
 * fixes both the pairing and the count in one statement.
 */
export const INVARIANT =
  'In every subtracted term, the power of $s$ and the order of the derivative at $0$ add up to $n-1$. That one fact fixes the pairing — $s^{n-1}$ goes with $y(0)$, and a bare $y^{(n-1)}(0)$ carries no $s$ at all — and it fixes the count, since there is one term for each order from $0$ to $n-1$.'

export const PURPOSE =
  'This is the rule that does the work. Applying it to each derivative in an initial-value problem turns the equation into an algebraic one in $Y(s)$, initial conditions and all, which is then solved by ordinary algebra rather than by any method for differential equations.'

/** Derivative order written the way the book writes it: primes to three, then (n). */
export function primeTex(order: number, name = 'y'): string {
  if (order === 0) return name
  if (order <= 3) return `${name}^{${"\\prime".repeat(order)}}`
  return `${name}^{(${order})}`
}

/** `y(0)`, `y'(0)`, `y''(0)`, `y^{(3)}(0)` — an initial value, symbolically. */
export const initialTex = (order: number, name = 'y'): string => `${primeTex(order, name)}(0)`
