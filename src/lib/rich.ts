/**
 * Rich text is prose with `$math$` and `` `code` `` spans. Almost every string
 * in the case library and in generated solutions is a sentence with an
 * expression in the middle of it, so this is the default text format rather
 * than a special case. A backslash escapes either delimiter.
 */

export type RichPart = { kind: 'text' | 'math' | 'code'; text: string }

export function splitRich(text: string): RichPart[] {
  const out: RichPart[] = []
  let buf = ''
  let i = 0
  const flush = () => {
    if (buf) out.push({ kind: 'text', text: buf })
    buf = ''
  }
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\' && (text[i + 1] === '$' || text[i + 1] === '`')) {
      buf += text[i + 1]
      i += 2
      continue
    }
    if (ch === '$' || ch === '`') {
      const end = text.indexOf(ch, i + 1)
      if (end > i) {
        flush()
        out.push({ kind: ch === '$' ? 'math' : 'code', text: text.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }
    buf += ch
    i++
  }
  flush()
  return out
}
