/**
 * Zill's Figures 7.3.2 and 7.3.6, drawn rather than described.
 *
 * The second translation theorem is a statement about a picture: the graph of
 * `f` picked up whole, moved `a` units right, and nothing at all before `a`.
 * Students who have only ever seen `f(t-a)U(t-a)` as a string of symbols read
 * it as "f, times a thing" and then apply the theorem to `t U(t-1)`, which is
 * not of that form. One look at the two curves settles it.
 */

const W = 300
const H = 132
const PAD = { l: 26, r: 10, t: 12, b: 22 }
const T_MAX = 8

const x = (t: number) => PAD.l + (t / T_MAX) * (W - PAD.l - PAD.r)
const y = (v: number, lo: number, hi: number) =>
  PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)

function path(f: (t: number) => number, lo: number, hi: number, from = 0): string {
  const steps = 240
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = from + ((T_MAX - from) * i) / steps
    pts.push(`${i === 0 ? 'M' : 'L'}${x(t).toFixed(2)} ${y(f(t), lo, hi).toFixed(2)}`)
  }
  return pts.join(' ')
}

function Axes({ lo, hi, zero = true }: { lo: number; hi: number; zero?: boolean }) {
  return (
    <>
      <line className="fig-axis" x1={PAD.l} y1={PAD.t - 4} x2={PAD.l} y2={H - PAD.b} />
      <line
        className="fig-axis"
        x1={PAD.l - 4}
        y1={zero ? y(0, lo, hi) : H - PAD.b}
        x2={W - PAD.r}
        y2={zero ? y(0, lo, hi) : H - PAD.b}
      />
      <text className="fig-label" x={W - PAD.r} y={(zero ? y(0, lo, hi) : H - PAD.b) + 13} textAnchor="end">
        t
      </text>
    </>
  )
}

/** The switch itself: off, then on, with the jump drawn as a jump. */
export function StepFigure({ a }: { a: number }) {
  const lo = -0.35
  const hi = 1.45
  return (
    <figure className="figure">
      <svg viewBox={`0 0 ${W} ${H}`} className="fig" role="img" aria-label={`Unit step at t = ${a}`}>
        <Axes lo={lo} hi={hi} />
        <line
          className="fig-guide"
          x1={x(a)}
          y1={PAD.t}
          x2={x(a)}
          y2={H - PAD.b}
        />
        <path className="fig-curve" d={`M${x(0)} ${y(0, lo, hi)} L${x(a)} ${y(0, lo, hi)}`} />
        <path className="fig-curve" d={`M${x(a)} ${y(1, lo, hi)} L${x(T_MAX)} ${y(1, lo, hi)}`} />
        <circle className="fig-open" cx={x(a)} cy={y(0, lo, hi)} r={3} />
        <circle className="fig-dot" cx={x(a)} cy={y(1, lo, hi)} r={3} />
        <text className="fig-label" x={x(a)} y={H - PAD.b + 14} textAnchor="middle">
          a = {a}
        </text>
        <text className="fig-label" x={PAD.l - 6} y={y(1, lo, hi) + 4} textAnchor="end">
          1
        </text>
      </svg>
      <figcaption className="fig-caption">
        Off below <em>a</em>, on from <em>a</em> — the value at <em>a</em> itself is 1.
      </figcaption>
    </figure>
  )
}

/** The same row before and after being delayed and switched on. */
export function DelayFigure({ a }: { a: number }) {
  const lo = -1.35
  const hi = 1.35
  const f = (t: number) => Math.sin(t)
  return (
    <figure className="figure">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="fig"
        role="img"
        aria-label={`sin t and sin(t minus ${a}) switched on at ${a}`}
      >
        <Axes lo={lo} hi={hi} />
        <path className="fig-ghost" d={path(f, lo, hi)} />
        <line className="fig-guide" x1={x(a)} y1={PAD.t} x2={x(a)} y2={H - PAD.b} />
        {/* Identically zero before a, then the whole curve, moved a to the right. */}
        <path className="fig-curve" d={`M${x(0)} ${y(0, lo, hi)} L${x(a)} ${y(0, lo, hi)}`} />
        <path className="fig-curve" d={path((t) => f(t - a), lo, hi, a)} />
        <text className="fig-label" x={x(a)} y={H - PAD.b + 14} textAnchor="middle">
          a = {a}
        </text>
      </svg>
      <figcaption className="fig-caption">
        The faint curve is <em>f</em>; the solid one is <em>f</em> delayed by <em>a</em> and
        switched on there. Same shape, moved whole, nothing before <em>a</em>.
      </figcaption>
    </figure>
  )
}
