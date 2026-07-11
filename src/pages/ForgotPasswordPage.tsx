import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageProvider'
import { requestPasswordReset, type PasswordResetTokenResponse } from '../lib/authApi'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<PasswordResetTokenResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setSubmitting(true)

    try {
      setResult(await requestPasswordReset(email))
    } catch (error) {
      setError(error instanceof Error ? error.message : t('account.forgotPasswordError'))
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
                {t('account.forgotPasswordHeroTitle')}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
                {t('account.forgotPasswordHeroDescription')}
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8">
              <div className="text-lg font-semibold text-agent-primary">{t('app.name')}</div>
              <div className="text-sm text-muted-text">{t('app.subtitle')}</div>
            </div>

            <h2 className="text-2xl font-semibold">{t('account.forgotPasswordTitle')}</h2>
            <p className="mt-2 text-sm text-muted-text">{t('account.forgotPasswordDescription')}</p>

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

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <div>{t('account.resetTokenGenerated')}</div>
                  <code className="block break-all rounded bg-white/70 p-2 text-xs">{result.reset_token}</code>
                  <Link
                    className="inline-flex font-semibold text-emerald-900 underline"
                    to={`/reset-password?token=${encodeURIComponent(result.reset_token)}`}
                  >
                    {t('account.continueToReset')}
                  </Link>
                </div>
              )}

              <button
                className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting}
              >
                {submitting ? t('account.requestingReset') : t('account.requestReset')}
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
