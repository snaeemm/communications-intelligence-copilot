import type { CoverageItem, KeyMessage, MessageId, PenetrationResult } from '../data/types'
import { detectKeyMessage } from './messages'
import { eligibleItems } from './eligibility'

/**
 * Message penetration = eligible analysed articles carrying the message ÷ total eligible analysed articles × 100.
 * Duplicates and records with missing text are excluded from numerator AND denominator. Zero eligible → 0%.
 * `override` lets the human-validated set replace the rules-based value.
 */
export function computePenetration(
  items: CoverageItem[],
  messages: KeyMessage[],
  override?: (itemId: string, messageId: MessageId) => boolean | undefined
): PenetrationResult[] {
  const { eligible } = eligibleItems(items)
  return messages.map(msg => {
    const itemIds: string[] = []
    const byOutletType: Record<string, number> = {}
    for (const it of eligible) {
      const ov = override?.(it.id, msg.id)
      const present = ov !== undefined ? ov : detectKeyMessage(it.text, msg).present
      if (present) { itemIds.push(it.id); byOutletType[it.outletType] = (byOutletType[it.outletType] ?? 0) + 1 }
    }
    const total = eligible.length
    return { messageId: msg.id, label: msg.label, count: itemIds.length, total, pct: total > 0 ? Math.round((itemIds.length / total) * 100) : 0, itemIds, byOutletType }
  })
}
