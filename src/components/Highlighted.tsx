import { Fragment } from 'react'
import type { EvidenceMatch } from '../data/types'

/** Renders text with matched spans wrapped in <mark>. Matches must not overlap (the engine guarantees this). */
export function Highlighted({ text, matches, focus = true, toneMode = false }: { text: string; matches: EvidenceMatch[]; focus?: boolean; toneMode?: boolean }) {
  const sorted = [...matches].sort((a, b) => a.start - b.start)
  const parts: React.ReactNode[] = []
  let cur = 0
  sorted.forEach((m, i) => {
    if (m.start < cur) return
    if (m.start > cur) parts.push(<Fragment key={`t${i}`}>{text.slice(cur, m.start)}</Fragment>)
    const cls = toneMode ? (m.weight > 0 ? 'ev ev-tone-pos' : 'ev ev-tone-neg') : focus ? 'ev ev-focus' : 'ev'
    parts.push(<mark key={`m${i}`} className={cls} data-match title={m.kind === 'phrase' ? 'Direct phrase match' : m.kind === 'synonym' ? 'Synonym / paraphrase match' : m.weight > 0 ? 'Positive term' : 'Negative term'}>{text.slice(m.start, m.end)}</mark>)
    cur = m.end
  })
  parts.push(<Fragment key="end">{text.slice(cur)}</Fragment>)
  return <>{parts}</>
}
