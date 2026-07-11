import type { TranslationKey } from '../i18n/translationService'

export type PasswordRequirementKey =
  | 'minimumLength'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'specialCharacter'

export type PasswordRequirementResult = {
  key: PasswordRequirementKey
  labelKey: TranslationKey
  met: boolean
}

export function evaluatePassword(password: string): PasswordRequirementResult[] {
  return [
    {
      key: 'minimumLength',
      labelKey: 'password.requirement.minimumLength',
      met: password.length >= 12
    },
    {
      key: 'uppercase',
      labelKey: 'password.requirement.uppercase',
      met: /[A-Z]/.test(password)
    },
    {
      key: 'lowercase',
      labelKey: 'password.requirement.lowercase',
      met: /[a-z]/.test(password)
    },
    {
      key: 'number',
      labelKey: 'password.requirement.number',
      met: /\d/.test(password)
    },
    {
      key: 'specialCharacter',
      labelKey: 'password.requirement.specialCharacter',
      met: /[^A-Za-z0-9\s]/.test(password)
    }
  ]
}

export function isPasswordValid(password: string) {
  return evaluatePassword(password).every(requirement => requirement.met)
}
