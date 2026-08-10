/**
 * The two theorems as the book states them, for quoting verbatim.
 *
 * This is deliberately separate from `forms.ts`. That file is the trainer's
 * working model of a row — parameters, evaluation, teaching notes — and it
 * takes liberties for the sake of drilling. This one is the citation: the same
 * seven facts in the book's own wording, ordering, and orientation, including
 * the fact that Theorem 7.2.1 is written with the function on the *left*.
 *
 * Zill, A First Course in Differential Equations, 9e, §7.1 and §7.2.
 */

export interface TheoremItem {
  letter: string
  tex: string
  /** Side condition printed after the statement, as the book prints it. */
  condition?: string
}

export interface Theorem {
  id: string
  number: string
  title: string
  /** The book's remark immediately before the boxed statement. */
  lead?: string
  items: TheoremItem[]
  /** The book's remark immediately after it. */
  note?: string
}

export const THEOREMS: Record<string, Theorem> = {
  '7.1.1': {
    id: '7.1.1',
    number: 'Theorem 7.1.1',
    title: 'Transforms of Some Basic Functions',
    lead: 'From this point on we shall also refrain from stating any restrictions on $s$; it is understood that $s$ is sufficiently restricted to guarantee the convergence of the appropriate Laplace transform.',
    items: [
      { letter: 'a', tex: '\\mathcal{L}\\{1\\} = \\dfrac{1}{s}' },
      {
        letter: 'b',
        tex: '\\mathcal{L}\\{t^n\\} = \\dfrac{n!}{s^{n+1}}',
        condition: 'n = 1, 2, 3, \\ldots',
      },
      { letter: 'c', tex: '\\mathcal{L}\\{e^{at}\\} = \\dfrac{1}{s-a}' },
      { letter: 'd', tex: '\\mathcal{L}\\{\\sin kt\\} = \\dfrac{k}{s^2+k^2}' },
      { letter: 'e', tex: '\\mathcal{L}\\{\\cos kt\\} = \\dfrac{s}{s^2+k^2}' },
      { letter: 'f', tex: '\\mathcal{L}\\{\\sinh kt\\} = \\dfrac{k}{s^2-k^2}' },
      { letter: 'g', tex: '\\mathcal{L}\\{\\cosh kt\\} = \\dfrac{s}{s^2-k^2}' },
    ],
  },
  '7.2.1': {
    id: '7.2.1',
    number: 'Theorem 7.2.1',
    title: 'Some Inverse Transforms',
    items: [
      { letter: 'a', tex: '1 = \\mathcal{L}^{-1}\\!\\left\\{\\dfrac{1}{s}\\right\\}' },
      {
        letter: 'b',
        tex: 't^n = \\mathcal{L}^{-1}\\!\\left\\{\\dfrac{n!}{s^{n+1}}\\right\\}',
        condition: 'n = 1, 2, 3, \\ldots',
      },
      { letter: 'c', tex: 'e^{at} = \\mathcal{L}^{-1}\\!\\left\\{\\dfrac{1}{s-a}\\right\\}' },
      { letter: 'd', tex: '\\sin kt = \\mathcal{L}^{-1}\\!\\left\\{\\dfrac{k}{s^2+k^2}\\right\\}' },
      { letter: 'e', tex: '\\cos kt = \\mathcal{L}^{-1}\\!\\left\\{\\dfrac{s}{s^2+k^2}\\right\\}' },
      { letter: 'f', tex: '\\sinh kt = \\mathcal{L}^{-1}\\!\\left\\{\\dfrac{k}{s^2-k^2}\\right\\}' },
      { letter: 'g', tex: '\\cosh kt = \\mathcal{L}^{-1}\\!\\left\\{\\dfrac{s}{s^2-k^2}\\right\\}' },
    ],
    note: 'In evaluating inverse transforms, it often happens that a function of $s$ under consideration does not match exactly the form of a Laplace transform $F(s)$ given in a table. It may be necessary to “fix up” the function of $s$ by multiplying and dividing by an appropriate constant.',
  },
  '7.2.2': {
    id: '7.2.2',
    number: 'Theorem 7.2.2',
    title: 'Transform of a Derivative',
    lead: 'If $f, f^{\\prime}, \\ldots, f^{(n-1)}$ are continuous on $[0, \\infty)$ and are of exponential order and if $f^{(n)}(t)$ is piecewise continuous on $[0, \\infty)$, then',
    items: [
      {
        letter: '',
        tex: '\\mathcal{L}\\{f^{(n)}(t)\\} = s^n F(s) - s^{n-1}f(0) - s^{n-2}f^{\\prime}(0) - \\cdots - f^{(n-1)}(0)',
      },
    ],
    note: 'where $F(s) = \\mathcal{L}\\{f(t)\\}$.',
  },
}
