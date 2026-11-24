import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ChevronDown, FileSearch, MessageSquare, Send, User } from 'lucide-react'
import { useApp } from '../state/store'
import { ASK_QUESTIONS, askText, type AskAnswer } from '../engine'
import { HumanBadge, PageHeader } from '../components/ui'
import { StepNav } from '../components/Shell'

interface Turn { text: string; typed: boolean; answer?: AskAnswer }

/** Guided demo: suggested questions or typed questions, matched to the reviewed data by deterministic rules. No language model. */
export default function AskScreen() {
  const { items, keyMessages, validated, validatedPenetration, aiPenetration, validatedTone, openEvidence, audit, state, validatedRecommendation } = useApp()
  const [turns, setTurns] = useState<Turn[]>([])
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => { if (turns.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [turns])

  const data = () => ({ items, keyMessages, validated, validatedPenetration, aiPenetration, validatedTone, audit, recommendation: { text: state.recText ?? validatedRecommendation, approved: state.recApproved } })
  const push = (text: string, typed: boolean, compute: () => AskAnswer) => {
    const idx = turns.length
    setTurns(t => [...t, { text, typed }])
    // cosmetic, fixed-duration pause; the answer is computed instantly from the data
    timers.current.push(window.setTimeout(() => { const answer = compute(); setTurns(t => t.map((x, i) => i === idx ? { ...x, answer } : x)) }, 600))
  }
  const askSuggested = (qid: string) => { const q = ASK_QUESTIONS.find(x => x.id === qid)!; push(q.text, false, () => q.answer(data())) }
  const submit = (e: FormEvent) => { e.preventDefault(); const text = draft.trim(); if (!text) return; setDraft(''); push(text, true, () => askText(text, data())) }

  return <div>
    <PageHeader kicker="Step 12 · Ask the Campaign" title="Ask the Campaign"
      lead="Pick a question or type your own. Answers are calculated from the reviewed findings."
      right={<span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold border border-charcoal text-charcoal px-2.5 py-1 bg-white"><MessageSquare size={12} />Guided demo · No live LLM</span>} />

    <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
      <aside className="card p-4 lg:sticky lg:top-24">
        <div className="kicker mb-3">Suggested questions</div>
        <div className="flex flex-col gap-2">
          {ASK_QUESTIONS.map(q => {
            const asked = turns.some(t => !t.typed && t.text === q.text)
            return <button key={q.id} onClick={() => askSuggested(q.id)}
              className={`text-left text-[15px] px-3.5 py-3 border transition-colors ${asked ? 'border-brand/60 bg-palegreen' : 'border-line bg-white hover:border-brand hover:bg-offwhite'}`}>
              {q.text}</button>
          })}
        </div>
        <p className="text-[12px] text-gray mt-3">Based on the human-validated set.</p>
      </aside>

      <section className="card flex flex-col min-h-[460px]" aria-live="polite">
        <div className="p-6 flex-1">
          {turns.length === 0 && <div className="min-h-[300px] grid place-items-center text-center text-gray">
            <div><MessageSquare className="mx-auto mb-3 text-line" size={36} /><div className="text-[17px] text-charcoal font-bold">Choose or type a question to begin</div>
              <div className="text-[14px] mt-1">Each answer links to the source articles it came from.</div></div></div>}
          <div className="space-y-6">
            {turns.map((t, i) => <div key={i} className="fade-in">
              <div className="flex justify-end"><div className="max-w-[80%] bg-charcoal text-white px-4 py-2.5 text-[15px] flex items-center gap-2"><User size={14} className="shrink-0" />{t.text}</div></div>
              {!t.answer
                ? <div className="mt-3 flex gap-1.5 px-1 py-3" aria-label="Preparing answer">{[0, 1, 2].map(d => <span key={d} className="w-2 h-2 rounded-full bg-gray/50" style={{ animation: `pulse 1s ${d * 0.15}s infinite` }} />)}</div>
                : <AnswerCard a={t.answer} idx={i} open={!!open[i]} toggle={() => setOpen(o => ({ ...o, [i]: !o[i] }))} openEvidence={openEvidence}
                    ask={askSuggested} />}
            </div>)}
            <div ref={endRef} />
          </div>
        </div>
        <form onSubmit={submit} className="border-t border-line p-4 flex items-center gap-3 bg-offwhite">
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={200} autoComplete="off"
            aria-label="Ask a question about this campaign" placeholder="Type a question about the reviewed campaign data…"
            className="flex-1 border border-line bg-white px-4 py-3 text-[16px] focus:border-brand outline-none" />
          <button type="submit" className="btn-primary" disabled={!draft.trim()}><Send size={14} />Ask</button>
        </form>
      </section>
    </div>
    <StepNav />
  </div>
}

function AnswerCard({ a, idx, open, toggle, openEvidence, ask }: { a: AskAnswer; idx: number; open: boolean; toggle: () => void; openEvidence: (t: { itemId: string; findingId?: string }) => void; ask: (id: string) => void }) {
  const unsupported = a.kind === 'unsupported'
  return <div className={`mt-3 border-l-4 p-5 fade-in ${unsupported ? 'border-accent bg-paleorange/50' : 'border-brand bg-offwhite'}`}>
    {a.understoodAs && !unsupported && <div className="text-[12px] text-gray mb-1.5">Understood as: <em className="not-italic text-charcoal">{a.understoodAs}</em></div>}
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <h2 className="text-[22px] leading-snug max-w-[44rem] flex items-start gap-2">{unsupported && <AlertCircle size={22} className="text-charcoal shrink-0 mt-1" />}{a.headline}</h2>
      {unsupported
        ? <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-charcoal text-charcoal bg-white">Not supported</span>
        : a.status === 'pending'
          ? <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-accent/70 bg-paleorange text-charcoal">Proposed · pending approval</span>
          : <HumanBadge />}
    </div>
    {a.detail && <p className="text-[16px] mt-2 text-body">{a.detail}</p>}
    {a.bullets && <>{unsupported && <div className="text-[12px] uppercase tracking-[0.12em] font-bold text-gray mt-3">What I can answer</div>}
      <ul className="mt-2 space-y-2 text-[16px] list-disc pl-5">{a.bullets.map(b => <li key={b}>{b}</li>)}</ul></>}
    {a.stats && a.stats.length > 0 && <div className="mt-4 space-y-2.5 max-w-[34rem]">
      {a.stats.map(s => <div key={s.label} className="grid grid-cols-[170px_1fr_90px] items-center gap-3 text-[14px]">
        <span className="text-charcoal">{s.label}</span>
        <div className="h-3 bg-line"><div className="h-3 bg-brand" style={{ width: `${s.pct ?? 0}%` }} /></div>
        <span className="tabular-nums text-right font-bold text-charcoal">{s.value}</span></div>)}</div>}
    {a.suggestions && <div className="mt-4 flex flex-wrap gap-2">{a.suggestions.map(id => { const q = ASK_QUESTIONS.find(x => x.id === id)!; return <button key={id} onClick={() => ask(id)} className="px-3 py-1.5 text-[13px] border border-brand/50 text-brand bg-white hover:bg-palegreen">{q.text}</button> })}</div>}
    {a.evidence.length > 0 && <div className="mt-4"><div className="text-[11px] uppercase tracking-[0.14em] font-bold text-gray mb-1.5 flex items-center gap-1.5"><FileSearch size={12} />Evidence</div>
      <div className="flex flex-wrap gap-2">{a.evidence.map(e => <button key={e.label} onClick={() => openEvidence({ itemId: e.itemId, findingId: e.findingId })}
        className="px-2.5 py-1 text-[13px] font-medium text-brand border border-brand/50 bg-white hover:bg-palegreen">[{e.label}]</button>)}</div></div>}
    <button className="mt-4 text-[13px] text-gray hover:text-charcoal flex items-center gap-1" onClick={toggle} aria-expanded={open}>
      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />How this was calculated</button>
    {open && <ul className="mt-2 text-[13px] text-gray space-y-1 list-disc pl-5 fade-in">{a.method.map(m => <li key={`${idx}-${m}`}>{m}</li>)}</ul>}
  </div>
}
