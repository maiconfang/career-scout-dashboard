import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useLanguage } from '../i18n/LanguageProvider'

export default function ProtectedRoute() {
  const location = useLocation()
  const { status } = useAuth()
  const { t } = useLanguage()

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
        <div className="w-full max-w-md bg-white p-6 text-center card-base">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            {t('app.name')}
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">{t('common.loadingSession')}</h1>
          <p className="mt-2 text-sm text-muted-text">
            {t('common.loadingSessionDescription')}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
