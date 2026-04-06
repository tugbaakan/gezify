const PENDING_INVITE_KEY = 'gezify_pending_invite_token'
const OAUTH_RETURN_KEY = 'gezify_oauth_return_path'

export function setPendingInviteToken(token: string): void {
  sessionStorage.setItem(PENDING_INVITE_KEY, token)
}

export function consumePendingInviteToken(): string | null {
  const v = sessionStorage.getItem(PENDING_INVITE_KEY)
  if (v) sessionStorage.removeItem(PENDING_INVITE_KEY)
  return v
}

export function setOAuthReturnPath(path: string): void {
  sessionStorage.setItem(OAUTH_RETURN_KEY, path)
}

export function consumeOAuthReturnPath(): string | null {
  const v = sessionStorage.getItem(OAUTH_RETURN_KEY)
  if (v) sessionStorage.removeItem(OAUTH_RETURN_KEY)
  return v
}

export function clearPendingInviteToken(): void {
  sessionStorage.removeItem(PENDING_INVITE_KEY)
}

export function clearOAuthReturnPath(): void {
  sessionStorage.removeItem(OAUTH_RETURN_KEY)
}
