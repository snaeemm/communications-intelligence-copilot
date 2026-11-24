import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../state/store'
import { Highlighted } from './Highlighted'
import { ActionPill, Change } from './AuditBits'
import { formatWhen } from '../engine'
import { ConfidenceMeter, ReviewBadge, StatusPill, ToneTag, fmtDate } from './ui'
import { EvidenceCheck } from './EvidenceCheck'

/** Global evidence inspector: any "AI classification" anywhere opens this via openEvidence({itemId, findingId}). */
export function EvidenceDrawer() {
  const { state, closeEvidence, items, findings, validated, keyMessages, auditFor } = useApp()
  const t = state.evidence
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (t) ref.current?.focus() }, [t])
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && closeEvidence(); window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true) }, [closeEvidence])
  if (!t) return null
  const item = items.find(i => i.id === t.itemId)!
  const focus = findings.find(f => f.id === t.findingId)
  const vf = validated.find(f => f.id === t.findingId)
  const msg = focus?.messageId ? keyMessages.find(m => m.id === focus.messageId) : undefined
  const matches = focus ? focus.matches : []
  return <div ref={ref} tabIndex={-1} onKeyDown={e => { if (e.key === 'Escape') closeEvidence() }} className="fixed inset-0 z-50 no-print outline-none" role="dialog" aria-modal="true" aria-label="Evidence inspector">
    <div className="absolute inset-0 bg-charcoal/50 backdrop-in" onClick={closeEvidence} />
    <aside className="absolute right-0 top-0 h-full w-full max-w-[680px] bg-white shadow-2xl overflow-y-auto drawer-in">
      <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex items-start justify-between gap-4">
        <div><div className="kicker mb-1">Evidence inspector</div>
          <div className="font-bold text-charcoal text-[18px] leading-snug">{item.headline}</div>
          <div className="text-[13px] text-gray mt-1">{item.outlet} · {item.outletType} · {fmtDate(item.date)} · {item.id}</div></div>
        <button onClick={closeEvidence} aria-label="Close" className="p-1 hover:bg-offwhite"><X /></button>
      </div>
      <div className="px-6 py-5">
        {focus && vf && <div className="mb-5 p-4 bg-offwhite border border-line">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-bold text-charcoal">{focus.kind === 'tone' ? 'Tone classification' : `Message ${focus.messageId}: ${msg?.label}`}</div>
            <span className="flex items-center gap-2"><ReviewBadge reviewed={vf.reviewed} /><StatusPill status={vf.status} /></span>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap text-[14px]">
            <span>Engine said:</span>
            {focus.kind === 'tone' ? <ToneTag tone={focus.aiTone!} /> : <strong>{focus.aiPresent ? 'Present' : 'Absent'}</strong>}
            <ConfidenceMeter value={focus.confidence} />
            {vf.reviewed && <><span>· Human validated:</span>{focus.kind === 'tone' ? <ToneTag tone={vf.tone!} /> : <strong>{vf.present ? 'Present' : 'Absent'}</strong>}</>}
          </div>
          <p className="text-[13px] text-gray mt-2">
            {matches.length ? `${matches.length} matched ${focus.kind === 'tone' ? 'sentiment terms' : 'span(s)'} highlighted below.` : 'No matching text was found — the rules marked this as absent. The full item is shown so you can verify.'}
          </p>
        </div>}
        {focus && <EvidenceCheck finding={focus} item={item} />}
        {focus && <div className="mb-5 border border-line">
          <div className="px-4 py-2 bg-offwhite text-[11px] uppercase tracking-[0.14em] font-bold text-gray">Decision history</div>
          {(() => { const h = [...auditFor(focus.id)].reverse(); return h.length === 0
            ? <div className="px-4 py-3 text-[13px] text-gray">No human decision yet — this finding is still auto-generated and pending review.</div>
            : <ul>{h.map(e => <li key={e.seq} className="px-4 py-2.5 border-t border-line first:border-t-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <ActionPill action={e.action} /><Change e={e} />
                <span className="ml-auto text-gray">{e.reviewerName} <span className="text-[11px]">({e.reviewerRole})</span> · {formatWhen(e.at)}</span></li>)}</ul> })()}
        </div>}
        <article className="text-[16px] leading-[1.75] text-body whitespace-pre-line">
          <Highlighted text={item.text} matches={matches} toneMode={focus?.kind === 'tone'} />
        </article>
        <p className="mt-6 text-[12px] text-gray">Source: synthetic coverage item {item.id}. Highlights come from the local rules engine's character offsets — nothing is inferred beyond the marked text.</p>
      </div>
    </aside>
  </div>
}
