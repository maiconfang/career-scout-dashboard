import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import {
  currentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  type PlatformUser
} from '../lib/authApi'

type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

type AuthContextValue = {
  status: AuthStatus
  user: PlatformUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function refreshDelay(expiresInSeconds: number) {
  return Math.max((expiresInSeconds - 60) * 1000, 30_000)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<PlatformUser | null>(null)
  const refreshTimer = useRef<number | undefined>()

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current !== undefined) {
      window.clearTimeout(refreshTimer.current)
      refreshTimer.current = undefined
    }
  }, [])

  const markAnonymous = useCallback(() => {
    clearRefreshTimer()
    setUser(null)
    setStatus('anonymous')
  }, [clearRefreshTimer])

  const refresh = useCallback(async () => {
    try {
      const token = await refreshSession()
      setUser(token.user)
      setStatus('authenticated')
      clearRefreshTimer()
      refreshTimer.current = window.setTimeout(() => {
        void refresh()
      }, refreshDelay(token.expires_in_seconds))
      return true
    } catch {
      markAnonymous()
      return false
    }
  }, [clearRefreshTimer, markAnonymous])

  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      try {
        const activeUser = await currentUser()
        if (!mounted) return
        setUser(activeUser)
        setStatus('authenticated')
        await refresh()
      } catch {
        if (!mounted) return
        await refresh()
      }
    }

    void restoreSession()

    return () => {
      mounted = false
      clearRefreshTimer()
    }
  }, [clearRefreshTimer, refresh])

  useEffect(() => {
    function handleExpiredSession() {
      markAnonymous()
    }

    window.addEventListener('career-scout-auth-expired', handleExpiredSession)
    return () => window.removeEventListener('career-scout-auth-expired', handleExpiredSession)
  }, [markAnonymous])

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginRequest(email, password)
    setUser(token.user)
    setStatus('authenticated')
    clearRefreshTimer()
    refreshTimer.current = window.setTimeout(() => {
      void refresh()
    }, refreshDelay(token.expires_in_seconds))
  }, [clearRefreshTimer, refresh])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      markAnonymous()
    }
  }, [markAnonymous])

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    login,
    logout,
    refresh
  }), [status, user, login, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
