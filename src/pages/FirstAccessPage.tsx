import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageProvider'
import { activateAccount } from '../lib/authApi'
import { isPasswordValid } from '../lib/passwordValidation'
import PasswordRequirements from '../components/PasswordRequirements'
import { ErrorAlert, SuccessAlert } from '../components/design-system'
import OnboardingStepper from '../components/OnboardingStepper'

function friendlyActivationError(message: string, fallback: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('expired')) {
    return 'This activation token has expired. Please request a new token from your platform administrator.'
  }
  if (normalized.includes('invalid') || normalized.includes('token')) {
    return 'This activation token could not be verified. Please check the token and try again.'
  }
  return message || fallback
}

export default function FirstAccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const tokenFromUrl = searchParams.get('token')?.trim() ?? ''
  const [activationToken, setActivationToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const tokenProvidedByUrl = Boolean(tokenFromUrl)

  const passwordsMatch = useMemo(
    () => !confirmPassword || password === confirmPassword,
    [confirmPassword, password]
  )
  const passwordValid = useMemo(() => isPasswordValid(password), [password])
  const canSubmit = Boolean(activationToken.trim() && passwordValid && passwordsMatch && confirmPassword)

  useEffect(() => {
    if (tokenFromUrl) {
      setActivationToken(tokenFromUrl)
    }
  }, [tokenFromUrl])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError(t('account.passwordMismatch'))
      return
    }
    if (!passwordValid) {
      setError(t('password.invalid'))
      return
    }

    setSubmitting(true)
    try {
      await activateAccount(activationToken, password)
      setSuccess(t('account.firstAccessSuccess'))
      window.setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (error) {
      setError(friendlyActivationError(
        error instanceof Error ? error.message : '',
        t('account.firstAccessError')
      ))
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
                {t('account.firstAccessHeroTitle')}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
                {t('account.firstAccessHeroDescription')}
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                {t('account.activateAccountContextTitle')}
              </div>
              <ul className="mt-4 space-y-3 text-sm font-semibold text-white/90">
                <li>{t('account.activateAccountContextCreated')}</li>
                <li>{t('account.activateAccountContextToken')}</li>
                <li>{t('account.activateAccountContextLink')}</li>
                <li>{t('account.activateAccountContextOnce')}</li>
              </ul>
              <p className="mt-5 text-sm leading-6 text-white/80">
                {t('account.activateAccountLoginAfter')}
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8">
              <div className="text-lg font-semibold text-agent-primary">{t('app.name')}</div>
              <div className="text-sm text-muted-text">{t('app.subtitle')}</div>
            </div>

            <h2 className="text-2xl font-semibold">{t('account.firstAccessTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-text">{t('account.firstAccessDescription')}</p>

            <div className="mt-6">
              <OnboardingStepper current="ACTIVATE_ACCOUNT" />
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {tokenProvidedByUrl ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <div className="font-semibold">{t('account.activationTokenFromUrl')}</div>
                  <div className="mt-1">{t('account.activationTokenCreatePassword')}</div>
                </div>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">{t('account.activationToken')}</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    value={activationToken}
                    onChange={event => setActivationToken(event.target.value)}
                    autoComplete="one-time-code"
                    placeholder={t('account.activationTokenPlaceholder')}
                    required
                  />
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{t('account.activationTokenHelp')}</span>
                </label>
              )}

              <PasswordRequirements password={password} />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('account.newPassword')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('account.confirmPassword')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  required
                />
              </label>

              {!passwordsMatch && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {t('account.passwordMismatch')}
                </div>
              )}

              {error && <ErrorAlert>{error}</ErrorAlert>}
              {success && <SuccessAlert>{success}</SuccessAlert>}

              <button
                className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting || !canSubmit || Boolean(success)}
              >
                {submitting ? t('account.activating') : t('account.activateAccount')}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link className="font-semibold text-brand-700 hover:text-brand-800" to="/access-request">
                {t('account.requestAccess')}
              </Link>
              <Link className="text-brand-700 hover:text-brand-800" to="/login">
                {t('account.backToLogin')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
