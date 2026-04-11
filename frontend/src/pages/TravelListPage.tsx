import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from 'react'
import { useTranslation } from 'react-i18next'
import { i18n } from '../i18n'
import { Link } from 'react-router-dom'
import { createTravel, fetchTravels } from '../api/travels'
import type { TravelListItem } from '../api/types'
import { ApiRequestError } from '../api/client'
import { ApiErrorBanner } from '../components/ApiErrorBanner'
import { AppLayout } from '../components/AppLayout'
import { TravelListSkeleton } from '../components/TravelListSkeleton'
import { useAuth } from '../auth/useAuth'
import {
  travelStatusChipTone,
  travelStatusLabel,
  travelStatusShort,
} from '../utils/format'
import './TravelListPage.css'

export function TravelListPage() {
  const { t } = useTranslation()
  const { user, ready, signInWithGoogle } = useAuth()
  const [travels, setTravels] = useState<TravelListItem[] | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<ApiRequestError | string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<ApiRequestError | string | null>(null)

  const loadTravels = useCallback(() => {
    if (!user) return
    setListError(null)
    setListLoading(true)
    fetchTravels()
      .then((data) => {
        setTravels(data)
      })
      .catch((e: unknown) => {
        if (e instanceof ApiRequestError) setListError(e)
        else setListError(i18n.t('travelList.loadFailed'))
      })
      .finally(() => setListLoading(false))
  }, [user])

  useLayoutEffect(() => {
    if (!ready || !user) return
    /* Show loading immediately when auth becomes ready to avoid list flash */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with auth readiness before paint
    setListLoading(true)
  }, [ready, user])

  useEffect(() => {
    if (!ready) return
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset list when signed out
      setListLoading(false)
      setTravels(null)
      setListError(null)
      return
    }
    loadTravels()
  }, [ready, user, loadTravels])

  const onCreateTravel = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name || creating) return
    setCreateError(null)
    setCreating(true)
    createTravel(name)
      .then(() => {
        setNewName('')
        loadTravels()
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) setCreateError(err)
        else setCreateError(i18n.t('travelList.createFailed'))
      })
      .finally(() => setCreating(false))
  }

  return (
    <AppLayout>
      <main className="travel-list__main">
        {!ready ? (
          <p className="travel-list__loading">{t('common.loading')}</p>
        ) : !user ? (
          <>
            <section className="travel-list__hero" aria-labelledby="hero-heading">
              <h1 id="hero-heading" className="travel-list__title">
                {t('travelList.heroTitle')}
              </h1>
              <p className="travel-list__lede">{t('travelList.heroLede')}</p>
            </section>
            <section
              className="travel-list__panel"
              aria-labelledby="travels-heading"
            >
              <h2 id="travels-heading" className="travel-list__section-title">
                {t('travelList.yourTravels')}
              </h2>
              <div className="travel-list__empty" role="status">
                <p className="travel-list__empty-title">{t('travelList.signInTitle')}</p>
                <p className="travel-list__empty-copy">{t('travelList.signInCopy')}</p>
                <button
                  type="button"
                  className="travel-list__primary"
                  onClick={() => signInWithGoogle()}
                >
                  {t('app.signInGoogle')}
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <section
              className="travel-list__panel"
              aria-labelledby="travels-heading"
            >
              <div className="travel-list__panel-head">
                <h2 id="travels-heading" className="travel-list__section-title">
                  {t('travelList.yourTravels')}
                </h2>
              </div>

              <form className="travel-list__create" onSubmit={onCreateTravel}>
                <label className="travel-list__label" htmlFor="new-travel-name">
                  {t('travelList.newTrip')}
                </label>
                <div className="travel-list__create-row">
                  <input
                    id="new-travel-name"
                    className="travel-list__input"
                    value={newName}
                    onChange={(ev) => setNewName(ev.target.value)}
                    placeholder={t('travelList.tripPlaceholder')}
                    maxLength={512}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="travel-list__primary"
                    disabled={creating || !newName.trim()}
                  >
                    {creating ? t('common.creating') : t('travelList.create')}
                  </button>
                </div>
                {createError ? (
                  <ApiErrorBanner className="travel-list__banner" error={createError} />
                ) : null}
              </form>

              {listError ? (
                <ApiErrorBanner className="travel-list__banner" error={listError} />
              ) : null}

              {listLoading && travels === null ? (
                <TravelListSkeleton />
              ) : !listError && travels !== null && travels.length === 0 ? (
                <div className="travel-list__empty" role="status">
                  <p className="travel-list__empty-title">{t('travelList.emptyTitle')}</p>
                  <p className="travel-list__empty-copy">{t('travelList.emptyCopy')}</p>
                </div>
              ) : !listError && travels !== null && travels.length > 0 ? (
                <ul className="travel-list__items motion-list">
                  {travels.map((tr, i) => (
                    <li
                      key={tr.id}
                      style={{ ['--stagger' as string]: String(i) } as CSSProperties}
                    >
                      <Link className="travel-list__link" to={`/travels/${tr.id}`}>
                        <span className="travel-list__link-name">{tr.name}</span>
                        <span
                          className={`travel-list__status-chip travel-list__status-chip--${travelStatusChipTone(tr.status)}`}
                          aria-label={travelStatusLabel(tr.status)}
                        >
                          {travelStatusShort(tr.status)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}

export default TravelListPage
