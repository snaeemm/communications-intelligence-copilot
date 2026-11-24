// Data preparation: which coverage records are eligible for analysis (no duplicates, no missing text).
import type { CoverageItem } from '../data/types'

export type ExclusionReason = 'duplicate' | 'missing-text' | 'missing-outlet'
export interface Exclusion { item: CoverageItem; reason: ExclusionReason; duplicateOf?: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Keeps the first occurrence of a story (same outlet + headline, or identical body text). */
export function eligibleItems(items: CoverageItem[]): { eligible: CoverageItem[]; excluded: Exclusion[] } {
  const eligible: CoverageItem[] = [], excluded: Exclusion[] = []
  const seenStory = new Map<string, string>(), seenBody = new Map<string, string>()
  for (const it of items) {
    if (!it.text || !it.text.trim()) { excluded.push({ item: it, reason: 'missing-text' }); continue }
    if (!it.outlet || !it.outlet.trim()) { excluded.push({ item: it, reason: 'missing-outlet' }); continue }
    const storyKey = `${norm(it.outlet)}|${norm(it.headline)}`, bodyKey = norm(it.text)
    const dup = seenStory.get(storyKey) ?? seenBody.get(bodyKey)
    if (dup) { excluded.push({ item: it, reason: 'duplicate', duplicateOf: dup }); continue }
    seenStory.set(storyKey, it.id); seenBody.set(bodyKey, it.id); eligible.push(it)
  }
  return { eligible, excluded }
}
