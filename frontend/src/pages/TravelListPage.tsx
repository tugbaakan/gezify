import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { createTravel, fetchTravels } from '../api/travels'
import type { TravelListItem } from '../api/types'
import { ApiRequestError } from '../api/client'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../auth/useAuth'
import {
  travelStatusChipTone,
  travelStatusLabel,
  travelStatusShort,
} from '../utils/format'
import './TravelListPage.css'

export function TravelListPage() {
  const { user, ready, signInWithGoogle } = useAuth()
  const [travels, setTravels] = useState<TravelListItem[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadTravels = useCallback(() => {
    if (!user) return
    fetchTravels()
      .then((data) => {
        setListError(null)
        setTravels(data)
      })
      .catch((e: unknown) => {
        setTravels([])
        if (e instanceof ApiRequestError) setListError(e.message)
        else setListError('Could not load travels.')
      })
  }, [user])

  useEffect(() => {
    if (!ready || !user) return
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
        if (err instanceof ApiRequestError) setCreateError(err.message)
        else setCreateError('Could not create travel.')
      })
      .finally(() => setCreating(false))
  }

  return (
    <AppLayout>
      <main className="travel-list__main">
        {!ready ? (
          <p className="travel-list__loading">Loading…</p>
        ) : !user ? (
          <>
            <section className="travel-list__hero" aria-labelledby="hero-heading">
              <h1 id="hero-heading" className="travel-list__title">
                Split trip costs without the spreadsheet drama.
              </h1>
              <p className="travel-list__lede">
                Track shared expenses in TRY, invite your crew, and settle up when
                the trip wraps — all in one place.
              </p>
            </section>
            <section
              className="travel-list__panel"
              aria-labelledby="travels-heading"
            >
              <h2 id="travels-heading" className="travel-list__section-title">
                Your travels
              </h2>
              <div className="travel-list__empty" role="status">
                <p className="travel-list__empty-title">Sign in to continue</p>
                <p className="travel-list__empty-copy">
                  Create a trip, add expenses, and see balances when you finish.
                </p>
                <button
                  type="button"
                  className="travel-list__primary"
                  onClick={() => signInWithGoogle()}
                >
                  Sign in with Google
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
                  Your travels
                </h2>
              </div>

              <form className="travel-list__create" onSubmit={onCreateTravel}>
                <label className="travel-list__label" htmlFor="new-travel-name">
                  New trip
                </label>
                <div className="travel-list__create-row">
                  <input
                    id="new-travel-name"
                    className="travel-list__input"
                    value={newName}
                    onChange={(ev) => setNewName(ev.target.value)}
                    placeholder="e.g. Cappadocia weekend"
                    maxLength={512}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="travel-list__primary"
                    disabled={creating || !newName.trim()}
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
                {createError ? (
                  <p className="travel-list__error" role="alert">
                    {createError}
                  </p>
                ) : null}
              </form>

              {listError ? (
                <p className="travel-list__error" role="alert">
                  {listError}
                </p>
              ) : null}

              {travels === null ? (
                <p className="travel-list__loading">Loading travels…</p>
              ) : travels.length === 0 ? (
                <div className="travel-list__empty" role="status">
                  <p className="travel-list__empty-title">No travels yet</p>
                  <p className="travel-list__empty-copy">
                    Create a trip above to start tracking shared expenses.
                  </p>
                </div>
              ) : (
                <ul className="travel-list__items motion-list">
                  {travels.map((t, i) => (
                    <li
                      key={t.id}
                      style={{ ['--stagger' as string]: String(i) } as CSSProperties}
                    >
                      <Link className="travel-list__link" to={`/travels/${t.id}`}>
                        <span className="travel-list__link-name">{t.name}</span>
                        <span
                          className={`travel-list__status-chip travel-list__status-chip--${travelStatusChipTone(t.status)}`}
                          aria-label={travelStatusLabel(t.status)}
                        >
                          {travelStatusShort(t.status)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}

export default TravelListPage
