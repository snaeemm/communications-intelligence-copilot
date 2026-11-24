import { useState } from 'react'
import { Check, Pencil, X, Undo2, Search, ShieldCheck, AlertTriangle } from 'lucide-react'
import { HIGH_CONFIDENCE, useApp } from '../state/store'
import { StepNav } from '../components/Shell'
import { ByLine } from '../components/AuditBits'
import { ConfidenceMeter, FlagNote, MsgChip, PageHeader, ReviewBadge, StatusPill, ToneTag } from '../components/ui'
import type { Tone, ValidatedFinding } from '../data/types'

type Filter = 'attention' | 'all' | 'reviewed'
const TONES: Tone[] = ['positive', 'neutral', 'negative']

function FindingRow({ f }: { f: ValidatedFinding }) {
  const { review, unreview, openEvidence, keyMessages } = useApp()
  const [picking, setPicking] = useState(false)
  const isTone = f.kind === 'tone'
  const msg = keyMessages.find(m => m.id === f.messageId)
  const open = () => openEvidence({ itemId: f.itemId, findingId: f.id })

  const aiValue = isTone
    ? <ToneTag tone={f.aiTone!} onClick={open} />
    : <MsgChip id={f.messageId!} present={!!f.aiPresent} onClick={open} />
  const humanValue = isTone
    ? <ToneTag tone={(f.tone ?? 'neutral') as Tone | 'unrated'} />
    : <MsgChip id={f.messageId!} present={!!f.present} reviewed />
  const changed = isTone ? f.tone !== f.aiTone : f.present !== f.aiPresent
  const invalid = f.evidenceStatus === 'invalid'
  const lowConf = !f.reviewed && (f.confidence < HIGH_CONFIDENCE || !!f.flag || invalid)

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-t border-line first:border-t-0 ${lowConf ? 'bg-paleorange/50' : ''}`}>
      <div className="w-[150px] shrink-0 text-[13px] font-medium text-charcoal" title={msg?.label}>
        {isTone ? 'Tone' : <>Message {f.messageId}<span className="block text-[11px] font-light text-gray truncate max-w-[150px]">{msg?.label}</span></>}
      </div>
      <div className="flex items-center gap-3 min-w-[230px]">
        <ReviewBadge reviewed={f.reviewed} />
        {f.reviewed ? (
          <span className="flex items-center gap-2">{humanValue}
            <StatusPill status={f.status} />
          </span>
        ) : aiValue}
      </div>
      <div className="flex items-center gap-2 min-w-[90px]">
        <ConfidenceMeter value={f.confidence} />
        {!f.reviewed && f.flag && <span className="text-[10px] font-bold uppercase tracking-wider bg-paleorange border border-accent/60 px-1.5 py-0.5">Check</span>}
      </div>
      {!f.reviewed && f.flag && <div className="basis-full"><FlagNote flag={f.flag} /></div>}
      {invalid && <div className="basis-full flex items-center gap-1.5 text-[12px] font-bold text-neg bg-paleneg px-2 py-1 border border-neg/40"><AlertTriangle size={13} />Quote could not be verified in the source article — Accept is disabled</div>}
      {f.reviewed && <div className="basis-full -mt-1"><ByLine findingId={f.id} /></div>}
      {f.reviewed && changed && <span className="text-[12px] text-gray">Engine said {isTone ? f.aiTone : f.aiPresent ? 'present' : 'absent'}</span>}
      <div className="ml-auto flex items-center gap-1.5 flex-wrap justify-end">
        <button className="p-1.5 text-gray hover:text-charcoal hover:bg-offwhite" title="View evidence" aria-label="View evidence" onClick={open}><Search size={15} /></button>
        {f.reviewed ? (
          <button className="btn-outline !py-1 !px-3 !text-[13px]" onClick={() => { setPicking(false); unreview(f.id) }}><Undo2 size={13} />Undo</button>
        ) : picking && isTone ? (
          <>
            <span className="text-[12px] text-gray mr-1">Correct to:</span>
            {TONES.filter(t => t !== f.aiTone).map(t => (
              <button key={t} onClick={() => { review(f.id, { status: 'corrected', tone: t }); setPicking(false) }} className="hover:opacity-80"><ToneTag tone={t} /></button>
            ))}
            <button className="p-1 text-gray hover:text-charcoal" aria-label="Cancel" onClick={() => setPicking(false)}><X size={14} /></button>
          </>
        ) : (
          <>
            <button className="btn-outline !py-1 !px-3 !text-[13px]" disabled={invalid} title={invalid ? 'Quote could not be verified' : undefined} onClick={() => review(f.id, { status: 'accepted' })}><Check size={13} />Accept</button>
            <button className="btn-outline !py-1 !px-3 !text-[13px] !border-line !text-body hover:!bg-offwhite"
              onClick={() => isTone ? setPicking(true) : review(f.id, { status: 'corrected', present: !f.aiPresent })}
              title={isTone ? 'Choose a different tone' : f.aiPresent ? 'Mark as absent' : 'Mark as present'}>
              <Pencil size={13} />{isTone ? 'Correct' : f.aiPresent ? 'Correct → absent' : 'Correct → present'}
            </button>
            {(isTone || f.aiPresent) && (
              <button className="btn-outline !py-1 !px-3 !text-[13px] !border-neg !text-neg hover:!bg-paleneg"
                onClick={() => isTone ? review(f.id, { status: 'rejected', tone: 'unrated' }) : review(f.id, { status: 'rejected', present: false })}
                title={isTone ? 'Reject: tone left unrated' : 'Reject: message not supported by the text'}>
                <X size={13} />Reject
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ReviewScreen() {
  const { items, validated, reviewedCount, totalFindings, reviewComplete, reviewMany, aiPenetration, validatedPenetration, pctReviewed, pendingCount } = useApp()
  const [filter, setFilter] = useState<Filter>('attention')

  const unreviewed = validated.filter(v => !v.reviewed)
  const needsCheck = (v: ValidatedFinding) => v.confidence < HIGH_CONFIDENCE || !!v.flag || v.evidenceStatus === 'invalid'
  const attention = unreviewed.filter(needsCheck)
  const highConf = unreviewed.filter(v => !needsCheck(v))
  const remaining = totalFindings - reviewedCount

  const show = (v: ValidatedFinding) => filter === 'all' ? true : filter === 'reviewed' ? v.reviewed : !v.reviewed && needsCheck(v)
  const tabs: { key: Filter; label: string; n: number }[] = [
    { key: 'attention', label: 'Needs attention', n: attention.length },
    { key: 'all', label: 'All', n: totalFindings },
    { key: 'reviewed', label: 'Reviewed', n: reviewedCount }
  ]
  const cards = items.map(it => ({ it, rows: validated.filter(v => v.itemId === it.id && show(v)) })).filter(c => c.rows.length)

  return (
    <div>
      <PageHeader kicker="Step 7 · Human review" title="Every automatic finding passes through you"
        lead="Accept, correct or reject each classification. Corrections update the human-validated set that the briefing and analytics read from." />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div>
          {/* sticky progress header */}
          <div className="sticky top-[49px] z-20 bg-white border border-line p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-[260px] flex-1">
                <div className="text-[28px] font-bold text-charcoal tabular-nums leading-none">{reviewedCount}<span className="text-gray font-light text-[18px]">/{totalFindings}</span></div>
                <div className="flex-1">
                  <div className="h-2 bg-line"><div className="h-2 bg-brand transition-all duration-500" style={{ width: `${pctReviewed}%` }} /></div>
                  <div className="text-[12px] text-gray mt-1">{pctReviewed}% human-reviewed · <strong className="text-charcoal">{pendingCount} pending</strong></div>
                </div>
              </div>
              <button className="btn-primary" disabled={!highConf.length}
                onClick={() => reviewMany(highConf.map(f => [f.id, { status: 'accepted' as const }]))}>
                <ShieldCheck size={15} />Accept all high-score (≥{HIGH_CONFIDENCE.toFixed(2)}){highConf.length ? ` · ${highConf.length}` : ''}
              </button>
            </div>
            <div className="flex gap-1 mt-4 border-b border-line -mb-4">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setFilter(t.key)}
                  className={`px-3 py-2 text-[13px] border-b-2 -mb-px ${filter === t.key ? 'border-brand text-charcoal font-bold' : 'border-transparent text-gray hover:text-charcoal'}`}>
                  {t.label} <span className="tabular-nums text-gray font-light">({t.n})</span>
                </button>
              ))}
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-palegreen text-brand grid place-items-center rounded-full"><Check /></div>
              <div className="font-bold text-charcoal text-[18px]">{filter === 'attention' ? 'No flagged or low-score findings left' : 'Nothing to show here'}</div>
              <p className="text-gray mt-1">{remaining ? <>Use “Accept all high-score” or switch to the <button className="text-brand underline" onClick={() => setFilter('all')}>All</button> tab to review the rest.</> : 'Every finding has been reviewed.'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map(({ it, rows }) => (
                <section key={it.id} className="card">
                  <header className="px-4 py-3 bg-offwhite border-b border-line flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="font-bold text-charcoal text-[15px]">{it.headline}</div>
                    <div className="text-[12px] text-gray">{it.outlet} · {it.outletType} · {it.id}</div>
                  </header>
                  {rows.map(f => <FindingRow key={f.id} f={f} />)}
                </section>
              ))}
            </div>
          )}
        </div>

        {/* side panel */}
        <aside className="lg:sticky lg:top-[49px] space-y-4">
          <div className="card p-5">
            <div className="kicker mb-1">Penetration impact</div>
            <p className="text-[13px] text-gray mb-2">Auto-generated pass vs. human-validated set. Corrections change these numbers live.</p>
            <div className={`text-[12px] font-bold mb-4 px-2 py-1 border ${reviewComplete ? 'bg-palegreen text-[#1d7335] border-brand/40' : 'bg-paleorange border-accent/50 text-charcoal'}`}>{reviewComplete ? 'Final — all findings reviewed' : `Provisional until every finding is reviewed (${pendingCount} pending)`}</div>
            <div className="space-y-4">
              {aiPenetration.map((a, i) => {
                const v = validatedPenetration[i]
                const diff = v.count - a.count
                return (
                  <div key={a.messageId}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-bold text-charcoal">Message {a.messageId}</span>
                      <span className="tabular-nums">
                        <span className="text-gray">{a.pct}%</span> → <strong className="text-charcoal">{v.pct}%</strong>
                        {diff !== 0 && <span className={`ml-2 text-[11px] font-bold ${diff > 0 ? 'text-brand' : 'text-neg'}`}>{diff > 0 ? '+' : ''}{diff} item{Math.abs(diff) === 1 ? '' : 's'}</span>}
                      </span>
                    </div>
                    <div className="relative h-2 bg-line">
                      <div className="absolute h-2 bg-[#9A9A9A] transition-all duration-500" style={{ width: `${a.pct}%` }} />
                      <div className="absolute h-1 top-0.5 bg-brand transition-all duration-500" style={{ width: `${v.pct}%` }} />
                    </div>
                    <div className="text-[11px] text-gray mt-1">{a.count}/{a.total} auto · {v.count}/{v.total} validated</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-line flex gap-4 text-[11px] text-gray">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#9A9A9A]" />Auto-generated</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 bg-brand" />Validated</span>
            </div>
          </div>

          <div className="card p-5 border-l-4 border-l-accent">
            <div className="font-bold text-charcoal mb-1">The rule</div>
            <p className="text-[13px] text-gray">Nothing reaches the briefing unreviewed. The briefing, analytics and recommendation (steps 8–12) unlock once all {totalFindings} findings carry a human decision.</p>
          </div>
        </aside>
      </div>

      <StepNav next={8} nextLabel="Generate briefing" disabled={!reviewComplete}
        note={reviewComplete ? 'All findings reviewed — briefing unlocked.' : `${remaining} finding${remaining === 1 ? '' : 's'} left to review to unlock the briefing`} />
    </div>
  )
}
