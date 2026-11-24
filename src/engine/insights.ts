import type { CoverageItem, PenetrationResult, ValidatedFinding } from '../data/types'

const lowest = (p: PenetrationResult[]) => [...p].sort((a, b) => a.pct - b.pct || a.messageId.localeCompare(b.messageId))[0]
const highest = (p: PenetrationResult[]) => [...p].sort((a, b) => b.pct - a.pct || a.messageId.localeCompare(b.messageId))[0]

const join = (a: string[], w: string) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ` ${w} ` + a[a.length - 1]

export function outletTypesIn(items: CoverageItem[]): string[] {
  return [...new Set(items.map(i => i.outletType))]
}

/** One-sentence gap/pattern observation, computed from real data. */
export function findGapsAndPatterns(penetration: PenetrationResult[], items: CoverageItem[]): string {
  const low = lowest(penetration), high = highest(penetration)
  const types = Object.entries(low.byOutletType).sort((a, b) => b[1] - a[1])
  let where: string
  if (low.count === 0) where = 'and did not reach any outlet type'
  else if (types.length === 1) where = `concentrated entirely in ${types[0][0].toLowerCase()}`
  else where = `strongest in ${types[0][0].toLowerCase()} (${types[0][1]} of ${low.count} mentions)`
  const absent = outletTypesIn(items).filter(t => !(t in low.byOutletType))
  const gap = absent.length ? `, with no presence in ${join(absent.map(t => t.toLowerCase()), 'or')}` : ''
  return `Message ${low.messageId} is the weakest, appearing in ${low.count} of ${low.total} items (${low.pct}%), ${where}${gap}; Message ${high.messageId} leads at ${high.pct}%.`
}

/** Step-10 recommendation text from the lowest-penetration result. */
export function recommendAction(penetration: PenetrationResult[], items: CoverageItem[] = []): string {
  const low = lowest(penetration)
  const present = Object.keys(low.byOutletType)
  const absent = outletTypesIn(items).filter(t => !present.includes(t))
  const target = absent.length ? join(absent.map(t => t.toLowerCase()), 'and') : 'the outlets where it is currently thin'
  const where = present.length ? ` It currently appears only in ${present.map(t => t.toLowerCase()).join(' and ')}.` : ''
  return `Message ${low.messageId} ("${low.label}") has the lowest penetration at ${low.pct}%.${where} Consider a targeted push into ${target}, leading with the supporting proof point, then re-measure on the next coverage batch.`
}

/** Deterministic "notable coverage findings" — each line is computed from the records, never free text. */
export function notableFindings(items: CoverageItem[], validated: ValidatedFinding[], aiPen: PenetrationResult[], valPen: PenetrationResult[]): string[] {
  const out: string[] = []
  const tones = validated.filter(v => v.kind === 'tone')
  const neg = tones.filter(t => t.tone === 'negative'), pos = tones.filter(t => t.tone === 'positive')
  out.push(`${pos.length} of ${items.length} items are positive and ${neg.length} negative (reviewer-validated tone).`)
  const corrected = validated.filter(v => v.reviewed && v.status === 'corrected').length
  const rejected = validated.filter(v => v.reviewed && v.status === 'rejected').length
  const changes = valPen.map(v => ({ v, a: aiPen.find(x => x.messageId === v.messageId)! })).filter(({ v, a }) => v.count !== a.count)
  if (corrected + rejected > 0) {
    out.push(`Reviewers corrected ${corrected} and rejected ${rejected} automatic findings.` + (changes.length ? ' Effect on pickup: ' + changes.map(({ v, a }) => `Message ${v.messageId} ${a.count}→${v.count} items`).join('; ') + '.' : ' No message count changed.'))
  } else out.push('No automatic findings were changed by reviewers.')
  const negItems = neg.map(n => items.find(i => i.id === n.itemId)!).filter(Boolean)
  if (negItems.length) out.push(`Critical coverage: ${negItems.map(i => `${i.outlet} [${i.id}]`).join(', ')}.`)
  return out
}

/** Deterministic limitations list for the briefing. */
export function limitations(eligibleCount: number, excludedCount: number): string[] {
  return [
    `Small, synthetic pilot sample (${eligibleCount} eligible articles${excludedCount ? `; ${excludedCount} excluded as duplicate or incomplete` : ''}); percentages are illustrative.`,
    'Classification uses keyword, phrase and synonym rules. It can miss paraphrases and can mis-read contradicted claims, which is why every finding is human-reviewed.',
    'Message pickup measures presence in coverage, not audience reach, sentiment depth or business outcome.'
  ]
}
