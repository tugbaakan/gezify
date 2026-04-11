import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getApiBaseUrl, getGoogleClientId } from '../config'
import { useAuth } from '../auth/useAuth'
import './AppLayout.css'

type AppLayoutProps = {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t, i18n } = useTranslation()
  const { user, ready, signInWithGoogle, signOut } = useAuth()
  const googleConfigured = Boolean(getGoogleClientId())
  const apiConfigured = Boolean(getApiBaseUrl())
  const redirectExample =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback'

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <Link className="app-layout__brand" to="/">
          <span className="app-layout__logo" aria-hidden="true" />
          <span className="app-layout__wordmark">Gezify</span>
        </Link>
        <div className="app-layout__header-right">
          <div className="app-layout__lang" role="group" aria-label={t('common.language')}>
            <button
              type="button"
              className={`app-layout__lang-btn${i18n.language === 'en' ? ' app-layout__lang-btn--on' : ''}`}
              onClick={() => void i18n.changeLanguage('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`app-layout__lang-btn${i18n.language === 'tr' ? ' app-layout__lang-btn--on' : ''}`}
              onClick={() => void i18n.changeLanguage('tr')}
            >
              TR
            </button>
          </div>
          <nav className="app-layout__nav" aria-label={t('common.ariaAccountNav')}>
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
                  {t('app.signOut')}
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
                    ? t('app.titleApiUrl')
                    : !googleConfigured
                      ? t('app.titleGoogleId')
                      : undefined
                }
              >
                {t('app.signInGoogle')}
              </button>
            )}
          </nav>
        </div>
      </header>

      {(!googleConfigured || !apiConfigured) && (
        <div className="app-layout__banner" role="status">
          <strong>{t('app.devSetup')}</strong>{' '}
          {!apiConfigured && <span>{t('app.devApiUrl')}</span>}
          {!googleConfigured && (
            <span>{t('app.devGoogleId', { uri: redirectExample })}</span>
          )}
        </div>
      )}

      <div className="app-layout__body">{children}</div>

      <footer className="app-layout__footer">
        <p className="app-layout__footer-note">{t('app.footer')}</p>
      </footer>
    </div>
  )
}
