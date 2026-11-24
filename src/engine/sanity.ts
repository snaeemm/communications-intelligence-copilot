import { coverage } from '../data/coverage'
import { keyMessages } from '../data/client'
import { analyzeAll, computePenetration, findGapsAndPatterns, recommendAction, buildFindings } from './index'
const an = analyzeAll(coverage, keyMessages)
for (const a of an) console.log(a.itemId, a.tone.tone, a.tone.confidence, (['A','B','C'] as const).map(m => `${m}:${a.messages[m].present?'Y':'-'}${a.messages[m].confidence}${a.messages[m].flag ? '!'+a.messages[m].flag : ''}`).join(' '))
const p = computePenetration(coverage, keyMessages)
console.log(p.map(x => `${x.messageId} ${x.count}/${x.total} ${x.pct}%`).join(' | '))
console.log(findGapsAndPatterns(p, coverage)); console.log(recommendAction(p, coverage))
const t = an.reduce((o: Record<string, number>, a) => (o[a.tone.tone] = (o[a.tone.tone] ?? 0) + 1, o), {}); console.log(t)
const f = buildFindings(an, keyMessages, coverage); console.log('findings', f.length, 'low-score (<0.8):', f.filter(x => x.confidence < 0.8).length, 'invalid evidence:', f.filter(x => x.evidenceStatus === 'invalid').length)
