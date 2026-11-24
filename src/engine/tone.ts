// Pure, deterministic, rules-based tone classifier (small curated lexicon — not a trained model).
import type { EvidenceMatch, Tone, ToneResult } from '../data/types'

const POSITIVE = ['brilliant', 'converted', 'painless', 'striking', 'encouraging', 'appealing', 'attractive', 'refined', 'excellent', 'smart', 'upbeat', 'recommend*', 'worthwhile', 'happier', 'cheerful', 'trust', 'concrete', 'commitments', 'leading', 'great', 'sharper', 'clearer', 'straightforward', 'good-looking', 'optimistic', 'delivered', 'upgrade', 'practical', 'transformation', 'calmer', 'peaceful', 'fast', 'professional', 'thumbs', 'happily', 'reasonable', 'impressive', 'handsome', 'thoughtful', 'well-made', 'luxury', 'easier']
const NEGATIVE = ['disappointing', 'frustrating', 'frustrat*', 'overpriced', 'misled', 'stressful', 'headache', 'confusing', 'minimal', 'damaged', 'late', 'slow', 'poor', 'sour', 'hard', 'refund', 'returned', 'missing', 'skipped', 'unhappy', 'problem*', 'difficult', 'wary', 'not quite right', "didn't", 'pricier', 'beyond', 'limited', 'dust', 'waited', 'wish', 'lacking', 'unanswered', 'liability', 'questioned', 'paused', 'deferred']
const NEGATORS = new Set(['not', 'no', 'never', "isn't", "wasn't", "don't", 'hardly'])

function matchesLex(word: string, entries: string[]): boolean {
  return entries.some(e => (e.endsWith('*') ? word.startsWith(e.slice(0, -1)) : word === e))
}

export function classifyTone(text: string): ToneResult {
  const re = /[A-Za-z'’-]+/g
  const tokens: { w: string; start: number; end: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) tokens.push({ w: m[0].toLowerCase().replace(/’/g, "'"), start: m.index, end: m.index + m[0].length })

  let score = 0
  const matches: EvidenceMatch[] = []
  tokens.forEach((t, i) => {
    let polarity = 0
    if (matchesLex(t.w, POSITIVE)) polarity = 1
    else if (matchesLex(t.w, NEGATIVE)) polarity = -1
    if (!polarity) return
    const negated = tokens.slice(Math.max(0, i - 2), i).some(p => NEGATORS.has(p.w))
    if (negated) polarity = -polarity
    score += polarity
    matches.push({ start: t.start, end: t.end, text: text.slice(t.start, t.end), kind: 'lexicon', weight: polarity })
  })

  const tone: Tone = score >= 3 ? 'positive' : score <= -2 ? 'negative' : 'neutral'
  const mag = Math.abs(score)
  const confidence = tone === 'neutral'
    ? Math.max(0.55, +(0.86 - 0.08 * mag).toFixed(2))
    : Math.min(0.97, +(0.6 + 0.05 * (mag - (tone === 'negative' ? 2 : 3)) + 0.1).toFixed(2))
  return { tone, confidence, matches }
}
