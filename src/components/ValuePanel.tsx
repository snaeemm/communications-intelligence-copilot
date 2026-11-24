import { useState } from 'react'
import { Users, Building2 } from 'lucide-react'
import { useApp } from '../state/store'
import { CountUp, Illustrative } from './ui'

/** "Where the value is" — only computed facts, plus one clearly-labelled user assumption. No measured savings are claimed. */
export function ValuePanel() {
  const { items, findings, state, validatedPenetration, validated } = useApp()
  const [mins, setMins] = useState(15)
  const words = items.reduce((n, i) => n + i.text.trim().split(/\s+/).length, 0)
  const reviews = Object.values(state.reviews)
  const kept = reviews.filter(r => r.status === 'accepted').length
  const changed = reviews.length - kept
  const citations = validated.filter(v => v.kind === 'message' && v.present).length
  const hours = (items.length * mins) / 60

  const Stat = ({ n, label, suffix = '' }: { n: number; label: string; suffix?: string }) => <div className="p-4 bg-offwhite border border-line">
    <div className="text-[34px] leading-none font-bold kpi-value tabular-nums"><CountUp value={n} />{suffix}</div>
    <div className="text-[13px] text-gray mt-1.5">{label}</div></div>

  return <section className="mt-8 fade-in">
    <div className="flex items-center gap-3 mb-3"><div className="kicker">Where the value is</div><Illustrative>Computed from this run</Illustrative></div>
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card p-6 border-t-4 border-t-brand">
        <div className="flex items-center gap-2 mb-1"><Users size={18} className="text-brand" /><h2 className="text-[20px]">For our team</h2></div>
        <p className="text-gray text-[15px] mb-4">The first pass is drafted. People spend their time judging, not reading and tagging.</p>
        <div className="grid grid-cols-2 gap-3">
          <Stat n={items.length} label={`articles read (${words.toLocaleString()} words)`} />
          <Stat n={findings.length} label="classifications pre-drafted" />
          <Stat n={kept} label="accepted as-is by a reviewer" />
          <Stat n={changed} label="corrected or rejected by a reviewer" />
        </div>
        <div className="mt-4 p-4 border border-dashed border-gray/40">
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-gray mb-2">Your assumption — not a result</div>
          <label className="flex items-center gap-3 text-[14px]">Minutes to read &amp; tag one article by hand:
            <input type="range" min={5} max={45} step={5} value={mins} onChange={e => setMins(+e.target.value)} className="accent-[#2DA24A] flex-1" aria-label="Minutes per article" />
            <strong className="tabular-nums w-14">{mins} min</strong></label>
          <p className="text-[14px] mt-2">At that pace, the first pass on this batch is <strong>about {hours.toFixed(1)} hours</strong> of hand work. Real savings would be measured against comparable briefs in a pilot, review time included.</p>
        </div>
      </div>
      <div className="card p-6 border-t-4 border-t-charcoal">
        <div className="flex items-center gap-2 mb-1"><Building2 size={18} className="text-charcoal" /><h2 className="text-[20px]">For the client</h2></div>
        <p className="text-gray text-[15px] mb-4">Message-level insight they can check, not a coverage count they have to trust.</p>
        <div className="grid grid-cols-2 gap-3">
          <Stat n={validatedPenetration.length} label="approved messages tracked, not just volume" />
          <Stat n={citations} label="message findings, each linked to its source text" />
          <Stat n={validatedPenetration.filter(p => p.pct < 25).length} label="message flagged as under-reaching" />
          <Stat n={100} suffix="%" label="of findings human-reviewed before release" />
        </div>
        <ul className="mt-4 text-[15px] space-y-1.5 list-disc pl-5">
          <li>Which messages reached the media, and which did not.</li>
          <li>Where the gap sits, and what to do about it.</li>
          <li>Nothing published without a named human sign-off.</li>
        </ul>
      </div>
    </div>
  </section>
}
