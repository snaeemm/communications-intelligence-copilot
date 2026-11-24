// Synthetic data generated for this demonstration. Not based on any real client, campaign, outlet, or journalist.
export type Tone = 'positive' | 'neutral' | 'negative'
export type OutletType = 'Trade press' | 'Consumer press' | 'Broadcast transcript' | 'Blog'
export type MessageId = 'A' | 'B' | 'C'

export interface Client { name: string; sector: string; campaign: string; objective: string; period: string; audiences: string[] }
export interface KeyMessage {
  id: MessageId
  label: string            // short labeled phrase, e.g. "Quieter homes improve focus and sleep"
  description: string      // what the client means by it
  /** Direct phrasing the classifier looks for (weight 1.0) */
  phrases: string[]
  /** Loose topic hints: if >=2 appear but no match is found, the result is flagged as a weak signal for human attention. */
  hints: string[]
  /** Synonym groups: a sentence containing a term from `anchors` AND one from `benefits` counts (weight 0.7) */
  groups: { anchors: string[]; benefits: string[] }[]
}
export interface CoverageItem {
  id: string
  outlet: string
  outletType: OutletType
  date: string             // ISO yyyy-mm-dd
  headline: string
  text: string
  /** Optional: marks a deliberately difficult synthetic article used to illustrate where semantic analysis could help. */
  demo?: { kind: 'paraphrase' | 'contradiction'; messageId: MessageId; interpretation: string; why: string }
}

export interface EvidenceMatch { start: number; end: number; text: string; kind: 'phrase' | 'synonym' | 'lexicon'; weight: number }
export interface ToneResult { tone: Tone; confidence: number; matches: EvidenceMatch[] }
export type SignalFlag = 'contrast-cue' | 'weak-signal'
export interface MessageResult { present: boolean; confidence: number; matches: EvidenceMatch[]; flag?: SignalFlag }
export interface PenetrationResult { messageId: MessageId; label: string; count: number; total: number; pct: number; itemIds: string[]; byOutletType: Record<string, number> }

/** One AI classification = one reviewable "finding". Id format: `${itemId}:tone` or `${itemId}:msg:A` */
export type FindingKind = 'tone' | 'message'
export interface Finding {
  id: string
  itemId: string
  kind: FindingKind
  messageId?: MessageId
  // AI output
  aiTone?: Tone
  aiPresent?: boolean
  confidence: number
  matches: EvidenceMatch[]
  flag?: SignalFlag
  /** Deterministic check that every quoted match exists verbatim in the source article. */
  evidenceStatus: EvidenceStatus
}
export type EvidenceStatus = 'verified' | 'invalid' | 'none'
export interface ItemAnalysis { itemId: string; tone: ToneResult; messages: Record<MessageId, MessageResult> }

export type ReviewStatus = 'accepted' | 'corrected' | 'rejected'
export interface Review { status: ReviewStatus; tone?: Tone | 'unrated'; present?: boolean }
export type Reviews = Record<string, Review>

/** Validated value of a finding after human review (or the AI value if not yet reviewed). */
export interface ValidatedFinding extends Finding {
  reviewed: boolean
  status?: ReviewStatus
  tone?: Tone | 'unrated'
  present?: boolean
  /** Reviewer explicitly asserted presence without an engine quote. */
  humanAsserted?: boolean
  /** AI said present but its quote failed verification — never counted as verified pickup. */
  unverified?: boolean
}

// ---- Audit trail ----
export type AuditAction =
  | 'accepted' | 'corrected' | 'rejected' | 'undone' | 'bulk-accepted'
  | 'observation-edited' | 'observation-approved'
  | 'recommendation-edited' | 'recommendation-accepted'
  | 'briefing-approved' | 'briefing-withdrawn' | 'approval-withdrawn' | 'advisory-run'
export interface AuditEntry {
  seq: number
  at: string                 // ISO timestamp taken when the action happened
  reviewerId: string
  reviewerName: string
  reviewerRole: string
  action: AuditAction
  subject: string            // human-readable target, e.g. "C16 · Message C" or "Briefing"
  itemId?: string
  findingId?: string
  from?: string
  to?: string
  count?: number
  findingIds?: string[]
  note?: string
}
export type AuditInput = Omit<AuditEntry, 'seq' | 'at' | 'reviewerId' | 'reviewerName' | 'reviewerRole'>
