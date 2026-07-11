import { evaluatePassword } from '../lib/passwordValidation'
import { useLanguage } from '../i18n/LanguageProvider'

export default function PasswordRequirements({ password }: { password: string }) {
  const { t } = useLanguage()
  const requirements = evaluatePassword(password)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-text">
        {t('password.requirementsTitle')}
      </div>
      <ul className="space-y-1 text-sm">
        {requirements.map(requirement => (
          <li
            className={requirement.met ? 'flex items-center gap-2 text-emerald-700' : 'flex items-center gap-2 text-slate-500'}
            key={requirement.key}
          >
            <span
              className={requirement.met
                ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700'
                : 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-400'}
            >
              {requirement.met ? '✓' : '•'}
            </span>
            {t(requirement.labelKey)}
          </li>
        ))}
      </ul>
    </div>
  )
}
