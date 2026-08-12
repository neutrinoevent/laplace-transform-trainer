import { useCallback, useMemo, useState } from 'react'
import {
  ALL_TOPICS,
  makePaper,
  TOPIC_NAME,
  type ExamQuestion,
  type Paper,
} from '../generators/exam'
import { checkScoped, previewOf } from '../lib/check'
import { diagnose } from '../lib/diagnose'
import type { SlipId } from '../data/slips'
import type { AttemptDetail } from '../store/progress'
import { Derivation } from './Derivation'
import { Rich, Tex } from './Tex'

const LENGTHS = [4, 6, 8, 10]

interface Marked {
  correct: boolean
  /** What the answer was, once it has been marked and can be shown. */
  given: string
  /** The named mistake, when the answer landed on a known wrong one. */
  why: string | null
  slip?: SlipId
}

interface ExamProps {
  onAnswer: (ids: string[], correct: boolean, detail?: AttemptDetail) => void
}

/**
 * A paper rather than a drill.
 *
 * Nothing is marked until everything is answered, which is the point: the whole
 * skill of an exam is committing to an answer without being told. Questions may
 * be done in any order and revisited, exactly as on paper, and the only thing
 * the app volunteers before marking is which questions are still blank.
 */
export function Exam({ onAnswer }: ExamProps) {
  const [paper, setPaper] = useState<Paper | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [marks, setMarks] = useState<Marked[] | null>(null)
  const [at, setAt] = useState(0)
  const [length, setLength] = useState(6)

  const start = useCallback((count: number) => {
    const next = makePaper({ count, topics: ALL_TOPICS })
    setPaper(next)
    setAnswers(Array(next.questions.length).fill(''))
    setMarks(null)
    setAt(0)
  }, [])

  const submit = useCallback(() => {
    if (!paper) return
    if (marks) return
    const marked = paper.questions.map((q, i) => {
      const given = answers[i] ?? ''
      const ok = given.trim()
        ? checkScoped(given, { symbols: q.symbols, target: q.target, points: q.points }).ok
        : false
      // A wrong answer that lands on a known distractor is named here too, so
      // the paper explains rather than merely scores.
      const named = ok || !given.trim() ? null : diagnose(given, q.symbols, q.choices)
      return { correct: ok, given, why: named?.why ?? null, slip: named?.slip }
    })
    setMarks(marked)
    // A paper still counts: every question reports into the same items a drill
    // would have, so sitting one moves the same scores.
    paper.questions.forEach((q, i) => {
      onAnswer(q.itemIds, marked[i].correct, { slip: marked[i].slip, facets: q.facets })
    })
  }, [paper, answers, marks, onAnswer])

  if (!paper) return <Cover length={length} onLength={setLength} onStart={start} />

  const questions = paper.questions
  const blank = answers.filter((a) => !a.trim()).length
  const score = marks ? marks.filter((m) => m.correct).length : 0

  return (
    <section>
      {marks ? (
        <div className="card exam-result">
          <div className="exam-score">
            <span className="exam-score-value">
              {score}/{questions.length}
            </span>
            <span className="stat-label">Marked</span>
          </div>
          <p className="meta-note" style={{ margin: 0, flex: 1 }}>
            Every question is worked below, whichever way it went. The score has been recorded
            against the same skills a drill would have moved.
          </p>
          <button className="btn btn-primary" onClick={() => start(questions.length)}>
            New paper
          </button>
        </div>
      ) : (
        <div className="scope-bar">
          <div className="mode-bar">
            <span className="eyebrow">Paper</span>
            <span className="meta-note">
              {questions.length} questions, mixed. Nothing is marked until you hand it in.
            </span>
            <span style={{ marginLeft: 'auto' }} />
            <span className="meta-note">
              {blank ? `${blank} still blank` : 'All answered'}
            </span>
            <button className="btn btn-primary" onClick={submit}>
              Hand it in
            </button>
          </div>
        </div>
      )}

      <div className="exam-strip">
        {questions.map((q, i) => {
          const state = marks
            ? marks[i].correct
              ? 'exam-pip-good'
              : 'exam-pip-bad'
            : answers[i]?.trim()
              ? 'exam-pip-done'
              : ''
          return (
            <button
              key={i}
              className={`exam-pip ${state} ${i === at ? 'exam-pip-at' : ''}`}
              onClick={() => setAt(i)}
              title={TOPIC_NAME[q.topic]}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {marks ? (
        questions.map((q, i) => (
          <Reviewed key={i} index={i} question={q} mark={marks[i]} />
        ))
      ) : (
        <Answering
          key={at}
          index={at}
          total={questions.length}
          question={questions[at]}
          value={answers[at] ?? ''}
          onChange={(v) => setAnswers((a) => a.map((x, i) => (i === at ? v : x)))}
          onMove={(d) => setAt((i) => Math.max(0, Math.min(questions.length - 1, i + d)))}
        />
      )}
    </section>
  )
}

function Cover({
  length,
  onLength,
  onStart,
}: {
  length: number
  onLength: (n: number) => void
  onStart: (n: number) => void
}) {
  return (
    <div className="card">
      <h2 className="section-title">Sit a paper</h2>
      <p>
        <Rich text="A mixed set drawn from every section: the table both ways, the translation theorems, derivatives of a transform, partial fractions, transforms of derivatives, and initial-value problems. Nothing says which is which — deciding that is most of the work." />
      </p>
      <p className="meta-note">
        <Rich text="Questions are typed, not chosen from a list, and *nothing is marked until you hand it in*. You can move between them freely and change your mind. Everything is worked through afterwards, and the result counts towards the same skills a drill would move." />
      </p>
      <div className="mode-bar" style={{ marginTop: 14 }}>
        <span className="eyebrow">Length</span>
        {LENGTHS.map((n) => (
          <button
            key={n}
            className={n === length ? 'chip chip-active' : 'chip'}
            onClick={() => onLength(n)}
          >
            {n}
          </button>
        ))}
        <span style={{ width: 10 }} />
        <button className="btn btn-primary" onClick={() => onStart(length)}>
          Start →
        </button>
      </div>
    </div>
  )
}

function Answering({
  index,
  total,
  question,
  value,
  onChange,
  onMove,
}: {
  index: number
  total: number
  question: ExamQuestion
  value: string
  onChange: (v: string) => void
  onMove: (delta: number) => void
}) {
  const preview = useMemo(() => previewOf(value, question.symbols), [value, question.symbols])

  return (
    <div className="card problem-card">
      <div className="problem-meta">
        <span className="badge badge-section">
          {index + 1} of {total}
        </span>
        <span className="meta-note" style={{ marginLeft: 'auto' }}>
          Unmarked
        </span>
      </div>

      <p className="question-line">
        <Rich text={question.question} />
      </p>

      <div className="problem-tex">
        <Tex tex={question.statementTex} block />
      </div>

      {question.givenTex ? (
        <div className="ivp-given">
          <span className="eyebrow">Subject to</span>
          <Tex tex={question.givenTex} />
        </div>
      ) : null}

      <div className="divider" />

      <div className="answer-block">
        <label className="answer-label" htmlFor="exam-answer">
          Your answer, as a function of <code>{question.symbols.primary}</code>
        </label>
        <div className="answer-row">
          <input
            id="exam-answer"
            className="answer-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={question.symbols.primary === 's' ? 'a function of s' : 'a function of t'}
          />
        </div>
        <div className="preview">
          {preview && 'tex' in preview ? (
            <>
              <span className="preview-label">read as</span>
              <Tex tex={preview.tex} />
            </>
          ) : preview && 'error' in preview ? (
            <span className="meta-note">{preview.error}</span>
          ) : null}
        </div>
        <p className="syntax">
          <Rich text={question.syntaxNote} />
        </p>
      </div>

      <div className="actions">
        <button className="btn" onClick={() => onMove(-1)} disabled={index === 0}>
          ← Previous
        </button>
        <button className="btn btn-primary" onClick={() => onMove(1)} disabled={index === total - 1}>
          Next →
        </button>
        <span className="meta-note">
          Move freely; nothing is marked until the paper is handed in.
        </span>
      </div>
    </div>
  )
}

function Reviewed({
  index,
  question,
  mark,
}: {
  index: number
  question: ExamQuestion
  mark: Marked
}) {
  return (
    <div className="card problem-card">
      <div className="problem-meta">
        <span className="badge badge-section">{index + 1}</span>
        <span className="badge">{TOPIC_NAME[question.topic]}</span>
        <span className={`meta-note ${mark.correct ? 'exam-right' : 'exam-wrong'}`} style={{ marginLeft: 'auto' }}>
          {mark.correct ? 'Right' : mark.given.trim() ? 'Wrong' : 'Left blank'}
        </span>
      </div>

      <div className="problem-tex">
        <Tex tex={question.statementTex} block />
      </div>

      {question.givenTex ? (
        <div className="ivp-given">
          <span className="eyebrow">Subject to</span>
          <Tex tex={question.givenTex} />
        </div>
      ) : null}

      {mark.given.trim() ? (
        <div className="exam-given">
          <span className="eyebrow">You wrote</span>
          <code>{mark.given}</code>
        </div>
      ) : null}

      {mark.why ? (
        <div className="diagnosis">
          <span className="eyebrow">What that was</span>
          <Rich text={mark.why} />
        </div>
      ) : null}

      <div className="solution">
        <span className="eyebrow">Answer</span>
        <Tex tex={`${question.prefixTex} ${question.answerTex}`} display />
      </div>
      <Derivation steps={question.derivation} />
    </div>
  )
}
