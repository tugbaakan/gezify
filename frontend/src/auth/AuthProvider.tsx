import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchCurrentUser } from '../api/auth'
import type { PublicUser } from '../api/types'
import { AuthContext } from './context'
import { startGoogleSignIn, type GoogleSignInOptions } from './google'
import { clearAccessToken, getAccessToken, setAccessToken } from './token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [ready, setReady] = useState(() => getAccessToken() === null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    let cancelled = false

    fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        clearAccessToken()
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signOut = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  const completeSession = useCallback((accessToken: string, next: PublicUser) => {
    setAccessToken(accessToken)
    setUser(next)
    setReady(true)
  }, [])

  const signInWithGoogle = useCallback((options?: GoogleSignInOptions) => {
    startGoogleSignIn(options)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      signInWithGoogle,
      signOut,
      completeSession,
    }),
    [user, ready, signInWithGoogle, signOut, completeSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
