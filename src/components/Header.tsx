import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/LanguageProvider'
import { supportedLocales, type Locale } from '../i18n/translationService'
import { listNotifications } from '../lib/api'

type HeaderProps = {
  onOpenCommandPalette?: () => void
}

export default function Header({ onOpenCommandPalette }: HeaderProps) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { locale, setLocale, t, localeLabels } = useLanguage()
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    let active = true
    async function loadUnreadNotifications() {
      try {
        const notifications = await listNotifications({ unread_only: true, limit: 100, offset: 0 })
        if (active) setUnreadNotifications(notifications.length)
      } catch {
        if (active) setUnreadNotifications(0)
      }
    }
    void loadUnreadNotifications()
    return () => {
      active = false
    }
  }, [pathname])

  const fixedPage = {
    '/workspace': {
      title: t('header.workspace.title'),
      subtitle: t('header.workspace.subtitle')
    },
    '/': {
      title: t('header.home.title'),
      subtitle: t('header.home.subtitle')
    },
    '/home': {
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
    '/agent/run-campaign': {
      title: t('header.runCampaignWizard.title'),
      subtitle: t('header.runCampaignWizard.subtitle')
    },
    '/agent/executions': {
      title: t('header.agentExecutions.title'),
      subtitle: t('header.agentExecutions.subtitle')
    },
    '/agent/campaign-inspector': {
      title: t('header.campaignInspector.title'),
      subtitle: t('header.campaignInspector.subtitle')
    },
    '/agent/campaign-comparison': {
      title: t('header.campaignComparison.title'),
      subtitle: t('header.campaignComparison.subtitle')
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
    '/career/discovery-sources': {
      title: t('header.discoverySources.title'),
      subtitle: t('header.discoverySources.subtitle')
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
    '/admin/platform-health': {
      title: t('header.platformHealth.title'),
      subtitle: t('header.platformHealth.subtitle')
    },
    '/admin': {
      title: t('header.administrationCenter.title'),
      subtitle: t('header.administrationCenter.subtitle')
    },
    '/notifications': {
      title: t('header.notifications.title'),
      subtitle: t('header.notifications.subtitle')
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
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette"
          title="Open command palette"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 lg:inline">
            Ctrl K
          </kbd>
        </button>
        <Link
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          to="/notifications"
          aria-label={t('notifications.open')}
          title={t('notifications.open')}
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Link>
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
