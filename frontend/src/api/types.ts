export type PublicUser = {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

export type AuthSuccess = {
  accessToken: string
  expiresIn: number
  user: PublicUser
}

export type ApiErrorEnvelope = {
  error: {
    status: number
    code: string
    message: string
    details?: Record<string, string[]>
  }
}
