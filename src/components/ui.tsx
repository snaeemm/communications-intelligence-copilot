import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bot, UserCheck } from 'lucide-react'
import type { ReviewStatus, SignalFlag, Tone } from '../data/types'

/** Cosmetic fixed-duration loading (never real latency). */
export function useCosmeticLoading(ms = 600) {
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), ms); return () => clearTimeout(t) }, [ms])
  return loading
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`} /> }

export function AIBadge({ className = '' }: { className?: string }) {
  return <span title="Generated automatically by the local rules-based engine — not yet human-reviewed" className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-paleorange text-charcoal border border-accent/60 ${className}`}><Bot size={11} />Auto-generated</span>
}
export function HumanBadge({ className = '' }: { className?: string }) {
  return <span title="Reviewed and validated by a human" className={`badge-pop inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-palegreen text-brand border border-brand/50 ${className}`}><UserCheck size={11} />Human-reviewed</span>
}
export const ReviewBadge = ({ reviewed, className }: { reviewed: boolean; className?: string }) => reviewed ? <HumanBadge className={className} /> : <AIBadge className={className} />

const STATUS_STYLE: Record<ReviewStatus | 'none', { label: string; cls: string }> = {
  accepted: { label: 'Approved by reviewer', cls: 'bg-palegreen text-[#1d7335] border-brand/40' },
  corrected: { label: 'Corrected by reviewer', cls: 'bg-paleorange text-charcoal border-accent/60' },
  rejected: { label: 'Rejected by reviewer', cls: 'bg-paleneg text-neg border-neg/40' },
  none: { label: 'Pending', cls: 'bg-white text-gray border-line' }
}
export function StatusPill({ status, className = '' }: { status?: ReviewStatus; className?: string }) {
  const s = STATUS_STYLE[status ?? 'none']
  return <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${s.cls} ${className}`}>{s.label}</span>
}

const FLAG_TEXT: Record<SignalFlag, string> = {
  'contrast-cue': 'Contrast language near the match — check the claim is endorsed, not disputed',
  'weak-signal': 'Loose topic hints but no direct match — check for a paraphrase'
}
export function FlagNote({ flag, className = '' }: { flag?: SignalFlag; className?: string }) {
  if (!flag) return null
  return <span className={`inline-flex items-start gap-1.5 text-[12px] text-charcoal bg-paleorange px-2 py-1 border border-accent/50 ${className}`}><span className="font-bold uppercase tracking-wider text-[10px] mt-[2px]">Check</span>{FLAG_TEXT[flag]}</span>
}

export const TONE_STYLE: Record<Tone | 'unrated', { label: string; cls: string; dot: string; hex: string }> = {
  positive: { label: 'Positive', cls: 'bg-palegreen text-[#1d7335]', dot: 'bg-brand', hex: '#2DA24A' },
  neutral: { label: 'Neutral', cls: 'bg-line text-body', dot: 'bg-[#9A9A9A]', hex: '#9A9A9A' },
  negative: { label: 'Negative', cls: 'bg-paleneg text-neg', dot: 'bg-neg', hex: '#B4432F' },
  unrated: { label: 'Unrated', cls: 'bg-white text-gray border border-line', dot: 'bg-line', hex: '#EAEAEA' }
}
export const TONE_DEFINITIONS: Record<Tone, string> = {
  positive: 'Praises the product or its outcomes; favourable framing.',
  neutral: 'Factual or balanced; no clear lean either way.',
  negative: 'Criticises the product, price or experience; unfavourable framing.'
}
export function ToneTag({ tone, onClick, className = '' }: { tone: Tone | 'unrated'; onClick?: () => void; className?: string }) {
  const s = TONE_STYLE[tone]
  const inner = <><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</>
  const base = `inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] font-medium ${s.cls} ${className}`
  return onClick ? <button onClick={onClick} className={`${base} hover:ring-1 hover:ring-charcoal/30 cursor-pointer`} title="Click to see the evidence">{inner}</button> : <span className={base}>{inner}</span>
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return <span className="inline-flex items-center gap-1.5 text-[12px] tabular-nums text-gray" title={`Rules score ${value.toFixed(2)} — a heuristic from phrase/synonym matching, not a model probability`}>
    <span className="w-12 h-1 bg-line inline-block"><span className="block h-1 bg-charcoal" style={{ width: `${pct}%` }} /></span>{value.toFixed(2)}</span>
}

export function MsgChip({ id, present, onClick, reviewed }: { id: string; present: boolean; onClick?: () => void; reviewed?: boolean }) {
  const cls = present ? 'bg-palegreen text-[#1d7335] border-brand/40' : 'bg-white text-gray border-line'
  const el = <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[12px] font-medium border ${cls}`}>{id}<span className="font-light">{present ? 'present' : 'absent'}</span>{reviewed ? <UserCheck size={11} /> : null}</span>
  return onClick ? <button onClick={onClick} className="hover:opacity-80 cursor-pointer" title="Click to see the evidence">{el}</button> : el
}

export function PageHeader({ kicker, title, lead, right }: { kicker: string; title: string; lead?: ReactNode; right?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div className="max-w-3xl"><div className="kicker mb-2">{kicker}</div><h1 className="text-[34px] leading-[1.1] tracking-tight">{title}</h1>{lead && <p className="mt-2 text-[17px] text-gray">{lead}</p>}</div>
    {right}
  </div>
}

/** Counts up from 0 to a number (keeps any % suffix). Non-numeric values render as-is. */
export function CountUp({ value, ms = 900 }: { value: ReactNode; ms?: number }) {
  const m = typeof value === 'number' ? [String(value), String(value), ''] : typeof value === 'string' ? value.match(/^(\d+)(.*)$/) : null
  const target = m ? parseInt(m[1], 10) : NaN
  const suffix = m ? (typeof value === 'number' ? '' : m[2]) : ''
  const [n, setN] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (isNaN(target)) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(target); return }
    const t0 = performance.now()
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setN(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf.current = requestAnimationFrame(tick) }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, ms])
  return isNaN(target) ? <>{value}</> : <>{n}{suffix}</>
}

export function KPI({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return <div className={`card p-5 ${accent ? 'border-l-4 border-l-brand' : ''}`}>
    <div className="text-[11px] uppercase tracking-[0.14em] text-gray font-bold">{label}</div>
    <div className="text-[40px] leading-none font-bold kpi-value mt-2 tabular-nums"><CountUp value={value} /></div>
    {sub && <div className="text-[13px] text-gray mt-2">{sub}</div>}
  </div>
}

export const Illustrative = ({ children = 'Illustrative · pilot sample' }: { children?: ReactNode }) =>
  <span className="inline-block text-[10px] uppercase tracking-[0.14em] font-bold text-gray border border-line bg-white px-2 py-0.5">{children}</span>

export function fmtDate(iso: string) { return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }
