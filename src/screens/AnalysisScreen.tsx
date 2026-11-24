import { AIBadge, ConfidenceMeter, KPI, MsgChip, PageHeader, Skeleton, TONE_DEFINITIONS, TONE_STYLE, ToneTag, fmtDate, useCosmeticLoading } from '../components/ui'
import { StepNav } from '../components/Shell'
import { DifficultCases } from '../components/DifficultCases'
import { useApp } from '../state/store'
import type { Tone } from '../data/types'

export default function AnalysisScreen() {
  const { items, analyses, keyMessages, aiPenetration, openEvidence } = useApp()
  const loading = useCosmeticLoading(700)
  const tones: Tone[] = ['positive', 'neutral', 'negative']
  const count = (t: Tone) => analyses.filter(a => a.tone.tone === t).length
  return <div>
    <PageHeader kicker="Step 3 · Analysis" title="Rules-based classification"
      lead="Tone and key-message presence for every item. Click any tag to see the exact source text."
      right={<span className="inline-flex items-center gap-2 text-[13px] text-gray"><AIBadge />Not yet human-reviewed</span>} />
    {loading ? <div className="space-y-3"><div className="text-[14px] text-gray">Running rules-based analysis on {items.length} items…</div>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Items analyzed" value={items.length} sub="Pilot sample" accent />
        {tones.map(t => <KPI key={t} label={`${TONE_STYLE[t].label} tone`} value={count(t)} sub={`${Math.round(count(t) / items.length * 100)}% of items · illustrative`} />)}
      </div>
      <div className="card p-4 mb-6 grid md:grid-cols-3 gap-4 text-[13px]">
        {tones.map(t => <div key={t} className="flex gap-2 items-start"><ToneTag tone={t} /><span className="text-gray">{TONE_DEFINITIONS[t]}</span></div>)}
      </div>
      <DifficultCases />
      <div className="card overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[2.2fr_1.2fr_repeat(3,1fr)_auto] gap-4 px-5 py-3 text-[11px] uppercase tracking-[0.14em] font-bold text-gray border-b border-line bg-offwhite">
            <div>Coverage item</div><div>Tone</div>{keyMessages.map(m => <div key={m.id}>Message {m.id}</div>)}<div>Status</div></div>
          {items.map(it => { const a = analyses.find(x => x.itemId === it.id)!
            return <div key={it.id} className="grid grid-cols-[2.2fr_1.2fr_repeat(3,1fr)_auto] gap-4 px-5 py-3 items-center border-b border-line last:border-0 hover:bg-offwhite/60">
              <div><div className="text-[14px] font-bold text-charcoal leading-snug">{it.headline}</div><div className="text-[12px] text-gray">{it.outlet} · {fmtDate(it.date)}</div></div>
              <div className="space-y-1"><ToneTag tone={a.tone.tone} onClick={() => openEvidence({ itemId: it.id, findingId: `${it.id}:tone` })} /><div><ConfidenceMeter value={a.tone.confidence} /></div></div>
              {keyMessages.map(m => { const r = a.messages[m.id]
                return <div key={m.id} className="space-y-1"><MsgChip id={m.id} present={r.present} onClick={() => openEvidence({ itemId: it.id, findingId: `${it.id}:msg:${m.id}` })} /><div><ConfidenceMeter value={r.confidence} /></div></div> })}
              <AIBadge />
            </div> })}
        </div>
      </div>
      <p className="text-[12px] text-gray mt-3">Auto-generated. Message presence totals: {aiPenetration.map(p => `${p.messageId} ${p.count}/${p.total}`).join(' · ')} — illustrative / pilot sample.</p></>}
    <StepNav next={4} nextLabel="Compare message penetration" disabled={loading} />
  </div>
}
