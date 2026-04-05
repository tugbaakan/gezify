import { createContext } from 'react'
import type { PublicUser } from '../api/types'

export type AuthContextValue = {
  user: PublicUser | null
  ready: boolean
  signInWithGoogle: () => void
  signOut: () => void
  completeSession: (accessToken: string, user: PublicUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
