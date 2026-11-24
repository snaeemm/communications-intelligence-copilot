import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Skeleton, fmtDate, useCosmeticLoading } from '../components/ui'
import { PageHeader } from '../components/ui'
import { StepNav } from '../components/Shell'
import { useApp } from '../state/store'

export default function CoverageScreen() {
  const { items, excluded, period } = useApp()
  const loading = useCosmeticLoading(500)
  const [filter, setFilter] = useState<string>('All')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const types = [...new Set(items.map(i => i.outletType))]
  const shown = filter === 'All' ? items : items.filter(i => i.outletType === filter)
  return <div>
    <PageHeader kicker="Step 2 · Coverage" title={`${items.length} coverage items ready for analysis`}
      lead="A pilot sample, already imported. Every item is synthetic and fictional." />
    <div className="card p-4 mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-[14px]" aria-label="Data preparation">
      <span className="kicker">Data preparation</span>
      <span><strong className="tabular-nums">{items.length + excluded.length}</strong> imported</span>
      <span><strong className="tabular-nums text-brand">{items.length}</strong> eligible for analysis</span>
      <span><strong className="tabular-nums">{excluded.length}</strong> excluded{excluded.length ? ` (${excluded.map(e => `${e.item.id}: ${e.reason.replace('-', ' ')}`).join(', ')})` : ' — no duplicates or incomplete records'}</span>
      <span className="text-gray">Reporting window: {period}</span>
    </div>
    {loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div> : <>
      <div className="flex flex-wrap gap-3 mb-6">
        {['All', ...types].map(t => {
          const n = t === 'All' ? items.length : items.filter(i => i.outletType === t).length
          const on = filter === t
          return <button key={t} onClick={() => setFilter(t)} className={`card px-4 py-3 text-left min-w-[150px] ${on ? 'border-brand bg-palegreen' : 'hover:bg-offwhite'}`}>
            <div className="text-[28px] font-bold text-charcoal leading-none tabular-nums">{n}</div>
            <div className="text-[12px] text-gray mt-1">{t === 'All' ? 'All outlets' : t}</div></button>
        })}
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map(i => <article key={i.id} className="card p-5 flex flex-col">
          <div className="flex items-center justify-between text-[12px] text-gray mb-2">
            <span className="px-2 py-0.5 bg-offwhite border border-line font-medium text-body">{i.outletType}</span><span>{fmtDate(i.date)}</span></div>
          <div className="text-[13px] text-brand font-bold">{i.outlet}</div>
          <h3 className="text-[17px] leading-snug mt-1 mb-2">{i.headline}</h3>
          <p className={`text-[14px] text-gray whitespace-pre-line ${open[i.id] ? '' : 'line-clamp-3'}`}>{i.text}</p>
          <button className="mt-3 text-brand text-[13px] flex items-center gap-1 self-start" onClick={() => setOpen(o => ({ ...o, [i.id]: !o[i.id] }))}>
            {open[i.id] ? <>Show less <ChevronUp size={14} /></> : <>Read full text <ChevronDown size={14} /></>}</button>
        </article>)}
      </div></>}
    <StepNav next={3} nextLabel="Run analysis" />
  </div>
}
