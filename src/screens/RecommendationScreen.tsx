import { useState } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { useApp } from '../state/store'
import { StepNav } from '../components/Shell'
import { ValuePanel } from '../components/ValuePanel'
import { AIBadge, HumanBadge, PageHeader } from '../components/ui'

export default function RecommendationScreen() {
  const { state, validatedRecommendation, validatedPenetration, validated, setRec, openEvidence, go, reset } = useApp()
  const seed = state.recText ?? validatedRecommendation
  const [text, setText] = useState(seed)
  const accepted = state.recApproved
  const low = [...validatedPenetration].sort((a, b) => a.pct - b.pct || a.messageId.localeCompare(b.messageId))[0]
  const evidence = validated.filter(v => v.kind === 'message' && v.messageId === low.messageId && v.present)
  const edited = text !== validatedRecommendation

  return <div>
    <PageHeader kicker="Step 11 · Recommendation" title="From pattern to decision"
      lead="The engine proposes. A person decides what goes to the client." />
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
      <section className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[18px]">Proposed recommendation</h2>
          {accepted ? <HumanBadge /> : <AIBadge />}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} aria-label="Recommendation text"
          className="w-full p-3 border border-line text-[16px] focus:border-brand outline-none" />
        <div className="flex flex-wrap items-center gap-3 mt-4 no-print">
          <button className="btn-primary" disabled={accepted && !edited && text === state.recText} onClick={() => setRec(text, true)}>{edited ? 'Save edit & accept' : 'Accept'}</button>
          {edited && <button className="btn-outline" onClick={() => setText(validatedRecommendation)}>Restore suggestion</button>}
        </div>
        {accepted && <div className="mt-5 p-4 bg-palegreen border border-brand/40 flex items-start gap-3 fade-in">
          <CheckCircle2 className="text-brand shrink-0 mt-0.5" size={20} />
          <div><div className="font-bold text-charcoal">Appended to briefing</div>
            <button className="btn-outline mt-2" onClick={() => go(8)}>View it in the briefing</button></div>
        </div>}
      </section>

      <aside className="space-y-4">
        <div className="card p-5">
          <div className="kicker mb-2">Derived from</div>
          <div className="text-[15px]"><strong>Message {low.messageId}</strong> · {low.label}</div>
          <div className="text-[32px] font-bold text-charcoal mt-1 tabular-nums">{low.pct}% <span className="text-[13px] font-light text-gray">{low.count} of {low.total} items · illustrative</span></div>
          <div className="mt-3 text-[13px] text-gray">Evidence:</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {evidence.length ? evidence.map(v => <button key={v.id} className="text-brand font-medium hover:underline text-[13px]" onClick={() => openEvidence({ itemId: v.itemId, findingId: v.id })}>[{v.itemId}]</button>) : <span className="text-[13px] text-gray">No items contain this message.</span>}
          </div>
        </div>
        <div className="card p-5 bg-charcoal text-white border-charcoal">
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/60 mb-2">Journey complete</div>
          <p className="text-[16px] text-white">The rules engine surfaced the pattern, a human made the decision.</p>
          <button className="btn-outline mt-4 !text-white !border-white/60 hover:!bg-white/10" onClick={() => reset()}><RotateCcw size={14} />Restart demo</button>
        </div>
      </aside>
    </div>
    <ValuePanel />
    <StepNav next={12} nextLabel="Ask the Campaign" />
  </div>
}
