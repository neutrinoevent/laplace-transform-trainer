import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  nextShiftProblem,
  SHIFT_ITEMS,
  type ShiftDirection,
  type ShiftProblem,
  type Theorem,
} from '../generators/shift'
import { checkScoped, previewOf, type Verdict } from '../lib/check'
import { SHIFT_LADDER, ladderOf, stepLadder } from '../lib/ladder'
import { autoOptionCount, TIER_LABEL, effectiveTier, shouldType, type Tier } from '../lib/mastery'
import { uncoveredItems } from '../lib/facets'
import { diagnose } from '../lib/diagnose'
import { masteryMap, type AttemptDetail, type ProgressState } from '../store/progress'
import type { Prefs, Response } from '../store/prefs'
import { AnswerBox, Feedback, Options } from './Answering'
import { LadderStrip } from './LadderStrip'
import { Derivation } from './Derivation'
import { Rail } from './Rail'
import { ShiftRule } from './ShiftRule'
import { Rich, Tex } from './Tex'
import { useAnswerKeys } from './useAnswerKeys'

const THEOREMS: { id: Theorem | 'both'; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'first', label: 's-axis' },
  { id: 'second', label: 't-axis' },
]

const DIRECTIONS: { id: ShiftDirection | 'both'; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'forward', label: '\\mathcal{L}' },
  { id: 'inverse', label: '\\mathcal{L}^{-1}' },
]

const RESPONSE_CHIPS: { id: Response; label: string; title: string }[] = [
  { id: 'auto', label: 'Auto', title: 'Multiple choice while this is new, typed once it holds' },
  { id: 'choose', label: 'Choose', title: 'Always multiple choice' },
  { id: 'type', label: 'Type', title: 'Always type the answer' },
]

interface ShiftsProps {
  progress: ProgressState
  prefs: Prefs
  onPrefs: (next: Prefs) => void
  onAnswer: (ids: string[], correct: boolean, detail?: AttemptDetail) => void
  onRung: (rung: number, run: number) => void
}

export function Shifts({ progress, prefs, onPrefs, onAnswer, onRung }: ShiftsProps) {
  const learning = prefs.shiftView === 'rule'
  const ladder = ladderOf(SHIFT_LADDER, progress, {
    rung: progress.shiftRung,
    run: progress.shiftRun,
  })

  return (
    <section>
      <div className="scope-bar">
        <div className="mode-bar">
          <span className="eyebrow">Mode</span>
          <button
            className={learning ? 'chip chip-active' : 'chip'}
            onClick={() => onPrefs({ ...prefs, shiftView: 'rule' })}
          >
            Learn
          </button>
          <button
            className={!learning ? 'chip chip-active' : 'chip'}
            onClick={() => onPrefs({ ...prefs, shiftView: 'drill' })}
          >
            Drill
          </button>
          <span className="meta-note">
            {learning
              ? 'Both theorems together, because they are one idea in two domains.'
              : 'Which theorem applies, and what it does when it does.'}
          </span>
        </div>
        {!learning ? (
          <div className="mode-bar">
            <span className="eyebrow">Set</span>
            <button
              className={prefs.shiftGuided ? 'chip chip-active' : 'chip'}
              onClick={() => onPrefs({ ...prefs, shiftGuided: true })}
              title="Let the questions follow what you have shown you can do"
            >
              Guided
            </button>
            <button
              className={!prefs.shiftGuided ? 'chip chip-active' : 'chip'}
              onClick={() => onPrefs({ ...prefs, shiftGuided: false })}
              title="Choose the theorem and direction yourself"
            >
              Choose mine
            </button>
            <span style={{ width: 10 }} />
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
        {!learning && !prefs.shiftGuided ? (
          <div className="mode-bar">
            <span className="eyebrow">Theorem</span>
            {THEOREMS.map((t) => (
              <button
                key={t.id}
                className={prefs.shiftTheorem === t.id ? 'chip chip-active' : 'chip'}
                onClick={() => onPrefs({ ...prefs, shiftTheorem: t.id })}
              >
                {t.label}
              </button>
            ))}
            <span style={{ width: 10 }} />
            <span className="eyebrow">Direction</span>
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                className={prefs.shiftDirection === d.id ? 'chip chip-active' : 'chip'}
                onClick={() => onPrefs({ ...prefs, shiftDirection: d.id })}
              >
                {d.id === 'both' ? d.label : <Tex tex={d.label} />}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {learning ? (
        <ShiftRule
          onDrill={(theorem) =>
            onPrefs({ ...prefs, shiftView: 'drill', shiftTheorem: theorem })
          }
        />
      ) : (
        <ShiftDrill
          key={`${prefs.shiftGuided}-${prefs.shiftTheorem}-${prefs.shiftDirection}`}
          guided={prefs.shiftGuided}
          theorem={prefs.shiftTheorem}
          direction={prefs.shiftDirection}
          response={prefs.response}
          hideLabel={prefs.hideRowLabel}
          progress={progress}
          ladder={ladder}
          onAnswer={onAnswer}
          onRung={onRung}
        />
      )}
    </section>
  )
}

interface Dealt {
  problem: ShiftProblem
  mode: 'choose' | 'type'
  tier: Tier
  choices: ShiftProblem['choices']
  correctIndex: number
}

function trim(problem: ShiftProblem, count: number) {
  if (problem.choices.length <= count) {
    return { choices: problem.choices, correctIndex: problem.correctIndex }
  }
  const correct = problem.choices[problem.correctIndex]
  const wrong = problem.choices.filter((_, i) => i !== problem.correctIndex).slice(0, count - 1)
  const at = problem.correctIndex % count
  return { choices: [...wrong.slice(0, at), correct, ...wrong.slice(at)], correctIndex: at }
}

function ShiftDrill({
  guided,
  theorem,
  direction,
  response,
  hideLabel,
  progress,
  ladder,
  onAnswer,
  onRung,
}: {
  guided: boolean
  theorem: Theorem | 'both'
  direction: ShiftDirection | 'both'
  response: Response
  /** Keep which theorem applies out of sight — that is the question. */
  hideLabel: boolean
  progress: ProgressState
  ladder: { rung: number; run: number }
  onAnswer: (ids: string[], correct: boolean, detail?: AttemptDetail) => void
  onRung: (rung: number, run: number) => void
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
  // The ladder moves as answers come in, but the question on screen must not be
  // rebuilt underneath the student when it does.
  const ladderRef = useRef(ladder)
  ladderRef.current = ladder

  const build = useCallback((): Dealt => {
    const state = progressRef.current
    const rung = ladderRef.current.rung
    const uncovered = uncoveredItems(SHIFT_ITEMS, state.facets)
    const problem = nextShiftProblem(
      guided
        ? {
            // Below the mixing rung only one theorem is served anyway, so a
            // request from the Learn page — "drill this one" — is honoured
            // there without the ladder losing charge of the difficulty.
            theorem: rung < 2 && theorem !== 'both' ? theorem : 'auto',
            direction: 'auto',
            rung,
            mastery: masteryMap(state),
            uncovered,
          }
        : { theorem, direction, uncovered },
    )
    const tier = effectiveTier(state, problem.itemId)
    const mode = response === 'auto' ? (shouldType(tier) ? 'type' : 'choose') : response
    return { problem, mode, tier, ...trim(problem, autoOptionCount(tier)) }
  }, [guided, theorem, direction, response])

  /** One place for "an answer happened", so the ladder never misses one. */
  const settle = useCallback(
    (itemId: string, correct: boolean, detail: AttemptDetail = {}) => {
      onAnswer([itemId], correct, detail)
      setRecent((r) => [...r.slice(-19), correct])
      if (guided) {
        const next = stepLadder(SHIFT_LADDER, ladderRef.current, correct)
        ladderRef.current = next
        onRung(next.rung, next.run)
      }
    },
    [guided, onAnswer, onRung],
  )

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

  const mode = dealt?.mode ?? 'choose'
  const settled = mode === 'choose' ? picked !== null : verdict?.ok === true || revealed

  const pick = useCallback(
    (index: number) => {
      if (!dealt || picked !== null) return
      setPicked(index)
      const correct = index === dealt.correctIndex
      settle(dealt.problem.itemId, correct, {
        slip: correct ? undefined : dealt.choices[index].slip,
        facets: dealt.problem.facets,
      })
    },
    [dealt, picked, settle],
  )

  const submit = useCallback(() => {
    if (!dealt || settled) return
    const p = dealt.problem
    const v = checkScoped(typed, { symbols: p.symbols, target: p.target, points: p.points })
    // Every distractor, not just the ones on display: typed mode shows no
    // options, so trimming the list would only narrow the diagnosis.
    const named = v.ok ? null : diagnose(typed, p.symbols, p.choices)
    setVerdict(named ? { ok: false, code: 'wrong', message: named.why } : v)
    if (tries === 0) settle(p.itemId, v.ok, { slip: named?.slip, facets: p.facets })
    setTries((n) => n + 1)
  }, [dealt, typed, tries, settled, settle])

  useAnswerKeys({
    active: dealt !== null,
    settled,
    mode,
    optionCount: dealt?.choices.length ?? 0,
    onPick: pick,
    onAdvance: advance,
  })

  const preview = useMemo(
    () => (dealt && mode === 'type' ? previewOf(typed, dealt.problem.symbols) : null),
    [typed, dealt, mode],
  )

  if (!dealt) return null
  const { problem, choices, correctIndex, tier } = dealt
  const correct = mode === 'choose' ? picked === correctIndex : verdict?.ok === true

  return (
    <>
      {guided ? <LadderStrip ladder={SHIFT_LADDER} state={ladderRef.current} /> : null}
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
          {hideLabel ? null : (
            <>
              <span className="badge">{problem.theorem === 'first' ? 's-axis' : 't-axis'}</span>
              <span className="badge badge-section">
                {problem.theorem === 'first' ? '7.3.1' : '7.3.2'}
              </span>
            </>
          )}
          <Rail direction={problem.direction} />
          {problem.completeSquare ? (
            <span className="meta-note">Complete the square</span>
          ) : null}
          <span className="meta-note" style={{ marginLeft: 'auto' }}>
            {TIER_LABEL[tier]}
          </span>
        </div>

        <p className="question-line">
          <Rich text={problem.question} />
        </p>

        {problem.anchorTex ? (
          <div className="anchor">
            <span className="eyebrow">You already have</span>
            <Tex tex={problem.anchorTex} display />
          </div>
        ) : null}

        {problem.stepNote ? (
          <div className="anchor anchor-step">
            <span className="eyebrow">The step function</span>
            <Tex tex={problem.stepNote.tex} display />
            <p className="meta-note">
              <Rich text={problem.stepNote.text} />
            </p>
          </div>
        ) : null}

        <div className="problem-tex">
          <Tex tex={problem.statementTex} block />
        </div>

        <div className="divider" />

        {mode === 'choose' ? (
          <Options choices={choices} picked={picked} correctIndex={correctIndex} onPick={pick} />
        ) : (
          <AnswerBox
            value={typed}
            onChange={setTyped}
            onSubmit={submit}
            onAdvance={advance}
            settled={settled}
            label={
              <>
                Your answer, as a function of <code>{problem.symbols.primary}</code>
              </>
            }
            placeholder={problem.symbols.primary === 's' ? '6/(s-5)^4' : 'e^(-2t)cos 4t'}
            preview={preview}
            syntax={problem.syntaxNote}
          />
        )}

        {mode === 'choose' && picked !== null ? (
          <Feedback tone={correct ? 'good' : 'bad'}>
            {correct ? 'Correct.' : 'Not that one.'}
          </Feedback>
        ) : null}

        {mode === 'type' && verdict ? (
          <Feedback tone={verdict.ok ? 'good' : verdict.code === 'scaled' ? 'near' : 'bad'}>
            {verdict.ok ? 'Correct.' : <Rich text={verdict.message} />}
          </Feedback>
        ) : null}

        {mode === 'choose' && picked !== null && picked !== correctIndex && choices[picked].why ? (
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
          {mode === 'type' && !settled && tries > 0 ? (
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
            {mode === 'choose'
              ? `Keys 1–${choices.length} answer, Enter advances.`
              : 'Enter checks, then advances.'}
          </span>
        </div>
      </div>
    </>
  )
}
