import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/LanguageProvider'

type LoginLocationState = {
  from?: string
}

function isActivationRequiredError(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('activation') ||
    normalized.includes('activate') ||
    normalized.includes('not active') ||
    normalized.includes('inactive') ||
    normalized.includes('pending') ||
    normalized.includes('first access')
  )
}

export default function LoginPageI18n() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, status } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activationRequired, setActivationRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as LoginLocationState | null)?.from ?? '/'

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(from, { replace: true })
    }
  }, [from, navigate, status])

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setActivationRequired(false)
    setSubmitting(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('login.genericError')
      setActivationRequired(isActivationRequiredError(message))
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden bg-white card-base lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                {t('login.platform')}
              </div>
              <h1 className="mt-8 max-w-lg text-4xl font-semibold leading-tight">
                {t('login.heroTitle')}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
                {t('login.heroDescription')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white/15 p-4">
                <div className="text-2xl font-semibold">IAM</div>
                <div className="mt-1 text-white/70">{t('login.secureSession')}</div>
              </div>
              <div className="rounded-xl bg-white/15 p-4">
                <div className="text-2xl font-semibold">Audit</div>
                <div className="mt-1 text-white/70">{t('login.traceable')}</div>
              </div>
              <div className="rounded-xl bg-white/15 p-4">
                <div className="text-2xl font-semibold">Agent</div>
                <div className="mt-1 text-white/70">{t('login.controlCenter')}</div>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8">
              <div className="text-lg font-semibold text-agent-primary">{t('app.name')}</div>
              <div className="text-sm text-muted-text">{t('app.subtitle')}</div>
            </div>

            <h2 className="text-2xl font-semibold">{t('login.title')}</h2>
            <p className="mt-2 text-sm text-muted-text">
              {t('login.description')}
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('login.email')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('login.password')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <div>{activationRequired ? t('login.activationRequiredMessage') : error}</div>
                  {activationRequired && (
                    <Link className="mt-3 inline-flex rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" to="/first-access">
                      {t('account.activateAccount')}
                    </Link>
                  )}
                </div>
              )}

              <button
                className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting || status === 'checking'}
              >
                {submitting ? t('login.submitting') : t('login.submit')}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link className="text-brand-700 hover:text-brand-800" to="/forgot-password">
                {t('login.forgotPassword')}
              </Link>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-sm font-semibold text-slate-900">{t('login.publicFlowsTitle')}</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-bold text-slate-900">{t('login.haveAccountTitle')}</div>
                  <p className="mt-1 text-sm text-slate-500">{t('login.haveAccountDescription')}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-bold text-slate-900">{t('login.needAccountTitle')}</div>
                  <p className="mt-1 text-sm text-slate-500">{t('login.needAccountDescription')}</p>
                  <Link className="mt-3 inline-flex rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" to="/access-request">
                    {t('account.requestAccess')}
                  </Link>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-bold text-slate-900">{t('login.receivedActivationTitle')}</div>
                  <p className="mt-1 text-sm text-slate-500">{t('login.receivedActivationDescription')}</p>
                  <Link className="mt-3 inline-flex rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" to="/first-access">
                    {t('account.activateAccount')}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
