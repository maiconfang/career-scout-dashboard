import { useEffect, useState } from 'react'
import PageState from '../components/PageState'
import { Campaign, listCampaigns } from '../lib/api'

const PAGE_SIZE = 25

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)} sec`
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} sec`
}

function campaignStatus(campaign: Campaign) {
  return campaign.metrics.execution_status ?? 'UNKNOWN'
}

export default function CampaignHistory() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [offset, setOffset] = useState(0)
  const [returned, setReturned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    listCampaigns(PAGE_SIZE, offset)
      .then(response => {
        if (!active) return
        setCampaigns(response.items)
        setReturned(response.returned)
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [offset, reloadKey])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campaign History</div>
        <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">Previous Career Scout campaigns</h2>
        <p className="mt-2 text-sm text-slate-600">Review when each campaign ran and the opportunities it processed.</p>
      </section>

      {loading && <PageState title="Loading campaigns" message="Fetching previous Career Scout campaigns." />}
      {!loading && error && (
        <PageState
          title="Campaign history is unavailable"
          message={error}
          action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>Try again</button>}
        />
      )}
      {!loading && !error && campaigns.length === 0 && <PageState title="No campaigns found" message="Career Scout has not recorded a campaign yet." />}

      {!loading && !error && campaigns.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card">
            <div className="hidden grid-cols-[1.4fr_0.7fr_repeat(4,0.6fr)_0.8fr] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
              <div>Campaign</div><div>Status</div><div>Found</div><div>Ranked</div><div>Top 5</div><div>Apply</div><div>Duration</div>
            </div>
            <div className="divide-y divide-slate-100">
              {campaigns.map(campaign => {
                const status = campaignStatus(campaign)
                return (
                  <article className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.4fr_0.7fr_repeat(4,0.6fr)_0.8fr] lg:items-center" key={campaign.campaign_id}>
                    <div>
                      <div className="font-semibold text-slate-900">{formatDate(campaign.campaign_date)}</div>
                      <div className="mt-1 font-mono text-[11px] text-slate-400">{campaign.campaign_id.slice(0, 8)}</div>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status === 'COMPLETED' ? 'bg-accent-50 text-emerald-700' : status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {status.toLowerCase().replace(/^./, value => value.toUpperCase())}
                      </span>
                    </div>
                    <div><span className="text-xs text-slate-500 lg:hidden">Found: </span><span className="font-semibold text-slate-700">{campaign.jobs_collected}</span></div>
                    <div><span className="text-xs text-slate-500 lg:hidden">Ranked: </span><span className="font-semibold text-slate-700">{campaign.jobs_accepted}</span></div>
                    <div><span className="text-xs text-slate-500 lg:hidden">Top 5: </span><span className="font-semibold text-slate-700">{campaign.top_5}</span></div>
                    <div><span className="text-xs text-slate-500 lg:hidden">Apply: </span><span className="font-semibold text-emerald-700">{campaign.apply_count}</span></div>
                    <div className="text-slate-600">{formatDuration(campaign.duration_seconds)}</div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>Previous</button>
            <span className="text-xs text-slate-500">Campaigns {offset + 1}–{offset + returned}</span>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={returned < PAGE_SIZE} onClick={() => setOffset(value => value + PAGE_SIZE)}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}
