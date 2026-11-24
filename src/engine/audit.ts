// Pure helpers for the audit trail: what a decision changed, how it is described, and how the log is exported.
import type { AuditEntry, AuditInput, Finding, Review, Tone } from '../data/types'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export function valueLabel(f: Finding, v: { tone?: Tone | 'unrated'; present?: boolean }): string {
  return f.kind === 'tone' ? cap(String(v.tone ?? f.aiTone ?? 'neutral')) : v.present ? 'Present' : 'Absent'
}
export const subjectOf = (f: Finding) => f.kind === 'tone' ? `${f.itemId} · Tone` : `${f.itemId} · Message ${f.messageId}`

/** The value a review resolves to — same rules as buildValidated (a rejected message finding is never present). */
export function resolveValue(f: Finding, r: Review): { tone?: Tone | 'unrated'; present?: boolean } {
  if (f.kind === 'tone') return { tone: r.status === 'rejected' ? 'unrated' : (r.tone ?? f.aiTone) }
  return { present: r.status === 'rejected' ? false : (r.present ?? f.aiPresent) }
}

/** Audit input for a single accept / correct / reject. `prev` is an earlier decision on the same finding, if any. */
export function auditForReview(f: Finding, r: Review, prev?: Review): AuditInput {
  const before = prev ? resolveValue(f, prev) : { tone: f.aiTone, present: f.aiPresent }
  return {
    action: r.status === 'accepted' ? 'accepted' : r.status === 'corrected' ? 'corrected' : 'rejected',
    subject: subjectOf(f), itemId: f.itemId, findingId: f.id,
    from: valueLabel(f, before), to: valueLabel(f, resolveValue(f, r))
  }
}
export function auditForUndo(f: Finding, prev: Review): AuditInput {
  return { action: 'undone', subject: subjectOf(f), itemId: f.itemId, findingId: f.id,
    from: valueLabel(f, resolveValue(f, prev)), to: valueLabel(f, { tone: f.aiTone, present: f.aiPresent }), note: 'Decision undone — back to the automatic result' }
}

export const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  accepted: 'Approved finding', corrected: 'Corrected finding', rejected: 'Rejected finding', undone: 'Undid decision', 'bulk-accepted': 'Bulk approved',
  'observation-edited': 'Edited observation', 'observation-approved': 'Approved observation',
  'recommendation-edited': 'Edited recommendation', 'recommendation-accepted': 'Accepted recommendation',
  'briefing-approved': 'Approved briefing', 'briefing-withdrawn': 'Withdrew briefing approval', 'approval-withdrawn': 'Approval withdrawn (automatic)', 'advisory-run': 'Ran advisory review'
}
export const formatWhen = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function summarizeAudit(entries: AuditEntry[]) {
  const byReviewer: Record<string, number> = {}
  for (const e of entries) byReviewer[e.reviewerName] = (byReviewer[e.reviewerName] ?? 0) + (e.count ?? 1)
  return { total: entries.length, reviewers: Object.keys(byReviewer).length, byReviewer, first: entries[0]?.at, last: entries[entries.length - 1]?.at }
}

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function auditToCsv(entries: AuditEntry[]): string {
  const head = ['seq', 'timestamp', 'reviewer', 'role', 'action', 'subject', 'from', 'to', 'count', 'note']
  return [head.join(','), ...entries.map(e => [e.seq, e.at, e.reviewerName, e.reviewerRole, ACTION_LABEL[e.action], e.subject, e.from, e.to, e.count, e.note].map(q).join(','))].join('\n')
}
