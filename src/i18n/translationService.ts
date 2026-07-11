import en from './locales/en.json'
import fr from './locales/fr.json'
import ptBR from './locales/pt-BR.json'

export const supportedLocales = ['en', 'fr', 'pt-BR'] as const
export type Locale = typeof supportedLocales[number]
export type TranslationKey = keyof typeof en

type Dictionary = Record<TranslationKey, string>

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fr,
  'pt-BR': ptBR
}

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  'pt-BR': 'Português (Brasil)'
}

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale)
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (isSupportedLocale(value)) return value
  if (value?.toLowerCase().startsWith('pt')) return 'pt-BR'
  if (value?.toLowerCase().startsWith('fr')) return 'fr'
  return 'en'
}

export function translate(locale: Locale, key: TranslationKey) {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key
}
