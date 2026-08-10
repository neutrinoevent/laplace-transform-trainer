/** Seedable PRNG (mulberry32), so a failing generated problem can be reproduced. */
export interface RNG {
  next: () => number
  int: (lo: number, hi: number) => number
  pick: <T>(arr: readonly T[]) => T
  sample: <T>(arr: readonly T[], n: number) => T[]
  shuffle: <T>(arr: readonly T[]) => T[]
  bool: (p?: number) => boolean
  sign: () => 1 | -1
}

export function makeRng(seed: number): RNG {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1))
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  return {
    next,
    int,
    pick: <T,>(arr: readonly T[]): T => arr[int(0, arr.length - 1)],
    sample: <T,>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, n),
    shuffle,
    bool: (p = 0.5) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  }
}

/** Fresh unseeded generator, for ordinary practice. */
export const randomRng = (): RNG => makeRng((Math.random() * 2 ** 32) >>> 0)
