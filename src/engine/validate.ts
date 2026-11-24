// Deterministic evidence validation: every displayed quote must be an exact substring of its source article.
import type { CoverageItem, EvidenceMatch, EvidenceStatus, Finding } from '../data/types'

export interface QuoteCheck { match: EvidenceMatch; found: boolean }
export interface EvidenceValidation { ok: boolean; checks: QuoteCheck[] }

/** A quote is valid only if the article text at its recorded offsets equals the quote AND the quote occurs in the article. */
export function validateEvidence(articleText: string, matches: EvidenceMatch[]): EvidenceValidation {
  const checks = matches.map(m => ({
    match: m,
    found: m.text.length > 0 && articleText.slice(m.start, m.end) === m.text && articleText.includes(m.text)
  }))
  return { ok: checks.every(c => c.found), checks }
}

/** verified: present with >=1 quote and all quotes found. invalid: any quote missing. none: no quote to check. */
export function evidenceStatusFor(item: CoverageItem | undefined, f: Pick<Finding, 'kind' | 'aiPresent' | 'matches'>): EvidenceStatus {
  if (!item) return 'invalid'
  if (f.kind === 'message' && !f.aiPresent) return 'none'
  if (f.matches.length === 0) return 'none'
  return validateEvidence(item.text, f.matches).ok ? 'verified' : 'invalid'
}
