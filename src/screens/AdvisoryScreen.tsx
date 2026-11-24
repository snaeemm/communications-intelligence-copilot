import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, FileSearch, HelpCircle, Play, Users } from 'lucide-react'
import { useApp } from '../state/store'
import { runAdvisory, type AdvisoryPoint, type Persona, type StanceKind } from '../engine'
import { PageHeader } from '../components/ui'
import { StepNav } from '../components/Shell'

const BAR: Record<string, string> = { strategist: 'border-t-brand', analyst: 'border-t-charcoal', advocate: 'border-t-accent', evidence: 'border-t-gray' }
const STANCE: Record<StanceKind, string> = {
  revisit: 'bg-palegreen text-[#1d7335] border-brand/50', hold: 'bg-offwhite text-charcoal border-line', challenge: 'bg-charcoal text-white border-charcoal',
  question: 'bg-paleorange text-charcoal border-accent/70', 'support-with-limits': 'bg-white text-charcoal border-gray/60', insufficient: 'bg-paleneg text-neg border-neg/40'
}
const STEP_MS = 520

/** Simulated advisory panel: four rule-based perspectives over the same reviewed state. Not LLM agents. */
export default function AdvisoryScreen() {
  const { items, keyMessages, client, validated, validatedPenetration, aiPenetration, reviewComplete, state, validatedRecommendation, openEvidence, logEvent, reviewedCount, totalFindings } = useApp()
  const [shown, setShown] = useState(-1)           // -1 = not run; 0..3 = personas revealed; 4 = synthesis revealed
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const result = runAdvisory({ items, keyMessages, client: { name: client.name, objective: client.objective, audiences: client.audiences }, validated, validatedPenetration, aiPenetration, reviewComplete,
    recommendation: { text: state.recText ?? validatedRecommendation, approved: state.recApproved } })

  const run = () => {
    timers.current.forEach(clearTimeout); timers.current = []
    setShown(0)
    logEvent({ action: 'advisory-run', subject: 'Advisory review', note: 'Simulated panel run over the reviewed results' })
    for (let i = 1; i <= 4; i++) timers.current.push(window.setTimeout(() => setShown(i), i * STEP_MS))
  }
  const ran = shown >= 0
  const evaluating = (i: number) => ran && shown <= i

  return <div>
    <PageHeader kicker="Step 10 · Advisory panel" title="Challenge the findings before the client sees them"
      lead="Four perspectives review the same reviewed results."
      right={<span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold border border-charcoal text-charcoal px-2.5 py-1 bg-white"><Users size={12} />Simulated advisory panel · No live LLM</span>} />

    <div className="card p-5 mb-6 flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="min-w-[200px]"><div className="kicker mb-1">Results under review</div>
        <div className="text-[14px] text-gray">{reviewedCount} of {totalFindings} findings human-reviewed · {items.length} eligible articles</div></div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 flex-1">{validatedPenetration.map(p => <div key={p.messageId} className="min-w-[150px]">
        <div className="flex justify-between text-[13px]"><span className="text-charcoal font-medium">Message {p.messageId}</span><span className="tabular-nums font-bold text-charcoal">{p.pct}%</span></div>
        <div className="h-2 bg-line mt-1"><div className="h-2 bg-brand" style={{ width: `${p.pct}%` }} /></div></div>)}</div>
      <button className={ran ? 'btn-outline' : 'btn-primary'} onClick={run}><Play size={14} />{ran ? 'Run again' : 'Run Advisory Review'}</button>
    </div>

    {!ran && <div className="card p-10 text-center text-gray"><Users className="mx-auto mb-3 text-line" size={36} />
      <div className="text-[17px] text-charcoal font-bold">Four perspectives, one set of reviewed results</div>
      <div className="text-[14px] mt-1 max-w-xl mx-auto">Each perspective applies its own rules, so they can disagree. Run the review to see where.</div></div>}

    {ran && <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
      {result.personas.map((p, i) => <PersonaCard key={p.id} p={p} loading={evaluating(i)} openEvidence={openEvidence} />)}
    </div>}

    {shown >= 4 && <section className="card mt-6 p-6 fade-in" aria-label="Synthesis">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div><div className="kicker mb-1">Synthesis</div><h2 className="text-[24px]">What is supported, what is disputed, what to do next</h2></div>
        <span className="text-[11px] uppercase tracking-[0.14em] font-bold px-2.5 py-1 border border-accent/70 bg-paleorange text-charcoal">Simulated · needs human approval</span>
      </div>
      <div className="grid lg:grid-cols-4 gap-6">
        <Col title="Areas of agreement" accent="border-brand"><ul className="space-y-2">{result.synthesis.agree.map(a => <li key={a} className="flex gap-2"><Check size={15} className="text-brand shrink-0 mt-1" />{a}</li>)}</ul></Col>
        <Col title="Areas of disagreement" accent="border-accent">
          {result.synthesis.disagree.length === 0 ? <p className="text-gray">No material disagreement on the current results.</p>
            : <div className="space-y-4">{result.synthesis.disagree.map(d => <div key={d.topic}><div className="font-bold text-charcoal mb-1">{d.topic}</div>
              {d.sides.map(s => <div key={s.persona} className="mb-1.5"><span className="text-[11px] uppercase tracking-wider font-bold text-gray">{s.persona}</span><div>{s.position}</div></div>)}</div>)}</div>}
        </Col>
        <Col title="Missing evidence or uncertainty" accent="border-gray"><ul className="space-y-2">{result.synthesis.missing.map(m => <li key={m} className="flex gap-2"><HelpCircle size={15} className="text-gray shrink-0 mt-1" />{m}</li>)}</ul></Col>
        <Col title="Recommended next steps" accent="border-charcoal"><ol className="space-y-2 list-decimal pl-5">{result.synthesis.next.map(n => <li key={n}>{n}</li>)}</ol></Col>
      </div>
      <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[13px]"><span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-gray"><FileSearch size={12} />Sources</span>
          {result.synthesis.refs.map(e => <button key={e.label} onClick={() => openEvidence({ itemId: e.itemId, findingId: e.findingId })} className="px-2.5 py-1 font-medium text-brand border border-brand/50 bg-white hover:bg-palegreen">[{e.label}]</button>)}</div>
        <p className="text-[13px] text-gray max-w-xl">{result.synthesis.approval}</p>
      </div>
    </section>}

    <StepNav next={11} nextLabel="Client recommendation" />
  </div>
}

function Col({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return <div className={`border-t-4 ${accent} pt-3 text-[14px] leading-snug`}><div className="text-[11px] uppercase tracking-[0.14em] font-bold text-gray mb-2">{title}</div>{children}</div>
}

function PersonaCard({ p, loading, openEvidence }: { p: Persona; loading: boolean; openEvidence: (t: { itemId: string; findingId?: string }) => void }) {
  return <article className={`card border-t-4 ${BAR[p.id]} p-5 min-h-[260px] fade-in`}>
    <div className="flex items-start justify-between gap-2">
      <div><h3 className="text-[19px] leading-tight">{p.name}</h3><div className="text-[12px] text-gray mt-0.5">{p.remit}</div></div>
    </div>
    {loading
      ? <div className="mt-6 flex gap-1.5" aria-label={`${p.name} is evaluating`}>{[0, 1, 2].map(d => <span key={d} className="w-2 h-2 rounded-full bg-gray/50" style={{ animation: `pulse 1s ${d * 0.15}s infinite` }} />)}</div>
      : <>
        <span className={`inline-block mt-3 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${STANCE[p.stance.kind]}`}>{p.stance.label}</span>
        <ul className="mt-3 space-y-3 text-[14px] leading-snug">{p.points.map(pt => <Point key={pt.text} pt={pt} openEvidence={openEvidence} />)}</ul>
        <p className="mt-3 text-[12px] text-gray italic">Limit: {p.limits}</p>
        <div className="mt-3 text-[10px] uppercase tracking-[0.14em] font-bold text-gray/80">Simulated perspective · rule-based</div>
      </>}
  </article>
}

function Point({ pt, openEvidence }: { pt: AdvisoryPoint; openEvidence: (t: { itemId: string; findingId?: string }) => void }) {
  const icon = pt.status === 'supported' ? <Check size={14} className="text-brand" /> : pt.status === 'assumption' ? <AlertTriangle size={14} className="text-charcoal" /> : <HelpCircle size={14} className="text-gray" />
  const label = pt.status === 'supported' ? 'Supported' : pt.status === 'assumption' ? 'Assumption' : 'Not established'
  return <li className="flex gap-2"><span className="shrink-0 mt-0.5" title={label} aria-label={label}>{icon}</span>
    <span>{pt.text}{pt.status !== 'supported' && <span className="ml-1.5 text-[10px] uppercase tracking-wider font-bold text-gray">{label}</span>}
      {pt.refs.length > 0 && <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">{pt.refs.slice(0, 4).map(e => <button key={e.label} onClick={() => openEvidence({ itemId: e.itemId, findingId: e.findingId })} className="px-1.5 py-0 text-[11px] font-medium text-brand border border-brand/40 hover:bg-palegreen">[{e.label}]</button>)}</span>}
    </span></li>
}
