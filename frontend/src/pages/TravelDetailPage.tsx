import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { fetchTravel, fetchTravelExpenses, fetchTravelMembers } from '../api/travels'
import type {
  ExpenseCategory,
  ExpenseDetail,
  TravelDetail,
  TravelMember,
} from '../api/types'
import { ApiRequestError } from '../api/client'
import { ApiErrorBanner } from '../components/ApiErrorBanner'
import { AppLayout } from '../components/AppLayout'
import { TravelDetailSkeleton } from '../components/TravelDetailSkeleton'
import {
  expenseCategoriesForFilter,
  formatExpenseCategory,
  formatForeignAmount,
  formatTry,
  travelStatusChipTone,
  travelStatusLabel,
  travelStatusShort,
} from '../utils/format'
import './TravelDetailPage.css'

function memberLabel(actor: { displayName: string | null; email: string }) {
  return actor.displayName?.trim() || actor.email
}

type ExpenseSort = 'date-desc' | 'date-asc' | 'try-desc' | 'try-asc'

function sortExpenses(list: ExpenseDetail[], sort: ExpenseSort): ExpenseDetail[] {
  const out = [...list]
  switch (sort) {
    case 'date-desc':
      out.sort(
        (a, b) =>
          new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
      )
      break
    case 'date-asc':
      out.sort(
        (a, b) =>
          new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime(),
      )
      break
    case 'try-desc':
      out.sort((a, b) => b.amountTry - a.amountTry)
      break
    case 'try-asc':
      out.sort((a, b) => a.amountTry - b.amountTry)
      break
    default:
      break
  }
  return out
}

function groupExpensesByLocalDay(
  sorted: ExpenseDetail[],
  locale: string,
): { dayKey: string; dayLabel: string; items: ExpenseDetail[] }[] {
  const groups: { dayKey: string; dayLabel: string; items: ExpenseDetail[] }[] = []
  for (const e of sorted) {
    const d = new Date(e.expenseDate)
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayLabel = d.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const last = groups[groups.length - 1]
    if (last?.dayKey === dayKey) last.items.push(e)
    else groups.push({ dayKey, dayLabel, items: [e] })
  }
  return groups
}

function TravelDetailContent({ travelId }: { travelId: string }) {
  const { t, i18n: i18next } = useTranslation()
  const locale = i18next.language
  const [travel, setTravel] = useState<TravelDetail | null>(null)
  const [expenses, setExpenses] = useState<ExpenseDetail[] | null>(null)
  const [members, setMembers] = useState<TravelMember[] | null>(null)
  const [error, setError] = useState<ApiRequestError | string | null>(null)
  const [expenseSort, setExpenseSort] = useState<ExpenseSort>('date-desc')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | 'all'>('all')
  const [expensePaidByMemberId, setExpensePaidByMemberId] = useState<string | 'all'>('all')

  const expenseGroups = useMemo(() => {
    if (!expenses) return []
    const filtered = expenses.filter((e) => {
      if (expenseCategory !== 'all' && e.category !== expenseCategory) return false
      if (expensePaidByMemberId !== 'all') {
        if (!e.paidBy || e.paidBy.id !== expensePaidByMemberId) return false
      }
      return true
    })
    const sorted = sortExpenses(filtered, expenseSort)
    return groupExpensesByLocalDay(sorted, locale)
  }, [expenses, expenseCategory, expensePaidByMemberId, expenseSort, locale])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchTravel(travelId),
      fetchTravelExpenses(travelId),
      fetchTravelMembers(travelId),
    ])
      .then(([tr, ex, mem]) => {
        if (!cancelled) {
          setError(null)
          setTravel(tr)
          setExpenses(ex)
          setMembers(mem)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (e instanceof ApiRequestError) setError(e)
          else setError(i18next.t('travelDetail.loadFailed'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [travelId, i18next])

  return (
    <main className="travel-detail__main">
      <nav className="travel-detail__crumb" aria-label={t('common.ariaBreadcrumb')}>
        <Link to="/">{t('travelDetail.breadcrumbTrips')}</Link>
        <span aria-hidden="true"> / </span>
        <span className="travel-detail__crumb-current">
          {travel?.name ?? t('travelDetail.tripFallback')}
        </span>
      </nav>

      {error ? (
        <ApiErrorBanner className="travel-detail__banner" error={error} />
      ) : !travel || !expenses || !members ? (
        <TravelDetailSkeleton />
      ) : (
        <>
          <div className="travel-detail__sticky">
            <div className="travel-detail__sticky-inner">
              <div className="travel-detail__sticky-text">
                <h1 className="travel-detail__title">{travel.name}</h1>
                <span
                  className={`travel-detail__status-chip travel-detail__status-chip--${travelStatusChipTone(travel.status)}`}
                  aria-label={travelStatusLabel(travel.status)}
                >
                  {travelStatusShort(travel.status)}
                </span>
              </div>
              <div className="travel-detail__actions">
                <Link
                  className="travel-detail__btn travel-detail__btn--secondary"
                  to={`/travels/${travel.id}/people`}
                >
                  {t('travelDetail.openPeoplePage')}
                </Link>
                <Link
                  className="travel-detail__btn travel-detail__btn--secondary"
                  to={`/travels/${travel.id}/settlement`}
                >
                  {t('travelDetail.settlement')}
                </Link>
                <Link
                  className="travel-detail__btn travel-detail__btn--primary"
                  to={`/travels/${travel.id}/expenses/new`}
                >
                  {t('travelDetail.addExpense')}
                </Link>
              </div>
            </div>
          </div>

          <section className="travel-detail__section" aria-labelledby="exp-heading">
            <h2 id="exp-heading" className="travel-detail__section-title">
              {t('travelDetail.expenses')}
            </h2>
            {expenses.length === 0 ? (
              <div className="travel-detail__empty-card" role="status">
                <p className="travel-detail__empty-title">{t('travelDetail.noExpensesTitle')}</p>
                <p className="travel-detail__empty-copy">{t('travelDetail.noExpensesCopy')}</p>
                <Link
                  className="travel-detail__btn travel-detail__btn--primary travel-detail__empty-cta"
                  to={`/travels/${travel.id}/expenses/new`}
                >
                  {t('travelDetail.addExpenseCta')}
                </Link>
              </div>
            ) : (
              <>
                <div className="travel-detail__expense-toolbar">
                  <div className="travel-detail__expense-toolbar-inner">
                    <div className="travel-detail__toolbar-field">
                      <label className="travel-detail__toolbar-label" htmlFor="travel-exp-sort">
                        {t('travelDetail.sort')}
                      </label>
                      <select
                        id="travel-exp-sort"
                        className="travel-detail__toolbar-select"
                        value={expenseSort}
                        onChange={(ev) => setExpenseSort(ev.target.value as ExpenseSort)}
                      >
                        <option value="date-desc">{t('travelDetail.sortDateDesc')}</option>
                        <option value="date-asc">{t('travelDetail.sortDateAsc')}</option>
                        <option value="try-desc">{t('travelDetail.sortTryDesc')}</option>
                        <option value="try-asc">{t('travelDetail.sortTryAsc')}</option>
                      </select>
                    </div>
                    <div className="travel-detail__toolbar-field">
                      <label className="travel-detail__toolbar-label" htmlFor="travel-exp-cat">
                        {t('travelDetail.category')}
                      </label>
                      <select
                        id="travel-exp-cat"
                        className="travel-detail__toolbar-select"
                        value={expenseCategory}
                        onChange={(ev) =>
                          setExpenseCategory(ev.target.value as ExpenseCategory | 'all')
                        }
                      >
                        <option value="all">{t('travelDetail.allCategories')}</option>
                        {expenseCategoriesForFilter().map((c) => (
                          <option key={c} value={c}>
                            {formatExpenseCategory(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="travel-detail__toolbar-field">
                      <label className="travel-detail__toolbar-label" htmlFor="travel-exp-paid-by">
                        {t('travelDetail.paidByMember')}
                      </label>
                      <select
                        id="travel-exp-paid-by"
                        className="travel-detail__toolbar-select"
                        value={expensePaidByMemberId}
                        onChange={(ev) =>
                          setExpensePaidByMemberId(
                            ev.target.value === 'all' ? 'all' : ev.target.value,
                          )
                        }
                      >
                        <option value="all">{t('travelDetail.allMembers')}</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {memberLabel(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {expenseGroups.length === 0 ? (
                  <p className="travel-detail__muted">{t('travelDetail.noMatchFilter')}</p>
                ) : (
                  <div className="travel-detail__expense-groups">
                    <div
                      className="travel-detail__expense-column-labels"
                      aria-hidden="true"
                    >
                      <span>{t('travelDetail.columnOriginal')}</span>
                      <span>{t('travelDetail.columnTry')}</span>
                    </div>
                    {expenseGroups.map((g) => (
                      <div key={g.dayKey} className="travel-detail__expense-day">
                        <h3 className="travel-detail__day-heading">{g.dayLabel}</h3>
                        <ul className="travel-detail__expenses motion-list">
                          {g.items.map((ex, i) => (
                            <li
                              key={ex.id}
                              className="travel-detail__expense"
                              style={
                                { ['--stagger' as string]: String(i) } as CSSProperties
                              }
                            >
                              <div className="travel-detail__expense-main">
                                <span className="travel-detail__expense-cat">
                                  {formatExpenseCategory(ex.category)}
                                </span>
                                {ex.location ? (
                                  <span className="travel-detail__expense-loc">
                                    {ex.location}
                                  </span>
                                ) : null}
                              </div>
                              <div className="travel-detail__expense-amounts">
                                <span className="travel-detail__expense-original">
                                  {formatForeignAmount(ex.amount, ex.currency)}
                                </span>
                                <span className="travel-detail__expense-try">
                                  {formatTry(ex.amountTry)}
                                </span>
                              </div>
                              <div className="travel-detail__expense-meta">
                                <span>
                                  {t('travelDetail.paidBy')}{' '}
                                  {ex.paidBy ? memberLabel(ex.paidBy) : t('common.dash')}
                                </span>
                                <span>
                                  {new Date(ex.expenseDate).toLocaleString(locale, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export function TravelDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  return (
    <AppLayout>
      {!id ? (
        <main className="travel-detail__main">
          <ApiErrorBanner error={t('travelDetail.missingId')} />
        </main>
      ) : (
        <TravelDetailContent key={id} travelId={id} />
      )}
    </AppLayout>
  )
}

export default TravelDetailPage
