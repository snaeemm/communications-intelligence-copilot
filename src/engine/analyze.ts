import type { CoverageItem, Finding, ItemAnalysis, KeyMessage, MessageId, Reviews, ValidatedFinding } from '../data/types'
import { classifyTone } from './tone'
import { detectKeyMessage } from './messages'
import { evidenceStatusFor } from './validate'

export function analyzeItem(item: CoverageItem, messages: KeyMessage[]): ItemAnalysis {
  const msgs = {} as ItemAnalysis['messages']
  for (const m of messages) msgs[m.id] = detectKeyMessage(item.text, m)
  return { itemId: item.id, tone: classifyTone(item.text), messages: msgs }
}
export const analyzeAll = (items: CoverageItem[], messages: KeyMessage[]) => items.map(i => analyzeItem(i, messages))

export function buildFindings(analyses: ItemAnalysis[], messages: KeyMessage[], items: CoverageItem[]): Finding[] {
  const out: Finding[] = []
  const byId = new Map(items.map(i => [i.id, i]))
  for (const a of analyses) {
    const toneF = { id: `${a.itemId}:tone`, itemId: a.itemId, kind: 'tone' as const, aiTone: a.tone.tone, confidence: a.tone.confidence, matches: a.tone.matches }
    out.push({ ...toneF, evidenceStatus: evidenceStatusFor(byId.get(a.itemId), toneF) })
    for (const m of messages) {
      const r = a.messages[m.id]
      const msgF = { id: `${a.itemId}:msg:${m.id}`, itemId: a.itemId, kind: 'message' as const, messageId: m.id, aiPresent: r.present, confidence: r.confidence, matches: r.matches, flag: r.flag }
      out.push({ ...msgF, evidenceStatus: evidenceStatusFor(byId.get(a.itemId), msgF) })
    }
  }
  return out
}

/**
 * Validated set: starts as a copy of the rules-based output; a reviewer's decision always takes precedence.
 * Safety rules for message findings:
 *  - rejected  → never counts as present
 *  - rules-based "present" whose quote fails verification → never counts, unless a human explicitly corrected it
 */
export function buildValidated(findings: Finding[], reviews: Reviews): ValidatedFinding[] {
  return findings.map(f => {
    const r = reviews[f.id]
    let present = r?.present ?? f.aiPresent
    const humanAsserted = f.kind === 'message' && r?.status === 'corrected' && r.present === true && !f.aiPresent
    let unverified = false
    if (f.kind === 'message') {
      if (r?.status === 'rejected') present = false
      if (present && f.aiPresent && f.evidenceStatus === 'invalid' && r?.status !== 'corrected') { present = false; unverified = true }
    }
    if (!r) return { ...f, reviewed: false, tone: f.aiTone, present, unverified }
    return { ...f, reviewed: true, status: r.status, tone: r.tone ?? f.aiTone, present, humanAsserted, unverified }
  })
}

export function validatedPresence(vf: ValidatedFinding[]): (itemId: string, m: MessageId) => boolean | undefined {
  const map = new Map(vf.filter(f => f.kind === 'message').map(f => [`${f.itemId}:${f.messageId}`, !!f.present]))
  return (itemId, m) => map.get(`${itemId}:${m}`)
}
