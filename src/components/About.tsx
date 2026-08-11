import { Rich } from './Tex'

export function About() {
  return (
    <section className="card about">
      <h2 className="section-title">About</h2>
      <p>
        A drill for the seven basic transform pairs — Theorem 7.1.1 and Theorem 7.2.1 in Zill,{' '}
        <em>A First Course in Differential Equations</em>, 9e.{' '}
        <Rich text="Notation follows the book: $t$ and $s$ for the variables, $n$ for the power, $a$ for the exponential rate, $k$ for the frequency." />
      </p>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        What it drills
      </h3>
      <ul>
        <li>
          <strong>Table</strong> — the seven pairs as pairs, with what separates each row from its
          neighbours.
        </li>
        <li>
          <strong>Drill</strong>{' '}
          <Rich text="— generated problems in both directions. Answers are checked by evaluating what you typed, so any equivalent form passes: `3/(s^2+9)`, `3/(s*s+9)`, `sin(3t)/3`, `(1/3)sin 3t`." />
        </li>
        <li>
          <strong>Match</strong>{' '}
          <Rich text="— timed recognition. Producing $k/(s^2+k^2)$ and recognizing it on sight are different skills." />
        </li>
        <li>
          <strong>Shifts</strong>{' '}
          <Rich text="— the two translation theorems taught together, because they are one idea in two domains: an exponential in $t$ slides the transform along the $s$-axis, an exponential in $s$ delays the function along the $t$-axis. The unit step is taught here too, with figures, since it is the notation the second theorem is written in. The drill builds up on its own: it starts with the untranslated row given, so the only new step is the translation, and widens as you show you no longer need the scaffold." />
        </li>
        <li>
          <strong>Fractions</strong>{' '}
          <Rich text="— partial fractions, the step that makes the table apply to anything you are actually handed, and completing the square, the sub-method it shares with the first translation theorem. Each shape of piece is shown beside the row it inverts to, which is the reason the shapes are what they are." />
        </li>
        <li>
          <strong>Derivatives</strong>{' '}
          <Rich text="— Theorem 7.2.2 three ways: the pattern, with the invariant that fixes it made visible; producing $\mathcal{L}\{y^{(n)}\}$; and using it to turn an initial-value problem into a formula for $Y(s)$." />
        </li>
        <li>
          <strong>Review</strong> — spaced repetition on the rows stated generically, so they are
          still there at the exam.
        </li>
      </ul>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        The fix-up
      </h3>
      <p>
        <Rich text="Most of the difficulty in $\mathcal{L}^{-1}$ is not the table, it is that the table almost never matches what you are handed. Rows (b), (d) and (f) each want a specific numerator — $n!$, or $k$ — and a problem will hand you something else. So the trainer scores each row separately in each direction, tells you when a wrong answer is a constant multiple of the right one rather than just calling it wrong, and shows the multiply-and-divide as its own line in every worked solution." />
      </p>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        Not in this version
      </h3>
      <p>
        <Rich text="Derivatives of a transform, convolution, periodic functions and the Dirac delta. Partial fractions stops at repeated linear factors and a single irreducible quadratic, which is the range the exercises live in; repeated quadratic factors are not generated. The Solve drill still stops at a formula for $Y(s)$ rather than carrying it through the decomposition. The second translation theorem is drilled as the book states it, on $f(t-a)\\,\\mathcal{U}(t-a)$; the alternative form $\\mathcal{L}\\{g(t)\\,\\mathcal{U}(t-a)\\} = e^{-as}\\mathcal{L}\\{g(t+a)\\}$ is stated but not generated." />
      </p>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        Where your data lives
      </h3>
      <p>
        No server, no accounts. Progress is stored in this browser and nowhere else; take a copy
        from the Progress tab before clearing site data.
      </p>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        Credit
      </h3>
      <p>
        Built by Alexander Nichols, Old Dominion University, 2026. Released under the MIT license;
        the source is on{' '}
        <a
          href="https://github.com/neutrinoevent/laplace-transform-trainer"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        . The theorem statements are quoted from Zill for study purposes and remain the property of
        their publisher.
      </p>
    </section>
  )
}
