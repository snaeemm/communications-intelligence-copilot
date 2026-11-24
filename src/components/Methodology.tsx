import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const GLOSSARY: [string, string][] = [
  ['Campaign brief (input)', 'Objectives, audiences and the client-approved key messages.'],
  ['Published media coverage (input)', 'The articles and editorial mentions being analysed.'],
  ['Media coverage briefing (output)', 'A reviewed summary of coverage, message pickup, evidence and implications.'],
  ['Quarterly client report', 'A broader deliverable that reviewed briefing findings can feed. The briefing does not replace it.'],
  ['Rules score', 'A heuristic from keyword and phrase rules. It is not a model probability or an accuracy measure.']
]

export function Methodology({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true) }, [onClose])
  return <div ref={ref} tabIndex={-1} onKeyDown={e => { if (e.key === 'Escape') onClose() }} className="fixed inset-0 z-[60] grid place-items-center p-4 no-print outline-none" role="dialog" aria-modal="true" aria-label="How this works">
    <div className="absolute inset-0 bg-charcoal/50 backdrop-in" onClick={onClose} />
    <div className="relative bg-white w-full max-w-[640px] max-h-[88vh] overflow-y-auto p-7 fade-in">
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 p-1 hover:bg-offwhite"><X /></button>
      <div className="kicker mb-1">Methodology</div>
      <h2 className="text-[24px] mb-3">How this works</h2>
      <p className="text-[15px] mb-5">This is a candidate-built, rules-based workflow demonstration using synthetic data. It illustrates how media coverage could be analysed, reviewed and converted into client insights. It does not contain a live language model and does not establish AI accuracy, time savings or production readiness.</p>
      <div className="p-4 bg-offwhite border-l-4 border-brand mb-5 text-[14px]">
        <strong className="text-charcoal">Message penetration</strong> = eligible analysed articles carrying the approved key message ÷ total eligible analysed articles × 100 (duplicates and incomplete records excluded).
      </div>
      <dl className="space-y-2.5 text-[14px]">
        {GLOSSARY.map(([t, d]) => <div key={t} className="grid grid-cols-[190px_1fr] gap-3"><dt className="font-bold text-charcoal">{t}</dt><dd className="text-gray">{d}</dd></div>)}
      </dl>
    </div>
  </div>
}
