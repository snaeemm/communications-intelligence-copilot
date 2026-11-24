import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { useApp } from '../state/store'
import { validateEvidence } from '../engine'
import type { CoverageItem, Finding } from '../data/types'
import { FlagNote } from './ui'

const HOW: Record<string, string> = { phrase: 'Direct phrase match', synonym: 'Synonym / paraphrase pair', lexicon: 'Sentiment term' }

/** Shows the exact quote(s) behind a finding and whether each is verified as a verbatim substring of the source article. */
export function EvidenceCheck({ finding, item }: { finding: Finding; item: CoverageItem }) {
  const { keyMessages } = useApp()
  const msg = finding.messageId ? keyMessages.find(m => m.id === finding.messageId) : undefined
  const { checks } = validateEvidence(item.text, finding.matches)
  const absent = finding.kind === 'message' && !finding.aiPresent
  return <div className="border border-line bg-white mb-5">
    <div className="px-4 py-2.5 border-b border-line bg-offwhite text-[11px] uppercase tracking-[0.14em] font-bold text-gray">Evidence check</div>
    <div className="p-4 space-y-3 text-[14px]">
      {msg && <div><div className="text-[12px] text-gray">Key message being evaluated</div>
        <div className="font-bold text-charcoal">Message {msg.id}: {msg.label}</div>
        <div className="text-gray text-[13px]">{msg.description}</div></div>}
      {finding.flag && <FlagNote flag={finding.flag} />}
      {absent || checks.length === 0
        ? <div className="text-gray">No matching text found{absent ? ' — the engine treated this message as absent.' : '.'}</div>
        : <ul className="space-y-2">
            {checks.map((c, i) => <li key={i} className={`border-l-4 pl-3 py-1 ${c.found ? 'border-brand' : 'border-neg bg-paleneg'}`}>
              <blockquote className="text-charcoal font-medium">“{c.match.text}”</blockquote>
              {c.found
                ? <div className="flex items-center gap-1.5 text-[12px] text-[#1d7335]"><CheckCircle2 size={13} />Exact quote found in source (characters {c.match.start}–{c.match.end}) · {HOW[c.match.kind]}</div>
                : <div className="flex items-center gap-1.5 text-[12px] text-neg font-bold"><AlertTriangle size={13} />Quote NOT found in source — this finding cannot be treated as verified</div>}
            </li>)}
          </ul>}
      {item.demo && <div className="p-3 bg-paleorange border border-accent/50 text-[13px]">
        <div className="font-bold uppercase tracking-wider text-[10px] mb-1">Hard case: {item.demo.kind}</div>{item.demo.why}</div>}
      <div className="pt-1 text-[13px] text-charcoal font-medium">Reviewer question: does this text support the classification?</div>
    </div>
  </div>
}
