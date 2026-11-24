import { FlaskConical } from 'lucide-react'
import { useApp } from '../state/store'
import { ConfidenceMeter, fmtDate } from './ui'

const SIGNAL_NOTE: Record<string, string> = {
  'weak-signal': 'No match found, but several loose topic hints appear. The rules flag this for a human look.',
  'contrast-cue': 'A match sits in a sentence with contrast wording (e.g. “but”, “does not appear”). The rules lower the score and flag it.'
}
const STATUS: Record<string, string> = { accepted: 'approved', corrected: 'corrected', rejected: 'rejected' }

/** Two deliberately difficult synthetic articles: rules-based result vs. the correct interpretation vs. a future semantic-analysis test. */
export function DifficultCases() {
  const { items, findings, validated, keyMessages, openEvidence, go } = useApp()
  const cases = items.filter(i => i.demo)
  if (!cases.length) return null
  return <section className="mb-6" aria-label="Difficult cases">
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <FlaskConical size={16} className="text-brand" /><h2 className="text-[18px]">Two difficult articles</h2>
      <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-gray border border-line bg-white px-2 py-0.5">Illustrative synthetic example — not a model benchmark</span>
    </div>
    <div className="space-y-4">
      {cases.map(it => {
        const d = it.demo!
        const fid = `${it.id}:msg:${d.messageId}`
        const f = findings.find(x => x.id === fid)!
        const v = validated.find(x => x.id === fid)!
        const msg = keyMessages.find(m => m.id === d.messageId)!
        const quote = f.matches.length ? f.matches.map(m => `“${m.text}”`).join(' … ') : null
        return <div key={it.id} className="card overflow-hidden">
          <div className="px-5 py-3 bg-offwhite border-b border-line flex flex-wrap items-baseline justify-between gap-2">
            <div><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand mr-2">{d.kind}</span><span className="font-bold text-charcoal">{it.headline}</span></div>
            <span className="text-[12px] text-gray">{it.outlet} · {fmtDate(it.date)} · {it.id} · tests Message {d.messageId}: {msg.label}</span>
          </div>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
            <div className="p-5">
              <div className="kicker !text-gray mb-2">Rules-based finding</div>
              <div className="text-[20px] font-bold text-charcoal">Message {d.messageId} {f.aiPresent ? 'present' : 'absent'}</div>
              <div className="mt-1"><ConfidenceMeter value={f.confidence} /></div>
              <p className="text-[13px] mt-2 text-body">{quote ? <>Matched: {quote}</> : 'No matching text found.'}</p>
              {f.flag && <p className="text-[12px] mt-2 text-gray border-l-2 border-accent pl-2">{SIGNAL_NOTE[f.flag]}</p>}
            </div>
            <div className="p-5">
              <div className="kicker !text-gray mb-2">Correct interpretation <span className="normal-case tracking-normal font-normal">(established in this synthetic example)</span></div>
              <p className="text-[14px]">{d.interpretation}</p>
              <p className={`mt-3 text-[12px] font-medium ${v.reviewed ? 'text-brand' : 'text-gray'}`}>Your review: {v.reviewed ? STATUS[v.status!] : 'pending'}</p>
            </div>
            <div className="p-5">
              <div className="kicker !text-gray mb-2">Future AI pilot opportunity</div>
              <p className="text-[14px]">Test whether an approved LLM handles this {d.kind} more accurately than the rules, against a human-reviewed reference set. Not implemented or validated in this POC.</p>
              <p className="text-[12px] text-gray mt-2">{d.why}</p>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-line flex gap-3 flex-wrap no-print">
            <button className="btn-outline !py-1.5 !text-[14px]" onClick={() => openEvidence({ itemId: it.id, findingId: fid })}>Open source article</button>
            <button className="btn-outline !py-1.5 !text-[14px]" onClick={() => go(7)}>Review this finding</button>
          </div>
        </div>
      })}
    </div>
  </section>
}
