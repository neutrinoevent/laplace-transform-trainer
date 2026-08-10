/**
 * The review deck. Cards are the *generic* rows — `\mathcal{L}\{\sin kt\}`, not
 * `\mathcal{L}\{\sin 3t\}` — because what has to survive until the exam is the
 * shape with its parameter in place, not one instance of it.
 *
 * Card ids are the same ids the drill records against, so a miss in Drill pulls
 * the matching card's review forward. There is one card per row per direction:
 * recognizing `k/(s^2+k^2)` on sight is a different skill from producing it.
 */

import { FORMS, type FormId } from './forms'
import { GENERAL_TEX } from './derivatives'
import { invLap, lap } from '../lib/expr'
import { itemId, type Direction } from '../generators/types'

export interface Card {
  id: string
  /** Which row this card belongs to, for scoping. Null for the two rule cards. */
  form: FormId | null
  direction: Direction | null
  section: string
  label: string
  promptTex: string
  answerTex: string
  note?: string
}

const rowCards: Card[] = FORMS.flatMap((f) => [
  {
    id: itemId(f.id, 'forward'),
    form: f.id,
    direction: 'forward' as Direction,
    section: '7.1.1',
    label: `${f.name} — forward`,
    promptTex: `${lap(f.genericF)} \\;=\\; ?`,
    answerTex: f.genericS,
    note: f.note,
  },
  {
    id: itemId(f.id, 'inverse'),
    form: f.id,
    direction: 'inverse' as Direction,
    section: '7.2.1',
    label: `${f.name} — inverse`,
    promptTex: `${invLap(f.genericS)} \\;=\\; ?`,
    answerTex: f.genericF,
    note: f.confusion,
  },
])

export const RULE_CARDS: Card[] = [
  {
    id: 'rule:linearity',
    form: null,
    direction: null,
    section: '7.1',
    label: 'Linearity',
    promptTex: `${lap('\\alpha f(t) + \\beta g(t)')} \\;=\\; ?`,
    answerTex: '\\alpha F(s) + \\beta G(s)',
    note: 'It runs both ways: $\\mathcal{L}^{-1}$ is linear too, which is what lets you split a fraction and invert the pieces one at a time.',
  },
  {
    id: 'rule:derivative',
    form: null,
    direction: null,
    section: '7.2.2',
    label: 'Transform of a derivative',
    promptTex: `${lap('f^{(n)}(t)')} \\;=\\; ?`,
    answerTex: GENERAL_TEX.replace('\\mathcal{L}\\{f^{(n)}(t)\\} = ', ''),
    note: 'In every subtracted term the power of $s$ and the order of the derivative at $0$ sum to $n-1$, and there is one term for each order from $0$ to $n-1$.',
  },
  {
    id: 'rule:fixup',
    form: null,
    direction: null,
    section: '7.2',
    label: 'Fixing up the constant',
    promptTex: `${invLap('\\dfrac{1}{s^2+9}')} \\;=\\; ?`,
    answerTex: '\\dfrac{1}{3}\\,\\mathcal{L}^{-1}\\!\\left\\{\\dfrac{3}{s^2+9}\\right\\} = \\dfrac{1}{3}\\sin 3t',
    note: 'No table row has a bare 1 over $s^2+k^2$. Multiply and divide by the $k$ the row wants; the division comes out front by linearity.',
  },
]

export const CARDS: Card[] = [...rowCards, ...RULE_CARDS]

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]))
