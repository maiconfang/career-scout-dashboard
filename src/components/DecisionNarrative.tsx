import React from 'react'

type Props = {
  hasConflict: boolean
  rankingSelection: string
  llmSelection: string
  resolvedBy: string
  confidenceLabel: string
  confidence: number
  primaryRisk: string
}

export default function DecisionNarrative({
  hasConflict,
  rankingSelection,
  llmSelection,
  resolvedBy,
  confidenceLabel,
  confidence,
  primaryRisk
}: Props) {
  const statusClass = hasConflict ? 'bg-red-50 text-red-700' : 'bg-agent-50 text-agent-primary'

  return (
    <section className="p-5 rounded-lg bg-white border border-slate-100 shadow-card">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500 uppercase font-semibold">Decision Narrative</div>
            <div className={`px-2 py-1 rounded-full text-xs font-bold ${statusClass}`}>
              {hasConflict ? 'Conflict detected' : 'Consensus'}
            </div>
          </div>

          <h2 className="mt-2 text-xl font-extrabold text-agent-primary">
            DecisionAuditAgent resolved the final recommendation in favor of {resolvedBy}.
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Score-Based Decision</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{rankingSelection}</div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-accent-50 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Semantic Decision</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{llmSelection}</div>
            </div>
          </div>
        </div>

        <div className="w-40 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <div className="text-xs font-semibold uppercase text-slate-500">Final Confidence</div>
          <div className="mt-2 text-4xl font-extrabold text-agent-primary">{confidence}%</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{confidenceLabel}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
        <div className="text-xs font-semibold uppercase text-red-700">Primary risk</div>
        <div className="mt-1 text-sm font-semibold text-red-700">{primaryRisk}</div>
      </div>
    </section>
  )
}
