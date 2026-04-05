const STATE_KEY = 'gezify_oauth_state'

export function createAndStoreOAuthState(): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  return state
}

/** Compare URL state to stored value without removing it (safe under React StrictMode remounts). */
export function validateOAuthState(stateFromUrl: string | null): boolean {
  if (!stateFromUrl) return false
  const expected = sessionStorage.getItem(STATE_KEY)
  return expected !== null && expected === stateFromUrl
}

export function clearOAuthState(): void {
  sessionStorage.removeItem(STATE_KEY)
}
