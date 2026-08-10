import { useMemo } from 'react'
import katex from 'katex'
import { splitRich } from '../lib/rich'

interface TexProps {
  tex: string
  /** Centre it on its own line. */
  block?: boolean
  /**
   * Full-size fractions without centring. Answers here are routinely of the
   * form `\frac{1}{3}\sin 3t`, and the fix-up constant is the point of the
   * line — it should not be set in the small script style inline math defaults to.
   */
  display?: boolean
}

export function Tex({ tex, block = false, display = false }: TexProps) {
  const html = useMemo(
    () =>
      katex.renderToString(display && !block ? `\\displaystyle ${tex}` : tex, {
        displayMode: block,
        throwOnError: false,
        strict: false,
      }),
    [tex, block, display],
  )
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

/** Prose with `$math$` and `` `code` `` spans; see `lib/rich`. */
export function Rich({ text }: { text: string }) {
  const parts = useMemo(() => splitRich(text), [text])
  return (
    <>
      {parts.map((p, i) =>
        p.kind === 'math' ? (
          <Tex key={i} tex={p.text} />
        ) : p.kind === 'code' ? (
          <code key={i}>{p.text}</code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}
