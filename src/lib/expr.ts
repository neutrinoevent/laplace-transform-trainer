/** Expression-level TeX: sums of table rows, and the two operator wrappers. */

import { termFTex, termSTex, type Term } from '../data/forms'
import { texSum } from './frac'

export const fTex = (terms: Term[]): string => texSum(terms.map(termFTex))
export const sTex = (terms: Term[]): string => texSum(terms.map(termSTex))

/** `\mathcal{L}\{\,\cdot\,\}`, sized so a stacked fraction fits inside. */
export const lap = (inner: string): string => `\\mathcal{L}\\left\\{${inner}\\right\\}`

export const invLap = (inner: string): string => `\\mathcal{L}^{-1}\\left\\{${inner}\\right\\}`

/** Unsized braces, for short operands where `\left\{` opens a visible gap. */
export const lapTight = (inner: string): string => `\\mathcal{L}\\{${inner}\\}`
