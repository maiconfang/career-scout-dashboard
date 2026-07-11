import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useLanguage } from '../i18n/LanguageProvider'

export default function AdminRoute() {
  const { status, user } = useAuth()
  const { t } = useLanguage()

  if (status === 'checking') return null
  if (status === 'anonymous') return <Navigate to="/login" replace />

  if (user?.role !== 'ADMIN') {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-red-100 bg-white p-8 text-center shadow-card">
        <div className="text-sm font-semibold uppercase tracking-wide text-red-600">
          {t('admin.accessDeniedLabel')}
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t('admin.accessDeniedTitle')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('admin.accessDeniedDescription')}</p>
      </div>
    )
  }

  return <Outlet />
}
