import { Link } from 'react-router-dom'
import { getApiBaseUrl, getGoogleClientId } from '../config'
import { useAuth } from '../auth/useAuth'
import './MainPage.css'

export function MainPage() {
  const { user, ready, signInWithGoogle, signOut } = useAuth()
  const googleConfigured = Boolean(getGoogleClientId())
  const apiConfigured = Boolean(getApiBaseUrl())

  return (
    <div className="main-page">
      <header className="main-page__header">
        <Link className="main-page__brand" to="/">
          <span className="main-page__logo" aria-hidden="true" />
          <span className="main-page__wordmark">Gezify</span>
        </Link>
        <nav className="main-page__nav" aria-label="Account">
          {!ready ? (
            <span className="main-page__nav-placeholder" aria-hidden="true" />
          ) : user ? (
            <div className="main-page__user">
              {user.avatarUrl ? (
                <img
                  className="main-page__avatar"
                  src={user.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                />
              ) : null}
              <span className="main-page__user-name">
                {user.displayName ?? user.email}
              </span>
              <button type="button" className="main-page__sign-out" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="main-page__sign-in"
              onClick={signInWithGoogle}
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
        <div className="main-page__banner" role="status">
          <strong>Dev setup:</strong>{' '}
          {!apiConfigured && (
            <span>
              Add <code className="main-page__code">VITE_API_URL</code> (e.g.{' '}
              <code className="main-page__code">http://localhost:8050</code>
              ).{' '}
            </span>
          )}
          {!googleConfigured && (
            <span>
              Add <code className="main-page__code">VITE_GOOGLE_CLIENT_ID</code>. Use the
              same redirect URI as in Google Cloud:{' '}
              <code className="main-page__code">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/auth/callback`
                  : '/auth/callback'}
              </code>
              .
            </span>
          )}
        </div>
      )}

      <main className="main-page__body">
        <section className="main-page__hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading" className="main-page__title">
            Split trip costs without the spreadsheet drama.
          </h1>
          <p className="main-page__lede">
            Track shared expenses in TRY, invite your crew, and settle up when
            the trip wraps — all in one place.
          </p>
        </section>

        <section
          className="main-page__travels"
          aria-labelledby="travels-heading"
        >
          <div className="main-page__travels-head">
            <h2 id="travels-heading" className="main-page__section-title">
              Your travels
            </h2>
          </div>
          <div className="main-page__empty" role="status">
            <div className="main-page__empty-icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 28h40v22a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V28Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 28V18a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v10"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M24 40h16M32 34v12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="main-page__empty-title">No travels yet</p>
            <p className="main-page__empty-copy">
              {user
                ? 'Create a trip to start tracking shared expenses and settlements.'
                : 'Sign in to create a trip, add expenses, and see who owes what when you finish.'}
            </p>
          </div>
        </section>
      </main>

      <footer className="main-page__footer">
        <p className="main-page__footer-note">Gezify — group travel, fair splits.</p>
      </footer>
    </div>
  )
}

export default MainPage
