import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { updateLocalePreference } from '../lib/authApi'
import {
  localeLabels,
  normalizeLocale,
  translate,
  type Locale,
  type TranslationKey
} from './translationService'

const STORAGE_KEY = 'career_scout_locale'

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  t: (key: TranslationKey) => string
  localeLabels: typeof localeLabels
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function storedLocale() {
  return normalizeLocale(window.localStorage.getItem(STORAGE_KEY) ?? navigator.language)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(storedLocale)

  useEffect(() => {
    if (status === 'authenticated' && user?.locale) {
      const userLocale = normalizeLocale(user.locale)
      setLocaleState(userLocale)
      window.localStorage.setItem(STORAGE_KEY, userLocale)
    }
  }, [status, user?.locale])

  const setLocale = useCallback(async (nextLocale: Locale) => {
    setLocaleState(nextLocale)
    window.localStorage.setItem(STORAGE_KEY, nextLocale)

    if (status === 'authenticated') {
      await updateLocalePreference(nextLocale)
    }
  }, [status])

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key: TranslationKey) => translate(locale, key),
    localeLabels
  }), [locale, setLocale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider.')
  }
  return context
}
