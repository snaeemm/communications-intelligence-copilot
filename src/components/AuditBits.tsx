import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileSearch, X } from 'lucide-react'
import { useApp } from '../state/store'
import { ACTION_LABEL, auditToCsv, formatWhen, summarizeAudit } from '../engine'
import type { AuditAction, AuditEntry } from '../data/types'

const TONE: Record<string, string> = {
  accepted: 'bg-palegreen text-[#1d7335] border-brand/40', corrected: 'bg-paleorange text-charcoal border-accent/60', rejected: 'bg-paleneg text-neg border-neg/40',
  undone: 'bg-white text-gray border-line', 'bulk-accepted': 'bg-palegreen text-[#1d7335] border-brand/40',
  'briefing-approved': 'bg-charcoal text-white border-charcoal', 'recommendation-accepted': 'bg-charcoal text-white border-charcoal', 'observation-approved': 'bg-charcoal text-white border-charcoal'
}
const DECISIONS: AuditAction[] = ['accepted', 'corrected', 'rejected', 'bulk-accepted']

export const ActionPill = ({ action }: { action: AuditAction }) =>
  <span className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap ${TONE[action] ?? 'bg-offwhite text-charcoal border-line'}`}>{ACTION_LABEL[action]}</span>

export const Change = ({ e }: { e: AuditEntry }) => e.from || e.to
  ? <span className="text-[13px]">{e.from && <span className="text-gray">{e.from}</span>}{e.from && e.to && <span className="mx-1.5 text-gray">→</span>}{e.to && <strong className="text-charcoal">{e.to}</strong>}</span>
  : e.count ? <span className="text-[13px] text-gray">{e.count} findings</span> : null

/** "Priya Nair · 8 Nov, 14:03:11" for a finding's latest decision. */
export function ByLine({ findingId }: { findingId: string }) {
  const { auditFor } = useApp()
  const last = [...auditFor(findingId)].reverse().find(e => DECISIONS.includes(e.action))
  if (!last) return null
  return <span className="text-[12px] text-gray" title={`${last.reviewerName}, ${last.reviewerRole}`}>by <strong className="text-charcoal font-medium">{last.reviewerName}</strong> · {formatWhen(last.at)}</span>
}

/** Header-launched panel: the complete append-only log of who changed what, and when. */
export function AuditPanel() {
  const { audit, state, setAuditOpen, openEvidence, staff } = useApp()
  const auditOpen = state.auditOpen
  const [who, setWho] = useState('all'); const [only, setOnly] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (auditOpen) { ref.current?.focus(); setWho('all'); setOnly(false) } }, [auditOpen])
  const rows = useMemo(() => [...audit].reverse().filter(e => (who === 'all' || e.reviewerId === who) && (!only || e.action !== 'accepted')), [audit, who, only])
  if (!auditOpen) return null
  const sum = summarizeAudit(audit)
  const close = () => setAuditOpen(false)
  const csv = () => { const url = URL.createObjectURL(new Blob([auditToCsv(audit)], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'review-audit-trail.csv'; a.click(); URL.revokeObjectURL(url) }
  return <div ref={ref} tabIndex={-1} onKeyDown={e => { if (e.key === 'Escape') close() }} className="fixed inset-0 z-[55] no-print outline-none" role="dialog" aria-modal="true" aria-label="Audit trail">
    <div className="absolute inset-0 bg-charcoal/50 backdrop-in" onClick={close} />
    <aside className="absolute right-0 top-0 h-full w-full max-w-[900px] bg-white overflow-y-auto drawer-in">
      <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex items-start justify-between gap-4 z-10">
        <div><div className="kicker mb-1">Audit trail</div>
          <div className="font-bold text-charcoal text-[20px]">Who changed what, and when</div>
          <div className="text-[13px] text-gray mt-1">{sum.total} event{sum.total === 1 ? '' : 's'} · {sum.reviewers} reviewer{sum.reviewers === 1 ? '' : 's'}{sum.first && <> · {formatWhen(sum.first)} → {formatWhen(sum.last!)}</>} · reviewers are fictional staff</div></div>
        <button onClick={close} aria-label="Close" className="p-1 hover:bg-offwhite"><X /></button>
      </div>
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-line bg-offwhite">
        <label className="text-[13px] flex items-center gap-2">Reviewer
          <select value={who} onChange={e => setWho(e.target.value)} className="border border-line bg-white px-2 py-1 text-[13px]"><option value="all">Everyone</option>{staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label className="text-[13px] flex items-center gap-2"><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} className="accent-[#2DA24A]" />Changes only (hide single approvals)</label>
        <button className="btn-outline !py-1 !text-[13px] ml-auto" onClick={csv} disabled={!audit.length}><Download size={13} />Export CSV</button>
      </div>
      {rows.length === 0
        ? <div className="px-6 py-16 text-center text-gray"><div className="text-charcoal font-bold text-[17px]">{audit.length ? 'No events match this filter' : 'No review activity yet'}</div><div className="text-[14px] mt-1">{audit.length ? '' : 'Every accept, correction, rejection and approval is recorded here with who did it and when.'}</div></div>
        : <table className="w-full text-[13px]">
          <thead className="text-left text-[11px] uppercase tracking-wider text-gray"><tr><th className="px-6 py-2 font-bold">When</th><th className="py-2 font-bold">Who</th><th className="py-2 font-bold">Action</th><th className="py-2 font-bold">What</th><th className="py-2 font-bold">Change</th><th className="pr-6" /></tr></thead>
          <tbody>{rows.map(e => <tr key={e.seq} className="border-t border-line align-top">
            <td className="px-6 py-2.5 whitespace-nowrap text-gray tabular-nums">{formatWhen(e.at)}</td>
            <td className="py-2.5 pr-3"><div className="text-charcoal font-medium">{e.reviewerName}</div><div className="text-[11px] text-gray">{e.reviewerRole}</div></td>
            <td className="py-2.5 pr-3"><ActionPill action={e.action} /></td>
            <td className="py-2.5 pr-3 text-charcoal">{e.subject}{e.note && <div className="text-[11px] text-gray">{e.note}</div>}</td>
            <td className="py-2.5 pr-3 max-w-[220px]"><Change e={e} /></td>
            <td className="py-2.5 pr-6 text-right">{e.itemId && e.findingId && <button title="Open the evidence" aria-label="Open the evidence" className="p-1 text-brand hover:bg-palegreen" onClick={() => { close(); openEvidence({ itemId: e.itemId!, findingId: e.findingId }) }}><FileSearch size={15} /></button>}</td>
          </tr>)}</tbody></table>}
    </aside>
  </div>
}
