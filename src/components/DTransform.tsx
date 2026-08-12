import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DTRANSFORM_ITEMS,
  nextDtProblem,
  type DtProblem,
} from '../generators/dtransform'
import { checkScoped, previewOf, type Verdict } from '../lib/check'
import { DTRANSFORM_LADDER, ladderOf, stepLadder } from '../lib/ladder'
import { autoOptionCount, TIER_LABEL, effectiveTier, shouldType, type Tier } from '../lib/mastery'
import { uncoveredItems } from '../lib/facets'
import { diagnose } from '../lib/diagnose'
import { type AttemptDetail, type ProgressState } from '../store/progress'
import type { Prefs, Response } from '../store/prefs'
import { AnswerBox, Feedback, Options } from './Answering'
import { Derivation } from './Derivation'
import { DTransformRule } from './DTransformRule'
import { LadderStrip } from './LadderStrip'
import { Rail } from './Rail'
import { Rich, Tex } from './Tex'
import { useAnswerKeys } from './useAnswerKeys'

const RESPONSE_CHIPS: { id: Response; label: string; title: string }[] = [
  { id: 'auto', label: 'Auto', title: 'Multiple choice while this is new, typed once it holds' },
  { id: 'choose', label: 'Choose', title: 'Always multiple choice' },
  { id: 'type', label: 'Type', title: 'Always type the answer' },
]

interface DTransformProps {
  progress: ProgressState
  prefs: Prefs
  onPrefs: (next: Prefs) => void
  onAnswer: (ids: string[], correct: boolean, detail?: AttemptDetail) => void
  onRung: (rung: number, run: number) => void
}

export function DTransform({ progress, prefs, onPrefs, onAnswer, onRung }: DTransformProps) {
  const learning = prefs.dtView === 'rule'
  const ladder = ladderOf(DTRANSFORM_LADDER, progress, {
    rung: progress.dtRung,
    run: progress.dtRun,
  })

  return (
    <section>
      <div className="scope-bar">
        <div className="mode-bar">
          <span className="eyebrow">Mode</span>
          <button
            className={learning ? 'chip chip-active' : 'chip'}
            onClick={() => onPrefs({ ...prefs, dtView: 'rule' })}
          >
            Learn
          </button>
          <button
            className={!learning ? 'chip chip-active' : 'chip'}
            onClick={() => onPrefs({ ...prefs, dtView: 'drill' })}
          >
            Drill
          </button>
          <span className="meta-note">
            {learning
              ? 'Where it comes from, and the pattern it leaves behind.'
              : 'Multiplying by t in one domain, differentiating in the other.'}
          </span>
        </div>
        {!learning ? (
          <div className="mode-bar">
            <span className="eyebrow">Set</span>
            <button
              className={prefs.dtGuided ? 'chip chip-active' : 'chip'}
              onClick={() => onPrefs({ ...prefs, dtGuided: true })}
              title="Let the questions follow what you have shown you can do"
            >
              Guided
            </button>
            <button
              className={!prefs.dtGuided ? 'chip chip-active' : 'chip'}
              onClick={() => onPrefs({ ...prefs, dtGuided: false })}
              title="Both powers of t, both directions, straight away"
            >
              Everything
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
      </div>

      {learning ? (
        <DTransformRule onDrill={() => onPrefs({ ...prefs, dtView: 'drill' })} />
      ) : (
        <DtDrill
          key={String(prefs.dtGuided)}
          guided={prefs.dtGuided}
          response={prefs.response}
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
  problem: DtProblem
  mode: 'choose' | 'type'
  tier: Tier
  choices: DtProblem['choices']
  correctIndex: number
}

function trim(problem: DtProblem, count: number) {
  if (problem.choices.length <= count) {
    return { choices: problem.choices, correctIndex: problem.correctIndex }
  }
  const correct = problem.choices[problem.correctIndex]
  const wrong = problem.choices.filter((_, i) => i !== problem.correctIndex).slice(0, count - 1)
  const at = problem.correctIndex % count
  return { choices: [...wrong.slice(0, at), correct, ...wrong.slice(at)], correctIndex: at }
}

function DtDrill({
  guided,
  response,
  progress,
  ladder,
  onAnswer,
  onRung,
}: {
  guided: boolean
  response: Response
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
  const ladderRef = useRef(ladder)
  ladderRef.current = ladder
  // Which of the two directions the question on screen is scored against.
  const itemRef = useRef(DTRANSFORM_ITEMS[0])

  const build = useCallback((): Dealt => {
    const state = progressRef.current
    const problem = nextDtProblem({
      rung: guided ? ladderRef.current.rung : 2,
      uncovered: uncoveredItems(DTRANSFORM_ITEMS, state.facets),
    })
    itemRef.current = problem.itemId
    const tier = effectiveTier(state, problem.itemId)
    const mode = response === 'auto' ? (shouldType(tier) ? 'type' : 'choose') : response
    return { problem, mode, tier, ...trim(problem, autoOptionCount(tier)) }
  }, [guided, response])

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

  const settle = useCallback(
    (correct: boolean, detail: AttemptDetail = {}) => {
      onAnswer([itemRef.current], correct, detail)
      setRecent((r) => [...r.slice(-19), correct])
      if (guided) {
        const next = stepLadder(DTRANSFORM_LADDER, ladderRef.current, correct)
        ladderRef.current = next
        onRung(next.rung, next.run)
      }
    },
    [guided, onAnswer, onRung],
  )

  const pick = useCallback(
    (index: number) => {
      if (!dealt || picked !== null) return
      setPicked(index)
      const correct = index === dealt.correctIndex
      settle(correct, {
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
    // Every distractor, not just the ones on display.
    const named = v.ok ? null : diagnose(typed, p.symbols, p.choices)
    setVerdict(named ? { ok: false, code: 'wrong', message: named.why } : v)
    if (tries === 0) settle(v.ok, { slip: named?.slip, facets: p.facets })
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
      {guided ? <LadderStrip ladder={DTRANSFORM_LADDER} state={ladderRef.current} /> : null}
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
          <span className="badge badge-section">7.4.1</span>
          <Rail direction={problem.direction} />
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
            placeholder={problem.symbols.primary === 's' ? '6s/(s^2+9)^2' : 't*sin(3t)'}
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
