import { Link } from 'react-router-dom'
import { getApiBaseUrl, getGoogleClientId } from '../config'
import { useAuth } from '../auth/useAuth'
import './AppLayout.css'

type AppLayoutProps = {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, ready, signInWithGoogle, signOut } = useAuth()
  const googleConfigured = Boolean(getGoogleClientId())
  const apiConfigured = Boolean(getApiBaseUrl())

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <Link className="app-layout__brand" to="/">
          <span className="app-layout__logo" aria-hidden="true" />
          <span className="app-layout__wordmark">Gezify</span>
        </Link>
        <nav className="app-layout__nav" aria-label="Account">
          {!ready ? (
            <span className="app-layout__nav-placeholder" aria-hidden="true" />
          ) : user ? (
            <div className="app-layout__user">
              {user.avatarUrl ? (
                <img
                  className="app-layout__avatar"
                  src={user.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                />
              ) : null}
              <span className="app-layout__user-name">
                {user.displayName ?? user.email}
              </span>
              <button type="button" className="app-layout__sign-out" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="app-layout__sign-in"
              onClick={() => signInWithGoogle()}
              disabled={!googleConfigured || !apiConfigured}
              title={
                !apiConfigured
                  ? 'Set VITE_API_URL to your API base URL.'
                  : !googleConfigured
                    ? 'Set VITE_GOOGLE_CLIENT_ID (Web client ID from Google Cloud).'
                    : undefined
              }
            >
              Sign in with Google
            </button>
          )}
        </nav>
      </header>

      {(!googleConfigured || !apiConfigured) && (
        <div className="app-layout__banner" role="status">
          <strong>Dev setup:</strong>{' '}
          {!apiConfigured && (
            <span>
              Add <code className="app-layout__code">VITE_API_URL</code> (e.g.{' '}
              <code className="app-layout__code">http://localhost:8050</code>
              ).{' '}
            </span>
          )}
          {!googleConfigured && (
            <span>
              Add <code className="app-layout__code">VITE_GOOGLE_CLIENT_ID</code>. Use the
              same redirect URI as in Google Cloud:{' '}
              <code className="app-layout__code">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/auth/callback`
                  : '/auth/callback'}
              </code>
              .
            </span>
          )}
        </div>
      )}

      <div className="app-layout__body">{children}</div>

      <footer className="app-layout__footer">
        <p className="app-layout__footer-note">Gezify — group travel, fair splits.</p>
      </footer>
    </div>
  )
}
