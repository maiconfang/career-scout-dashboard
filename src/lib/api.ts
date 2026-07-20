import { apiUrl, get, patch } from './httpClient'

export type PlatformHealth = {
  status: 'ok'
  service: string
}

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
  recommended_set_decision?: RecommendedSetDecision
}

export type RecommendedSetDecision = {
  opportunity_key?: string
  decision?: 'APPLY' | 'CONSIDER' | 'DO_NOT_APPLY'
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  reason?: string
  match_score?: number
  ranking_position?: number
  recommended?: boolean
  decision_explanation?: {
    occupation_context?: {
      occupation_classification?: string
      occupation_compatibility?: string
    }
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
  recommendation_decision: string | null
  decision_confidence: string | null
  decision_reason: string | null
  ranking_position: number | null
  occupation_type: string | null
  occupation_compatibility: string | null
  recommended_at: string | null
  job_posted_at: string | null
  recommended_set: RecommendedSetDecision
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

export type OpportunityExplainability = {
  opportunity_id: number
  confidence: string
  recommendation_reason: string
  matched_skills: string[]
  missing_skills: string[]
  ranking_position: number | null
  match_score: number | null
  planner_goal: string
  search_policy_summary: Record<string, unknown>
  decision_reason: string
  recommendation_summary: Record<string, unknown>
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
  recommendation?: string
  confidence?: string
  occupation_type?: string
  compatibility?: string
  company?: string
  work_mode?: string
  min_match_score?: number
  posted_from?: string
  posted_to?: string
  campaign_id?: string
  lifecycle_status?: string
  sort_by?: 'last_discovered_at' | 'match_score' | 'company' | 'title' | 'lifecycle_status' | 'recommendation' | 'confidence' | 'job_posted_at' | 'ranking_position'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type RepositoryOpportunity = {
  opportunity_id: number
  opportunity_key: string
  linkedin_job_id: string | null
  company: string
  title: string
  location: string
  salary: string
  work_mode: string
  employment_type: string
  job_url: string
  role_type: string
  description: string
  recommendation_status: string
  decision: string | null
  decision_confidence: string | null
  match_score: number | null
  search_family: string | null
  search_keyword: string | null
  last_campaign_id: string | null
  first_discovered_at: string
  last_discovered_at: string
  campaign_count: number
  appearance_count: number
  campaign_ids: string[]
  search_families: string[]
}

export type OpportunityRepositoryQuery = {
  q?: string
  recommendation?: string
  decision?: string
  company?: string
  role_type?: string
  work_mode?: string
  employment_type?: string
  search_family?: string
  campaign_id?: string
  sort_by?: 'match_score' | 'first_discovered_at' | 'last_discovered_at' | 'company' | 'title'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type SearchAudit = {
  campaign_id: string
  campaign_date: string
  execution_status: string
  search_family: string | null
  search_keyword: string
  linkedin_search_url: string
  location: string
  work_mode: string
  jobs_collected: number
  jobs_aligned: number
  jobs_rejected: number
  conversion_rate: number
  duration_seconds: number | null
}

export type AgentExecutionSummary = {
  execution_id: string
  owner_user_id: string | null
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | string
  campaign: string
  started_at: string
  finished_at: string | null
  duration_seconds: number
  progress: number
  jobs_collected: number
  jobs_ranked: number
  apply_count: number
  consider_count: number
  do_not_apply_count: number
  has_final_report: boolean
  has_execution_log: boolean
}

export type AgentExecutionRecommendedOpportunity = {
  sighting_id: string
  opportunity_id: number
  title: string
  company: string
  location?: string | null
  match_score: number | null
  ranking_position: number | null
  recommendation_decision: string | null
  decision_confidence: string | null
  decision_reason: string | null
  job_url: string
}

export type AgentExecutionDetail = {
  summary: AgentExecutionSummary
  current_stage: string | null
  failed_agent: string | null
  error_message: string | null
  stack_trace: string | null
  planner: Record<string, unknown>
  discovery: Record<string, unknown>
  ranking: Record<string, unknown>
  decision: Record<string, unknown>
  recommended_set: AgentExecutionRecommendedOpportunity[]
  runtime_settings: Record<string, unknown>[]
  configuration_resolution: Record<string, unknown>
  goal_satisfaction: Record<string, unknown>
  self_review: Record<string, unknown>
  generated_hypotheses: Record<string, unknown>
  semantic_match: Record<string, unknown>
  final_report: Record<string, unknown>
  downloads: Record<string, string>
}

export type AgentExecutionQuery = {
  q?: string
  execution_status?: string
  sort_by?: 'status' | 'execution_id' | 'campaign' | 'started_at' | 'finished_at' | 'duration' | 'jobs_collected' | 'jobs_ranked' | 'apply' | 'consider' | 'do_not_apply'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type CampaignResultOpportunity = {
  opportunity_id: number
  title: string
  company: string
  location: string
  source: string
  url: string
  collected_at: string
  match_score: number | null
  ranking_score: number | null
  decision: string | null
  recommendation: string | null
  recommendation_reason: string | null
  status: string
}

export type CampaignExecutionResults = {
  summary: {
    execution_id: string
    campaign_profile: Record<string, unknown>
    started_at: string
    finished_at: string | null
    duration: number
    execution_status: string
  }
  discovery: {
    raw_jobs_found: number
    unique_jobs_found: number
    discarded_jobs: number
    discovery_duration: number | null
  }
  match: {
    jobs_processed: number
    average_match_score: number | null
    highest_match_score: number | null
    lowest_match_score: number | null
  }
  ranking: {
    jobs_ranked: number
    top_score: number | null
    average_score: number | null
    lowest_score: number | null
  }
  decision: {
    apply_count: number
    defer_count: number
    do_not_apply_count: number
  }
  recommendation: {
    recommendations_generated: number
    apply_recommendations: number
    defer_recommendations: number
    rejected_recommendations: number
  }
  opportunities: {
    items: CampaignResultOpportunity[]
    limit: number
    offset: number
    returned: number
    total: number
  }
}

export type CampaignExecutionResultsQuery = {
  decision?: string
  recommendation?: string
  company?: string
  source?: string
  minimum_match_score?: number
  sort_by?: 'ranking_score' | 'match_score' | 'company' | 'collected_at'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type SearchAuditQuery = {
  search_family?: string
  campaign_id?: string
  sort_by?: 'conversion_rate' | 'jobs_collected' | 'campaign_date'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type CareerFeedbackOverview = Record<string, unknown>
export type CareerFeedbackCompany = Record<string, unknown>
export type CareerFeedbackSource = Record<string, unknown>
export type CareerFeedbackCampaign = Record<string, unknown>
export type CareerFeedbackExecution = Record<string, unknown>
export type CandidateIntelligence = Record<string, unknown>

export type ResumeSkillOptimization = {
  skill: string
  present: boolean
  market_count: number
  missing_count: number
  market_frequency: number
  priority_score: number
}

export type ResumeOptimization = {
  owner_user_id: string
  resume_id: string | null
  current_resume_coverage: number
  top_skills_already_present: ResumeSkillOptimization[]
  most_frequent_missing_skills: ResumeSkillOptimization[]
  estimated_coverage_improvement: number
  skills_priority: ResumeSkillOptimization[]
  market_frequency: ResumeSkillOptimization[]
  resume_completeness_score: number
}

export type NotificationType = string

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

export type PlatformNotification = {
  id: string
  owner_user_id: string
  type: NotificationType
  title: string
  message: string
  severity: NotificationSeverity
  is_read: boolean
  related_execution_id: string | null
  related_campaign_id: string | null
  metadata?: Record<string, unknown>
  created_at: string
  read_at: string | null
}

export type AuditLogRecord = {
  id: string
  owner_user_id: string | null
  actor_user_id: string | null
  action: string
  resource_type: string
  resource_id: string
  description: string
  metadata: Record<string, unknown>
  ip_address: string
  user_agent: string
  created_at: string
}

export type AuditLogQuery = {
  action?: string
  resource_type?: string
  user_id?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export type CampaignSchedule = {
  scheduler_id: string
  owner_user_id: string
  campaign_profile_id: string
  enabled: boolean
  schedule_type: 'MANUAL' | 'DAILY' | 'WEEKLY'
  timezone: string
  next_execution: string | null
  last_execution: string | null
  created_at: string
  updated_at: string
}

export function platformHealth() {
  return get<PlatformHealth>('/health')
}

export function listNotifications(query: { unread_only?: boolean; limit?: number; offset?: number } = {}) {
  return get<PlatformNotification[]>('/api/notifications', {
    unread_only: query.unread_only ? 'true' : undefined,
    limit: query.limit,
    offset: query.offset
  })
}

export function markNotificationRead(notificationId: string) {
  return patch<PlatformNotification>(`/api/notifications/${notificationId}/read`)
}

export function markAllNotificationsRead() {
  return patch<PlatformNotification[]>('/api/notifications/read-all')
}

export function listAuditLog(query: AuditLogQuery = {}) {
  return get<AuditLogRecord[]>('/api/audit-log', query)
}

export function listCampaignSchedules() {
  return get<CampaignSchedule[]>('/api/scheduler')
}

export function listOpportunities(query: OpportunityQuery = {}) {
  return get<PaginatedResponse<Opportunity>>('/api/opportunities', query)
}

export function listOpportunityRepository(query: OpportunityRepositoryQuery = {}) {
  return get<PaginatedResponse<RepositoryOpportunity>>('/api/opportunity-repository', query)
}

export function listAgentExecutions(query: AgentExecutionQuery = {}) {
  return get<PaginatedResponse<AgentExecutionSummary>>('/api/agent/executions', query)
}

export function getAgentExecution(executionId: string) {
  return get<AgentExecutionDetail>(`/api/agent/executions/${executionId}`)
}

export function getAgentExecutionResults(executionId: string, query: CampaignExecutionResultsQuery = {}) {
  return get<CampaignExecutionResults>(`/api/agent/executions/${executionId}/results`, query)
}

export function agentExecutionDownloadUrl(executionId: string, artifact: 'final-report' | 'log') {
  return apiUrl(`/api/agent/executions/${executionId}/downloads/${artifact}`)
}

export function listSearchAudits(query: SearchAuditQuery = {}) {
  return get<PaginatedResponse<SearchAudit>>('/api/search-audit', query)
}

export function getCareerFeedbackAnalytics() {
  return get<CareerFeedbackOverview>('/api/analytics/feedback')
}

export function listCareerFeedbackCompanies() {
  return get<CareerFeedbackCompany[] | PaginatedResponse<CareerFeedbackCompany> | Record<string, unknown>>('/api/analytics/feedback/companies')
}

export function listCareerFeedbackSources() {
  return get<CareerFeedbackSource[] | PaginatedResponse<CareerFeedbackSource> | Record<string, unknown>>('/api/analytics/feedback/sources')
}

export function listCareerFeedbackCampaigns() {
  return get<CareerFeedbackCampaign[] | PaginatedResponse<CareerFeedbackCampaign> | Record<string, unknown>>('/api/analytics/feedback/campaigns')
}

export function listCareerFeedbackExecutions() {
  return get<CareerFeedbackExecution[] | PaginatedResponse<CareerFeedbackExecution> | Record<string, unknown>>('/api/analytics/feedback/executions')
}

export function getCandidateIntelligence() {
  return get<CandidateIntelligence>('/api/intelligence/candidate')
}

export function getResumeOptimization() {
  return get<ResumeOptimization>('/api/intelligence/resume-optimization')
}

export function getOpportunity(opportunityId: number) {
  return get<Opportunity>(`/api/opportunities/${opportunityId}`)
}

export function getOpportunityHistory(opportunityId: number) {
  return get<OpportunityHistory>(`/api/opportunities/${opportunityId}/history`)
}

export function getOpportunityExplainability(opportunityId: number) {
  return get<OpportunityExplainability>(`/api/opportunities/${opportunityId}/explain`)
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
  const recommendedSet = opportunity.recommended_set
    ?? recommendation.recommended_set_decision

  return {
    decision: opportunity.recommendation_decision
      ?? recommendedSet?.decision
      ?? relevantEvent?.apply_decision
      ?? decisionRecord?.decision
      ?? null,
    confidence: opportunity.decision_confidence
      ?? recommendedSet?.confidence
      ?? decisionRecord?.decision_confidence
      ?? null,
    reason: opportunity.decision_reason
      ?? recommendedSet?.reason
      ?? decisionRecord?.selection_reason
      ?? selectedRecommendation?.reason
      ?? recommendation.objective_ranking_reason
      ?? decisionRecord?.decision_reason
      ?? null,
    matchedSkills: recommendation.matched_skills ?? decisionRecord?.matched_skills ?? [],
    missingSkills: recommendation.missing_skills ?? decisionRecord?.missing_skills ?? [],
    strengths: selectedRecommendation?.strengths ?? [],
    risks: selectedRecommendation?.risks ?? [],
    rankingPosition: opportunity.ranking_position
      ?? recommendedSet?.ranking_position
      ?? relevantEvent?.ranking_position
      ?? null,
    matchScore: opportunity.match_score ?? relevantEvent?.match_score ?? null
  }
}
