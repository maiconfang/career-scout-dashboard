import React from 'react'

type Props = {
  sameDecision: boolean
  rankingSelection: string
  llmSelection: string
  reason?: string
}

export default function ConflictStatus({ sameDecision, rankingSelection, llmSelection, reason }: Props) {
  const status = sameDecision ? 'CONSENSUS' : 'CONFLICT'
  const statusColor = sameDecision ? 'text-agent-primary' : 'text-red-600'
  const statusBgColor = sameDecision ? 'bg-agent-50' : 'bg-red-50'

  return (
    <div className={`p-6 rounded-lg border-2 ${statusBgColor}`}>
      <div className={`text-sm font-bold uppercase tracking-widest ${statusColor}`}>{status}</div>
      <h3 className="text-2xl font-extrabold mt-3 mb-4">
        {sameDecision ? 'Os agentes concordam' : 'Os agentes discordam'}
      </h3>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-slate-500 font-semibold">RankingAgent</div>
          <div className="text-sm font-medium">{rankingSelection ?? '—'}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500 font-semibold">LLMSelectionAgent</div>
          <div className="text-sm font-medium">{llmSelection ?? '—'}</div>
        </div>
      </div>

      {reason && <div className="mt-4 text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3">{reason}</div>}
    </div>
  )
}
