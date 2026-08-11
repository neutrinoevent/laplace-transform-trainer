/**
 * Naming a typed wrong answer.
 *
 * Multiple choice gets a diagnosis for every wrong option; typed answers got
 * "that is not the transform". But typed mode is where the *stronger* students
 * are, by design — so the better you got, the worse your feedback. That is
 * backwards.
 *
 * The distractors already carry both an explanation and an evaluable form, so a
 * typed answer can simply be sampled against them. Landing on one is the same
 * mistake as picking it from a list, and is told the same thing.
 */

import { parseExpr, samplePoints, type Symbols } from './check'
import type { SlipId } from '../data/slips'

interface Named {
  why: string
  slip?: SlipId
}

interface Option {
  why: string | null
  slip?: SlipId
  value?: (scope: Record<string, number>) => number
}

export function diagnose(
  raw: string,
  symbols: Symbols,
  options: Option[],
  poles: number[] = [],
): Named | null {
  const parsed = parseExpr(raw, symbols)
  if ('error' in parsed) return null

  const xs = samplePoints(symbols.primary, poles)
  if (xs.length < 4) return null
  const scopes = xs.map((x) => ({ [symbols.primary]: x }))

  for (const option of options) {
    if (option.why === null || !option.value) continue
    let matches = true
    let scale = 0
    const diffs: number[] = []
    for (const scope of scopes) {
      const want = option.value(scope)
      const got = parsed.evaluate(scope)
      if (!Number.isFinite(want) || !Number.isFinite(got)) {
        matches = false
        break
      }
      scale = Math.max(scale, Math.abs(want))
      diffs.push(Math.abs(got - want))
    }
    if (!matches) continue
    const tol = 1e-7 * (scale + 1)
    if (diffs.every((d) => d <= tol)) return { why: option.why, slip: option.slip }
  }
  return null
}
