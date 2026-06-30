import React from 'react'

type Props = {
  objective?: string
  reflection?: string
  recommendation?: string
  confidence?: number
}

export default function AgentBrain({ objective, reflection, recommendation, confidence }: Props) {
  const conf = Math.min(100, Math.max(0, Number(confidence) || 0))

  return (
    <section className="w-full max-w-3xl mx-auto p-6 rounded-2xl shadow-2xl bg-gradient-to-br from-agent-50/60 to-white border border-slate-100">
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <div className="text-agent-primary text-xs font-semibold uppercase tracking-wide">Agent Brain</div>
          <h2 className="text-2xl md:text-3xl font-extrabold mt-2">{objective ?? 'Optimize candidate-job fit'}</h2>

          <div className="mt-4 text-sm text-slate-600">{reflection ?? 'O agente identificou divergência de skills entre o candidato e múltiplas vagas; priorizar papéis com foco em dados.'}</div>

          <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="text-sm text-slate-500">Recommendation</div>
            <div className="text-lg font-semibold mt-1">{recommendation ?? 'Apply to: Senior Data Engineer — Company XYZ'}</div>
            <div className="mt-2 text-xs text-slate-400">Rationale: combina experiência em ETL com requisitos técnicos e score alto de compatibilidade.</div>
          </div>
        </div>

        <div className="w-40 flex-shrink-0">
          <div className="text-sm text-slate-500">Confidence</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="h-3 bg-agent-primary" style={{ width: `${conf}%` }} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-right">{conf}%</div>

          <div className="mt-4 text-xs text-slate-500">Last run</div>
          <div className="text-sm font-medium">{new Date().toLocaleString()}</div>
        </div>
      </div>
    </section>
  )
}
