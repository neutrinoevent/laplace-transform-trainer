import type { Direction } from '../generators/types'

/**
 * Which way this problem runs, source on the left and the answer's domain
 * highlighted on the right. Small, but it is the thing students lose track of
 * once both directions are interleaved.
 */
export function Rail({ direction }: { direction: Direction }) {
  const [from, to] = direction === 'forward' ? ['t', 's'] : ['s', 't']
  return (
    <span className="rail" aria-label={`${from}-domain to ${to}-domain`}>
      <span className="rail-node">{from}</span>
      <span className="rail-arrow" aria-hidden="true">
        →
      </span>
      <span className="rail-node rail-node-on">{to}</span>
    </span>
  )
}
