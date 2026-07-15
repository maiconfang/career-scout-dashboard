import { useEffect, useMemo, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  InfoCard,
  LoadingState,
  PageContainer,
  PageHeader,
  ProgressBar,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { getResumeOptimization, type ResumeOptimization, type ResumeSkillOptimization } from '../lib/api'

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-CA').format(value)
}

function coverageWithImprovement(data: ResumeOptimization) {
  return Math.max(0, Math.min(100, data.current_resume_coverage + data.estimated_coverage_improvement))
}

function SkillList({ items, emptyTitle }: { items: ResumeSkillOptimization[], emptyTitle: string }) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message="Resume optimization data is not available yet." />
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map(item => (
        <div className="flex items-center justify-between gap-4 py-3" key={item.skill}>
          <div>
            <div className="font-bold text-slate-950">{item.skill}</div>
            <div className="text-xs font-medium text-slate-500">
              Market frequency {formatPercent(item.market_frequency)}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <StatusBadge tone={item.present ? 'emerald' : 'amber'}>
              {item.present ? 'Present' : 'Gap'}
            </StatusBadge>
            <StatusBadge tone="blue">{formatNumber(item.market_count)}</StatusBadge>
          </div>
        </div>
      ))}
    </div>
  )
}

function MissingSkillsTable({ items }: { items: ResumeSkillOptimization[] }) {
  if (items.length === 0) {
    return <EmptyState title="No missing skills found" message="Historical missing skill data is not available yet." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs font-bold uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-4">Skill</th>
            <th className="py-2 pr-4">Frequency</th>
            <th className="py-2 pr-4">Priority</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(item => (
            <tr key={item.skill}>
              <td className="py-3 pr-4 font-bold text-slate-950">{item.skill}</td>
              <td className="py-3 pr-4 tabular-nums text-slate-600">{formatNumber(item.missing_count)}</td>
              <td className="py-3 pr-4 tabular-nums text-slate-600">{item.priority_score.toFixed(1)}</td>
              <td className="py-3">
                <StatusBadge tone={item.present ? 'emerald' : 'amber'}>{item.present ? 'Present' : 'Improve'}</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarketFrequency({ items }: { items: ResumeSkillOptimization[] }) {
  if (items.length === 0) {
    return <EmptyState title="No market frequency found" message="Market skill frequency data is not available yet." />
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.skill}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="font-bold text-slate-950">{item.skill}</div>
            <div className="text-xs font-bold tabular-nums text-slate-500">
              {formatPercent(item.market_frequency)}
            </div>
          </div>
          <ProgressBar value={item.market_frequency} tone={item.present ? 'emerald' : 'blue'} />
        </div>
      ))}
    </div>
  )
}

export default function ResumeOptimizationPage() {
  const [data, setData] = useState<ResumeOptimization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    getResumeOptimization()
      .then(setData)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const estimatedCoverage = useMemo(() => data ? coverageWithImprovement(data) : 0, [data])
  const strongestSkills = data?.top_skills_already_present.slice(0, 3) ?? []
  const biggestGaps = data?.most_frequent_missing_skills.slice(0, 3) ?? []
  const highestPriority = data?.skills_priority[0]

  if (loading) {
    return (
      <PageContainer size="xl">
        <LoadingState title="Loading Resume Optimization" message="Fetching persisted resume optimization metrics." />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer size="xl">
        <ErrorState title="Resume Optimization is unavailable" message={error} />
      </PageContainer>
    )
  }

  if (!data) {
    return (
      <PageContainer size="xl">
        <EmptyState title="No resume optimization data" message="Resume optimization metrics are not available yet." />
      </PageContainer>
    )
  }

  return (
    <PageContainer size="xl">
      <PageHeader
        eyebrow="Career"
        title="Resume Optimization"
        description="Historical resume coverage, skill gaps, and deterministic optimization signals from persisted platform data."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Resume Completeness" value={formatPercent(data.resume_completeness_score)} subtitle="Profile and default resume readiness" tone="emerald" />
        <StatCard label="Current Coverage" value={formatPercent(data.current_resume_coverage)} subtitle="Market skills already reflected" tone="blue" />
        <StatCard label="Estimated Improvement" value={formatPercent(data.estimated_coverage_improvement)} subtitle="Projected coverage gain" tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard label="Resume Insights" title="Strongest Skills">
          <SkillList items={strongestSkills} emptyTitle="No strongest skills found" />
        </InfoCard>
        <InfoCard label="Resume Insights" title="Biggest Skill Gaps">
          <SkillList items={biggestGaps} emptyTitle="No skill gaps found" />
        </InfoCard>
        <InfoCard label="Resume Insights" title="Highest Priority Skill">
          {highestPriority ? (
            <div>
              <div className="text-2xl font-black text-slate-950">{highestPriority.skill}</div>
              <div className="mt-2 text-sm text-slate-600">
                Priority {highestPriority.priority_score.toFixed(1)} with {formatNumber(highestPriority.missing_count)} missing-skill signals.
              </div>
              <ProgressBar className="mt-4" value={highestPriority.market_frequency} label={formatPercent(highestPriority.market_frequency)} tone="amber" />
            </div>
          ) : (
            <EmptyState title="No priority skill found" message="Skill priority data is not available yet." />
          )}
        </InfoCard>
      </div>

      <SectionCard>
        <div className="mb-5">
          <h3 className="text-lg font-extrabold text-agent-primary">Coverage Improvement</h3>
          <p className="text-sm text-slate-500">Comparison between current resume coverage and estimated coverage after adding priority skills.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Current Coverage</span>
              <span className="text-sm font-black text-slate-950">{formatPercent(data.current_resume_coverage)}</span>
            </div>
            <ProgressBar value={data.current_resume_coverage} tone="blue" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Estimated Coverage</span>
              <span className="text-sm font-black text-slate-950">{formatPercent(estimatedCoverage)}</span>
            </div>
            <ProgressBar value={estimatedCoverage} tone="emerald" />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">Top Skills Already Present</h3>
            <p className="text-sm text-slate-500">Skills found in the resume and ordered by historical market frequency.</p>
          </div>
          <SkillList items={data.top_skills_already_present} emptyTitle="No present skills found" />
        </SectionCard>

        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">Most Frequent Missing Skills</h3>
            <p className="text-sm text-slate-500">Skills repeatedly marked as missing in persisted recommendation evidence.</p>
          </div>
          <MissingSkillsTable items={data.most_frequent_missing_skills} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">Skills Priority</h3>
            <p className="text-sm text-slate-500">Deterministic ranking of skills to prioritize based on gaps and market frequency.</p>
          </div>
          <MissingSkillsTable items={data.skills_priority} />
        </SectionCard>

        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">Market Frequency</h3>
            <p className="text-sm text-slate-500">Frequency of each skill across historical opportunities.</p>
          </div>
          <MarketFrequency items={data.market_frequency} />
        </SectionCard>
      </div>
    </PageContainer>
  )
}
