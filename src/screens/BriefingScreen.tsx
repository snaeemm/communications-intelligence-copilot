import { useState } from 'react'
import { Check, Printer } from 'lucide-react'
import { ACTION_LABEL, formatWhen } from '../engine'
import { Change } from '../components/AuditBits'
import { useApp } from '../state/store'
import { StepNav } from '../components/Shell'
import { HumanBadge, Illustrative, PageHeader, TONE_STYLE, fmtDate } from '../components/ui'

export default function BriefingScreen() {
  const { client, keyMessages, items, excluded, period, notable, limits, reviewComplete, validated, validatedPenetration, validatedTone, validatedGap, state, setGap, approveBriefing, openEvidence, go, audit, setAuditOpen } = useApp()
  const briefingApproved = state.briefingApproved
  const signoff = briefingApproved ? [...audit].reverse().find(e => e.action === 'briefing-approved') : undefined
  const decisions = audit.filter(e => ['accepted', 'corrected', 'rejected', 'bulk-accepted'].includes(e.action))
  const decided = decisions.reduce((n, e) => n + (e.count ?? 1), 0)
  const changes = audit.filter(e => ['corrected', 'rejected', 'observation-edited', 'recommendation-edited'].includes(e.action))
  const people = [...new Set(audit.map(e => e.reviewerName))]
  const savedGap = state.gapText ?? validatedGap
  const [draft, setDraft] = useState(savedGap)
  const approved = state.gapApproved
  const dirty = draft !== savedGap
  const recText = state.recText ?? ''
  const recAppended = state.recApproved

  const tones = (['positive', 'neutral', 'negative'] as const).map(t => ({ t, n: items.filter(i => validatedTone[i.id] === t).length }))
  const present = (msgId: string) => validated.filter(v => v.kind === 'message' && v.messageId === msgId && v.present && v.reviewed)

  const Cite = ({ itemId, findingId }: { itemId: string; findingId: string }) => (
    <button onClick={() => openEvidence({ itemId, findingId })} className="text-brand font-medium hover:underline text-[13px]" title="Open source evidence">[{itemId}]</button>
  )

  return <div>
    <PageHeader kicker="Step 8 · Briefing" title="Evidence-backed briefing"
      lead="Compiled from the human-validated set only. Every citation opens its source."
      right={<button className="btn-primary no-print" onClick={() => window.print()}><Printer size={14} />Print / Export PDF</button>} />

    <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
      <div id="briefing-print" className="card p-8 md:p-10 space-y-8">
        <header className="border-b border-line pb-5">
          <div className="kicker mb-1">Campaign briefing</div>
          <h2 className="text-[28px] leading-tight">{client.campaign}</h2>
          <div className="text-[14px] text-gray mt-1">{client.name} · Reporting period: {period} <span className="text-gray/80">({client.period})</span></div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {briefingApproved
              ? <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider bg-palegreen text-brand border border-brand/50"><Check size={12} />Approved{signoff ? ` by ${signoff.reviewerName}, ${signoff.reviewerRole} · ${formatWhen(signoff.at)}` : ' by reviewer'}</span>
              : <span className="inline-flex px-2 py-1 text-[11px] font-bold uppercase tracking-wider bg-paleorange text-charcoal border border-accent/60">Draft — awaiting reviewer approval</span>}
            <HumanBadge /><Illustrative />
          </div>
          <p className="text-[13px] text-gray mt-3">Eligible analysed articles: <strong className="text-charcoal tabular-nums">{items.length}</strong>{excluded.length ? ` (${excluded.length} excluded as duplicate or incomplete)` : ''}</p>
        </header>

        <section>
          <h3 className="kicker !text-gray mb-2">Campaign objective</h3>
          <p className="text-[16px]">{client.objective}</p>
        </section>

        <section>
          <h3 className="kicker !text-gray mb-3">Priority key messages and reviewed penetration</h3>
          <table className="w-full text-[14px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray border-b border-line">
              <th className="py-2 pr-3">Message</th><th className="py-2 pr-3 w-[30%]">Penetration</th><th className="py-2 pr-3 whitespace-nowrap">Items</th><th className="py-2">Evidence</th></tr></thead>
            <tbody>
              {validatedPenetration.map(p => <tr key={p.messageId} className="border-b border-line align-top">
                <td className="py-3 pr-3"><span className="font-bold text-charcoal">{p.messageId}</span> · {p.label}</td>
                <td className="py-3 pr-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-line"><div className="h-2 bg-brand" style={{ width: `${p.pct}%` }} /></div><span className="font-bold tabular-nums">{p.pct}%</span></div></td>
                <td className="py-3 pr-3 tabular-nums whitespace-nowrap">{p.count} of {p.total}</td>
                <td className="py-3 space-x-1.5">{present(p.messageId).map(v => <Cite key={v.id} itemId={v.itemId} findingId={v.id} />)}{p.count === 0 && <span className="text-gray">None</span>}</td>
              </tr>)}
            </tbody>
          </table>
          <p className="text-[12px] text-gray mt-2">Penetration = eligible analysed articles carrying the message ÷ total eligible analysed articles × 100. Based on reviewer-validated findings.</p>
        </section>

        <section>
          <h3 className="kicker !text-gray mb-3">Tone of coverage</h3>
          <div className="flex h-3 w-full bg-line">
            {tones.map(({ t, n }) => n > 0 && <div key={t} style={{ width: `${(n / items.length) * 100}%`, background: TONE_STYLE[t].hex }} title={`${TONE_STYLE[t].label}: ${n}`} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
            {tones.map(({ t, n }) => <span key={t} className="inline-flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${TONE_STYLE[t].dot}`} />{TONE_STYLE[t].label} <strong className="tabular-nums">{n}</strong> <span className="text-gray">({Math.round((n / items.length) * 100)}%)</span></span>)}
          </div>
          <p className="text-[12px] text-gray mt-2">Tone as validated by a human reviewer, from {items.length} sampled items.</p>
        </section>

        <section>
          <h3 className="kicker !text-gray mb-2">Notable coverage findings</h3>
          <ul className="list-disc pl-5 space-y-1 text-[15px]">{notable.map(n => <li key={n}>{n}</li>)}</ul>
        </section>

        <section>
          <h3 className="kicker !text-gray mb-2">Gap and pattern (insight)</h3>
          {approved
            ? <div className="border-l-4 border-brand bg-palegreen/50 p-4"><p className="text-[16px]">{savedGap}</p><div className="mt-2"><HumanBadge /> <span className="text-[12px] text-gray ml-1">Approved by reviewer</span></div></div>
            : <p className="text-[14px] text-gray italic border-l-4 border-accent bg-paleorange/60 p-4">Pending approval — approve the observation in the panel to include it in this briefing.</p>}
        </section>

        <section>
          <h3 className="kicker !text-gray mb-2">Recommended next action</h3>
          {recAppended
            ? <div className="border-l-4 border-brand bg-palegreen/50 p-4"><p className="text-[16px]">{recText}</p><div className="mt-2"><HumanBadge /> <span className="text-[12px] text-gray ml-1">Approved by reviewer</span></div></div>
            : <p className="text-[14px] text-gray italic border-l-4 border-accent bg-paleorange/60 p-4">Recommendation pending — accept or edit it in step 11.</p>}
        </section>

        <section>
          <h3 className="kicker !text-gray mb-2">Gaps and limitations</h3>
          <ul className="list-disc pl-5 space-y-1 text-[14px] text-body">{limits.map(l => <li key={l}>{l}</li>)}</ul>
        </section>

        <section>
          <h3 className="kicker !text-gray mb-2">Review log</h3>
          <p className="text-[14px] text-body">{decided} finding decisions recorded{people.length ? <> by {people.join(', ')}</> : ''}. {changes.length ? `${changes.length} change${changes.length === 1 ? '' : 's'} to the automatic output:` : 'No changes were made to the automatic output.'}</p>
          {changes.length > 0 && <table className="w-full text-[13px] mt-2"><tbody>{changes.map(e => <tr key={e.seq} className="border-t border-line align-top">
            <td className="py-2 pr-3 whitespace-nowrap text-gray tabular-nums">{formatWhen(e.at)}</td>
            <td className="py-2 pr-3 text-charcoal font-medium whitespace-nowrap">{e.reviewerName}</td>
            <td className="py-2 pr-3 whitespace-nowrap">{ACTION_LABEL[e.action]}</td>
            <td className="py-2 pr-3">{e.subject}</td>
            <td className="py-2"><Change e={e} /></td></tr>)}</tbody></table>}
          <button className="no-print mt-3 text-[13px] text-brand font-medium hover:underline" onClick={() => setAuditOpen(true)}>View full audit trail</button>
        </section>

        <section>
          <h3 className="kicker !text-gray mb-3">Source coverage cited</h3>
          <ul className="text-[13px] grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {items.filter(i => keyMessages.some(m => present(m.id).some(v => v.itemId === i.id))).map(i => <li key={i.id}>
              <button onClick={() => openEvidence({ itemId: i.id })} className="text-brand font-medium hover:underline">[{i.id}]</button> {i.outlet} · {fmtDate(i.date)}</li>)}
          </ul>
        </section>

        <p className="text-[13px] text-gray border-t border-line pt-4">These reviewed findings can feed the quarterly client report, which is a broader deliverable than this briefing.</p>

        <p className="print-only text-[11px] text-gray border-t border-line pt-3">Candidate-built demonstration — synthetic data, not an Atteline product.</p>
      </div>

      <aside className="no-print space-y-4 lg:sticky lg:top-20">
        <div className="card p-5">
          <div className="kicker mb-2">Edit before inclusion</div>
          <label htmlFor="gap" className="text-[13px] text-gray">Gap / pattern observation</label>
          <textarea id="gap" value={draft} onChange={e => setDraft(e.target.value)} rows={6}
            className="w-full mt-1 p-3 border border-line text-[14px] focus:border-brand outline-none" />
          <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
            {approved && !dirty ? <span className="inline-flex items-center gap-1 text-brand text-[13px] font-medium"><Check size={14} />Included in briefing</span>
              : <span className="text-[12px] text-gray">{dirty ? 'Edited' : 'Not yet approved'}</span>}
            <button className="btn-primary" disabled={approved && !dirty} onClick={() => setGap(draft, true)}>Approve for briefing</button>
          </div>
          {dirty && <button className="mt-2 text-[12px] text-gray underline" onClick={() => setDraft(savedGap)}>Discard edit</button>}
        </div>
        <div className="card p-5">
          <div className="kicker mb-2">Approve briefing</div>
          {briefingApproved
            ? <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-brand text-[13px] font-medium"><Check size={14} />Approved</span><button className="text-[12px] text-gray underline" onClick={() => approveBriefing(false)}>Undo</button></div>
            : <><p className="text-[13px] text-gray mb-3">{reviewComplete ? 'All findings are reviewed. Approve to mark this briefing as reviewed.' : 'Complete the human review first.'}</p>
              <button className="btn-primary" disabled={!reviewComplete} onClick={() => approveBriefing(true)}>Approve briefing</button></>}
        </div>
        <div className="card p-5 text-[13px] text-gray">
          Nothing here comes from unreviewed automatic output. {recAppended ? 'The approved recommendation is appended.' : <>No recommendation appended yet — <button className="text-brand underline" onClick={() => go(11)}>go to step 11</button>.</>}
        </div>
      </aside>
    </div>
    <StepNav next={9} nextLabel="Client analytics" />
  </div>
}
