import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FORM_BY_ID, FORM_IDS, type FormId } from '../data/forms'
import { itemId, nextProblem, type Direction, type Problem } from '../generators'
import { checkAnswer, previewOf, type Verdict } from '../lib/check'
import { uncoveredItems } from '../lib/facets'
import { autoOptionCount, TIER_LABEL, effectiveTier, shouldType, type Tier } from '../lib/mastery'
import { diagnose } from '../lib/diagnose'
import { dueNow, emptyQueue, recordServed, tooRecent, type Queue } from '../lib/queue'
import { masteryMap, type AttemptDetail, type ProgressState } from '../store/progress'
import type { Prefs, Response } from '../store/prefs'
import { AnswerBox, Feedback, Options } from './Answering'
import { Derivation } from './Derivation'
import { Rail } from './Rail'
import { ScopeBar } from './ScopeBar'
import { Rich, Tex } from './Tex'
import { useAnswerKeys } from './useAnswerKeys'

const DIRECTION_CHIPS: { id: Direction | 'both'; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'forward', label: '\\mathcal{L}' },
  { id: 'inverse', label: '\\mathcal{L}^{-1}' },
]

/** Every row-and-direction the ordinary drill can serve. */
const ALL_ROW_ITEMS = FORM_IDS.flatMap((f) => [itemId(f, 'forward'), itemId(f, 'inverse')])

const RESPONSE_CHIPS: { id: Response; label: string; title: string }[] = [
  { id: 'auto', label: 'Auto', title: 'Multiple choice while a row is new, typed once it holds' },
  { id: 'choose', label: 'Choose', title: 'Always multiple choice' },
  { id: 'type', label: 'Type', title: 'Always type the answer' },
]

interface DrillProps {
  progress: ProgressState
  prefs: Prefs
  onPrefs: (next: Prefs) => void
  onAnswer: (ids: string[], correct: boolean, detail?: AttemptDetail) => void
}

/**
 * Narrow the option set to the scaffolding this row currently warrants. The
 * result is a pure function of the problem, so a re-render never reshuffles the
 * options out from under a click.
 */
function trim(problem: Problem, count: number) {
  if (problem.choices.length <= count) {
    return { choices: problem.choices, correctIndex: problem.correctIndex }
  }
  const correct = problem.choices[problem.correctIndex]
  const wrong = problem.choices.filter((_, i) => i !== problem.correctIndex).slice(0, count - 1)
  const at = problem.correctIndex % count
  return { choices: [...wrong.slice(0, at), correct, ...wrong.slice(at)], correctIndex: at }
}

/** Which theorem a problem is really testing, once translations are mixed in. */
function sectionOf(problem: Problem): string {
  if (problem.terms.some((t) => t.shift)) return '7.3.1'
  if (problem.terms.some((t) => t.delay)) return '7.3.2'
  return problem.direction === 'forward' ? '7.1.1' : '7.2.1'
}

/**
 * A problem together with the presentation chosen for it. Both are fixed when
 * the problem is dealt: answering moves the mastery score, and a score that
 * crossed a tier boundary must not reshape the question already on screen.
 */
interface Dealt {
  problem: Problem
  mode: 'choose' | 'type'
  tier: Tier
  choices: Problem['choices']
  correctIndex: number
}

export function Drill({ progress, prefs, onPrefs, onAnswer }: DrillProps) {
  const [dealt, setDealt] = useState<Dealt | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [tries, setTries] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [recent, setRecent] = useState<boolean[]>([])
  // Sequencing for this sitting: what came up lately, and what is owed a return.
  const queueRef = useRef<Queue>(emptyQueue())

  // The generator reads progress, but a fresh answer must not swap the problem
  // out from under the student, so it is read through a ref.
  const progressRef = useRef(progress)
  progressRef.current = progress

  const build = useCallback(
    (exclude: FormId | null): Dealt => {
      const state = progressRef.current
      const queue = queueRef.current
      const problem = nextProblem({
        scope: prefs.scope,
        direction: prefs.direction,
        mastery: masteryMap(state),
        allowCombo: true,
        allowShifts: prefs.shiftsInDrill,
        excludeForm: exclude,
        avoid: tooRecent(queue),
        prefer: dueNow(queue),
        uncovered: uncoveredItems(ALL_ROW_ITEMS, state.facets),
      })
      const tier = effectiveTier(state, problem.itemIds[0])
      const mode =
        prefs.response === 'auto' ? (shouldType(tier) ? 'type' : 'choose') : prefs.response
      return { problem, mode, tier, ...trim(problem, autoOptionCount(tier)) }
    },
    [prefs.scope, prefs.direction, prefs.response, prefs.shiftsInDrill],
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
    setDealt(build(null))
    reset()
  }, [build, reset])

  const advance = useCallback(() => {
    setDealt((d) => build(d?.problem.forms[0] ?? null))
    reset()
  }, [build, reset])

  const problem = dealt?.problem ?? null
  const mode = dealt?.mode ?? 'choose'
  const settled = mode === 'choose' ? picked !== null : verdict?.ok === true || revealed

  /** One place for "an answer happened", so nothing is recorded twice or missed. */
  const settle = useCallback(
    (correct: boolean, slip?: AttemptDetail['slip']) => {
      if (!dealt) return
      const p = dealt.problem
      onAnswer(p.itemIds, correct, { slip, facets: p.facets })
      setRecent((r) => [...r.slice(-19), correct])
      queueRef.current = recordServed(queueRef.current, p.itemIds[0], correct)
    },
    [dealt, onAnswer],
  )

  const pick = useCallback(
    (index: number) => {
      if (!dealt || picked !== null) return
      setPicked(index)
      const correct = index === dealt.correctIndex
      settle(correct, correct ? undefined : dealt.choices[index].slip)
    },
    [dealt, picked, settle],
  )

  const submit = useCallback(() => {
    if (!dealt || !problem || settled) return
    const v = checkAnswer(typed, {
      variable: problem.variable,
      target: problem.target,
      poles: problem.poles,
    })
    // A typed wrong answer that lands on a known distractor is the same mistake
    // as picking it from a list, and gets the same explanation. Every distractor
    // counts here, not just the ones a multiple-choice list had room for: typed
    // mode shows no options, so trimming would only narrow the diagnosis.
    const named = v.ok
      ? null
      : diagnose(
          typed,
          { primary: problem.variable, allowed: [problem.variable] },
          problem.choices,
          problem.poles,
        )
    setVerdict(named ? { ok: false, code: 'wrong', message: named.why } : v)
    // Only the first attempt counts, so mastery tracks what you knew, not what
    // you found after three goes.
    if (tries === 0) settle(v.ok, named?.slip)
    setTries((n) => n + 1)
  }, [dealt, problem, typed, tries, settled, settle])


  useAnswerKeys({
    active: dealt !== null,
    settled,
    mode,
    optionCount: dealt?.choices.length ?? 0,
    onPick: pick,
    onAdvance: advance,
  })

  const preview = useMemo(
    () => (problem && mode === 'type' ? previewOf(typed, problem.variable) : null),
    [typed, problem, mode],
  )

  if (!dealt || !problem) return null

  const { choices, correctIndex, tier } = dealt
  const form = FORM_BY_ID.get(problem.forms[0])!
  const correct = mode === 'choose' ? picked === correctIndex : verdict?.ok === true

  return (
    <section>
      <ScopeBar scope={prefs.scope} onScope={(scope) => onPrefs({ ...prefs, scope })}>
        <div className="mode-bar">
          <span className="eyebrow">Direction</span>
          {DIRECTION_CHIPS.map((d) => (
            <button
              key={d.id}
              className={prefs.direction === d.id ? 'chip chip-active' : 'chip'}
              onClick={() => onPrefs({ ...prefs, direction: d.id })}
            >
              {d.id === 'both' ? d.label : <Tex tex={d.label} />}
            </button>
          ))}
          <span style={{ width: 10 }} />
          <button
            className={prefs.shiftsInDrill ? 'chip chip-active' : 'chip'}
            onClick={() => onPrefs({ ...prefs, shiftsInDrill: !prefs.shiftsInDrill })}
            title="Mix in translated forms — Theorems 7.3.1 and 7.3.2 — alongside the plain rows"
            aria-pressed={prefs.shiftsInDrill}
          >
            + Shifts
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
      </ScopeBar>

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
          {prefs.hideRowLabel ? null : (
            <span className="badge">
              <span className="badge-letter">({form.letter})</span> {form.name}
            </span>
          )}
          <span className="badge badge-section">{sectionOf(problem)}</span>
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
                Your answer, as a function of <code>{problem.variable}</code>
              </>
            }
            placeholder={problem.variable === 's' ? '3/(s^2+9)' : '(1/3)sin(3t)'}
            preview={preview}
            syntax="`^` powers, `*` or juxtaposition, `e^(-2t)`, `sin 3t`, `t^3/6` — any equivalent form is accepted."
          />
        )}

        {mode === 'choose' && picked !== null ? (
          <Feedback tone={correct ? 'good' : 'bad'}>{correct ? 'Correct.' : 'Not that one.'}</Feedback>
        ) : null}

        {mode === 'type' && verdict ? (
          <Feedback tone={verdict.ok ? 'good' : verdict.code === 'scaled' ? 'near' : 'bad'}>
            {verdict.ok ? 'Correct.' : <Rich text={verdict.message} />}
          </Feedback>
        ) : null}

        {mode === 'choose' && picked !== null && picked !== correctIndex && choices[picked].why ? (
          <div className="diagnosis">
            <span className="eyebrow">What you picked</span>
            <Rich text={choices[picked].why} />
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
              <Tex tex={`${problem.promptTex} = ${problem.answerTex}`} display />
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
    </section>
  )
}
