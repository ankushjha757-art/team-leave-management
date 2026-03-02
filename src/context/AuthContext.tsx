import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { AppUser } from '../types'
import { apiLogin, apiMe } from '../api'

interface AuthContextValue {
  token: string | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOutUser: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'leave-app-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const user = await apiMe(stored)
        setToken(stored)
        setAppUser(user)
      } catch (err) {
        console.error('Failed to restore session', err)
        window.localStorage.removeItem(STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const signIn = async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    setToken(result.token)
    setAppUser(result.user)
    window.localStorage.setItem(STORAGE_KEY, result.token)
  }

  const signOutUser = () => {
    setToken(null)
    setAppUser(null)
    window.localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ token, appUser, loading, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

