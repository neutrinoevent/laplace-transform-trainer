import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FORM_IDS } from '../data/forms'
import { itemId } from '../generators/types'
import { makeBoard, type Pair } from '../generators'
import { randomRng } from '../lib/rng'
import type { ProgressState } from '../store/progress'
import type { Prefs } from '../store/prefs'
import { ScopeBar } from './ScopeBar'
import { Tex } from './Tex'

const SIZE = 5

interface MatchProps {
  progress: ProgressState
  prefs: Prefs
  onPrefs: (next: Prefs) => void
  onAnswer: (ids: string[], correct: boolean) => void
  onBoard: (size: number, ms: number) => void
}

interface Tile {
  key: string
  pairIndex: number
  tex: string
}

type Side = 'f' | 's'

function deal(scope: Prefs['scope']): { pairs: Pair[]; left: Tile[]; right: Tile[] } {
  const rng = randomRng()
  const pairs = makeBoard(rng, scope ?? FORM_IDS, SIZE)
  const left = rng.shuffle(pairs.map((p, i) => ({ key: `f${i}`, pairIndex: i, tex: p.fTex })))
  const right = rng.shuffle(pairs.map((p, i) => ({ key: `s${i}`, pairIndex: i, tex: p.sTex })))
  return { pairs, left, right }
}

/**
 * Recognition, timed. Producing a transform and recognizing one on sight are
 * different skills, and the second is what an exam actually leans on when a
 * partial-fractions answer has to be read off row by row.
 */
export function Match({ progress, prefs, onPrefs, onAnswer, onBoard }: MatchProps) {
  const [board, setBoard] = useState(() => deal(prefs.scope))
  const [done, setDone] = useState<number[]>([])
  const [sel, setSel] = useState<{ side: Side; pairIndex: number } | null>(null)
  const [wrong, setWrong] = useState<string | null>(null)
  const [misses, setMisses] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const wrongTimer = useRef<number | null>(null)

  const cleared = board.pairs.length > 0 && done.length === board.pairs.length
  const best = progress.bestBoard[String(SIZE)]

  const restart = useCallback(() => {
    setBoard(deal(prefs.scope))
    setDone([])
    setSel(null)
    setWrong(null)
    setMisses(0)
    setStartedAt(null)
    setElapsed(0)
  }, [prefs.scope])

  // A new scope means a new board; a half-finished one would be meaningless.
  useEffect(() => {
    restart()
  }, [restart])

  useEffect(() => {
    if (startedAt === null || cleared) return
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), 100)
    return () => window.clearInterval(id)
  }, [startedAt, cleared])

  useEffect(() => () => {
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current)
  }, [])

  const finish = useCallback(
    (at: number) => {
      if (startedAt === null) return
      const ms = at - startedAt
      setElapsed(ms)
      if (misses === 0) onBoard(SIZE, ms)
    },
    [startedAt, misses, onBoard],
  )

  const tap = (side: Side, pairIndex: number) => {
    if (cleared || done.includes(pairIndex)) return
    const now = Date.now()
    if (startedAt === null) setStartedAt(now)

    if (!sel || sel.side === side) {
      setSel({ side, pairIndex })
      setWrong(null)
      return
    }
    const form = board.pairs[sel.pairIndex].form
    const ids = [itemId(form, 'forward'), itemId(form, 'inverse')]
    if (sel.pairIndex === pairIndex) {
      onAnswer(ids, true)
      const next = [...done, pairIndex]
      setDone(next)
      setSel(null)
      if (next.length === board.pairs.length) finish(now)
    } else {
      onAnswer(ids, false)
      setMisses((m) => m + 1)
      setWrong(`${side}${pairIndex}`)
      setSel(null)
      if (wrongTimer.current) window.clearTimeout(wrongTimer.current)
      wrongTimer.current = window.setTimeout(() => setWrong(null), 550)
    }
  }

  const seconds = useMemo(() => (elapsed / 1000).toFixed(1), [elapsed])

  const tileClass = (side: Side, t: Tile) => {
    if (done.includes(t.pairIndex)) return 'tile tile-done'
    if (wrong === `${side}${t.pairIndex}`) return 'tile tile-wrong'
    if (sel && sel.side === side && sel.pairIndex === t.pairIndex) return 'tile tile-picked'
    return 'tile'
  }

  return (
    <section>
      <ScopeBar scope={prefs.scope} onScope={(scope) => onPrefs({ ...prefs, scope })} />

      <div className="board-bar">
        <span className="board-clock">{seconds}s</span>
        <span className="meta-note">
          {done.length}/{board.pairs.length} paired · {misses} {misses === 1 ? 'miss' : 'misses'}
        </span>
        {best !== undefined ? (
          <span className="meta-note">best clean run {(best / 1000).toFixed(1)}s</span>
        ) : null}
        <span style={{ marginLeft: 'auto' }} />
        <button className={cleared ? 'btn btn-primary' : 'btn'} onClick={restart}>
          New board
        </button>
      </div>

      {cleared ? (
        <div className="feedback feedback-good" style={{ marginTop: 0, marginBottom: 14 }}>
          Board cleared in {seconds}s with {misses} {misses === 1 ? 'miss' : 'misses'}.
          {misses > 0 ? ' Clean runs count toward your best time.' : ''}
        </div>
      ) : null}

      <div className="card">
        <div className="board">
          <div className="board-col">
            <span className="board-head">
              <Tex tex="f(t)" />
            </span>
            {board.left.map((t) => (
              <button
                key={t.key}
                className={tileClass('f', t)}
                onClick={() => tap('f', t.pairIndex)}
                disabled={done.includes(t.pairIndex)}
              >
                <Tex tex={t.tex} display />
              </button>
            ))}
          </div>
          <div className="board-col">
            <span className="board-head">
              <Tex tex="F(s)" />
            </span>
            {board.right.map((t) => (
              <button
                key={t.key}
                className={tileClass('s', t)}
                onClick={() => tap('s', t.pairIndex)}
                disabled={done.includes(t.pairIndex)}
              >
                <Tex tex={t.tex} display />
              </button>
            ))}
          </div>
        </div>
        <p className="meta-note" style={{ marginTop: 14, marginBottom: 0 }}>
          Pick one from each column. Pairings count toward both directions of that row.
        </p>
      </div>
    </section>
  )
}
