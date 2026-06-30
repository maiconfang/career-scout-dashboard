export type PaginatedResponse<T> = {
  items: T[]
  limit: number
  offset: number
  returned: number
}

export type OpportunityFeedback = {
  feedback_id: string
  opportunity_id: number
  feedback_type: string
  feedback_at: string
  notes: string
  source: string
}

export type DecisionRecord = {
  decision?: string
  decision_confidence?: string
  decision_reason?: string
  selection_reason?: string
  matched_skills?: string[]
  missing_skills?: string[]
}

export type OpportunityRecommendation = {
  matched_skills?: string[]
  missing_skills?: string[]
  priority_skills_found?: string[]
  priority_skills_missing?: string[]
  objective_ranking_reason?: string
  professional_context?: string
  professional_context_evidence?: string[]
  decision_record?: DecisionRecord
  selected_opportunity_recommendation?: {
    reason?: string
    strengths?: string[]
    risks?: string[]
  }
}

export type Opportunity = {
  opportunity_id: number
  opportunity_key: string
  linkedin_job_id: string | null
  company: string
  title: string
  location: string
  salary: string
  currency: string
  work_mode: string
  employment_type: string
  posted_at: string
  apply_count: number | null
  apply_type: string
  job_url: string
  role_type: string
  description: string
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  skills: string[]
  technologies: string[]
  job_intelligence: Record<string, unknown>
  match_score: number | null
  recommendation: OpportunityRecommendation
  selected: boolean
  lifecycle_status: string
  feedback: OpportunityFeedback[]
  last_campaign_id: string | null
  first_discovered_at: string
  last_discovered_at: string
  campaign_count: number
  appearance_count: number
}

export type OpportunityHistoryEvent = {
  sighting_id: string
  opportunity_id: number
  campaign_id: string
  collected_at: string
  search_family: string | null
  search_keyword: string
  search_policy: Record<string, unknown>
  ranking_position: number | null
  match_score: number | null
  recommendation: OpportunityRecommendation
  selected: boolean
  apply_decision: string | null
  rejection_reason: string | null
  filters: Record<string, unknown>
  collection_duration_seconds: number | null
}

export type OpportunityHistory = {
  opportunity: Opportunity
  events: OpportunityHistoryEvent[]
  feedback: OpportunityFeedback[]
}

export type CampaignMetrics = {
  execution_status?: string
  total_appearances?: number
  average_match_score?: number | null
  selected_count?: number
  unique_companies?: number
  unique_titles?: number
  objective_achieved?: boolean | null
  strategy_adequate?: boolean | null
  sufficient_opportunities?: boolean | null
  confidence_coherent?: boolean | null
  decision_confidence?: string | null
}

export type Campaign = {
  campaign_id: string
  campaign_date: string
  duration_seconds: number
  jobs_collected: number
  jobs_accepted: number
  jobs_rejected: number
  top_5: number
  apply_count: number
  metrics: CampaignMetrics
}

export type OpportunityQuery = {
  q?: string
  lifecycle_status?: string
  sort_by?: 'last_discovered_at' | 'match_score' | 'company' | 'title' | 'lifecycle_status'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

const configuredBaseUrl = (import.meta.env.VITE_CAREER_SCOUT_API_URL as string | undefined)?.trim()
const apiBaseUrl = configuredBaseUrl?.replace(/\/$/, '') ?? ''

function apiUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(`${apiBaseUrl}${path}`, window.location.origin)

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  })

  return url.toString()
}

async function get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const response = await fetch(apiUrl(path, query), { headers: { Accept: 'application/json' } })

  if (!response.ok) {
    const message = response.status === 404
      ? 'The requested Career Scout data was not found.'
      : `Career Scout API request failed (${response.status}).`
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function listOpportunities(query: OpportunityQuery = {}) {
  return get<PaginatedResponse<Opportunity>>('/api/opportunities', query)
}

export function getOpportunity(opportunityId: number) {
  return get<Opportunity>(`/api/opportunities/${opportunityId}`)
}

export function getOpportunityHistory(opportunityId: number) {
  return get<OpportunityHistory>(`/api/opportunities/${opportunityId}/history`)
}

export function listCampaigns(limit = 25, offset = 0) {
  return get<PaginatedResponse<Campaign>>('/api/campaigns', {
    sort_by: 'campaign_date',
    order: 'desc',
    limit,
    offset
  })
}

export function recommendationDetails(
  opportunity: Opportunity,
  events: OpportunityHistoryEvent[] = []
) {
  const relevantEvent = events.find(event =>
    event.apply_decision || event.selected || event.match_score !== null || Object.keys(event.recommendation ?? {}).length > 0
  )
  const recommendation = Object.keys(opportunity.recommendation ?? {}).length > 0
    ? opportunity.recommendation
    : relevantEvent?.recommendation ?? {}
  const decisionRecord = recommendation.decision_record
  const selectedRecommendation = recommendation.selected_opportunity_recommendation

  return {
    decision: relevantEvent?.apply_decision ?? decisionRecord?.decision ?? null,
    confidence: decisionRecord?.decision_confidence ?? null,
    reason: decisionRecord?.selection_reason
      ?? selectedRecommendation?.reason
      ?? recommendation.objective_ranking_reason
      ?? decisionRecord?.decision_reason
      ?? null,
    matchedSkills: recommendation.matched_skills ?? decisionRecord?.matched_skills ?? [],
    missingSkills: recommendation.missing_skills ?? decisionRecord?.missing_skills ?? [],
    strengths: selectedRecommendation?.strengths ?? [],
    risks: selectedRecommendation?.risks ?? [],
    rankingPosition: relevantEvent?.ranking_position ?? null,
    matchScore: opportunity.match_score ?? relevantEvent?.match_score ?? null
  }
}
