// Deterministic QA for the rules engine. Run: npm run check:qa  (no test framework needed)
import { coverage } from '../data/coverage'
import { keyMessages, client } from '../data/client'
import type { CoverageItem, Finding, Reviews } from '../data/types'
import { runAdvisory, ASK_QUESTIONS, askText, interpretQuestion, recommendAction, auditForReview, auditForUndo, auditToCsv, summarizeAudit, valueLabel, analyzeAll, buildFindings, buildValidated, computePenetration, validatedPresence, validateEvidence, eligibleItems, detectKeyMessage } from './index'

let pass = 0, fail = 0
const t = (name: string, ok: boolean, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + detail}`) }

const { eligible: items } = eligibleItems(coverage)
const analyses = analyzeAll(items, keyMessages)
const findings = buildFindings(analyses, keyMessages, items)
const pen = (rv: Reviews = {}) => computePenetration(items, keyMessages, validatedPresence(buildValidated(findings, rv)))
const get = (id: string) => findings.find(f => f.id === id)!
const pct = (p: ReturnType<typeof pen>, m: string) => p.find(x => x.messageId === m)!

// 1. Evidence quotes are exact substrings (every finding, every match)
const allValid = findings.every(f => validateEvidence(items.find(i => i.id === f.itemId)!.text, f.matches).ok)
t('every engine quote is an exact substring of its article', allValid)
t('no finding is flagged invalid out of the box', findings.every(f => f.evidenceStatus !== 'invalid'))
const c1 = items[0]
t('tampered quote text is detected', !validateEvidence(c1.text, [{ start: 0, end: 10, text: 'not in text', kind: 'phrase', weight: 1 }]).ok)
t('right text at wrong offset is detected', !validateEvidence(c1.text, [{ start: 5, end: 15, text: c1.text.slice(0, 10), kind: 'phrase', weight: 1 }]).ok)
t('empty quote is rejected', !validateEvidence(c1.text, [{ start: 0, end: 0, text: '', kind: 'phrase', weight: 1 }]).ok)

// 2. An AI "present" finding whose quote cannot be verified never counts as verified pickup
const bad: Finding[] = findings.map(f => f.id === 'C01:msg:C' ? { ...f, matches: [{ start: 0, end: 5, text: 'zzzzz', kind: 'phrase' as const, weight: 1 }], evidenceStatus: 'invalid' as const } : f)
const vBad = buildValidated(bad, {})
t('unverifiable quote → not counted', vBad.find(v => v.id === 'C01:msg:C')!.present === false && vBad.find(v => v.id === 'C01:msg:C')!.unverified === true)
const vBadAccepted = buildValidated(bad, { 'C01:msg:C': { status: 'accepted' } })
t('accepting an unverifiable finding still does not count it', vBadAccepted.find(v => v.id === 'C01:msg:C')!.present === false)

// 3. Baseline determinism + hard-case behaviour
const base = pen()
t('baseline penetration is deterministic', JSON.stringify(base) === JSON.stringify(pen()))
t('paraphrase (C15 / Message A) is missed by the rules and flagged weak-signal', get('C15:msg:A').aiPresent === false && get('C15:msg:A').flag === 'weak-signal')
t('contradiction (C16 / Message C) is counted by the rules but flagged contrast-cue', get('C16:msg:C').aiPresent === true && get('C16:msg:C').flag === 'contrast-cue' && get('C16:msg:C').confidence < 0.8)

// 4. Corrections, rejections and recalculation
const a0 = pct(base, 'A').count, c0 = pct(base, 'C').count
const corrected = pen({ 'C15:msg:A': { status: 'corrected', present: true } })
t('correcting a missed finding to present raises the count', pct(corrected, 'A').count === a0 + 1)
const rejected = pen({ 'C16:msg:C': { status: 'rejected', present: false } })
t('rejecting an unsupported finding lowers the count', pct(rejected, 'C').count === c0 - 1)
const rej2 = buildValidated(findings, { 'C16:msg:C': { status: 'rejected' } })
t('rejected without explicit value still resolves to absent', rej2.find(v => v.id === 'C16:msg:C')!.present === false)
const accepted = pen({ 'C16:msg:C': { status: 'accepted' } })
t('accepting leaves the rules value unchanged', pct(accepted, 'C').count === c0)
const hv = buildValidated(findings, { 'C15:msg:A': { status: 'corrected', present: true } }).find(v => v.id === 'C15:msg:A')!
t('human-corrected presence is marked reviewer-asserted', hv.humanAsserted === true && hv.reviewed === true)
t('percentage recomputes from records (A: 10→11 of 16)', pct(corrected, 'A').pct === Math.round(((a0 + 1) / items.length) * 100))
t('tone: rejected tone resolves to unrated', buildValidated(findings, { 'C01:tone': { status: 'rejected', tone: 'unrated' } }).find(v => v.id === 'C01:tone')!.tone === 'unrated')

// 5. Duplicates, missing data and zero denominators
const dup: CoverageItem = { ...coverage[0], id: 'DUP1', date: '2026-07-07' }                // same outlet + headline
const dupBody: CoverageItem = { ...coverage[1], id: 'DUP2', outlet: 'Syndicated Wire', headline: 'Different headline' } // same body text
const empty: CoverageItem = { ...coverage[2], id: 'EMPTY', text: '   ' }
const el = eligibleItems([...coverage, dup, dupBody, empty])
t('duplicates (same story and same body) are excluded', el.excluded.filter(e => e.reason === 'duplicate').length === 2)
t('records with missing text are excluded', el.excluded.some(e => e.reason === 'missing-text' && e.item.id === 'EMPTY'))
const withDup = computePenetration([...coverage, dup, dupBody, empty], keyMessages)
t('duplicates do not inflate counts or the denominator', JSON.stringify(withDup.map(p => [p.count, p.total])) === JSON.stringify(base.map(p => [p.count, p.total])))
const zero = computePenetration([], keyMessages)
t('zero eligible articles → 0%, no NaN/Infinity', zero.every(p => p.pct === 0 && p.total === 0 && Number.isFinite(p.pct)))
t('all-duplicates input does not crash', computePenetration([dup, dup], keyMessages).length === 3)

// 6. Review completeness gating inputs
const full: Reviews = Object.fromEntries(findings.map(f => [f.id, { status: 'accepted' as const }]))
t('pending = total when nothing reviewed; 0 when all reviewed', buildValidated(findings, {}).every(v => !v.reviewed) && buildValidated(findings, full).every(v => v.reviewed))
t('single-message detector is pure (same input → same output)', JSON.stringify(detectKeyMessage(c1.text, keyMessages[0])) === JSON.stringify(detectKeyMessage(c1.text, keyMessages[0])))

// 7. Ask the Campaign: answers come from the reviewed set, and every evidence link resolves to a real finding
const reviewsAll: Reviews = { ...Object.fromEntries(findings.map(f => [f.id, { status: 'accepted' as const }])), 'C15:msg:A': { status: 'corrected', present: true }, 'C16:msg:C': { status: 'rejected', present: false } }
const vAll = buildValidated(findings, reviewsAll)
const vPenAll = computePenetration(items, keyMessages, validatedPresence(vAll))
const toneMap = Object.fromEntries(vAll.filter(v => v.kind === 'tone').map(v => [v.itemId, v.tone as 'positive' | 'neutral' | 'negative' | 'unrated']))
const mk = (seq: number, who: string, role: string, inp: ReturnType<typeof auditForReview>, at: string) => ({ ...inp, seq, at, reviewerId: who, reviewerName: who, reviewerRole: role })
const audit = [
  { ...mk(1, 'Priya Nair', 'Insights Analyst', auditForReview(get('C15:msg:A'), { status: 'corrected', present: true }), '2026-11-08T10:00:00.000Z') },
  { ...mk(2, 'Amira Haddad', 'Account Director', auditForReview(get('C16:msg:C'), { status: 'rejected', present: false }), '2026-11-08T10:01:00.000Z') },
  { seq: 3, at: '2026-11-08T10:02:00.000Z', reviewerId: 'Jonas Weller', reviewerName: 'Jonas Weller', reviewerRole: 'Senior Account Manager', action: 'bulk-accepted' as const, subject: '60 findings', count: 60 }
]
const askData = { items, keyMessages, validated: vAll, validatedPenetration: vPenAll, aiPenetration: base, validatedTone: toneMap, audit, recommendation: { text: recommendAction(vPenAll, items), approved: false } }
const ans = Object.fromEntries(ASK_QUESTIONS.map(q => [q.id, q.answer(askData)]))
t('ask: lowest-penetration answer uses reviewed numbers (C, 13%, 2 of 16)', /Message C/.test(ans.lowest.headline) && /13%/.test(ans.lowest.headline) && /2 of 16/.test(ans.lowest.detail ?? ''), ans.lowest.headline)
t('ask: review answer reports 2 changed (1 corrected, 1 rejected)', /2 of 64/.test(ans.review.headline) && /1 corrected, 1 rejected/.test(ans.review.detail ?? ''), ans.review.headline + ' ' + ans.review.detail)
t('ask: review answer shows rules-based → reviewed shift', (ans.review.stats ?? []).some(s => s.label === 'Message C' && s.value === '19% → 13%'), JSON.stringify(ans.review.stats))
t('ask: tone answer counts match the validated tone', new RegExp(`${Object.values(toneMap).filter(x => x === 'positive').length} positive`).test(ans.tone.headline), ans.tone.headline)
const allEv = Object.values(ans).flatMap(a => a.evidence)
t('ask: every evidence link resolves to a real article and finding', allEv.length > 0 && allEv.every(e => items.some(i => i.id === e.itemId) && (!e.findingId || findings.some(f => f.id === e.findingId))))
t('ask: every answer has a method note and a headline', Object.values(ans).every(a => a.method.length > 0 && a.headline.length > 0))
t('ask: "next" answer flags the rejected claim', (ans.next.bullets ?? []).some(b => /C16/.test(b)), JSON.stringify(ans.next.bullets))
const ansBase = ASK_QUESTIONS.find(q => q.id === 'lowest')!.answer({ ...askData, validated: buildValidated(findings, {}), validatedPenetration: base })
t('ask: answers change when the review changes (unreviewed C is 19%)', /19%/.test(ansBase.headline) && !/13%/.test(ansBase.headline), ansBase.headline)

// 8. Audit trail: who, what, when, before → after
t('audit: a correction records the before and after value', audit[0].from === 'Absent' && audit[0].to === 'Present' && audit[0].action === 'corrected', JSON.stringify(audit[0]))
t('audit: a rejection records Present → Absent', audit[1].from === 'Present' && audit[1].to === 'Absent' && audit[1].action === 'rejected')
t('audit: a later change starts from the previous human value', auditForReview(get('C15:msg:A'), { status: 'rejected', present: false }, { status: 'corrected', present: true }).from === 'Present')
t('audit: undo returns to the automatic value', auditForUndo(get('C16:msg:C'), { status: 'rejected', present: false }).to === 'Present')
t('audit: tone change is labelled', auditForReview(get('C01:tone'), { status: 'corrected', tone: 'negative' }).to === 'Negative' && valueLabel(get('C01:tone'), { tone: 'positive' }) === 'Positive')
t('audit: summary counts reviewers and bulk findings', summarizeAudit(audit).reviewers === 3 && summarizeAudit(audit).byReviewer['Jonas Weller'] === 60)
t('audit: CSV has a header and one row per event, quotes escaped', auditToCsv(audit).split('\n').length === 4 && auditToCsv(audit).startsWith('seq,timestamp,reviewer'))
t('ask: "who" answer names reviewers and the changes they made', /62 finding decisions by 3 reviewers/.test(ans.who.headline) && (ans.who.bullets ?? []).some(b => /Priya Nair/.test(b) && /C15 · Message A/.test(b)), ans.who.headline + JSON.stringify(ans.who.bullets))
t('ask: "who" with no audit says so', /No review decisions/.test(ASK_QUESTIONS.find(q => q.id === 'who')!.answer({ ...askData, audit: [] }).headline))

// 9. Typed questions: deterministic interpretation, answers from current data, honest limits
const typed = (q: string, d = askData) => askText(q, d)
t('typed: "Which key message performed the worst?" → weakest message from reviewed data', /Message C/.test(typed('Which key message performed the worst?').headline) && /13%/.test(typed('Which key message performed the worst?').headline))
const why = typed('Why is our message penetration low?')
t('typed: "Why is our message penetration low?" explains from outlet types and review impact', interpretQuestion('Why is our message penetration low?').intent === 'why' && /only reached trade press/.test(why.headline) && (why.bullets ?? []).some(b => /Review:/.test(b) && /19%/.test(b) && /13%/.test(b) && /C16/.test(b)), why.headline + JSON.stringify(why.bullets))
t('typed: "why" answer cites articles and is not unsupported', why.evidence.length > 0 && why.kind === 'answer' && why.status === 'reviewed')
const rec = typed('What should we recommend to the client?')
t('typed: recommendation uses the step-10 text and is marked pending until accepted', interpretQuestion('What should we recommend to the client?').intent === 'recommend' && rec.status === 'pending' && rec.detail === askData.recommendation.text, String(rec.status))
const recOk = typed('What should we recommend to the client?', { ...askData, recommendation: { ...askData.recommendation, approved: true } })
t('typed: recommendation is marked reviewed once a person has accepted it', recOk.status === 'reviewed' && (recOk.bullets ?? []).some(b => /accepted by a reviewer/.test(b)))
t('typed: an edited recommendation is what gets quoted', typed('What should we recommend?', { ...askData, recommendation: { text: 'Edited by a person.', approved: true } }).detail === 'Edited by a person.')
const variations: [string, string, string?][] = [
  ['Which message performed the worst?', 'lowest'], ['what is our weakest message', 'lowest'], ['Where are we missing coverage?', 'missing'], ['which outlets have no pickup', 'missing'],
  ['Did the reviewers change anything?', 'review'], ['what was corrected or rejected', 'review'], ['Who approved these findings and when?', 'who'], ['show me the audit trail', 'who'],
  ['How negative was the press?', 'tone'], ['what is the sentiment', 'tone'], ['What should the team look into next?', 'next'], ['what should we investigate', 'next'],
  ['Any advice for the client?', 'recommend'], ['Explain why message A is low', 'why', 'A'], ['Tell me about message B', 'message', 'B'], ['how did key message c do', 'message', 'C']
]
for (const [q, intent, letter] of variations) { const i = interpretQuestion(q); t(`typed: "${q}" → ${intent}${letter ? ' ' + letter : ''}`, i.intent === intent && (!letter || i.letter === letter), JSON.stringify(i)) }
const msgB = typed('Tell me about message B')
t('typed: a per-message question reports that message’s reviewed numbers', /Message B appears in 6 of 16/.test(msgB.headline) && msgB.evidence.length === 6, msgB.headline)
for (const [q, why2] of [['Predict next quarter\'s message penetration', /forecast/], ['What will our competitors do?', /competitor/], ['How much time did we save?', /time-saving|financial/], ['How accurate is the classifier?', /accuracy/], ['What\'s the weather today?', /outside the reviewed/]] as [string, RegExp][]) {
  const a = typed(q)
  t(`typed: unsupported "${q}" explains the limit and invents nothing`, a.kind === 'unsupported' && why2.test(a.detail ?? '') && !a.stats && a.evidence.length === 0 && (a.suggestions ?? []).length > 0, JSON.stringify(a).slice(0, 200))
}
t('typed: gibberish is unsupported, not guessed', typed('asdf qwerty zzz').kind === 'unsupported')
t('typed: interpretation is deterministic', JSON.stringify(interpretQuestion('Why is our message penetration low?')) === JSON.stringify(interpretQuestion('Why is our message penetration low?')))
t('typed: answers follow the current state (unreviewed C is 19%)', /19%/.test(typed('Which key message performed the worst?', { ...askData, validated: buildValidated(findings, {}), validatedPenetration: base }).headline))
const allTyped = ['Which key message performed the worst?', 'Why is our message penetration low?', 'What should we recommend to the client?', 'Tell me about message B', 'Did the reviewers change anything?', 'Who approved these findings and when?'].flatMap(q => typed(q).evidence)
t('typed: every evidence reference resolves to a real article and finding', allTyped.length > 0 && allTyped.every(e => items.some(i => i.id === e.itemId) && (!e.findingId || findings.some(f => f.id === e.findingId))))

// 10. Compound typed question
const both = typed('Which message is underperforming, and what should we recommend to the client?')
t('typed: compound "underperforming + recommend" answers both parts from reviewed data', interpretQuestion('Which message is underperforming, and what should we recommend to the client?').also === 'recommend' && /Message C/.test(both.headline) && /13%/.test(both.headline) && (both.bullets ?? [])[0]?.startsWith('Recommendation:') && /Understood as:?/.test('Understood as:') && /\+/.test(both.understoodAs ?? ''), JSON.stringify(both).slice(0, 300))
t('typed: compound answer carries evidence references and the pending/approved status', both.evidence.length > 0 && both.status === 'pending' && typed('Which message is underperforming, and what should we recommend to the client?', { ...askData, recommendation: { ...askData.recommendation, approved: true } }).status === 'reviewed')
t('typed: compound answer stays within five bullets', (both.bullets ?? []).length <= 5)

// 11. Advisory panel across several campaign states
const adv = (validated = vAll, pen = vPenAll, over: Record<string, unknown> = {}) => runAdvisory({ items, keyMessages, client: { name: client.name, objective: client.objective, audiences: client.audiences }, validated, validatedPenetration: pen, aiPenetration: base, reviewComplete: true, recommendation: askData.recommendation, ...over } as Parameters<typeof runAdvisory>[0])
const txt = (r: ReturnType<typeof adv>) => JSON.stringify(r)
const pts = (r: ReturnType<typeof adv>, id: string) => r.personas.find(p => p.id === id)!.points.map(x => x.text).join(' | ')
const A = adv()
t('advisory[A current state]: four named perspectives with distinct stances', A.personas.map(p => p.name).join() === 'PR Strategist,Data Analyst,Audience Advocate,Evidence Reviewer' && A.personas.map(p => p.stance.kind).join() === 'revisit,challenge,question,support-with-limits', A.personas.map(p => p.stance.kind).join())
t('advisory[A]: figures match the reviewed data (C, 13%, 2 of 16)', A.subject?.messageId === 'C' && /13%/.test(pts(A, 'strategist')) && /2 of 16/.test(pts(A, 'strategist')))
t('advisory[A]: meaningful disagreement — Strategist vs Analyst on "underperforming"', A.synthesis.disagree.some(x => /underperforming/.test(x.topic) && x.sides.some(y => y.persona === 'PR Strategist') && x.sides.some(y => y.persona === 'Data Analyst')))
t('advisory[A]: Analyst challenges the missing baseline and target', /no prior-period baseline/.test(pts(A, 'analyst')) && /no target/.test(pts(A, 'analyst')))
t('advisory[A]: Analyst notes the review changed the figure 19% → 13%', /from 19% \(rules-based\) to 13% \(reviewed\)/.test(pts(A, 'analyst')), pts(A, 'analyst'))
t('advisory[A]: Audience Advocate says audience understanding cannot be established', /cannot be established/.test(pts(A, 'advocate')) && A.personas[2].points.some(p => p.status === 'assumption'))
t('advisory[A]: Evidence Reviewer separates supported from unsupported and cites the disputed claim C16', /verified exact quotes/.test(pts(A, 'evidence')) && /Not supported/.test(pts(A, 'evidence')) && /C16/.test(pts(A, 'evidence')))
t('advisory[A]: three disagreements incl. where to push and whether to amplify a disputed claim', A.synthesis.disagree.length === 3 && A.synthesis.disagree.some(x => /Where to push/.test(x.topic)) && A.synthesis.disagree.some(x => /Amplify/.test(x.topic)))
t('advisory[A]: synthesis has agreement, missing evidence and next steps; final step is a human decision', A.synthesis.agree.length >= 3 && A.synthesis.missing.length >= 4 && /person accepts, edits or rejects/.test(A.synthesis.next[A.synthesis.next.length - 1]) && /only when a person accepts or edits/.test(A.synthesis.approval))
t('advisory[A]: every source reference resolves to a real article and finding', [...A.synthesis.refs, ...A.personas.flatMap(p => p.points.flatMap(x => x.refs))].every(e => items.some(i => i.id === e.itemId) && (!e.findingId || findings.some(f => f.id === e.findingId))) && A.synthesis.refs.length > 0)
t('advisory: method states it is simulated, not independent LLM agents', /not four independent language-model agents/.test(A.method.join(' ')))
t('advisory: makes no causal or proof claims', !/\bproves?\b|caused by|guarantee|because of the message/i.test(txt(A)))
t('advisory: deterministic', txt(adv()) === txt(adv()))
const vAcc = buildValidated(findings, Object.fromEntries(findings.map(f => [f.id, { status: 'accepted' as const }])))
const penAcc = computePenetration(items, keyMessages, validatedPresence(vAcc))
const B = adv(vAcc, penAcc)
t('advisory[B all accepted, nothing corrected]: C is 19% (3 of 16) and the disputed-claim material disappears', /19%/.test(pts(B, 'strategist')) && /3 of 16/.test(pts(B, 'strategist')) && !/C16/.test(pts(B, 'evidence')) && !/Review changed/.test(pts(B, 'analyst')) && !B.synthesis.disagree.some(x => /Amplify/.test(x.topic)), pts(B, 'evidence'))
const revB: Reviews = { ...Object.fromEntries(findings.map(f => [f.id, { status: 'accepted' as const }])), ...Object.fromEntries(findings.filter(f => f.messageId === 'B' && f.aiPresent).map(f => [f.id, { status: 'rejected' as const, present: false }])) }
const vB = buildValidated(findings, revB), penB = computePenetration(items, keyMessages, validatedPresence(vB))
const C = adv(vB, penB)
t('advisory[C different weakest message]: panel follows the data to Message B (0%)', C.subject?.messageId === 'B' && C.subject?.pct === 0 && /Message B/.test(pts(C, 'strategist')) && !/Message C \(“/.test(pts(C, 'strategist')), pts(C, 'strategist'))
const mkPen = (m: string, c: number) => ({ ...base.find(x => x.messageId === m)!, count: c, pct: Math.round((c / 16) * 100), itemIds: items.slice(0, c).map(i => i.id), byOutletType: { 'Trade press': Math.min(c, 5) } })
const narrow = [mkPen('A', 5), mkPen('B', 5), mkPen('C', 4)]
const D = adv(vAll, narrow)
t('advisory[D narrow gap]: Strategist holds, no "revisit" or underperformance dispute is invented', D.personas[0].stance.kind === 'hold' && D.synthesis.disagree.length === 0 && !/revisit/i.test(pts(D, 'strategist')), pts(D, 'strategist'))
t('advisory[D]: Analyst flags a fragile ranking when messages are one article apart', /fragile/.test(pts(D, 'analyst')) && /ranking survives/.test(pts(A, 'analyst')))
const E = adv(buildValidated(findings, {}), base, { reviewComplete: false })
t('advisory[E review incomplete]: every perspective says it cannot evaluate, nothing invented', E.insufficient && E.personas.every(p => p.stance.kind === 'insufficient') && /not fully reviewed/.test(pts(E, 'analyst')) && E.synthesis.disagree.length === 0)
const F = runAdvisory({ items: [], keyMessages, client: { name: 'x', objective: 'y', audiences: [] }, validated: [], validatedPenetration: [], aiPenetration: [], reviewComplete: true, recommendation: { text: '', approved: false } })
t('advisory[F no articles]: says there is nothing to evaluate', F.insufficient && /no eligible articles/.test(F.personas[0].points[0].text))
const paraRev: Reviews = { ...Object.fromEntries(findings.map(f => [f.id, { status: 'accepted' as const }])), 'C15:msg:C': { status: 'corrected', present: true } }
const vP = buildValidated(findings, paraRev), penP = computePenetration(items, keyMessages, validatedPresence(vP))
const G = adv(vP, penP)
t('advisory[G reviewer-asserted pickup for the weakest message]: Advocate cites paraphrase and Evidence flags no engine quote', /expressed in other words in C15/.test(pts(G, 'advocate')) && /reviewer-asserted with no engine quote \(C15\)/.test(pts(G, 'evidence')), pts(G, 'advocate') + ' || ' + pts(G, 'evidence'))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) throw new Error(`QA failed: ${fail} check(s)`)
