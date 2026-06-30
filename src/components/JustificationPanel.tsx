import React from 'react'

type Props = {
  agentName: string
  decisionType: string
  selection: string
  strengths?: string[]
  risks?: string[]
  reason?: string
  variant?: 'score' | 'semantic'
}

export default function JustificationPanel({
  agentName,
  decisionType,
  selection,
  strengths,
  risks,
  reason,
  variant = 'score'
}: Props) {
  const variantClass =
    variant === 'score'
      ? 'border-l-agent-primary bg-slate-50'
      : 'border-l-accent-500 bg-accent-50'

  return (
    <section className={`p-4 rounded-lg bg-white border border-slate-100 border-l-4 ${variantClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 uppercase font-semibold">{agentName}</div>
          <div className="mt-1 text-xs font-semibold text-slate-700">{decisionType}</div>
        </div>
      </div>

      <div className="mt-3 text-sm font-semibold text-slate-950">{selection ?? '-'}</div>

      {reason && <div className="mt-3 text-xs text-slate-600">{reason}</div>}

      {strengths && strengths.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-700">Evidence</div>
          <div className="mt-1 space-y-1">
            {strengths.map((s, i) => (
              <div key={i} className="text-xs text-slate-600">
                + {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {risks && risks.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-red-700">Risks</div>
          <div className="mt-1 space-y-1">
            {risks.map((r, i) => (
              <div key={i} className="text-xs text-red-600">
                ! {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
