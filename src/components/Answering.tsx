/**
 * The parts of a question that are the same whichever thing is being drilled:
 * the option grid, the typed-answer box, and the feedback banner. Shared so the
 * seven-row drill and the derivative drill cannot drift apart in behaviour.
 */

import { useEffect, useRef } from 'react'
import type { Choice } from '../generators/types'
import { Rich, Tex } from './Tex'

export function Options({
  choices,
  picked,
  correctIndex,
  onPick,
}: {
  choices: Choice[]
  picked: number | null
  correctIndex: number
  onPick: (index: number) => void
}) {
  // Wide answers — a sum of two fractions, an expansion of order four — get a
  // column to themselves, so options stay comparable line for line.
  const wide = choices.some((c) => c.tex.length > 52)
  const cls = wide ? 'options options-1' : choices.length === 3 ? 'options options-3' : 'options'
  return (
    <div className={cls}>
      {choices.map((c, i) => {
        const cls =
          picked === null
            ? 'option'
            : i === correctIndex
              ? 'option option-correct'
              : picked === i
                ? 'option option-wrong'
                : 'option option-dim'
        return (
          <button key={c.tex} className={cls} onClick={() => onPick(i)} disabled={picked !== null}>
            <span className="option-key">{i + 1}</span>
            <span className="option-body">
              <Tex tex={c.tex} display />
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function AnswerBox({
  value,
  onChange,
  onSubmit,
  onAdvance,
  settled,
  label,
  placeholder,
  prefixTex,
  preview,
  syntax,
  autoFocus = true,
}: {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  onAdvance: () => void
  settled: boolean
  label: React.ReactNode
  placeholder: string
  /** Rendered immediately left of the field, e.g. `Y(s) =`. */
  prefixTex?: string
  preview: { tex: string } | { error: string } | null
  syntax: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus && !settled) ref.current?.focus()
  }, [autoFocus, settled, prefixTex, placeholder])

  return (
    <div>
      <label className="answer-label" htmlFor="answer">
        {label}
      </label>
      <div className="answer-row">
        {prefixTex ? (
          <span className="answer-prefix">
            <Tex tex={prefixTex} display />
          </span>
        ) : null}
        <input
          id="answer"
          ref={ref}
          className="answer-input"
          value={value}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (settled) onAdvance()
            else onSubmit()
          }}
          disabled={settled}
        />
        <button className="btn btn-primary" onClick={onSubmit} disabled={settled || !value.trim()}>
          Check
        </button>
      </div>
      <div className="preview">
        {preview && 'tex' in preview ? (
          <>
            <span className="preview-label">read as</span>
            <Tex tex={preview.tex} display />
          </>
        ) : preview ? (
          <span className="meta-note">{preview.error}</span>
        ) : null}
      </div>
      <p className="syntax">
        <Rich text={syntax} />
      </p>
    </div>
  )
}

export function Feedback({ tone, children }: { tone: 'good' | 'bad' | 'near'; children: React.ReactNode }) {
  return <div className={`feedback feedback-${tone}`}>{children}</div>
}
