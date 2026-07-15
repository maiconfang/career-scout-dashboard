import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/LanguageProvider'

function navClass({ isActive }: { isActive: boolean }) {
  return `block rounded px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`
}

export default function Sidebar() {
  const { t } = useLanguage()
  const { user } = useAuth()

  return (
    <aside className="w-full shrink-0 border border-slate-100 bg-white p-4 card-base lg:w-64">
      <div className="mb-6">
        <div className="text-lg font-semibold text-agent-primary">{t('app.name')}</div>
        <div className="text-sm text-muted-text">{t('app.subtitle')}</div>
      </div>

      <nav className="space-y-2">
        <NavLink to="/workspace" className={navClass}>{t('nav.workspace')}</NavLink>
        <NavLink to="/home" className={navClass}>{t('nav.home')}</NavLink>
        <NavLink to="/inbox" className={navClass}>{t('nav.opportunityInbox')}</NavLink>
        <NavLink to="/campaigns" className={navClass}>{t('nav.campaignHistory')}</NavLink>
        <NavLink to={'/repository'} className={navClass}>{t('nav.opportunityRepository')}</NavLink>
        <NavLink to="/search-audit" className={navClass}>{t('nav.searchAudit')}</NavLink>
      </nav>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('nav.agent')}
        </div>
        <nav className="space-y-2">
          <NavLink to="/agent/run-campaign" className={navClass}>{t('nav.runCampaignWizard')}</NavLink>
          <NavLink to="/agent/executions" className={navClass}>{t('nav.agentExecutions')}</NavLink>
          <NavLink to="/agent/campaign-inspector" className={navClass}>{t('nav.campaignInspector')}</NavLink>
          <NavLink to="/agent/campaign-comparison" className={navClass}>{t('nav.campaignComparison')}</NavLink>
        </nav>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('nav.analytics')}
        </div>
        <nav className="space-y-2">
          <NavLink to="/analytics/career" className={navClass}>{t('nav.careerAnalytics')}</NavLink>
          <NavLink to="/analytics/intelligence" className={navClass}>{t('nav.careerIntelligence')}</NavLink>
        </nav>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('nav.career')}
        </div>
        <nav className="space-y-2">
          <NavLink to="/career/candidate-profile" className={navClass}>{t('nav.candidateProfile')}</NavLink>
          <NavLink to="/career/resumes" className={navClass}>{t('nav.resumes')}</NavLink>
          <NavLink to="/career/resume-optimization" className={navClass}>{t('nav.resumeOptimization')}</NavLink>
          <NavLink to="/career/linkedin-accounts" className={navClass}>{t('nav.linkedinAccounts')}</NavLink>
          <NavLink to="/career/campaign-profiles" className={navClass}>{t('nav.campaignProfiles')}</NavLink>
        </nav>
      </div>

      {user?.role === 'ADMIN' && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('nav.administration')}
          </div>
          <nav className="space-y-2">
            <NavLink to="/admin" end className={navClass}>{t('nav.administrationCenter')}</NavLink>
            <NavLink to="/admin/users" className={navClass}>{t('nav.adminUsers')}</NavLink>
            <NavLink to="/admin/agent-settings" className={navClass}>{t('nav.agentSettings')}</NavLink>
            <NavLink to="/admin/platform-health" className={navClass}>{t('nav.platformHealth')}</NavLink>
          </nav>
        </div>
      )}
    </aside>
  )
}
