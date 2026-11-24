import { Target, Calendar, Building2 } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { StepNav } from '../components/Shell'
import { useApp } from '../state/store'

export default function BriefScreen() {
  const { client, keyMessages } = useApp()
  return <div>
    <PageHeader kicker="Step 1 · Campaign brief" title={client.campaign}
      lead={<>Fictional client <strong className="font-bold text-charcoal">{client.name}</strong> · {client.sector}</>} />
    <div className="grid lg:grid-cols-3 gap-6 mb-8">
      <div className="card p-6 lg:col-span-2 border-l-4 border-l-brand">
        <div className="flex items-center gap-2 kicker mb-3"><Target size={14} />Campaign objective</div>
        <p className="text-[22px] leading-snug text-charcoal font-normal">{client.objective}</p>
      </div>
      <div className="card p-6 space-y-5">
        <div><div className="flex items-center gap-2 kicker mb-1"><Building2 size={14} />Client</div><div className="text-charcoal font-bold">{client.name}</div><div className="text-[14px] text-gray">{client.sector}</div></div>
        <div><div className="flex items-center gap-2 kicker mb-1"><Calendar size={14} />Period</div><div className="text-charcoal">{client.period}</div></div>
        <div><div className="kicker mb-1">Audiences</div><ul className="text-[14px] text-charcoal list-disc pl-4 space-y-0.5">{client.audiences.map(a => <li key={a}>{a}</li>)}</ul></div>
      </div>
    </div>
    <div className="kicker mb-3">Client-approved key messages</div>
    <div className="grid md:grid-cols-3 gap-6">
      {keyMessages.map(m => <div key={m.id} className="card p-6">
        <div className="w-10 h-10 grid place-items-center bg-charcoal text-white font-bold text-[18px] mb-4">{m.id}</div>
        <h3 className="text-[20px] leading-snug mb-2">Message {m.id}: {m.label}</h3>
        <p className="text-[14px] text-gray">{m.description}</p>
      </div>)}
    </div>
    <StepNav next={2} nextLabel="View coverage" />
  </div>
}
