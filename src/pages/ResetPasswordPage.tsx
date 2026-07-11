import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageProvider'
import { resetPassword } from '../lib/authApi'
import { isPasswordValid } from '../lib/passwordValidation'
import PasswordRequirements from '../components/PasswordRequirements'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const [resetToken, setResetToken] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = useMemo(
    () => !confirmPassword || password === confirmPassword,
    [confirmPassword, password]
  )
  const passwordValid = useMemo(() => isPasswordValid(password), [password])
  const canSubmit = Boolean(resetToken.trim() && passwordValid && passwordsMatch && confirmPassword)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

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
      await resetPassword(resetToken, password)
      navigate('/login', { replace: true })
    } catch (error) {
      setError(error instanceof Error ? error.message : t('account.resetPasswordError'))
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
                {t('account.resetPasswordHeroTitle')}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
                {t('account.resetPasswordHeroDescription')}
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8">
              <div className="text-lg font-semibold text-agent-primary">{t('app.name')}</div>
              <div className="text-sm text-muted-text">{t('app.subtitle')}</div>
            </div>

            <h2 className="text-2xl font-semibold">{t('account.resetPasswordTitle')}</h2>
            <p className="mt-2 text-sm text-muted-text">{t('account.resetPasswordDescription')}</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('account.resetToken')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  value={resetToken}
                  onChange={event => setResetToken(event.target.value)}
                  required
                />
              </label>

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

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting || !canSubmit}
              >
                {submitting ? t('account.resettingPassword') : t('account.resetPassword')}
              </button>
            </form>

            <div className="mt-6 text-sm">
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
