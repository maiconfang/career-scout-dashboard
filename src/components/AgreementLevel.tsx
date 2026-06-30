import React from 'react'

type AlignmentLevel = 'High' | 'Low'

type Props = {
  level: AlignmentLevel
  summary: string
  evidence: string[]
}

export default function AgreementLevel({ level, summary, evidence }: Props) {
  const isHigh = level === 'High'
  const badgeClass = isHigh ? 'bg-agent-50 text-agent-primary' : 'bg-amber-50 text-amber-700'

  return (
    <section className="p-4 rounded-lg bg-white border border-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 uppercase font-semibold">Alignment Assessment</div>
          <div className="mt-2 text-sm text-slate-700">{summary}</div>
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-bold ${badgeClass}`}>
          {level} Alignment
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {evidence.map((item, i) => (
          <div key={i} className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {item}
          </div>
        ))}
      </div>
    </section>
  )
}
