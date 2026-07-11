import { FormEvent, useMemo, useState } from 'react'
import PasswordRequirements from '../components/PasswordRequirements'
import { useLanguage } from '../i18n/LanguageProvider'
import { changePassword } from '../lib/authApi'
import { isPasswordValid } from '../lib/passwordValidation'

export default function ChangePasswordPage() {
  const { t } = useLanguage()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = useMemo(
    () => !confirmPassword || newPassword === confirmPassword,
    [confirmPassword, newPassword]
  )
  const passwordValid = useMemo(() => isPasswordValid(newPassword), [newPassword])
  const canSubmit = Boolean(currentPassword && newPassword && confirmPassword && passwordsMatch && passwordValid)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError(t('account.passwordMismatch'))
      return
    }
    if (!passwordValid) {
      setError(t('password.invalid'))
      return
    }

    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(t('account.changePasswordSuccess'))
    } catch (error) {
      setError(error instanceof Error ? error.message : t('account.changePasswordError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.55fr)]">
      <div className="bg-white p-6 card-base">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('account.changePasswordTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-text">{t('account.changePasswordDescription')}</p>
        </div>

        <form className="mt-6 max-w-xl space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{t('account.currentPassword')}</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">{t('account.newPassword')}</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              required
            />
          </label>

          <PasswordRequirements password={newPassword} />

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

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <button
            className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting || !canSubmit}
          >
            {submitting ? t('account.changingPassword') : t('account.changePassword')}
          </button>
        </form>
      </div>

      <aside className="bg-white p-6 card-base">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted-text">
          {t('password.requirementsTitle')}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t('account.changePasswordHelp')}
        </p>
      </aside>
    </section>
  )
}
