// "Ask the Campaign" — a GUIDED demo, not a language model. Each answer is a pure function of the reviewed (validated) data.
import type { AuditEntry, CoverageItem, KeyMessage, PenetrationResult, ValidatedFinding } from '../data/types'
import { ACTION_LABEL, formatWhen } from './audit'

export interface AskData {
  items: CoverageItem[]
  keyMessages: KeyMessage[]
  validated: ValidatedFinding[]
  validatedPenetration: PenetrationResult[]
  aiPenetration: PenetrationResult[]
  validatedTone: Record<string, 'positive' | 'neutral' | 'negative' | 'unrated'>
  audit: AuditEntry[]
  /** The step-10 recommendation as it currently stands (edited text if a person edited it) */
  recommendation: { text: string; approved: boolean }
}
export interface AskEvidence { label: string; itemId: string; findingId?: string }
export interface AskAnswer {
  /** 'unsupported' = the question is outside the reviewed data; no figures are invented */
  kind?: 'answer' | 'unsupported'
  /** 'pending' = built from reviewed data but not yet approved by a person (e.g. an unaccepted recommendation) */
  status?: 'reviewed' | 'pending'
  /** For typed questions: which supported question the text was matched to */
  understoodAs?: string
  /** Ids of suggested questions to offer next */
  suggestions?: string[]
  headline: string
  detail?: string
  stats?: { label: string; value: string; pct?: number }[]
  bullets?: string[]
  evidence: AskEvidence[]
  /** Plain-language description of exactly how the answer was calculated */
  method: string[]
}
export interface AskQuestion { id: string; text: string; answer: (d: AskData) => AskAnswer }

const join = (a: string[], w = 'and') => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ` ${w} ` + a[a.length - 1]
const lowest = (p: PenetrationResult[]) => [...p].sort((a, b) => a.pct - b.pct || a.messageId.localeCompare(b.messageId))[0]
const FORMULA = 'Message penetration = eligible analysed articles carrying the message ÷ total eligible analysed articles × 100.'
const REVIEWED = 'Counts come from the human-validated set: a reviewer\'s decision overrides the rules-based result.'
const msgEvidence = (ids: string[], m: string): AskEvidence[] => ids.map(id => ({ label: id, itemId: id, findingId: `${id}:msg:${m}` }))
const outletTypes = (items: CoverageItem[]) => [...new Set(items.map(i => i.outletType))]

export const ASK_QUESTIONS: AskQuestion[] = [
  {
    id: 'lowest', text: 'Which key message had the lowest penetration?',
    answer: d => {
      const low = lowest(d.validatedPenetration)
      const types = Object.keys(low.byOutletType)
      return {
        headline: `Message ${low.messageId} had the lowest penetration at ${low.pct}%.`,
        detail: `“${low.label}” appears in ${low.count} of ${low.total} eligible articles${types.length ? `, only in ${join(types.map(t => t.toLowerCase()))}` : ''}.`,
        stats: d.validatedPenetration.map(p => ({ label: `Message ${p.messageId}`, value: `${p.pct}%`, pct: p.pct })),
        evidence: msgEvidence(low.itemIds, low.messageId),
        method: [FORMULA, REVIEWED]
      }
    }
  },
  {
    id: 'missing', text: 'Where is the weakest message missing?',
    answer: d => {
      const low = lowest(d.validatedPenetration)
      const rows = outletTypes(d.items).map(t => {
        const total = d.items.filter(i => i.outletType === t).length
        const n = low.byOutletType[t] ?? 0
        return { t, total, n }
      })
      const none = rows.filter(r => r.n === 0).map(r => r.t.toLowerCase())
      return {
        headline: none.length ? `Message ${low.messageId} has no pickup in ${join(none, 'or')}.` : `Message ${low.messageId} appears in every outlet type.`,
        detail: 'Share of each outlet type\'s articles that carry the message.',
        stats: rows.map(r => ({ label: `${r.t} (${r.total})`, value: `${r.n} of ${r.total}`, pct: r.total ? Math.round((r.n / r.total) * 100) : 0 })),
        evidence: msgEvidence(low.itemIds, low.messageId),
        method: ['Reviewed findings are grouped by the outlet type of their article.', REVIEWED]
      }
    }
  },
  {
    id: 'review', text: 'What did human review change?',
    answer: d => {
      const changed = d.validated.filter(v => v.reviewed && (v.status === 'corrected' || v.status === 'rejected'))
      const corrected = changed.filter(v => v.status === 'corrected').length
      const rejected = changed.length - corrected
      const diffs = d.validatedPenetration.map(v => ({ v, a: d.aiPenetration.find(x => x.messageId === v.messageId)! })).filter(({ v, a }) => v.count !== a.count)
      return {
        headline: changed.length ? `Reviewers changed ${changed.length} of ${d.validated.length} automatic findings.` : 'No automatic findings were changed by reviewers.',
        detail: changed.length ? `${corrected} corrected, ${rejected} rejected.` : 'Every finding was accepted as generated.',
        stats: diffs.map(({ v, a }) => ({ label: `Message ${v.messageId}`, value: `${a.pct}% → ${v.pct}%`, pct: v.pct })),
        evidence: changed.map(v => ({ label: v.kind === 'tone' ? `${v.itemId} · tone` : `${v.itemId} · ${v.messageId}`, itemId: v.itemId, findingId: v.id })),
        method: ['Compares the rules-based result with the validated result for every finding.', 'Penetration is recomputed from the validated set; arrows show the rules-based value → reviewed value.']
      }
    }
  },
  {
    id: 'who', text: 'Who made the review decisions, and when?',
    answer: d => {
      const dec = d.audit.filter(e => ['accepted', 'corrected', 'rejected', 'bulk-accepted'].includes(e.action))
      if (!dec.length) return { headline: 'No review decisions have been recorded yet.', evidence: [], method: ['Read from the audit trail, which logs every accept, correction, rejection and approval.'] }
      const per: Record<string, number> = {}
      for (const e of dec) per[e.reviewerName] = (per[e.reviewerName] ?? 0) + (e.count ?? 1)
      const total = Object.values(per).reduce((a, b) => a + b, 0)
      const changes = d.audit.filter(e => e.action === 'corrected' || e.action === 'rejected')
      return {
        headline: `${total} finding decisions by ${Object.keys(per).length} reviewer${Object.keys(per).length === 1 ? '' : 's'}.`,
        detail: `From ${formatWhen(dec[0].at)} to ${formatWhen(dec[dec.length - 1].at)}.`,
        stats: Object.entries(per).map(([n, c]) => ({ label: n, value: `${c}`, pct: Math.round((c / total) * 100) })),
        bullets: changes.map(e => `${e.reviewerName} ${ACTION_LABEL[e.action].toLowerCase()} ${e.subject}${e.from && e.to ? ` (${e.from} → ${e.to})` : ''} at ${formatWhen(e.at)}.`),
        evidence: changes.filter(e => e.findingId).map(e => ({ label: e.subject, itemId: e.itemId!, findingId: e.findingId })),
        method: ['Read from the audit trail: every accept, correction, rejection and approval is logged with the reviewer, a timestamp and the before and after value.', 'Reviewers in this demo are fictional staff chosen from a picker; this is not authentication.']
      }
    }
  },
  {
    id: 'tone', text: 'How did the coverage read in tone?',
    answer: d => {
      const t = Object.values(d.validatedTone), n = d.items.length
      const c = (k: string) => t.filter(x => x === k).length
      const neg = d.items.filter(i => d.validatedTone[i.id] === 'negative')
      return {
        headline: `${c('positive')} positive, ${c('neutral')} neutral and ${c('negative')} negative across ${n} eligible articles.`,
        detail: neg.length ? `Critical coverage: ${join(neg.map(i => `${i.outlet} [${i.id}]`))}.` : 'No article was classified as negative.',
        stats: (['positive', 'neutral', 'negative'] as const).map(k => ({ label: k[0].toUpperCase() + k.slice(1), value: `${c(k)}`, pct: n ? Math.round((c(k) / n) * 100) : 0 })),
        evidence: neg.map(i => ({ label: i.id, itemId: i.id, findingId: `${i.id}:tone` })),
        method: ['Tone comes from a small sentiment lexicon plus reviewer decisions; it is a rules-based label, not a model score.', REVIEWED]
      }
    }
  },
  {
    id: 'next', text: 'What should the account team investigate next?',
    answer: d => {
      const low = lowest(d.validatedPenetration)
      const present = Object.keys(low.byOutletType)
      const absent = outletTypes(d.items).filter(t => !present.includes(t)).map(t => t.toLowerCase())
      const rejected = d.validated.filter(v => v.reviewed && v.status === 'rejected' && v.kind === 'message')
      const neg = d.items.filter(i => d.validatedTone[i.id] === 'negative')
      const bullets = [`Message ${low.messageId} (${low.pct}%): ${absent.length ? `test a targeted push into ${join(absent)}` : 'broaden placement across outlets'}, then re-measure on the next batch.`]
      if (rejected.length) bullets.push(`${rejected.length} claim${rejected.length > 1 ? 's were' : ' was'} rejected in review (${join(rejected.map(r => r.itemId))}): confirm the supporting evidence before using ${rejected.length > 1 ? 'them' : 'it'} with the client.`)
      if (neg.length) bullets.push(`Critical coverage in ${join(neg.map(i => i.outlet))}: check whether the themes repeat.`)
      return {
        headline: `${bullets.length === 1 ? 'One thing' : bullets.length + ' things'} to look at next.`,
        bullets,
        evidence: [...msgEvidence(low.itemIds, low.messageId), ...rejected.map(r => ({ label: `${r.itemId} · ${r.messageId}`, itemId: r.itemId, findingId: r.id })), ...neg.map(i => ({ label: `${i.id} · tone`, itemId: i.id, findingId: `${i.id}:tone` }))],
        method: ['Built from the weakest message, outlet types with no pickup, findings rejected in review, and negative-tone articles.', 'These are prompts for a person to investigate. They are not causal conclusions.']
      }
    }
  }
]

// ---------------------------------------------------------------------------------------------------------------
// Typed questions. Deterministic keyword matching — there is no language model. Anything that does not match
// a supported intent gets an explicit limitation instead of an invented answer.
// ---------------------------------------------------------------------------------------------------------------
type IntentId = 'why' | 'recommend' | 'lowest' | 'missing' | 'review' | 'who' | 'tone' | 'next' | 'message'
const INTENT_KEYWORDS: Record<Exclude<IntentId, 'message'>, Record<string, number>> = {
  why: { why: 5, reason: 4, cause: 4, explain: 4, because: 3, 'how come': 5, driving: 3, behind: 2, low: 1, poor: 1, weak: 1 },
  recommend: { recommend: 5, suggest: 4, advise: 4, advice: 4, propose: 3, 'tell the client': 4, 'what should we': 3, 'what do we': 2, client: 2, action: 2, 'do next': 2 },
  lowest: { worst: 5, weakest: 5, lowest: 5, least: 4, underperform: 5, 'performed badly': 5, 'fewest': 4, low: 2, poor: 1, penetration: 1, message: 1 },
  missing: { missing: 5, 'not covered': 5, 'no pickup': 5, absent: 4, gap: 3, gaps: 3, where: 3, outlet: 2, outlets: 2, 'which outlets': 4, 'what press': 3, 'consumer press': 3 },
  review: { change: 4, correct: 4, reject: 4, overrode: 4, override: 3, edited: 3, 'human review': 2, 'what did': 1 },
  who: { who: 5, audit: 5, reviewer: 3, when: 3, 'signed off': 4, 'approved by': 4, accountable: 4 },
  tone: { tone: 5, sentiment: 5, negative: 3, positive: 3, critical: 3, criticism: 4, mood: 3, 'how did the coverage read': 5 },
  next: { investigate: 5, 'look at': 3, 'follow up': 3, dig: 3, 'look into': 4, next: 2, check: 1, 'what should the account team': 4 }
}
const PRIORITY: IntentId[] = ['why', 'recommend', 'who', 'review', 'missing', 'lowest', 'tone', 'next', 'message']

const norm = (t: string) => ' ' + t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '
function score(text: string, kws: Record<string, number>): number {
  let sum = 0
  const words = text.trim().split(' ')
  const used = new Set<number>()
  for (const [k, w] of Object.entries(kws).sort((a, b) => b[0].length - a[0].length)) {
    if (k.includes(' ')) { if (text.includes(' ' + k + ' ') || text.includes(' ' + k)) sum += w; continue }
    const i = words.findIndex((x, ix) => !used.has(ix) && (x === k || (k.length >= 5 && x.startsWith(k))))
    if (i !== -1) { used.add(i); sum += w }
  }
  return sum
}
export interface Interpretation { intent: IntentId | null; letter?: 'A' | 'B' | 'C'; scores: Record<string, number>; /** a second, diagnostic intent when the question has two parts (e.g. 'which is worst, and what should we recommend?') */ also?: IntentId }
export function interpretQuestion(raw: string): Interpretation {
  const t = norm(raw)
  const letterMatch = t.match(/ (?:key )?message ([abc]) /) ?? t.match(/ ([abc]) (?:message|penetration|performance) /)
  const letter = letterMatch ? (letterMatch[1].toUpperCase() as 'A' | 'B' | 'C') : undefined
  const scores: Record<string, number> = {}
  for (const id of Object.keys(INTENT_KEYWORDS) as Exclude<IntentId, 'message'>[]) scores[id] = score(t, INTENT_KEYWORDS[id])
  scores.message = letter ? 3 : 0
  let best: IntentId | null = null, bestScore = 0
  for (const id of PRIORITY) if (scores[id] > bestScore) { best = id; bestScore = scores[id] }
  if (bestScore < 3) return { intent: null, letter, scores }
  // Two-part question: a recommendation request plus one clearly diagnostic part → answer both.
  const DIAGNOSTIC: IntentId[] = ['lowest', 'why', 'missing', 'tone', 'review']
  if (best === 'recommend') {
    const second = DIAGNOSTIC.filter(id => scores[id] >= 4).sort((a, b) => scores[b] - scores[a])[0]
    if (second) return { intent: second, also: 'recommend', letter, scores }
  } else if (best && DIAGNOSTIC.includes(best) && scores.recommend >= 4) return { intent: best, also: 'recommend', letter, scores }
  return { intent: best, letter, scores }
}

function unsupportedReason(raw: string): string {
  const t = norm(raw)
  if (/ (competitor|competitors|rival|rivals|market share|industry|benchmark)\w* /.test(t)) return 'It needs competitor or market data. The sample contains only coverage of this client.'
  if (/ (roi|revenue|sales|profit|budget|spend|cost|costs|saving|savings|save|faster|hours)\w* /.test(t)) return 'It asks for financial or time-saving figures. This prototype does not measure them, and no ROI or time savings are claimed.'
  if (/ (accuracy|accurate|precision|recall|f1|how good)\w* /.test(t)) return 'It asks about model accuracy. The classifier is a set of keyword rules, and no accuracy has been measured or validated.'
  if (/ (journalist|journalists|reporter|reporters|editor|editors|audience|readers|sentiment of readers)\w* /.test(t)) return 'It asks about people outside the dataset. The data records what was published, not why or who read it.'
  if (/ (predict|forecast|projection|future|will|going to|expect)\w* /.test(t) || / next (quarter|month|year) /.test(t)) return 'It asks for a forecast. This prototype only describes the coverage that has been analysed and reviewed; it does not predict.'
  return 'It is outside the reviewed campaign data this demo can read.'
}
const SUGGEST_ALL = ['lowest', 'missing', 'review', 'who', 'tone', 'next']

const present = (d: AskData, id: string) => d.validatedPenetration.find(p => p.messageId === id)!
const aiOf = (d: AskData, id: string) => d.aiPenetration.find(p => p.messageId === id)!

function answerWhy(d: AskData, letter?: string): AskAnswer {
  const low = letter ? present(d, letter) : lowest(d.validatedPenetration)
  const ai = aiOf(d, low.messageId)
  const types = Object.keys(low.byOutletType)
  const absent = outletTypesOf(d).filter(x => !types.includes(x)).map(x => x.toLowerCase())
  const rejected = d.validated.filter(v => v.reviewed && v.status === 'rejected' && v.kind === 'message' && v.messageId === low.messageId)
  const bullets: string[] = []
  bullets.push(`Reach: it appears in ${low.count} of ${low.total} eligible articles${types.length ? `, only in ${join(types.map(x => x.toLowerCase()))}` : ''}${absent.length ? `, with no pickup in ${join(absent, 'or')}` : ''}.`)
  if (ai.count !== low.count) bullets.push(`Review: the rules-based pass counted ${ai.count} article${ai.count === 1 ? '' : 's'} (${ai.pct}%). Reviewers brought it to ${low.count} (${low.pct}%)${rejected.length ? ` after rejecting ${join(rejected.map(r => r.itemId))}, which repeated the claim only to dispute it` : ''}.`)
  bullets.push(`Limit: this is a ${d.items.length}-article synthetic sample. It shows where the message is missing, not why journalists chose not to use it.`)
  return {
    headline: types.length && absent.length ? `Message ${low.messageId} is low mainly because it only reached ${join(types.map(x => x.toLowerCase()))}.` : `Message ${low.messageId} appears in only ${low.count} of ${low.total} eligible articles.`,
    detail: `“${low.label}” stands at ${low.pct}% after review.`,
    bullets,
    stats: d.validatedPenetration.map(p => ({ label: `Message ${p.messageId}`, value: `${p.pct}%`, pct: p.pct })),
    evidence: msgEvidence(low.itemIds, low.messageId),
    method: [FORMULA, REVIEWED, 'The reasons are read from the data (outlet types, counts, reviewer changes). They describe the pattern; they are not proof of cause.']
  }
}

function answerRecommend(d: AskData): AskAnswer {
  const low = lowest(d.validatedPenetration)
  const types = Object.keys(low.byOutletType)
  const absent = outletTypesOf(d).filter(x => !types.includes(x)).map(x => x.toLowerCase())
  const rejected = d.validated.filter(v => v.reviewed && v.status === 'rejected' && v.kind === 'message')
  const bullets = [`Evidence: Message ${low.messageId} sits at ${low.pct}% (${low.count} of ${low.total} eligible articles)${absent.length ? `, with no pickup in ${join(absent, 'or')}` : ''}.`]
  if (rejected.length) bullets.push(`Caution: ${join(rejected.map(r => r.itemId))} was rejected in review. Confirm the supporting evidence before using that claim with the client.`)
  bullets.push(d.recommendation.approved ? 'Status: this recommendation was accepted by a reviewer in step 11.' : 'Status: this recommendation is proposed. A person has not yet accepted it in step 10.')
  return {
    status: d.recommendation.approved ? 'reviewed' : 'pending',
    headline: `Focus the client conversation on Message ${low.messageId}.`,
    detail: d.recommendation.text,
    bullets,
    stats: d.validatedPenetration.map(p => ({ label: `Message ${p.messageId}`, value: `${p.pct}%`, pct: p.pct })),
    evidence: msgEvidence(low.itemIds, low.messageId),
    method: ['The recommendation text is the step-10 recommendation (edited by a person if they changed it).', REVIEWED, 'It is a prompt for the account team to decide on, not a causal conclusion.']
  }
}

function answerMessage(d: AskData, letter: string): AskAnswer {
  const m = present(d, letter), ai = aiOf(d, letter)
  const rows = outletTypesOf(d).map(t => ({ t, n: m.byOutletType[t] ?? 0, total: d.items.filter(i => i.outletType === t).length }))
  return {
    headline: `Message ${m.messageId} appears in ${m.count} of ${m.total} eligible articles (${m.pct}%).`,
    detail: `“${m.label}”${ai.count !== m.count ? ` — the rules-based pass counted ${ai.count} (${ai.pct}%); reviewed value shown.` : '.'}`,
    stats: rows.map(r => ({ label: `${r.t} (${r.total})`, value: `${r.n} of ${r.total}`, pct: r.total ? Math.round((r.n / r.total) * 100) : 0 })),
    evidence: msgEvidence(m.itemIds, m.messageId),
    method: [FORMULA, REVIEWED]
  }
}
const outletTypesOf = (d: AskData) => outletTypes(d.items)

function answerFor(intent: IntentId, d: AskData, letter?: string): AskAnswer & { q: string } {
  switch (intent) {
    case 'why': return { ...answerWhy(d, letter), q: letter ? `Why is Message ${letter} low?` : 'Why is the weakest message low?' }
    case 'recommend': return { ...answerRecommend(d), q: 'What should we recommend to the client?' }
    case 'message': return { ...answerMessage(d, letter!), q: `How did Message ${letter} perform?` }
    default: { const q = ASK_QUESTIONS.find(x => x.id === intent)!; return { ...q.answer(d), q: q.text } }
  }
}
function combine(a: AskAnswer & { q: string }, b: AskAnswer & { q: string }): AskAnswer {
  const seen = new Set<string>(); const evidence = [...a.evidence, ...b.evidence].filter(e => { const k = e.label + e.itemId; if (seen.has(k)) return false; seen.add(k); return true })
  return {
    status: a.status === 'pending' || b.status === 'pending' ? 'pending' : 'reviewed',
    headline: a.headline,
    detail: a.detail,
    bullets: [`Recommendation: ${b.detail ?? b.headline}`, ...(b.bullets ?? []), ...(a.bullets ?? [])].slice(0, 5),
    stats: a.stats ?? b.stats,
    evidence,
    method: [...new Set([...a.method, ...b.method])],
    understoodAs: `${a.q} + ${b.q}`
  }
}

/** Answer a typed question. Returns a supported answer built from the reviewed data, or an explicit limitation. */
export function askText(raw: string, d: AskData): AskAnswer {
  const it = interpretQuestion(raw)
  const base = (a: AskAnswer, understood: string): AskAnswer => ({ kind: 'answer', status: 'reviewed', ...a, understoodAs: understood })
  if (it.intent && it.also === 'recommend') return { kind: 'answer', ...combine(answerFor(it.intent, d, it.letter), answerFor('recommend', d)) }
  switch (it.intent) {
    case 'why': return base(answerWhy(d, it.letter), it.letter ? `Why is Message ${it.letter} low?` : 'Why is the weakest message low?')
    case 'recommend': return base(answerRecommend(d), 'What should we recommend to the client?')
    case 'message': return base(answerMessage(d, it.letter!), `How did Message ${it.letter} perform?`)
    case 'lowest': case 'missing': case 'review': case 'who': case 'tone': case 'next': {
      const q = ASK_QUESTIONS.find(x => x.id === it.intent)!
      return base(q.answer(d), q.text)
    }
    default:
      return {
        kind: 'unsupported', status: 'reviewed',
        headline: 'I can’t answer that from the reviewed campaign data.',
        detail: unsupportedReason(raw),
        bullets: [
          'Which message performed worst or best, and how a specific message (A, B or C) did',
          'Where a message is missing, and why it may be low',
          'What review changed, who reviewed, and when',
          'How the coverage read in tone',
          'What to investigate next and what to recommend'
        ],
        suggestions: SUGGEST_ALL,
        evidence: [],
        method: ['This demo matches questions to a fixed set of topics using keyword rules. It does not use a language model, so it does not guess at questions it cannot match.']
      }
  }
}
