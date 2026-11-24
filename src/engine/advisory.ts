// Simulated advisory panel. Four rule-based perspectives read the SAME reviewed campaign state and apply different rules.
// This is deterministic template logic, not four independent language-model agents. Everything quoted is computed from the data;
// when the evidence is insufficient the perspectives say so instead of inventing insight.
import type { CoverageItem, KeyMessage, PenetrationResult, ValidatedFinding } from '../data/types'
import type { AskEvidence } from './ask'

export interface AdvisoryData {
  items: CoverageItem[]
  keyMessages: KeyMessage[]
  client: { name: string; objective: string; audiences: string[] }
  validated: ValidatedFinding[]
  validatedPenetration: PenetrationResult[]
  aiPenetration: PenetrationResult[]
  reviewComplete: boolean
  recommendation: { text: string; approved: boolean }
}
export type PointStatus = 'supported' | 'assumption' | 'not-established'
export interface AdvisoryPoint { text: string; status: PointStatus; refs: AskEvidence[] }
export type PersonaId = 'strategist' | 'analyst' | 'advocate' | 'evidence'
export type StanceKind = 'revisit' | 'hold' | 'challenge' | 'question' | 'support-with-limits' | 'insufficient'
export interface Persona { id: PersonaId; name: string; remit: string; stance: { kind: StanceKind; label: string }; points: AdvisoryPoint[]; limits: string }
export interface Disagreement { topic: string; sides: { persona: string; position: string }[] }
export interface Synthesis { agree: string[]; disagree: Disagreement[]; missing: string[]; next: string[]; refs: AskEvidence[]; approval: string }
export interface AdvisoryResult {
  subject?: { messageId: string; label: string; pct: number; count: number; total: number }
  insufficient: boolean
  personas: Persona[]
  synthesis: Synthesis
  method: string[]
}

const join = (a: string[], w = 'and') => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ` ${w} ` + a[a.length - 1]
const lc = (s: string) => s.toLowerCase()
const ev = (ids: string[], m: string): AskEvidence[] => ids.map(id => ({ label: id, itemId: id, findingId: `${id}:msg:${m}` }))
const evF = (v: ValidatedFinding): AskEvidence => ({ label: `${v.itemId} · ${v.messageId}`, itemId: v.itemId, findingId: v.id })
const dedupe = (a: AskEvidence[]) => { const s = new Set<string>(); return a.filter(e => { const k = e.itemId + (e.findingId ?? ''); if (s.has(k)) return false; s.add(k); return true }) }

export const PERSONAS: { id: PersonaId; name: string; remit: string }[] = [
  { id: 'strategist', name: 'PR Strategist', remit: 'Message effectiveness, campaign objectives and communications strategy' },
  { id: 'analyst', name: 'Data Analyst', remit: 'Metrics, denominators, baselines and unsupported conclusions' },
  { id: 'advocate', name: 'Audience Advocate', remit: 'Audience relevance, message clarity and what audience understanding can be established' },
  { id: 'evidence', name: 'Evidence Reviewer', remit: 'Whether claims are supported by approved campaign data and source evidence' }
]

const METHOD = [
  'Four rule-based perspectives run over the same reviewed state. Each applies its own fixed rules to the current numbers, so they can disagree.',
  'This is deterministic template logic with the data filled in. It is not four independent language-model agents, and it does not reason beyond the rules.',
  'Nothing here is a recommendation until a person accepts or edits it.'
]

export function runAdvisory(d: AdvisoryData): AdvisoryResult {
  const total = d.items.length
  if (!d.reviewComplete || total === 0 || d.validatedPenetration.length === 0) {
    const why = !d.reviewComplete ? 'The findings are not fully reviewed, so there are no reviewed results to evaluate.' : 'There are no eligible articles to evaluate.'
    return {
      insufficient: true,
      personas: PERSONAS.map(p => ({ ...p, stance: { kind: 'insufficient' as const, label: 'Cannot evaluate' }, points: [{ text: why, status: 'not-established' as const, refs: [] }], limits: 'No conclusion offered.' })),
      synthesis: { agree: ['All four perspectives agree there is not enough reviewed evidence to comment.'], disagree: [], missing: [why], next: [!d.reviewComplete ? 'Complete the human review (every finding accepted, corrected or rejected).' : 'Load eligible coverage.'], refs: [], approval: 'No recommendation is offered. A person decides what happens next.' },
      method: METHOD
    }
  }

  // ---- shared facts, all computed from the reviewed state ----
  const sorted = [...d.validatedPenetration].sort((a, b) => a.pct - b.pct || a.messageId.localeCompare(b.messageId))
  const low = sorted[0], next = sorted[1], high = sorted[sorted.length - 1]
  const lowAi = d.aiPenetration.find(p => p.messageId === low.messageId)!
  const types = [...new Set(d.items.map(i => i.outletType))]
  const present = Object.keys(low.byOutletType)
  const absent = types.filter(t => !present.includes(t))
  const clearGap = low.count * 2 <= high.count
  const gapToNext = next ? next.count - low.count : 0
  const perArticle = Math.round(100 / total)
  const msgFindings = d.validated.filter(v => v.kind === 'message')
  const rejectedLow = msgFindings.filter(v => v.reviewed && v.status === 'rejected' && v.messageId === low.messageId && v.aiPresent)
  const rejectedAll = msgFindings.filter(v => v.reviewed && v.status === 'rejected')
  const correctedAll = d.validated.filter(v => v.reviewed && v.status === 'corrected')
  const assertedAll = msgFindings.filter(v => v.humanAsserted)
  const reviewedN = d.validated.filter(v => v.reviewed).length
  const paraphrased = msgFindings.filter(v => v.humanAsserted && v.messageId === low.messageId)
  const consumerAbsent = absent.some(t => /consumer/i.test(t))
  const lowRefs = ev(low.itemIds, low.messageId)
  const subject = { messageId: low.messageId, label: low.label, pct: low.pct, count: low.count, total }
  const absentTxt = absent.length ? join(absent.map(lc), 'or') : ''

  // ---- PR Strategist ----
  const strat: AdvisoryPoint[] = [
    { text: `Message ${low.messageId} (“${low.label}”) is the least represented at ${low.pct}% (${low.count} of ${total} articles). Message ${high.messageId} leads at ${high.pct}%.`, status: 'supported', refs: lowRefs }
  ]
  if (clearGap) {
    strat.push({ text: absent.length ? `The gap is large enough to act on. I would test a targeted push for Message ${low.messageId} in ${absentTxt}, leading with its proof point.` : `The gap is large enough to act on. I would broaden placement for Message ${low.messageId} across outlets.`, status: 'assumption', refs: [] })
  } else {
    strat.push({ text: `The spread between the leading and weakest message is narrow (${high.count} vs ${low.count} articles). I would not change the plan on this evidence.`, status: 'supported', refs: [] })
  }
  strat.push({ text: `The brief’s objective is to get all three approved messages into relevant coverage. Message ${low.messageId} is the furthest from that.`, status: 'supported', refs: [] })
  if (rejectedLow.length) strat.push({ text: `Caution: the proof point behind Message ${low.messageId} was disputed in ${join(rejectedLow.map(r => r.itemId))}. Check the claim and its evidence before amplifying it.`, status: 'supported', refs: rejectedLow.map(evF) })

  // ---- Data Analyst ----
  const inType = present.length ? present.map(t => ({ t, n: low.byOutletType[t], tot: d.items.filter(i => i.outletType === t).length })).sort((a, b) => b.n - a.n)[0] : undefined
  const analyst: AdvisoryPoint[] = [
    { text: `There is no prior-period baseline in this dataset, so ${low.pct}% can be called “lowest of ${d.validatedPenetration.length}”, not “underperforming”.`, status: 'not-established', refs: [] },
    { text: `The brief sets no target penetration, so “low” has no benchmark.`, status: 'not-established', refs: [] },
    { text: `The denominator is ${total} eligible articles: one article moves a message by about ${perArticle} points. ${low.messageId} sits ${gapToNext} article${gapToNext === 1 ? '' : 's'} below the next message.`, status: 'supported', refs: [] },
    { text: gapToNext > 2 ? `The ranking survives a one-article misclassification either way.` : `The ranking is fragile: a single reclassified article could change the order.`, status: 'supported', refs: [] }
  ]
  if (inType) analyst.push({ text: `Within ${lc(inType.t)}, Message ${low.messageId} appears in ${inType.n} of ${inType.tot} articles (${Math.round((inType.n / inType.tot) * 100)}%). The overall ${low.pct}% mixes outlet types of different size and audience.`, status: 'supported', refs: lowRefs })
  if (lowAi.count !== low.count) analyst.push({ text: `Review changed this figure from ${lowAi.pct}% (rules-based) to ${low.pct}% (reviewed). Conclusions drawn from the unreviewed pass would have been off by ${Math.abs(lowAi.pct - low.pct)} points.`, status: 'supported', refs: rejectedLow.map(evF) })

  // ---- Audience Advocate ----
  const advocate: AdvisoryPoint[] = [
    { text: `The brief names these audiences: ${join(d.client.audiences.map(lc))}. Message ${low.messageId} reached ${present.length ? join(present.map(lc)) : 'no outlet type'}${absent.length ? ` and has no pickup in ${absentTxt}` : ''}.`, status: 'supported', refs: lowRefs },
    { text: `Assumption: trade press tends to reach professional readers such as specifiers and property managers, while consumer press, broadcast and blogs reach the public. The data does not record readership.`, status: 'assumption', refs: [] },
    { text: `Whether any audience saw or understood Message ${low.messageId} cannot be established. Coverage records what was published, not who read it or what they took from it.`, status: 'not-established', refs: [] }
  ]
  advocate.push(paraphrased.length
    ? { text: `Reviewers found Message ${low.messageId} expressed in other words in ${join(paraphrased.map(p => p.itemId))}. Audiences may meet the idea without the approved wording.`, status: 'supported', refs: paraphrased.map(evF) }
    : { text: `No reviewer found paraphrased pickup of Message ${low.messageId}. Message clarity cannot be judged from this sample.`, status: 'not-established', refs: [] })

  // ---- Evidence Reviewer ----
  const verified = msgFindings.filter(v => v.present && v.evidenceStatus === 'verified').length
  const evid: AdvisoryPoint[] = [
    { text: `Supported: ${verified} reviewed message findings carry verified exact quotes. The counts behind ${low.pct}% (${low.count} of ${total}) trace to these articles.`, status: 'supported', refs: lowRefs },
    { text: `Review status: ${reviewedN} of ${d.validated.length} findings human-reviewed; ${correctedAll.length} corrected, ${rejectedAll.length} rejected.`, status: 'supported', refs: [...correctedAll, ...rejectedAll].map(evF).slice(0, 4) }
  ]
  if (rejectedLow.length) evid.push({ text: `Not supported: the claim behind Message ${low.messageId} appears in ${join(rejectedLow.map(r => r.itemId))} only to be disputed, and was rejected in review.`, status: 'not-established', refs: rejectedLow.map(evF) })
  if (assertedAll.length) evid.push({ text: `${assertedAll.length} finding${assertedAll.length === 1 ? ' is' : 's are'} reviewer-asserted with no engine quote (${join(assertedAll.map(a => a.itemId))}).`, status: 'assumption', refs: assertedAll.map(evF) })
  evid.push({ text: `Not supported by any evidence here: why Message ${low.messageId} is low, whether it is behind a baseline, and whether audiences understood it.`, status: 'not-established', refs: [] })

  const personas: Persona[] = [
    { ...PERSONAS[0], stance: clearGap ? { kind: 'revisit', label: `Revisit Message ${low.messageId}` } : { kind: 'hold', label: 'Hold the plan' }, points: strat, limits: 'Strategic judgement from the brief and reviewed counts. It is not a measured effect.' },
    { ...PERSONAS[1], stance: { kind: 'challenge', label: 'Conclusion not established' }, points: analyst, limits: 'Small synthetic sample. No reach weighting and no history.' },
    { ...PERSONAS[2], stance: { kind: 'question', label: 'Audience reach unproven' }, points: advocate, limits: 'The outlet-to-audience mapping is an assumption.' },
    { ...PERSONAS[3], stance: { kind: 'support-with-limits', label: 'Counts supported, causes not' }, points: evid, limits: 'Checks traceability to sources, not the quality of the strategy.' }
  ]

  // ---- synthesis ----
  const disagree: Disagreement[] = []
  if (clearGap) disagree.push({ topic: `Is Message ${low.messageId} “underperforming”?`, sides: [
    { persona: 'PR Strategist', position: `Yes. It trails by ${high.count - low.count} articles, so revisit it.` },
    { persona: 'Data Analyst', position: 'Not established. There is no baseline or target, only a ranking within one sample.' }] })
  if (clearGap && consumerAbsent) disagree.push({ topic: 'Where to push it', sides: [
    { persona: 'PR Strategist', position: `Test consumer press${absent.length > 1 ? ' and other uncovered outlets' : ''}.` },
    { persona: 'Audience Advocate', position: 'Trade pickup may already reach professional audiences. Decide the target audience first, because reach is not measured.' }] })
  if (clearGap && rejectedLow.length) disagree.push({ topic: 'Amplify the proof point now?', sides: [
    { persona: 'PR Strategist', position: 'Push the message harder.' },
    { persona: 'Evidence Reviewer', position: `Verify first. ${join(rejectedLow.map(r => r.itemId))} disputes the claim and it was rejected in review.` }] })

  const agree = [
    `Message ${low.messageId} has the fewest pickups in the reviewed data (${low.count} of ${total}, ${low.pct}%).`,
    `The results are fully reviewed (${reviewedN} of ${d.validated.length} findings).`,
    `The data cannot show why Message ${low.messageId} is low.`,
    'Any recommendation needs a person’s approval before it reaches the client.'
  ]
  const missing = ['A prior-period baseline for message penetration.', 'A target penetration in the brief.', 'Readership or audience data for each outlet type.', `A larger sample (${total} articles here), ideally weighted by outlet reach.`]
  if (rejectedLow.length) missing.push(`Independent proof for the claim disputed in ${join(rejectedLow.map(r => r.itemId))}.`)
  const nextSteps: string[] = ['Agree a baseline and a target before calling any message underperforming.']
  if (rejectedLow.length) nextSteps.push(`Verify the evidence behind Message ${low.messageId}’s claim (${join(rejectedLow.map(r => r.itemId))}) before using it with the client.`)
  nextSteps.push('Obtain readership data to see whether the intended audiences are reached.')
  if (clearGap) nextSteps.push(`Test a targeted push for Message ${low.messageId}${absentTxt ? ` in ${absentTxt}` : ''}, then re-measure on the next coverage batch.`)
  nextSteps.push('A person accepts, edits or rejects the recommendation in step 11.')

  return {
    subject, insufficient: false, personas,
    synthesis: { agree, disagree, missing, next: nextSteps, refs: dedupe([...lowRefs, ...rejectedLow.map(evF)]).slice(0, 8), approval: 'This is a simulated review. It becomes a recommendation only when a person accepts or edits it in step 11.' },
    method: METHOD
  }
}
