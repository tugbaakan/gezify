import { createContext } from 'react'
import type { PublicUser } from '../api/types'
import type { GoogleSignInOptions } from './google'

export type AuthContextValue = {
  user: PublicUser | null
  ready: boolean
  signInWithGoogle: (options?: GoogleSignInOptions) => void
  signOut: () => void
  completeSession: (accessToken: string, user: PublicUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
