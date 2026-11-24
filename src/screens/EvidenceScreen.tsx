import { useState } from 'react'
import { useApp } from '../state/store'
import { ConfidenceMeter, PageHeader, ReviewBadge, StatusPill, ToneTag, MsgChip, fmtDate } from '../components/ui'
import { EvidenceCheck } from '../components/EvidenceCheck'
import { Highlighted } from '../components/Highlighted'
import { StepNav } from '../components/Shell'

export default function EvidenceScreen() {
  const { items, analyses, findings, validated, keyMessages } = useApp()
  const firstC = items.find(i => analyses.find(a => a.itemId === i.id)!.messages.C.present) ?? items[0]
  const [itemId, setItemId] = useState(firstC.id)
  const [findingId, setFindingId] = useState(`${firstC.id}:msg:C`)

  const item = items.find(i => i.id === itemId)!
  const itemFindings = findings.filter(f => f.itemId === itemId)
  const focus = itemFindings.find(f => f.id === findingId) ?? itemFindings[0]
  const vf = validated.find(v => v.id === focus.id)!
  const msg = focus.messageId ? keyMessages.find(m => m.id === focus.messageId) : undefined

  const pick = (id: string) => { setItemId(id); const mid = focus.messageId; setFindingId(mid ? `${id}:msg:${mid}` : `${id}:tone`) }

  return <div>
    <PageHeader kicker="Step 6 · Evidence inspector" title="Every classification, traced to its source"
      lead="Pick an item and a classification. The exact matched text is highlighted — no black box." />
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      <aside className="card max-h-[640px] overflow-y-auto">
        <ul className="divide-y divide-line">
          {items.map(i => <li key={i.id}>
            <button onClick={() => pick(i.id)} className={`w-full text-left px-4 py-3 border-l-4 ${i.id === itemId ? 'border-brand bg-offwhite' : 'border-transparent hover:bg-offwhite'}`}>
              <div className="text-[11px] text-gray">{i.id} · {i.outletType}</div>
              <div className="text-[14px] font-medium text-charcoal leading-snug">{i.headline}</div>
              <div className="text-[12px] text-gray">{i.outlet} · {fmtDate(i.date)}</div>
            </button>
          </li>)}
        </ul>
      </aside>

      <section className="card p-6">
        <h2 className="text-[20px] leading-snug">{item.headline}</h2>
        <div className="text-[13px] text-gray mb-4">{item.outlet} · {item.outletType} · {fmtDate(item.date)}</div>

        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Classifications">
          {itemFindings.map(f => {
            const v = validated.find(x => x.id === f.id)!
            const active = f.id === focus.id
            return <button key={f.id} role="tab" aria-selected={active} onClick={() => setFindingId(f.id)}
              className={`flex items-center gap-2 px-2 py-1 border ${active ? 'border-charcoal bg-offwhite' : 'border-line hover:border-gray'}`}>
              {f.kind === 'tone' ? <><span className="text-[12px] text-gray">Tone</span><ToneTag tone={v.tone!} /></> : <><span className="text-[12px] text-gray">Message</span><MsgChip id={f.messageId!} present={!!v.present} /></>}
            </button>
          })}
        </div>

        <div className="p-4 bg-offwhite border border-line mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
          <strong className="text-charcoal">{focus.kind === 'tone' ? 'Tone' : `Message ${focus.messageId}: ${msg?.label}`}</strong>
          <span className="flex items-center gap-2">Engine: {focus.kind === 'tone' ? <ToneTag tone={focus.aiTone!} /> : <strong>{focus.aiPresent ? 'Present' : 'Absent'}</strong>}</span>
          <ConfidenceMeter value={focus.confidence} />
          <ReviewBadge reviewed={vf.reviewed} /><StatusPill status={vf.status} />
        </div>

        <EvidenceCheck finding={focus} item={item} />

        <article className="text-[16px] leading-[1.75] whitespace-pre-line">
          <Highlighted text={item.text} matches={focus.matches} toneMode={focus.kind === 'tone'} />
        </article>
        {focus.matches.length === 0 && <p className="mt-3 text-[13px] text-gray">No matched text — the engine found no support for this message in the item.</p>}

        <div className="mt-6 pt-4 border-t border-line flex flex-wrap gap-5 text-[12px] text-gray items-center">
          <span className="font-bold uppercase tracking-wider text-[10px]">Legend</span>
          <span><mark className="ev ev-focus">matched text</mark> direct phrase or paraphrase (hover to see which)</span>
          <span><mark className="ev ev-tone-pos">positive</mark> / <mark className="ev ev-tone-neg">negative</mark> tone terms</span>
        </div>
      </section>
    </div>
    <StepNav next={7} nextLabel="Review the automatic findings" />
  </div>
}
