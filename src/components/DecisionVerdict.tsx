import React from 'react'

type Props = {
  verdict: string // "CONSENSUS" | "CONFLICT_RESOLVED"
  resolvedBy?: string
  resolutionReason?: string
  confidenceLabel?: string
  confidence?: number
  recommendation?: string
}

export default function DecisionVerdict({
  verdict,
  resolvedBy,
  resolutionReason,
  confidenceLabel,
  confidence,
  recommendation
}: Props) {
  const verdictLabel = verdict === 'CONSENSUS' ? 'Unified Decision' : 'Conflict Resolved'
  const verdictBgColor = verdict === 'CONSENSUS' ? 'bg-agent-50' : 'bg-amber-50'
  const verdictBorderColor = verdict === 'CONSENSUS' ? 'border-agent-primary' : 'border-amber-600'

  return (
    <section className={`p-5 rounded-lg border-2 ${verdictBgColor} ${verdictBorderColor}`}>
      <div className="grid grid-cols-[1fr_9rem] gap-5 items-start">
        <div>
          <div className="text-sm font-bold uppercase tracking-widest">DecisionAuditAgent</div>
          <h3 className="text-xl font-extrabold mt-1">{verdictLabel}</h3>

          {resolvedBy && (
            <div className="mt-3 text-sm text-slate-700">
              Final selection matches <span className="font-semibold">{resolvedBy}</span>.
            </div>
          )}

          {resolutionReason && (
            <div className="mt-3 text-sm text-slate-700 border-l-2 border-slate-300 pl-3">
              {resolutionReason}
            </div>
          )}

          {recommendation && (
            <div className="mt-3 p-3 bg-white rounded border border-slate-200">
              <div className="text-xs font-semibold text-slate-600">Final recommendation</div>
              <div className="text-sm font-medium mt-1">{recommendation}</div>
            </div>
          )}
        </div>

        {confidence !== undefined && (
          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
            <div className="text-xs text-slate-500 uppercase font-semibold">Confidence</div>
            <div className="mt-2 text-4xl font-extrabold text-agent-primary">
              {Math.min(100, Math.max(0, confidence))}%
            </div>
            {confidenceLabel && <div className="mt-1 text-sm font-bold text-slate-700">{confidenceLabel}</div>}
          </div>
        )}
      </div>
    </section>
  )
}
