import { useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { useApp } from '../state/store'
import { AIBadge, Illustrative, PageHeader, fmtDate } from '../components/ui'
import { StepNav } from '../components/Shell'

export default function GapsScreen() {
  const { aiPenetration, aiGap, items, openEvidence } = useApp()
  const low = useMemo(() => [...aiPenetration].sort((a, b) => a.pct - b.pct || a.messageId.localeCompare(b.messageId))[0], [aiPenetration])
  const outletTypes = [...new Set(items.map(i => i.outletType))]
  const without = outletTypes.filter(t => !low.byOutletType[t])
  const mentions = low.itemIds.map(id => items.find(i => i.id === id)!)

  return <div>
    <PageHeader kicker="Step 5 · Gaps and patterns" title="Where the story is thin"
      lead="One observation, computed from the coverage sample." right={<div className="flex items-center gap-2"><AIBadge /><Illustrative /></div>} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="card p-8 lg:col-span-2 border-l-4 border-l-brand">
        <div className="flex items-center gap-2 mb-3"><Lightbulb className="text-brand" size={20} /><span className="kicker">Auto-generated observation</span><AIBadge /></div>
        <p className="text-[26px] leading-snug text-charcoal font-bold">{aiGap}</p>
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-offwhite p-4"><div className="text-[32px] font-bold text-charcoal tabular-nums">{low.pct}%</div><div className="text-[12px] text-gray">Message {low.messageId} penetration</div></div>
          <div className="bg-offwhite p-4"><div className="text-[32px] font-bold text-charcoal tabular-nums">{low.count}/{low.total}</div><div className="text-[12px] text-gray">Items with the message</div></div>
          <div className="bg-offwhite p-4"><div className="text-[32px] font-bold text-charcoal tabular-nums">{without.length}</div><div className="text-[12px] text-gray">Outlet types with none</div></div>
        </div>
        <p className="mt-6 text-[14px] text-gray">This is a rules-based draft, still provisional. It becomes a human-approved finding in the briefing (step 8), where it can be edited before inclusion.</p>
      </section>

      <section className="card p-6">
        <div className="kicker mb-1">Supporting evidence</div>
        <h2 className="text-[18px] mb-3">Message {low.messageId}: where it appears</h2>
        {mentions.length === 0 && <p className="text-[14px] text-gray">No items contain this message.</p>}
        <ul className="space-y-2">
          {mentions.map(i => <li key={i.id}>
            <button className="w-full text-left p-3 border border-line hover:border-brand hover:bg-palegreen" onClick={() => openEvidence({ itemId: i.id, findingId: `${i.id}:msg:${low.messageId}` })}>
              <div className="text-[14px] font-medium text-charcoal leading-snug">{i.headline}</div>
              <div className="text-[12px] text-gray">{i.outlet} · {i.outletType} · {fmtDate(i.date)}</div>
            </button>
          </li>)}
        </ul>
        <h3 className="text-[14px] mt-5 mb-2">Outlet types with no mention</h3>
        <div className="flex flex-wrap gap-2">
          {without.length ? without.map(t => <span key={t} className="px-2 py-1 text-[12px] bg-paleorange text-charcoal">{t}</span>) : <span className="text-[13px] text-gray">None — every outlet type carries it.</span>}
        </div>
      </section>
    </div>
    <StepNav next={6} nextLabel="Inspect the evidence" />
  </div>
}
