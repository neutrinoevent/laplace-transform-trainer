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
          <Rich text="— the two translation theorems taught together, because they are one idea in two domains: an exponential in $t$ slides the transform along the $s$-axis, an exponential in $s$ delays the function along the $t$-axis. The unit step is taught here too, with figures, since it is the notation the second theorem is written in. The drill builds up on its own: it starts with the untranslated row given, so the only new step is the translation, and widens as you show you no longer need the scaffold. The $s$-axis theorem comes first — it asks nothing the seven rows have not already given you — and the $t$-axis one follows once that holds, since it needs the step function as well." />
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
          <strong>IVPs</strong>{' '}
          <Rich text="— the capstone: an initial-value problem in, a function of $t$ out. Transform the equation, solve for $Y(s)$, decompose, invert. Mostly second order, with first order as the on-ramp and the occasional third. The problems are built from the equation forwards rather than from a chosen answer backwards, because an initial-value problem does not let you pick your own denominator." />
        </li>
        <li>
          <strong>t·f(t)</strong>{' '}
          <Rich text="— Theorem 7.4.1, $\mathcal{L}\{t^{n}f(t)\} = (-1)^{n}F^{(n)}(s)$: the theorem that runs the other way, where an operation on the transform matches one on the function. It is derived rather than asserted — the factor of $t$ falls out of differentiating $e^{-st}$ under the integral — and it is the only route to $t\sin kt$, which nothing in the table can produce." />
        </li>
        <li>
          <strong>Exam</strong>{' '}
          <Rich text="— a mixed paper, one question from each section, in no useful order and with nothing saying which is which. Every question is typed, and *nothing is marked until you hand it in*: committing to an answer without being told is the part a drill cannot teach. Everything is worked through afterwards, and it counts towards the same skills a drill would move." />
        </li>
        <li>
          <strong>Review</strong> — spaced repetition on the rows stated generically, so they are
          still there at the exam.
        </li>
      </ul>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        Settings
      </h3>
      <p>
        <Rich text="The gear beside the theme toggle holds one setting: *hide which row it is*, on by default. A label reading “(d) Sine” over $\mathcal{L}^{-1}\{5/(s^2+4)\}$ answers half the question before it is asked — recognising the form is the skill, and nothing hands it over on an exam. It hides the row in Drill, which theorem applies in Shifts, and which method in Fractions; the derivative badge stays, since $\mathcal{L}\{y^{\prime\prime\prime}\}$ names its own order. Turn it off when you are learning one particular row rather than testing recall." />
      </p>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        The fix-up
      </h3>
      <p>
        <Rich text="Most of the difficulty in $\mathcal{L}^{-1}$ is not the table, it is that the table almost never matches what you are handed. Rows (b), (d) and (f) each want a specific numerator — $n!$, or $k$ — and a problem will hand you something else. So the trainer scores each row separately in each direction, tells you when a wrong answer is a constant multiple of the right one rather than just calling it wrong, and shows the multiply-and-divide as its own line in every worked solution." />
      </p>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        How it chooses what to ask
      </h3>
      <p>
        <Rich text="Nothing here needs configuring, and nothing consults the calendar: everything is counted in questions answered, so forty in an evening and forty across a term behave the same. Nor is anything read from how long you took — an open tab is not a thinking student." />
      </p>
      <ul>
        <li>
          <strong>Wrong answers are counted by the mistake, not by the row.</strong>{' '}
          <Rich text="Dropping the fix-up on sine, on hyperbolic sine and on a delayed inverse is one problem met three times, and the Progress tab says so, with the remedy attached. Type an answer that lands on a known wrong one and you are told exactly what picking it from a list would have told you." />
        </li>
        <li>
          <strong>A skill is not scored on its easy half.</strong>{' '}
          <Rich text="$\mathcal{L}^{-1}\{3/(s^2+9)\}$ and $\mathcal{L}^{-1}\{5/(s^2+9)\}$ are the same row but not the same problem — only the second makes you build the constant. So a row with a harder variant is held below proficient until that variant has been faced, the drill serves it rather than waiting for the draw to oblige, and the Progress tab says what is owed. Only rows that can owe a fix-up are held: $5/s$ and $5s/(s^2+9)$ are linearity, with nothing to manufacture." />
        </li>
        <li>
          <strong>A run is interleaved.</strong>{' '}
          <Rich text="Nothing recurs within three questions, so consecutive problems come from different rows; and a missed item returns after two questions, then five, then ten, starting over if the return is missed too." />
        </li>
      </ul>

      <h3 className="section-title" style={{ marginTop: 6 }}>
        Not in this version
      </h3>
      <p>
        {/* Single backslashes: a JSX attribute string is not escape-processed,
            so a doubled one reaches KaTeX as its line break. */}
        <Rich text="Convolution, periodic functions and the Dirac delta. Partial fractions stop at repeated linear factors and a single irreducible quadratic, which is the range the exercises live in; a repeated quadratic factor is never generated, so an initial-value problem whose forcing resonates with a complex pair — which would invert through $t\sin kt$ — is not posed. A repeated real root is fine and does appear, since $1/(s-a)^2$ is row (b) translated. The second translation theorem is drilled as the book states it, on $f(t-a)\,\mathcal{U}(t-a)$; the alternative form $\mathcal{L}\{g(t)\,\mathcal{U}(t-a)\} = e^{-as}\mathcal{L}\{g(t+a)\}$ is stated but not generated." />
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
