import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../state/store'
import { StepNav } from '../components/Shell'
import { HumanBadge, Illustrative, KPI, PageHeader, TONE_DEFINITIONS, TONE_STYLE } from '../components/ui'

export default function AnalyticsScreen() {
  const { client, items, validatedPenetration, validatedTone, pctReviewed, openEvidence, validated } = useApp()
  const avg = Math.round(validatedPenetration.reduce((n, p) => n + p.pct, 0) / validatedPenetration.length)
  const lowest = [...validatedPenetration].sort((a, b) => a.pct - b.pct)[0]
  const data = validatedPenetration.map(p => ({ name: `Message ${p.messageId}`, id: p.messageId, pct: p.pct, label: p.label, count: p.count, total: p.total }))
  const tones = (['positive', 'neutral', 'negative'] as const).map(t => ({ t, n: items.filter(i => validatedTone[i.id] === t).length }))
  const open = (id: string) => {
    const f = validated.find(v => v.kind === 'message' && v.messageId === id && v.present)
    if (f) openEvidence({ itemId: f.itemId, findingId: f.id })
  }

  return <div>
    <PageHeader kicker="Step 9 · Client analytics" title={`${client.campaign}: message performance`}
      lead="The same validated dataset, framed for the client."
      right={<div className="flex items-center gap-2"><HumanBadge /><span className="text-[12px] text-gray">Based on human-validated data</span><Illustrative /></div>} />

    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <KPI label="Items analyzed" value={items.length} sub="Approved coverage, pilot sample" />
      <KPI label="Human-reviewed" value={`${pctReviewed}%`} sub="Of all automatic findings" accent />
      <KPI label="Avg. message penetration" value={`${avg}%`} sub={`Weakest: Message ${lowest.messageId} at ${lowest.pct}%`} />
    </div>

    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
      <section className="card p-6">
        <div className="flex items-center justify-between mb-1"><h2 className="text-[18px]">Penetration by key message</h2><Illustrative /></div>
        <p className="text-[13px] text-gray mb-4">Share of sampled items containing each approved message. Click a bar to open evidence.</p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12, fill: '#6B6B6B' }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 13, fill: '#141618' }} />
              <Tooltip cursor={{ fill: '#F7F7F7' }} formatter={(v: number, _n, p) => [`${v}% (${p.payload.count} of ${p.payload.total})`, p.payload.label]} />
              <Bar dataKey="pct" barSize={34} cursor="pointer" isAnimationActive animationDuration={900} onClick={(d: { id: string }) => open(d.id)}>
                {data.map(d => <Cell key={d.id} fill={d.id === lowest.messageId ? '#F8B818' : '#2DA24A'} />)}
                <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 13, fontWeight: 700, fill: '#141618' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[12px] text-gray mt-2">Amber marks the lowest-penetration message.</p>
      </section>

      <section className="card p-6">
        <h2 className="text-[18px] mb-3">Tone of coverage</h2>
        <div className="flex h-3 bg-line mb-4">{tones.map(({ t, n }) => n > 0 && <div key={t} style={{ width: `${(n / items.length) * 100}%`, background: TONE_STYLE[t].hex }} />)}</div>
        <ul className="space-y-3">
          {tones.map(({ t, n }) => <li key={t} className="flex gap-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${TONE_STYLE[t].dot}`} />
            <div><div className="text-[14px]"><strong>{TONE_STYLE[t].label}</strong> · {n} items ({Math.round((n / items.length) * 100)}%)</div>
              <div className="text-[12px] text-gray">{TONE_DEFINITIONS[t]}</div></div>
          </li>)}
        </ul>
      </section>
    </div>
    <StepNav next={10} nextLabel="Advisory panel" />
  </div>
}
