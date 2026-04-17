import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AccountSwitchInfo {
  oldEmail: string
  newEmail: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  accountSwitchDetected: AccountSwitchInfo | null
  dismissAccountSwitch: () => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null; user: User | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountSwitchDetected, setAccountSwitchDetected] = useState<AccountSwitchInfo | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Detect account switch in another tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('sb-') && e.key.endsWith('-auth-token')) {
        if (e.oldValue && e.newValue && e.oldValue !== e.newValue) {
          try {
            const oldSession = JSON.parse(e.oldValue)
            const newSession = JSON.parse(e.newValue)
            if (oldSession?.user?.id !== newSession?.user?.id) {
              setAccountSwitchDetected({
                oldEmail: oldSession?.user?.email || 'desconhecido',
                newEmail: newSession?.user?.email || 'desconhecido',
              })
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const dismissAccountSwitch = useCallback(() => {
    setAccountSwitchDetected(null)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      console.error('Google sign-in error:', error.message)
      throw error
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return { error: error.message, user: null }
    }
    return { error: null, user: data.user }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('piramide-user')
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      accountSwitchDetected,
      dismissAccountSwitch,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
