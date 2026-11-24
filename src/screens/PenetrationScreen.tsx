import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useApp } from '../state/store'
import { AIBadge, Illustrative, KPI, PageHeader, TONE_DEFINITIONS, TONE_STYLE, ToneTag, fmtDate, useCosmeticLoading, Skeleton } from '../components/ui'
import { StepNav } from '../components/Shell'
import type { Tone } from '../data/types'

const OUTLET_COLORS: Record<string, string> = {
  'Trade press': '#141618', 'Consumer press': '#2DA24A', 'Broadcast transcript': '#6B6B6B', Blog: '#BFBFBF'
}

export default function PenetrationScreen() {
  const { items, analyses, aiPenetration, pctReviewed, openEvidence, reviewComplete } = useApp()
  const loading = useCosmeticLoading(500)
  const lowest = useMemo(() => [...aiPenetration].sort((a, b) => a.pct - b.pct || a.messageId.localeCompare(b.messageId))[0], [aiPenetration])
  const [sel, setSel] = useState<string>(lowest.messageId)
  const [outletFilter, setOutletFilter] = useState<string | null>(null)

  const outletTypes = useMemo(() => [...new Set(items.map(i => i.outletType))], [items])
  const avg = Math.round(aiPenetration.reduce((n, p) => n + p.pct, 0) / aiPenetration.length)
  const selected = aiPenetration.find(p => p.messageId === sel)!
  const listItems = selected.itemIds.map(id => items.find(i => i.id === id)!).filter(i => !outletFilter || i.outletType === outletFilter)

  const toneCounts = useMemo(() => {
    const c: Record<Tone, number> = { positive: 0, neutral: 0, negative: 0 }
    analyses.forEach(a => { c[a.tone.tone]++ })
    return c
  }, [analyses])
  const sourceCounts = outletTypes.map(t => ({ t, n: items.filter(i => i.outletType === t).length }))

  if (loading) return <div><Skeleton className="h-10 w-96 mb-6" /><div className="grid grid-cols-3 gap-4 mb-6"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-80" /></div>

  return <div>
    <PageHeader kicker="Step 4 · Message penetration" title="Which approved messages reached the media?"
      lead="Share of coverage items that carry each client-approved key message."
      right={<div className="flex items-center gap-2"><AIBadge /><Illustrative /></div>} />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <KPI accent label="Items analyzed" value={items.length} sub="Approved coverage sample" />
      <KPI label="Avg. key-message penetration" value={`${avg}%`} sub="Mean across 3 messages · rules-based pass" />
      <KPI label="Human-reviewed" value={`${pctReviewed}%`} sub="Of automatic findings" />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="card p-6 xl:col-span-3">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px]">Key-message penetration</h2>
          <div className="text-[12px] text-gray">Rules-based · illustrative / pilot sample</div>
        </div>
        {!reviewComplete && <p className="mb-4 -mt-2 inline-block text-[12px] font-bold uppercase tracking-wider bg-paleorange px-2 py-1">Provisional — rules-based, not yet reviewed</p>}
        <p className="mb-5 text-[12px] text-gray">Penetration = eligible analysed articles carrying the message ÷ total eligible analysed articles × 100.</p>
        <div className="space-y-6">
          {aiPenetration.map(p => {
            const weakest = p.messageId === lowest.messageId
            const active = p.messageId === sel
            return <div key={p.messageId} className={`p-3 -mx-3 border ${active ? 'border-brand bg-offwhite' : 'border-transparent'}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <button className="text-left" onClick={() => { setSel(p.messageId); setOutletFilter(null) }}>
                  <span className="font-bold text-charcoal">Message {p.messageId}</span>
                  <span className="text-gray"> · {p.label}</span>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {weakest && <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neg bg-paleneg px-1.5 py-0.5"><AlertTriangle size={11} />Weakest</span>}
                  <span className="text-[28px] font-bold text-charcoal tabular-nums leading-none">{p.pct}%</span>
                </div>
              </div>
              <div className="h-9 bg-line relative flex" role="img" aria-label={`Message ${p.messageId} appears in ${p.count} of ${p.total} items`}>
                {outletTypes.filter(t => p.byOutletType[t]).map(t => {
                  const n = p.byOutletType[t]
                  return <button key={t} title={`${t}: ${n} item(s) — click to inspect`}
                    onClick={() => { setSel(p.messageId); setOutletFilter(t) }}
                    className="h-full text-[11px] font-bold text-white grid place-items-center hover:opacity-80 border-r border-white/60"
                    style={{ width: `${(n / p.total) * 100}%`, background: OUTLET_COLORS[t], color: t === 'Blog' ? '#141618' : '#fff' }}>{n}</button>
                })}
              </div>
              <div className="text-[13px] text-gray mt-1.5">{p.count} of {p.total} items</div>
            </div>
          })}
        </div>
        <div className="mt-5 pt-4 border-t border-line flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-gray">
          <span className="font-bold uppercase tracking-wider text-[10px]">Segment = outlet type</span>
          {outletTypes.map(t => <span key={t} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: OUTLET_COLORS[t] }} />{t}</span>)}
        </div>
      </section>

      <section className="card p-6 xl:col-span-2 flex flex-col">
        <div className="kicker mb-1">Evidence</div>
        <h2 className="text-[20px]">Message {selected.messageId}: {selected.count} item{selected.count === 1 ? '' : 's'}{outletFilter ? ` · ${outletFilter}` : ''}</h2>
        <p className="text-[13px] text-gray mb-3">Click an item to see the matched text.{outletFilter && <button className="ml-2 text-brand underline" onClick={() => setOutletFilter(null)}>Show all outlet types</button>}</p>
        <ul className="divide-y divide-line border-t border-line overflow-y-auto max-h-[360px]">
          {listItems.map(i => <li key={i.id}>
            <button className="w-full text-left py-2.5 hover:bg-offwhite px-1" onClick={() => openEvidence({ itemId: i.id, findingId: `${i.id}:msg:${selected.messageId}` })}>
              <div className="text-[14px] font-medium text-charcoal leading-snug">{i.headline}</div>
              <div className="text-[12px] text-gray">{i.outlet} · {i.outletType} · {fmtDate(i.date)}</div>
            </button>
          </li>)}
        </ul>
      </section>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[18px]">Tone split</h2><AIBadge /></div>
        <div className="flex h-7 w-full bg-line">
          {(['positive', 'neutral', 'negative'] as Tone[]).filter(t => toneCounts[t]).map(t =>
            <div key={t} className="h-full grid place-items-center text-[11px] font-bold text-white" style={{ width: `${(toneCounts[t] / items.length) * 100}%`, background: TONE_STYLE[t].hex }}>{toneCounts[t]}</div>)}
        </div>
        <dl className="mt-4 space-y-2">
          {(['positive', 'neutral', 'negative'] as Tone[]).map(t => <div key={t} className="flex items-start gap-3 text-[13px]">
            <ToneTag tone={t} className="shrink-0 w-24" /><dd className="text-gray">{toneCounts[t]} of {items.length} · {TONE_DEFINITIONS[t]}</dd></div>)}
        </dl>
      </section>
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[18px]">Source breakdown</h2><span className="text-[12px] text-gray">Items by outlet type</span></div>
        <div className="space-y-3">
          {sourceCounts.map(s => <div key={s.t} className="flex items-center gap-3 text-[13px]">
            <span className="w-40 shrink-0 text-charcoal">{s.t}</span>
            <div className="flex-1 h-4 bg-line"><div className="h-4" style={{ width: `${(s.n / items.length) * 100}%`, background: OUTLET_COLORS[s.t] }} /></div>
            <span className="w-14 text-right tabular-nums text-gray">{s.n} · {Math.round((s.n / items.length) * 100)}%</span>
          </div>)}
        </div>
      </section>
    </div>
    <StepNav next={5} nextLabel="See gaps & patterns" />
  </div>
}
