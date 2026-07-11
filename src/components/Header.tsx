import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/LanguageProvider'
import { supportedLocales, type Locale } from '../i18n/translationService'

export default function Header() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { locale, setLocale, t, localeLabels } = useLanguage()
  const fixedPage = {
    '/': {
      title: t('header.home.title'),
      subtitle: t('header.home.subtitle')
    },
    '/inbox': {
      title: t('header.opportunityInbox.title'),
      subtitle: t('header.opportunityInbox.subtitle')
    },
    '/campaigns': {
      title: t('header.campaignHistory.title'),
      subtitle: t('header.campaignHistory.subtitle')
    },
    '/repository': {
      title: t('header.opportunityRepository.title'),
      subtitle: t('header.opportunityRepository.subtitle')
    },
    '/search-audit': {
      title: t('header.searchAudit.title'),
      subtitle: t('header.searchAudit.subtitle')
    },
    '/agent/executions': {
      title: t('header.agentExecutions.title'),
      subtitle: t('header.agentExecutions.subtitle')
    },
    '/career/candidate-profile': {
      title: t('header.candidateProfile.title'),
      subtitle: t('header.candidateProfile.subtitle')
    },
    '/career/resumes': {
      title: t('header.resumes.title'),
      subtitle: t('header.resumes.subtitle')
    },
    '/career/linkedin-accounts': {
      title: t('header.linkedinAccounts.title'),
      subtitle: t('header.linkedinAccounts.subtitle')
    },
    '/career/campaign-profiles': {
      title: t('header.campaignProfiles.title'),
      subtitle: t('header.campaignProfiles.subtitle')
    },
    '/admin/users': {
      title: t('header.adminUsers.title'),
      subtitle: t('header.adminUsers.subtitle')
    },
    '/admin/agent-settings': {
      title: t('header.agentSettings.title'),
      subtitle: t('header.agentSettings.subtitle')
    },
    '/account/change-password': {
      title: t('header.changePassword.title'),
      subtitle: t('header.changePassword.subtitle')
    },
    '/decision-compare': {
      title: 'Decision Compare',
      subtitle: 'Agent conflict, audit verdict, and decision evidence'
    },
    '/skills-gap': {
      title: 'Skills Gap',
      subtitle: 'Capability gaps and opportunity fit'
    },
    '/history': {
      title: 'History',
      subtitle: 'Agent evolution across historical runs'
    },
    '/jobs': {
      title: 'Jobs List',
      subtitle: 'Collected opportunities and match context'
    }
  }[pathname]
  const page = pathname.startsWith('/opportunities/')
    ? { title: t('header.opportunityDetails.title'), subtitle: t('header.opportunityDetails.subtitle') }
    : pathname.startsWith('/agent/executions/')
      ? { title: t('header.agentExecutionDetails.title'), subtitle: t('header.agentExecutionDetails.subtitle') }
      : fixedPage ?? { title: t('header.default.title'), subtitle: t('header.default.subtitle') }

  return (
    <header className="flex w-full flex-col gap-4 bg-white p-4 card-base sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold">{page.title}</h1>
        <div className="text-sm text-muted-text">{page.subtitle}</div>
      </div>

      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor="language-selector">{t('common.language')}</label>
        <select
          id="language-selector"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none transition hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          value={locale}
          onChange={event => void setLocale(event.target.value as Locale)}
          aria-label={t('common.language')}
        >
          {supportedLocales.map(option => (
            <option key={option} value={option}>{localeLabels[option]}</option>
          ))}
        </select>
        {user && (
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-slate-800">{user.display_name || user.email}</div>
            <div className="text-xs uppercase tracking-wide text-muted-text">{user.role}</div>
          </div>
        )}
        <Link
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          to="/account/change-password"
        >
          {t('account.changePassword')}
        </Link>
        <button
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          type="button"
          onClick={() => void logout()}
        >
          {t('common.logout')}
        </button>
      </div>
    </header>
  )
}
