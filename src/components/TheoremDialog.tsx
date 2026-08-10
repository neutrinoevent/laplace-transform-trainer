import { useEffect, useRef } from 'react'
import { THEOREMS } from '../data/theorems'
import { Rich, Tex } from './Tex'

/**
 * The book's statement, quoted. Laid out the way the book lays it out — (a)
 * alone and centred, the remaining six in two columns — so that someone
 * checking the trainer against the page finds the same shape on both.
 */
export function TheoremDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const theorem = THEOREMS[id]
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnTo = useRef<Element | null>(null)

  useEffect(() => {
    returnTo.current = document.activeElement
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus()
    }
  }, [onClose])

  if (!theorem) return null
  const [first, ...rest] = theorem.items
  const headingId = `theorem-${theorem.id}`

  return (
    <div
      className="modal-root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <div className="modal-head">
          <div className="modal-heading">
            <span className="theorem-number">{theorem.number}</span>
            <h2 className="theorem-title" id={headingId}>
              {theorem.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            className="btn icon-btn modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {theorem.lead ? (
            <p className="theorem-aside">
              <Rich text={theorem.lead} />
            </p>
          ) : null}

          <div className="theorem-panel">
            <div className={rest.length ? 'theorem-lead-item' : 'theorem-lead-item theorem-only'}>
              <TheoremLine item={first} />
            </div>
            {rest.length ? (
              <div className="theorem-grid">
                {rest.map((item) => (
                  <div key={item.letter} className="theorem-item">
                    <TheoremLine item={item} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {theorem.note ? (
            <p className="theorem-aside">
              <Rich text={theorem.note} />
            </p>
          ) : null}

          <p className="theorem-source muted">
            Zill, <em>A First Course in Differential Equations</em>, 9e.
          </p>
        </div>
      </div>
    </div>
  )
}

function TheoremLine({ item }: { item: (typeof THEOREMS)[string]['items'][number] }) {
  // The side condition belongs inside the math, so the comma and the space
  // before it are typeset rather than assembled out of CSS gaps.
  const tex = item.condition ? `${item.tex},\\quad ${item.condition}` : item.tex
  return (
    <>
      {item.letter ? <span className="theorem-letter">({item.letter})</span> : null}
      <span className="theorem-tex">
        <Tex tex={tex} display />
      </span>
    </>
  )
}
