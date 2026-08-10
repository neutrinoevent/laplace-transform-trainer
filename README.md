# Laplace Trainer

A drill for the operational core of Laplace transforms as Zill sets it out in
*A First Course in Differential Equations*, 9e: the seven basic pairs of **Theorem 7.1.1** and
**Theorem 7.2.1**, in both directions and with the constant fix-up made the explicit object of
practice, and the transform of a derivative, **Theorem 7.2.2**, which is what puts them to work.

Notation follows the book exactly: `t` and `s` for the variables, `n` for the power, `a` for the
exponential rate, `k` for the frequency, and the rows labelled (a)–(g) in the order the book gives
them.

| | f(t) | F(s) |
|---|---|---|
| (a) | 1 | 1/s |
| (b) | tⁿ, n = 1, 2, 3, … | n!/s<sup>n+1</sup> |
| (c) | e<sup>at</sup> | 1/(s−a) |
| (d) | sin kt | k/(s²+k²) |
| (e) | cos kt | s/(s²+k²) |
| (f) | sinh kt | k/(s²−k²) |
| (g) | cosh kt | s/(s²−k²) |

## Why it is built this way

Anyone can memorize seven rows. What actually stalls people is that the table almost never matches
the expression in front of them: rows (b), (d) and (f) each demand a specific numerator — `n!`, or
`k` — and a problem hands you a 1. Zill says as much in the sentence right under Theorem 7.2.1.

So the whole trainer is organised around that gap.

- **Each row is scored separately in each direction.** `sin:forward` and `sin:inverse` are
  different skills tracked as different items; the fix-up lives only on the inverse side, and it
  is reliably the weaker one.
- **Inverse problems are generated from the s-side.** An integer numerator is chosen first and the
  t-side coefficient falls out of it, so the fix-up constants arise from the mathematics rather
  than being decorated on afterwards.
- **A constant multiple of the right answer is named, not just marked wrong.** Type `sin 3t` for
  `L⁻¹{1/(s²+9)}` and the feedback says *your answer is 3 times the correct one* — because that
  is a different error from picking the wrong row.
- **Every worked solution shows the multiply-and-divide as its own line**, and every distractor
  carries an explanation of the specific slip that produces it.

## What is in it

- **Table** — the two theorems as one table of pairs. Open a row for what separates it from its
  neighbours, the mistake it invites, a worked instance in both directions, and a link straight
  into a drill scoped to that row. The theorem numbers themselves are clickable: each opens the
  book's statement quoted verbatim, in the book's own layout and orientation — Theorem 7.2.1 is
  written with the function on the *left* — alongside the remark the book prints with it.
- **Drill** — generated problems, forward and inverse, single rows and two-row combinations
  (including the shared-denominator split `(2s+6)/(s²+4)`). Multiple choice while a row is new,
  typed once it holds; the scaffolding fades on its own.
- **Match** — a timed board pairing f(t) tiles against F(s) tiles. Recognising a form on sight is
  a different skill from producing it, and it is the one an exam leans on.
- **Derivatives** — Theorem 7.2.2 (§7.2.2), in three faces. *Rule* states it, derives (6) by parts,
  shows (7) falling out of (6), and writes the expansion out at any order beside a table of the
  invariant that fixes it. *Transform* drills producing `L{y⁽ⁿ⁾}`, with the initial values left as
  symbols or substituted as numbers. *Solve* applies it to an initial-value problem and asks for
  `Y(s)` — which pulls the seven basic rows back in through the forcing function.
- **Review** — spaced repetition (SM-2 style) over the rows stated generically. Missing a row in
  Drill pulls its card forward.
- **Progress** — mastery per row per direction, with a backup/restore box.

## Answer checking

Nothing is compared as text. A typed answer is parsed, sampled at a spread of points chosen clear
of the problem's poles, and matched against the exact target function. Every algebraically
equivalent form passes:

```
3/(s^2+9)      3/(s*s+9)      3/(9+s^2)      \frac{3}{s^2+9}
(1/3)sin(3t)   sin(3t)/3      1/3 sin 3t     \frac{1}{3}\sin 3t
e^-2t          e^(-2t)        exp(-2t)       1/e^(2t)
```

Input accepts calculator habits (implicit multiplication, `sin 3t`, `e^-2t`) and the LaTeX
reflexes students carry over (`\frac{a}{b}`, `\sin`, braces as grouping). A live "read as" line
under the box shows how the expression was parsed before you commit to it.

## Not in this version

The translation theorems, derivatives of a transform, unit step functions, convolution, and
partial fractions beyond splitting one shared denominator. The Solve drill therefore stops at a
formula for `Y(s)` and does not invert it — inverting it is the next section's work.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # generator corpus, answer checker, UI smoke test
npm run build
```

No server, no accounts. Progress lives in `localStorage` and nowhere else; take a copy from the
Progress tab before clearing site data.

## Layout

```
src/
  data/forms.ts        the seven rows: notation, teaching notes, term rendering and evaluation
  data/theorems.ts     the three theorems as the book states them, for quoting verbatim
  data/derivatives.ts  the derivative rule: equations (6)-(8), its origin, its invariant
  data/cards.ts        the review deck, derived from the rows
  lib/frac.ts          exact rationals, so 1/3! prints as a fraction and not as 0.1666…
  lib/check.ts         parsing and numeric grading of typed answers
  lib/expr.ts          expression-level TeX
  lib/poly.ts          integer polynomials, for the characteristic polynomial and its roots
  lib/mastery.ts       tiers, and the scaffolding that fades with them
  generators/          problem construction, distractors, worked solutions, adaptive selection
  components/          Table, Drill, Match, Derivatives, Review, Progress, About
  store/               localStorage-backed progress and preferences
```

## Credit

Alexander Nichols, Old Dominion University, 2026. Released under the [MIT license](LICENSE).

The theorem statements quoted in the app are from Zill, *A First Course in Differential Equations*,
9e, reproduced for study purposes; they remain the property of their publisher. No textbook
material is redistributed with this repository.
