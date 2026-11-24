import { useState, type ReactNode } from 'react'
import { Check, ClipboardList, HelpCircle, Lock, RotateCcw } from 'lucide-react'
import { Methodology } from './Methodology'
import logo from '../assets/logo.png'
import { STEPS, useApp } from '../state/store'

export function Header() {
  const { reset, reviewedCount, totalFindings, staff, reviewer, setReviewer, audit, setAuditOpen } = useApp()
  const [about, setAbout] = useState(false)
  return <header className="app-header bg-white border-b border-line no-print">
    <div className="max-w-[1480px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <img src={logo} alt="ruderfinn atteline wordmark" className="h-9 w-auto" />
        <div className="hidden md:block border-l border-line pl-4 leading-tight">
          <div className="font-bold text-charcoal text-[15px]">Communications Intelligence Copilot</div>
          <div className="text-[12px] text-gray">From Coverage to Client Counsel</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden lg:inline text-[11px] uppercase tracking-[0.14em] font-bold text-gray border border-line px-2 py-1" title="Synthetic data, rules-based engine">Candidate POC · Synthetic data</span>
        <span className="hidden sm:inline text-[12px] text-gray tabular-nums">{reviewedCount}/{totalFindings} reviewed</span>
        <label className="hidden md:flex items-center gap-1.5 text-[12px] text-gray" title="Demo identity picker with fictional staff — actions are attributed to this reviewer. Not authentication.">Reviewing as
          <select value={reviewer.id} onChange={e => setReviewer(e.target.value)} aria-label="Reviewing as" className="border border-line bg-white text-charcoal text-[13px] px-1.5 py-1 max-w-[150px]">{staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <button className="flex items-center gap-1.5 text-[13px] text-gray hover:text-charcoal" onClick={() => setAuditOpen(true)}><ClipboardList size={15} />Audit trail<span className="tabular-nums text-[11px] bg-offwhite border border-line px-1.5">{audit.length}</span></button>
        <button className="flex items-center gap-1.5 text-[13px] text-gray hover:text-charcoal" onClick={() => setAbout(true)}><HelpCircle size={15} />How this works</button>
        <button className="btn-outline !py-1.5 !text-[13px]" onClick={() => { if (confirm('Reset the demo to its pristine state?')) reset() }}><RotateCcw size={14} />Reset demo</button>
      </div>
    </div>
    {about && <Methodology onClose={() => setAbout(false)} />}
  </header>
}

export function StepBar() {
  const { state, go, isLocked } = useApp()
  return <nav aria-label="Journey progress" className="bg-white border-b border-line no-print sticky top-0 z-30">
    <ol className="max-w-[1680px] mx-auto px-6 flex overflow-x-auto">
      {STEPS.map(s => {
        const active = state.step === s.n, done = s.n < state.step, locked = isLocked(s.n)
        return <li key={s.n} className="flex-1 min-w-[120px]">
          <button disabled={locked} onClick={() => go(s.n)} aria-current={active ? 'step' : undefined}
            title={locked ? 'Complete the human review (step 7) to unlock' : s.label}
            className={`w-full text-left py-3 pr-2 border-b-2 transition-colors ${active ? 'border-brand' : 'border-transparent'} ${locked ? 'opacity-45 cursor-not-allowed' : 'hover:bg-offwhite'}`}>
            <span className="flex items-center gap-1.5 px-1.5">
              <span className={`w-5 h-5 shrink-0 grid place-items-center text-[11px] font-bold rounded-full ${active ? 'bg-brand text-white' : done ? 'bg-palegreen text-brand' : 'bg-line text-gray'}`}>
                {locked ? <Lock size={10} /> : done ? <Check size={12} /> : s.n}
              </span>
              <span className={`text-[12.5px] whitespace-nowrap ${active ? 'font-bold text-charcoal' : 'text-gray'}`}>{s.label}</span>
            </span>
          </button>
        </li>
      })}
    </ol>
  </nav>
}

export function Footer() {
  return <footer className="no-print border-t border-line bg-white mt-12">
    <div className="max-w-[1480px] mx-auto px-6 py-4 flex flex-wrap justify-between gap-2 text-[12px] text-gray">
      <span>Candidate-built demonstration — synthetic data, not an Atteline product.</span>
      <span>Rules-based analysis by a local, deterministic engine · no language model, no external services · figures are illustrative / pilot sample</span>
    </div>
  </footer>
}

/** Bottom-of-screen navigation row. */
export function StepNav({ next, nextLabel, disabled, note }: { next?: number; nextLabel?: string; disabled?: boolean; note?: ReactNode }) {
  const { state, go } = useApp()
  const prev = state.step - 1
  return <div className="no-print mt-8 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
    {prev >= 1 ? <button className="btn-outline" onClick={() => go(prev)}>← Back</button> : <span />}
    <div className="flex items-center gap-4">
      {note && <span className="text-[13px] text-gray">{note}</span>}
      {next && <button className="btn-primary" disabled={disabled} onClick={() => go(next)}>{nextLabel ?? 'Continue'} <span className="arrow">→</span></button>}
    </div>
  </div>
}
