import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { client, keyMessages } from '../data/client'
import { coverage } from '../data/coverage'
import type { Review, Reviews, Finding, ItemAnalysis, ValidatedFinding, PenetrationResult, AuditEntry, AuditInput } from '../data/types'
import { staff, type StaffMember } from '../data/staff'
import { analyzeAll, buildFindings, buildValidated, computePenetration, validatedPresence, findGapsAndPatterns, recommendAction, eligibleItems, notableFindings, limitations, auditForReview, auditForUndo } from '../engine'
import type { Exclusion } from '../engine'

export const STEPS = [
  { n: 1, key: 'brief', label: 'Client brief' },
  { n: 2, key: 'coverage', label: 'Coverage' },
  { n: 3, key: 'analysis', label: 'Analysis' },
  { n: 4, key: 'penetration', label: 'Penetration' },
  { n: 5, key: 'gaps', label: 'Gaps' },
  { n: 6, key: 'evidence', label: 'Evidence' },
  { n: 7, key: 'review', label: 'Human review' },
  { n: 8, key: 'briefing', label: 'Briefing' },
  { n: 9, key: 'analytics', label: 'Client analytics' },
  { n: 10, key: 'advisory', label: 'Advisory Panel' },
  { n: 11, key: 'recommendation', label: 'Recommendation' },
  { n: 12, key: 'ask', label: 'Ask the Campaign' }
] as const
/** Steps >= this need the human review to be complete first. */
export const FIRST_LOCKED_STEP = 8
export const HIGH_CONFIDENCE = 0.8

export interface EvidenceTarget { itemId: string; findingId?: string }
interface State {
  step: number
  reviews: Reviews
  gapText: string | null        // human-edited gap observation (null = use computed)
  gapApproved: boolean
  recText: string | null        // human-edited recommendation (null = use computed)
  recApproved: boolean
  briefingApproved: boolean     // reviewer explicitly approved the briefing (reset whenever any review changes)
  reviewerId: string            // synthetic reviewer the actions are attributed to (demo picker, not authentication)
  audit: AuditEntry[]           // append-only log of who changed what and when
  evidence: EvidenceTarget | null   // transient, not persisted
  auditOpen: boolean                // transient, not persisted
}
const initial: State = { step: 1, reviews: {}, gapText: null, gapApproved: false, recText: null, recApproved: false, briefingApproved: false, reviewerId: staff[0].id, audit: [], evidence: null, auditOpen: false }
type Draft = Omit<AuditEntry, 'seq'>
const append = (s: State, log?: Draft[]): State => log && log.length ? { ...s, audit: [...s.audit, ...log.map((e, i) => ({ ...e, seq: s.audit.length + i + 1 }))] } : s

type Action =
  | { type: 'step'; step: number }
  | { type: 'review'; id: string; review: Review; log: Draft[] }
  | { type: 'reviewMany'; entries: [string, Review][]; log: Draft[] }
  | { type: 'unreview'; id: string; log: Draft[] }
  | { type: 'gap'; text: string | null; approved?: boolean; log: Draft[] }
  | { type: 'rec'; text: string | null; approved?: boolean; log: Draft[] }
  | { type: 'approveBriefing'; value: boolean; log: Draft[] }
  | { type: 'reviewer'; id: string }
  | { type: 'auditPanel'; open: boolean }
  | { type: 'log'; log: Draft[] }
  | { type: 'evidence'; target: EvidenceTarget | null }
  | { type: 'reset' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'step': return { ...s, step: a.step }
    case 'review': return append({ ...s, reviews: { ...s.reviews, [a.id]: a.review }, gapApproved: false, recApproved: false, briefingApproved: false }, a.log)
    case 'reviewMany': return append({ ...s, reviews: { ...s.reviews, ...Object.fromEntries(a.entries) }, gapApproved: false, recApproved: false, briefingApproved: false }, a.log)
    case 'unreview': { const r = { ...s.reviews }; delete r[a.id]; return append({ ...s, reviews: r, gapApproved: false, recApproved: false, briefingApproved: false }, a.log) }
    case 'gap': return append({ ...s, gapText: a.text, gapApproved: a.approved ?? s.gapApproved }, a.log)
    case 'rec': return append({ ...s, recText: a.text, recApproved: a.approved ?? s.recApproved }, a.log)
    case 'approveBriefing': return append({ ...s, briefingApproved: a.value }, a.log)
    case 'reviewer': return { ...s, reviewerId: a.id }
    case 'auditPanel': return { ...s, auditOpen: a.open }
    case 'log': return append(s, a.log)
    case 'evidence': return { ...s, evidence: a.target }
    case 'reset': return { ...initial }
  }
}

const KEY = 'cic-poc-state-v3'
function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial, ...JSON.parse(raw), evidence: null, auditOpen: false }
  } catch { /* storage unavailable — start pristine */ }
  return initial
}

export interface Derived {
  client: typeof client
  keyMessages: typeof keyMessages
  items: typeof coverage
  analyses: ItemAnalysis[]
  findings: Finding[]
  /** AI-only penetration (step 4) */
  aiPenetration: PenetrationResult[]
  /** Validated set: AI copy with human decisions applied */
  validated: ValidatedFinding[]
  validatedPenetration: PenetrationResult[]
  reviewedCount: number
  totalFindings: number
  reviewComplete: boolean
  /** True while any finding is still pending — figures are provisional */
  provisional: boolean
  pendingCount: number
  excluded: Exclusion[]
  period: string
  notable: string[]
  limits: string[]
  pctReviewed: number
  aiGap: string
  validatedGap: string
  validatedRecommendation: string
  /** Validated tone per item (human value if reviewed) */
  validatedTone: Record<string, 'positive' | 'neutral' | 'negative' | 'unrated'>
}
interface Ctx extends Derived {
  state: State
  go: (step: number) => void
  isLocked: (step: number) => boolean
  review: (id: string, r: Review) => void
  reviewMany: (entries: [string, Review][]) => void
  unreview: (id: string) => void
  setGap: (text: string | null, approved?: boolean) => void
  setRec: (text: string | null, approved?: boolean) => void
  approveBriefing: (v: boolean) => void
  staff: StaffMember[]
  reviewer: StaffMember
  setReviewer: (id: string) => void
  audit: AuditEntry[]
  auditFor: (findingId: string) => AuditEntry[]
  setAuditOpen: (open: boolean) => void
  logEvent: (e: AuditInput) => void
  openEvidence: (t: EvidenceTarget) => void
  closeEvidence: () => void
  reset: () => void
}
const C = createContext<Ctx | null>(null)

// Engine output is pure + deterministic, so compute once at module load.
// Data preparation: only eligible records (no duplicates / missing text) are analysed.
const { eligible: items, excluded } = eligibleItems(coverage)
const analyses = analyzeAll(items, keyMessages)
const findings = buildFindings(analyses, keyMessages, items)
const aiPenetration = computePenetration(items, keyMessages)
const fmt = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dates = items.map(i => i.date).sort()
const period = `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try { const { evidence: _e, auditOpen: _a, ...rest } = state; void _e; void _a; localStorage.setItem(KEY, JSON.stringify(rest)) } catch { /* ignore */ }
  }, [state])

  const derived = useMemo<Derived>(() => {
    const validated = buildValidated(findings, state.reviews)
    const vPen = computePenetration(items, keyMessages, validatedPresence(validated))
    const reviewedCount = validated.filter(v => v.reviewed).length
    const validatedTone: Derived['validatedTone'] = {}
    for (const v of validated) if (v.kind === 'tone') validatedTone[v.itemId] = (v.tone as Derived['validatedTone'][string]) ?? 'neutral'
    return {
      client, keyMessages, items, analyses, findings, aiPenetration, validated,
      validatedPenetration: vPen, reviewedCount, totalFindings: findings.length,
      reviewComplete: reviewedCount === findings.length,
      provisional: reviewedCount !== findings.length,
      pendingCount: findings.length - reviewedCount,
      excluded, period,
      notable: notableFindings(items, validated, aiPenetration, vPen),
      limits: limitations(items.length, excluded.length),
      pctReviewed: Math.round((reviewedCount / findings.length) * 100),
      aiGap: findGapsAndPatterns(aiPenetration, items),
      validatedGap: findGapsAndPatterns(vPen, items),
      validatedRecommendation: recommendAction(vPen, items),
      validatedTone
    }
  }, [state.reviews])

  const isLocked = (step: number) => step >= FIRST_LOCKED_STEP && !derived.reviewComplete
  const reviewer = staff.find(m => m.id === state.reviewerId) ?? staff[0]
  const snip = (t: string, n = 160) => (t.length > n ? t.slice(0, n - 1) + '…' : t)
  const stamp = (inputs: AuditInput[]): Draft[] => { const at = new Date().toISOString(); return inputs.map(i => ({ ...i, at, reviewerId: reviewer.id, reviewerName: reviewer.name, reviewerRole: reviewer.role })) }
  /** If an approval was in place, a changed review withdraws it — log that too so the trail explains the state. */
  const withdrawals = (): AuditInput[] => {
    const out: AuditInput[] = []
    if (state.briefingApproved) out.push({ action: 'approval-withdrawn', subject: 'Briefing', note: 'A review changed after the briefing was approved' })
    if (state.gapApproved) out.push({ action: 'approval-withdrawn', subject: 'Observation', note: 'A review changed after the observation was approved' })
    if (state.recApproved) out.push({ action: 'approval-withdrawn', subject: 'Recommendation', note: 'A review changed after the recommendation was accepted' })
    return out
  }
  const value: Ctx = {
    ...derived, state,
    go: step => { if (!isLocked(step)) { dispatch({ type: 'step', step }); window.scrollTo({ top: 0 }) } },
    isLocked,
    review: (id, review) => {
      const f = findings.find(x => x.id === id); if (!f) return
      dispatch({ type: 'review', id, review, log: stamp([auditForReview(f, review, state.reviews[id]), ...withdrawals()]) })
    },
    reviewMany: entries => {
      if (!entries.length) return
      dispatch({ type: 'reviewMany', entries, log: stamp([{ action: 'bulk-accepted', subject: `${entries.length} findings`, count: entries.length, findingIds: entries.map(e => e[0]), note: 'Bulk approval of unflagged, high-score findings' }, ...withdrawals()]) })
    },
    unreview: id => {
      const f = findings.find(x => x.id === id), prev = state.reviews[id]; if (!f || !prev) return
      dispatch({ type: 'unreview', id, log: stamp([auditForUndo(f, prev), ...withdrawals()]) })
    },
    setGap: (text, approved) => {
      const log: AuditInput[] = []
      if (approved && text !== null && text !== derived.validatedGap) log.push({ action: 'observation-edited', subject: 'Observation', from: snip(derived.validatedGap), to: snip(text) })
      if (approved) log.push({ action: 'observation-approved', subject: 'Observation' })
      dispatch({ type: 'gap', text, approved, log: stamp(log) })
    },
    setRec: (text, approved) => {
      const log: AuditInput[] = []
      if (approved && text !== null && text !== derived.validatedRecommendation) log.push({ action: 'recommendation-edited', subject: 'Recommendation', from: snip(derived.validatedRecommendation), to: snip(text) })
      if (approved) log.push({ action: 'recommendation-accepted', subject: 'Recommendation' })
      dispatch({ type: 'rec', text, approved, log: stamp(log) })
    },
    approveBriefing: v => dispatch({ type: 'approveBriefing', value: v, log: stamp([{ action: v ? 'briefing-approved' : 'briefing-withdrawn', subject: 'Briefing' }]) }),
    staff, reviewer, setReviewer: id => dispatch({ type: 'reviewer', id }),
    setAuditOpen: open => dispatch({ type: 'auditPanel', open }),
    logEvent: e => dispatch({ type: 'log', log: stamp([e]) }),
    audit: state.audit, auditFor: fid => state.audit.filter(e => e.findingId === fid || e.findingIds?.includes(fid)),
    openEvidence: target => dispatch({ type: 'evidence', target }),
    closeEvidence: () => dispatch({ type: 'evidence', target: null }),
    reset: () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } dispatch({ type: 'reset' }); window.scrollTo({ top: 0 }) }
  }
  return <C.Provider value={value}>{children}</C.Provider>
}
export function useApp(): Ctx {
  const c = useContext(C)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}
