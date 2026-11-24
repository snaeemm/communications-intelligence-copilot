// Pure, deterministic key-message detector: direct phrases (weight 1.0) + same-sentence synonym groups (weight 0.7).
import type { EvidenceMatch, KeyMessage, MessageResult, SignalFlag } from '../data/types'

/** Words that signal a claim is being reported and challenged rather than endorsed. */
const CONTRAST_CUES = [' but ', 'despite', 'although', 'however', 'does not appear', 'no record', 'went unanswered', 'could find no', 'fails to', 'cannot be verified', 'questioned']

function findAll(hay: string, needle: string): [number, number][] {
  const out: [number, number][] = []
  let i = hay.indexOf(needle)
  while (i !== -1) { out.push([i, i + needle.length]); i = hay.indexOf(needle, i + needle.length) }
  return out
}
const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1]

export function detectKeyMessage(text: string, message: KeyMessage): MessageResult {
  const lower = text.toLowerCase()
  const matches: EvidenceMatch[] = []
  const taken: [number, number][] = []

  // 1) direct phrases, longest first so shorter phrases don't double-count
  const phrases = [...message.phrases].sort((a, b) => b.length - a.length)
  for (const p of phrases) {
    for (const span of findAll(lower, p.toLowerCase())) {
      if (taken.some(t => overlaps(t, span))) continue
      taken.push(span)
      matches.push({ start: span[0], end: span[1], text: text.slice(span[0], span[1]), kind: 'phrase', weight: 1 })
    }
  }

  // 2) synonym groups: anchor + benefit term in the same sentence
  const sentenceRe = /[^.!?]+[.!?]*/g
  let s: RegExpExecArray | null
  while ((s = sentenceRe.exec(lower))) {
    const base = s.index
    const sent = s[0]
    for (const g of message.groups) {
      const a = g.anchors.map(x => ({ x, i: sent.indexOf(x) })).find(r => r.i !== -1)
      const b = g.benefits.map(x => ({ x, i: sent.indexOf(x) })).find(r => r.i !== -1)
      if (!a || !b) continue
      const aSpan: [number, number] = [base + a.i, base + a.i + a.x.length]
      const bSpan: [number, number] = [base + b.i, base + b.i + b.x.length]
      if (taken.some(t => overlaps(t, aSpan) || overlaps(t, bSpan))) continue
      for (const [span, term] of [[aSpan, a.x], [bSpan, b.x]] as const) {
        // expand to the whole word for a clean highlight
        let st = span[0], en = span[1]
        while (st > 0 && /[a-z-]/i.test(text[st - 1])) st--
        while (en < text.length && /[a-z-]/i.test(text[en])) en++
        taken.push([st, en])
        matches.push({ start: st, end: en, text: text.slice(st, en), kind: 'synonym', weight: 0.35 })
        void term
      }
    }
  }
  matches.sort((x, y) => x.start - y.start)

  const score = matches.reduce((n, m) => n + m.weight, 0)
  const present = score >= 0.7
  let confidence = present
    ? Math.min(0.98, +(0.5 + 0.3 * score).toFixed(2))
    : +Math.max(0.55, 0.9 - 0.4 * score).toFixed(2)
  let flag: SignalFlag | undefined

  // Rule: a match inside a sentence that also carries a contrast cue is reported-and-challenged language — lower the score, flag for review.
  if (present) {
    const sentences = lower.match(/[^.!?]+[.!?]*/g) ?? []
    let off = 0
    const spans = sentences.map(sn => { const a = off; off += sn.length; return [a, off, ` ${sn} `] as const })
    const cued = matches.some(m => spans.some(([a, b, sn]) => m.start >= a && m.start < b && CONTRAST_CUES.some(c => sn.includes(c))))
    if (cued) { flag = 'contrast-cue'; confidence = Math.min(confidence, 0.6) }
  } else {
    // Rule: no match, but several loose topic hints appear — weak signal, flag for review.
    const hit = message.hints.filter(h => lower.includes(h)).length
    if (hit >= 2) { flag = 'weak-signal'; confidence = Math.min(confidence, 0.6) }
  }
  return { present, confidence, matches, flag }
}
