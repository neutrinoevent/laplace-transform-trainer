/**
 * The translation theorems — Zill 9e, §7.3.1 and §7.3.2.
 *
 * Two theorems, one idea in two places: a shift in one domain is a multiplier
 * in the other.
 *
 *   s-axis (7.3.1)   multiply by e^{at}  in t   ⟷  read F at s - a
 *   t-axis (7.3.2)   delay by a and switch on   ⟷  multiply F by e^{-as}
 *
 * Laid out that way the pair is one fact, and the mistake the drills exist to
 * catch is using the wrong one of them — answering e^{-as}F(s) when the
 * exponential was in t, or F(s-a) when the function was delayed.
 *
 * The unit step gets taught but not drilled on its own: it is the notation the
 * second theorem is written in, so it has to be readable, but reading it is not
 * a skill worth a scoreboard.
 */

export interface Worked {
  label: string
  tex?: string
  text?: string
}

// ---------------------------------------------------------------------------
// s-axis
// ---------------------------------------------------------------------------

export const FIRST_TEX = '\\mathcal{L}\\{e^{at}f(t)\\} = F(s - a)'

export const FIRST_ALT_TEX =
  '\\mathcal{L}\\{e^{at}f(t)\\} = \\mathcal{L}\\{f(t)\\}\\big|_{s \\to s-a}'

export const FIRST_IDEA =
  'Nothing new has to be computed. Take the transform you already have and replace every $s$ in it by $s-a$ — every one, including an $s$ sitting in the numerator, which is where this goes wrong most often.'

export const FIRST_GRAPH =
  'Read as a graph, $F(s-a)$ is $F(s)$ slid along the $s$-axis by $|a|$: to the right when $a > 0$, to the left when $a < 0$. The poles travel with it, which is why $\\mathcal{L}\\{e^{5t}t^3\\}$ blows up at $s = 5$ rather than at $s = 0$.'

/** Zill's Example 1, both parts. */
export const FIRST_EXAMPLES: Worked[] = [
  {
    label: 'Example 1(a)',
    tex: '\\mathcal{L}\\{e^{5t}t^{3}\\} = \\mathcal{L}\\{t^{3}\\}\\big|_{s \\to s-5} = \\dfrac{3!}{s^{4}}\\bigg|_{s \\to s-5} = \\dfrac{6}{(s-5)^{4}}',
    text: 'Row (b) first, then the substitution. The factorial is untouched by the translation — only the $s$ moves.',
  },
  {
    label: 'Example 1(b)',
    tex: '\\mathcal{L}\\{e^{-2t}\\cos 4t\\} = \\mathcal{L}\\{\\cos 4t\\}\\big|_{s \\to s+2} = \\dfrac{s}{s^{2}+16}\\bigg|_{s \\to s+2} = \\dfrac{s+2}{(s+2)^{2}+16}',
    text: 'Here $a = -2$, so $s$ becomes $s+2$. The numerator was an $s$, so it becomes $s+2$ as well — leaving it as a bare $s$ is the standard slip.',
  },
]

/** Running the theorem backwards is where completing the square earns its keep. */
export const FIRST_INVERSE =
  'Backwards the theorem reads $\\mathcal{L}^{-1}\\{F(s-a)\\} = e^{at}f(t)$. The work is in recognising that a denominator *is* a translated one: an irreducible quadratic like $s^2+6s+13$ is not in the table, but completing the square turns it into $(s+3)^2+4$, which is row (d) translated by $a=-3$.'

export const FIRST_INVERSE_EXAMPLE: Worked[] = [
  {
    label: 'Complete the square',
    tex: '\\dfrac{1}{s^{2}+6s+13} = \\dfrac{1}{(s^{2}+6s+9)+4} = \\dfrac{1}{(s+3)^{2}+4}',
    text: 'Half of 6 is 3, and $3^2 = 9$; add and subtract it. The denominator is now a translated $s^2+k^2$ with $k=2$ and $a=-3$.',
  },
  {
    label: 'Fix up, then translate',
    tex: '= \\dfrac{1}{2}\\cdot\\dfrac{2}{(s+3)^{2}+4} \\;\\longrightarrow\\; \\dfrac{1}{2}e^{-3t}\\sin 2t',
    text: 'Row (d) wants $k=2$ upstairs, so the constant is fixed up exactly as it would be without the translation. The translation then contributes $e^{-3t}$ and nothing else.',
  },
]

// ---------------------------------------------------------------------------
// The unit step
// ---------------------------------------------------------------------------

export const STEP_TEX =
  '\\mathcal{U}(t-a) = \\begin{cases} 0, & 0 \\le t < a \\\\ 1, & t \\ge a \\end{cases}'

export const STEP_IDEA =
  'A switch: off until $t = a$, on from then on. Multiplying by it turns a function off — the graph of $f(t)\\,\\mathcal{U}(t-a)$ is flat zero up to $a$ and is $f$ after it.'

export const STEP_PIECEWISE =
  'That is also how a piecewise definition gets written as a single expression, which is what makes it transformable at all. Every switch-over costs one step function.'

/** Equations (9) and (10), and the concrete instance the book gives. */
export const STEP_CONVERSIONS: Worked[] = [
  {
    label: 'Two pieces',
    tex: '\\begin{aligned} f(t) &= \\begin{cases} g(t), & 0 \\le t < a \\\\ h(t), & t \\ge a \\end{cases} \\\\[6pt] &= g(t) - g(t)\\,\\mathcal{U}(t-a) + h(t)\\,\\mathcal{U}(t-a) \\end{aligned}',
    text: 'Start with $g$ everywhere, switch it off at $a$, switch $h$ on in its place.',
  },
  {
    label: 'One piece, delayed',
    tex: '\\begin{aligned} f(t) &= \\begin{cases} 0, & 0 \\le t < a \\\\ g(t), & t \\ge a \\end{cases} \\\\[6pt] &= g(t)\\,\\mathcal{U}(t-a) \\end{aligned}',
    text: 'The case the second translation theorem is built for.',
  },
  {
    label: 'A worked instance',
    tex: '\\begin{aligned} f(t) &= \\begin{cases} 2, & 0 \\le t < 2 \\\\ -1, & 2 \\le t < 3 \\\\ 0, & t \\ge 3 \\end{cases} \\\\[6pt] &= 2 - 3\\,\\mathcal{U}(t-2) + \\mathcal{U}(t-3) \\end{aligned}',
    text: 'Read the coefficients as jumps: the value drops by 3 at $t=2$ and rises by 1 at $t=3$.',
  },
]

// ---------------------------------------------------------------------------
// t-axis
// ---------------------------------------------------------------------------

export const SECOND_TEX = '\\mathcal{L}\\{f(t-a)\\,\\mathcal{U}(t-a)\\} = e^{-as}F(s)'

export const SECOND_STEP_TEX = '\\mathcal{L}\\{\\mathcal{U}(t-a)\\} = \\dfrac{e^{-as}}{s}'

export const SECOND_IDEA =
  'The argument matters. The theorem applies to $f(t-a)\\,\\mathcal{U}(t-a)$ — the whole graph of $f$ picked up and moved $a$ units right, with nothing before $a$. Only then is the transform the old one times $e^{-as}$.'

export const SECOND_INVERSE =
  'Backwards: $\\mathcal{L}^{-1}\\{e^{-as}F(s)\\} = f(t-a)\\,\\mathcal{U}(t-a)$. Strip the $e^{-as}$, invert what is left, then delay the result and switch it on at $a$. Any constant fix-up the row needs is done before the delay, exactly as usual.'

export const SECOND_CAUTION =
  'A product like $t\\,\\mathcal{U}(t-1)$ is *not* of this form, because $t$ is not $t-1$ shifted. Rewriting it as $\\big((t-1)+1\\big)\\mathcal{U}(t-1)$ first — or using the alternative form $\\mathcal{L}\\{g(t)\\,\\mathcal{U}(t-a)\\} = e^{-as}\\mathcal{L}\\{g(t+a)\\}$ — is what the book turns to next. The drills here stay with the theorem as stated.'

/** The pair, stated together, which is the thing worth carrying away. */
export const PAIR_NOTE =
  'A multiplier in one domain is a shift in the other. An exponential in $t$ shifts the transform along the $s$-axis; an exponential in $s$ shifts the function along the $t$-axis. Deciding which theorem you are in is just asking which domain the exponential lives in.'
