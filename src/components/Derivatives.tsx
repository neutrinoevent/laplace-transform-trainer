import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { nextDerivProblem, type DerivMode, type DerivProblem } from '../generators/derivative'
import { checkScoped, previewOf, type Verdict } from '../lib/check'
import { autoOptionCount, TIER_LABEL, shouldType, tierFor } from '../lib/mastery'
import { statsFor, type ProgressState } from '../store/progress'
import type { Prefs, Response } from '../store/prefs'
import { AnswerBox, Feedback, Options } from './Answering'
import { Derivation } from './Derivation'
import { DerivativeRule } from './DerivativeRule'
import { Rich, Tex } from './Tex'
import { useAnswerKeys } from './useAnswerKeys'

type View = 'rule' | DerivMode

const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: 'rule', label: 'Rule', blurb: 'What it says, why it is true, and what it is for.' },
  { id: 'transform', label: 'Transform', blurb: 'Write $\\mathcal{L}\\{y^{(n)}\\}$ in terms of $Y(s)$.' },
  { id: 'solve', label: 'Solve', blurb: 'Turn an initial-value problem into a formula for $Y(s)$.' },
]

const RESPONSE_CHIPS: { id: Response; label: string; title: string }[] = [
  { id: 'auto', label: 'Auto', title: 'Multiple choice while this is new, typed once it holds' },
  { id: 'choose', label: 'Choose', title: 'Always multiple choice' },
  { id: 'type', label: 'Type', title: 'Always type the answer' },
]

interface DerivativesProps {
  progress: ProgressState
  prefs: Prefs
  onPrefs: (next: Prefs) => void
  onAnswer: (ids: string[], correct: boolean) => void
}

export function Derivatives({ progress, prefs, onPrefs, onAnswer }: DerivativesProps) {
  const view = prefs.derivView
  const blurb = VIEWS.find((v) => v.id === view)?.blurb ?? ''

  return (
    <section>
      <div className="scope-bar">
        <div className="mode-bar">
          <span className="eyebrow">Mode</span>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={view === v.id ? 'chip chip-active' : 'chip'}
              onClick={() => onPrefs({ ...prefs, derivView: v.id })}
            >
              {v.label}
            </button>
          ))}
          <span className="meta-note">
            <Rich text={blurb} />
          </span>
        </div>
        {view !== 'rule' ? (
          <div className="mode-bar">
            {view === 'transform' ? (
              <>
                <span className="eyebrow">Initial values</span>
                <button
                  className={prefs.derivSymbolic ? 'chip chip-active' : 'chip'}
                  onClick={() => onPrefs({ ...prefs, derivSymbolic: true })}
                  title="Leave y(0), y'(0), … as symbols — the pattern itself"
                >
                  Symbols
                </button>
                <button
                  className={!prefs.derivSymbolic ? 'chip chip-active' : 'chip'}
                  onClick={() => onPrefs({ ...prefs, derivSymbolic: false })}
                  title="Substitute numbers, so the signs and the zeros bite"
                >
                  Numbers
                </button>
                <span style={{ width: 10 }} />
              </>
            ) : null}
            <span className="eyebrow">Answer</span>
            {RESPONSE_CHIPS.map((r) => (
              <button
                key={r.id}
                title={r.title}
                className={prefs.response === r.id ? 'chip chip-active' : 'chip'}
                onClick={() => onPrefs({ ...prefs, response: r.id })}
              >
                {r.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {view === 'rule' ? (
        <DerivativeRule onDrill={() => onPrefs({ ...prefs, derivView: 'transform' })} />
      ) : (
        <DerivDrill
          key={`${view}-${prefs.derivSymbolic}`}
          mode={view}
          symbolic={prefs.derivSymbolic}
          response={prefs.response}
          progress={progress}
          onAnswer={onAnswer}
        />
      )}
    </section>
  )
}

interface Dealt {
  problem: DerivProblem
  mode: 'choose' | 'type'
  tier: ReturnType<typeof tierFor>
  choices: DerivProblem['choices']
  correctIndex: number
}

/** Narrow the options to the scaffolding this item currently warrants. */
function trim(problem: DerivProblem, count: number) {
  if (problem.choices.length <= count) {
    return { choices: problem.choices, correctIndex: problem.correctIndex }
  }
  const correct = problem.choices[problem.correctIndex]
  const wrong = problem.choices.filter((_, i) => i !== problem.correctIndex).slice(0, count - 1)
  const at = problem.correctIndex % count
  return { choices: [...wrong.slice(0, at), correct, ...wrong.slice(at)], correctIndex: at }
}

function DerivDrill({
  mode,
  symbolic,
  response,
  progress,
  onAnswer,
}: {
  mode: DerivMode
  symbolic: boolean
  response: Response
  progress: ProgressState
  onAnswer: (ids: string[], correct: boolean) => void
}) {
  const [dealt, setDealt] = useState<Dealt | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [tries, setTries] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [recent, setRecent] = useState<boolean[]>([])

  const progressRef = useRef(progress)
  progressRef.current = progress

  const build = useCallback((): Dealt => {
    const problem = nextDerivProblem({ mode, symbolic })
    const tier = tierFor(statsFor(progressRef.current, problem.itemId))
    const answering = response === 'auto' ? (shouldType(tier) ? 'type' : 'choose') : response
    return { problem, mode: answering, tier, ...trim(problem, autoOptionCount(tier)) }
  }, [mode, symbolic, response])

  const reset = useCallback(() => {
    setPicked(null)
    setTyped('')
    setVerdict(null)
    setTries(0)
    setRevealed(false)
    setHintShown(false)
  }, [])

  useEffect(() => {
    setDealt(build())
    reset()
  }, [build, reset])

  const advance = useCallback(() => {
    setDealt(build())
    reset()
  }, [build, reset])

  const answering = dealt?.mode ?? 'choose'
  const settled = answering === 'choose' ? picked !== null : verdict?.ok === true || revealed

  const pick = useCallback(
    (index: number) => {
      if (!dealt || picked !== null) return
      setPicked(index)
      const correct = index === dealt.correctIndex
      onAnswer([dealt.problem.itemId], correct)
      setRecent((r) => [...r.slice(-19), correct])
    },
    [dealt, picked, onAnswer],
  )

  const submit = useCallback(() => {
    if (!dealt || settled) return
    const p = dealt.problem
    const v = checkScoped(typed, { symbols: p.symbols, target: p.target, points: p.points })
    setVerdict(v)
    if (tries === 0) {
      onAnswer([p.itemId], v.ok)
      setRecent((r) => [...r.slice(-19), v.ok])
    }
    setTries((n) => n + 1)
  }, [dealt, typed, tries, settled, onAnswer])

  useAnswerKeys({
    active: dealt !== null,
    settled,
    mode: answering,
    optionCount: dealt?.choices.length ?? 0,
    onPick: pick,
    onAdvance: advance,
  })

  const preview = useMemo(
    () => (dealt && answering === 'type' ? previewOf(typed, dealt.problem.symbols) : null),
    [typed, dealt, answering],
  )

  if (!dealt) return null
  const { problem, choices, correctIndex, tier } = dealt
  const correct = answering === 'choose' ? picked === correctIndex : verdict?.ok === true

  return (
    <>
      <div className="run-bar">
        <span className="run-count">
          {recent.filter(Boolean).length}/{recent.length || 0}
        </span>
        <span className="run-track">
          {Array.from({ length: 20 }, (_, i) => {
            const r = recent[recent.length - 20 + i]
            return (
              <i
                key={i}
                className={`run-pip ${r === true ? 'run-pip-good' : r === false ? 'run-pip-bad' : ''}`}
              />
            )
          })}
        </span>
        <span className="meta-note">last 20</span>
      </div>

      <div className="card problem-card">
        <div className="problem-meta">
          <span className="badge">
            {problem.mode === 'solve' ? (
              `Order ${problem.order}`
            ) : (
              <Tex tex={`n = ${problem.order}`} />
            )}
          </span>
          <span className="badge badge-section">7.2.2</span>
          {problem.mode === 'transform' ? (
            <span className="meta-note">{problem.symbolic ? 'Symbolic' : 'Numeric'}</span>
          ) : null}
          <span className="meta-note" style={{ marginLeft: 'auto' }}>
            {TIER_LABEL[tier]}
          </span>
        </div>

        <p className="question-line">
          <Rich text={problem.question} />
        </p>

        <div className="problem-tex">
          <Tex tex={problem.statementTex} block />
        </div>

        {problem.givenTex ? (
          <div className="given-row">
            <span className="eyebrow">Given</span>
            <Tex tex={problem.givenTex} display />
          </div>
        ) : null}

        <div className="divider" />

        {answering === 'choose' ? (
          <Options choices={choices} picked={picked} correctIndex={correctIndex} onPick={pick} />
        ) : (
          <AnswerBox
            value={typed}
            onChange={setTyped}
            onSubmit={submit}
            onAdvance={advance}
            settled={settled}
            label={<Rich text={`Your answer, in terms of \`s\`${problem.mode === 'solve' ? '' : ' and $Y(s)$'}`} />}
            placeholder={problem.mode === 'solve' ? '(s+1)/(s^2-3s+2)' : 's^2 Y(s) - 2s + 3'}
            prefixTex={problem.prefixTex}
            preview={preview}
            syntax={problem.syntaxNote}
          />
        )}

        {answering === 'choose' && picked !== null ? (
          <Feedback tone={correct ? 'good' : 'bad'}>{correct ? 'Correct.' : 'Not that one.'}</Feedback>
        ) : null}

        {answering === 'type' && verdict ? (
          <Feedback tone={verdict.ok ? 'good' : verdict.code === 'scaled' ? 'near' : 'bad'}>
            {verdict.ok ? 'Correct.' : <Rich text={verdict.message} />}
          </Feedback>
        ) : null}

        {answering === 'choose' && picked !== null && picked !== correctIndex && choices[picked].why ? (
          <div className="diagnosis">
            <span className="eyebrow">What you picked</span>
            <Rich text={choices[picked].why!} />
          </div>
        ) : null}

        {hintShown && !settled ? (
          <div className="hint">
            <Rich text={problem.hint} />
          </div>
        ) : null}

        {settled ? (
          <>
            <div className="solution">
              <span className="eyebrow">Answer</span>
              <Tex tex={`${problem.prefixTex} ${problem.answerTex}`} display />
            </div>
            <Derivation steps={problem.derivation} />
          </>
        ) : null}

        <div className="actions">
          {!settled ? (
            <button className="btn" onClick={() => setHintShown(true)} disabled={hintShown}>
              Hint
            </button>
          ) : null}
          {answering === 'type' && !settled && tries > 0 ? (
            <button className="btn" onClick={() => setRevealed(true)}>
              Show answer
            </button>
          ) : null}
          <button className="btn btn-primary" onClick={advance} disabled={!settled}>
            Next →
          </button>
          <button className="btn" onClick={advance} disabled={settled}>
            Skip
          </button>
          <span className="meta-note">
            {answering === 'choose'
              ? `Keys 1–${choices.length} answer, Enter advances.`
              : 'Enter checks, then advances.'}
          </span>
        </div>
      </div>
    </>
  )
}
