import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { i18n } from '../i18n'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createExpense, patchExpensePayer } from '../api/expenses'
import { fetchTravelMembers } from '../api/travels'
import type { ExpenseCategory, ExpenseDetail, TravelMember } from '../api/types'
import { ApiRequestError } from '../api/client'
import { ApiErrorBanner } from '../components/ApiErrorBanner'
import { AppLayout } from '../components/AppLayout'
import { ExpenseFormSkeleton } from '../components/ExpenseFormSkeleton'
import { useAuth } from '../auth/useAuth'
import './NewExpensePage.css'

const CATEGORY_VALUES: ExpenseCategory[] = [
  'food',
  'accommodation',
  'transfer',
  'souvenir',
  'activity',
]

const PRESET_CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'] as const
type PresetCurrency = (typeof PRESET_CURRENCIES)[number]

function isPresetCurrency(c: string): c is PresetCurrency {
  return (PRESET_CURRENCIES as readonly string[]).includes(c)
}

function defaultDatetimeLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function NewExpenseContent({ travelId }: { travelId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const payerTitleId = useId()
  const currencyFieldId = useId()

  const categories = useMemo(
    () =>
      CATEGORY_VALUES.map((value) => ({
        value,
        label: t(`expenseCategory.${value}`),
      })),
    [t],
  )

  const [members, setMembers] = useState<TravelMember[] | null>(null)
  const [loadError, setLoadError] = useState<ApiRequestError | string | null>(null)

  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [location, setLocation] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [expenseDateLocal, setExpenseDateLocal] = useState(defaultDatetimeLocal)

  const [createdExpense, setCreatedExpense] = useState<ExpenseDetail | null>(null)
  const [payerId, setPayerId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<ApiRequestError | string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchTravelMembers(travelId)
      .then((list) => {
        if (!cancelled) {
          setLoadError(null)
          setMembers(list)
          const me = list.find((m) => m.userId === user?.id)
          setPayerId(me?.userId ?? list[0]?.userId ?? null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (e instanceof ApiRequestError) setLoadError(e)
          else setLoadError(i18n.t('newExpense.membersLoadFailed'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [travelId, user?.id])

  useEffect(() => {
    if (!createdExpense) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      const el =
        document.querySelector<HTMLInputElement>(
          '.new-expense__sheet input[name="payer"]:checked',
        ) ??
        document.querySelector<HTMLInputElement>('.new-expense__sheet input[name="payer"]')
      el?.focus()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = prevOverflow
    }
  }, [createdExpense])

  const amountNum = useMemo(() => {
    const n = Number.parseFloat(amount.replace(',', '.'))
    return Number.isFinite(n) ? n : NaN
  }, [amount])

  const currencySelectValue = isPresetCurrency(currency) ? currency : 'OTHER'

  const onCreateSubmit = (e: FormEvent) => {
    e.preventDefault()
    const code = currency.trim().toUpperCase()
    if (!code || code.length !== 3) {
      setSubmitError(t('newExpense.currencyInvalid'))
      return
    }
    if (submitting || !Number.isFinite(amountNum) || amountNum <= 0) return
    setSubmitError(null)
    setSubmitting(true)
    const expenseDate = new Date(expenseDateLocal).toISOString()
    createExpense(travelId, {
      category,
      location: location.trim() || null,
      amount: amountNum,
      currency: code,
      expenseDate,
    })
      .then((exp) => {
        setCreatedExpense(exp)
        const defaultPayer =
          exp.paidBy?.id ??
          user?.id ??
          members?.find((m) => m.userId === user?.id)?.userId ??
          members?.[0]?.userId ??
          null
        setPayerId(defaultPayer)
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) setSubmitError(err)
        else setSubmitError(t('newExpense.saveFailed'))
      })
      .finally(() => setSubmitting(false))
  }

  const onPayerSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!createdExpense || !payerId || submitting) return
    setSubmitError(null)
    setSubmitting(true)
    patchExpensePayer(createdExpense.id, payerId)
      .then(() => navigate(`/travels/${travelId}`, { replace: true }))
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) setSubmitError(err)
        else setSubmitError(t('newExpense.payerFailed'))
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <main className="new-expense__main">
      <nav className="new-expense__crumb" aria-label="Breadcrumb">
        <Link to="/">{t('newExpense.breadcrumbTrips')}</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/travels/${travelId}`}>{t('newExpense.trip')}</Link>
        <span aria-hidden="true"> / </span>
        <span>{t('newExpense.newExpense')}</span>
      </nav>

      {loadError ? <ApiErrorBanner className="new-expense__banner" error={loadError} /> : null}

      {!createdExpense && loadError ? null : !createdExpense && members === null ? (
        <ExpenseFormSkeleton />
      ) : !createdExpense ? (
        <form className="new-expense__form" onSubmit={onCreateSubmit}>
          <h1 className="new-expense__title">{t('newExpense.newExpense')}</h1>

          <label className="new-expense__field">
            <span className="new-expense__label">{t('newExpense.category')}</span>
            <select
              className="new-expense__input"
              value={category}
              onChange={(ev) => setCategory(ev.target.value as ExpenseCategory)}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="new-expense__field">
            <span className="new-expense__label">{t('newExpense.locationOptional')}</span>
            <input
              className="new-expense__input"
              value={location}
              onChange={(ev) => setLocation(ev.target.value)}
              maxLength={1024}
              placeholder={t('newExpense.locationPlaceholder')}
            />
          </label>

          <div className="new-expense__row new-expense__row--amount-block">
            <label className="new-expense__field new-expense__field--grow">
              <span className="new-expense__label">{t('newExpense.amount')}</span>
              <input
                className="new-expense__input new-expense__input--amount"
                inputMode="decimal"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                placeholder="0.00"
                required
                autoComplete="off"
              />
            </label>
            <div className="new-expense__field new-expense__field--currency-block">
              <span className="new-expense__label" id={currencyFieldId}>
                {t('newExpense.currency')}
              </span>
              <select
                className="new-expense__input new-expense__select"
                aria-labelledby={currencyFieldId}
                value={currencySelectValue}
                onChange={(ev) => {
                  const v = ev.target.value
                  if (v === 'OTHER') setCurrency('')
                  else setCurrency(v)
                }}
              >
                {PRESET_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="OTHER">{t('newExpense.currencyOther')}</option>
              </select>
              {!isPresetCurrency(currency) ? (
                <input
                  className="new-expense__input new-expense__input--currency-code"
                  value={currency}
                  onChange={(ev) =>
                    setCurrency(
                      ev.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3),
                    )
                  }
                  placeholder={t('newExpense.currencyCodePlaceholder')}
                  maxLength={3}
                  aria-label={t('newExpense.currencyCodeAria')}
                />
              ) : null}
            </div>
          </div>

          <p className="new-expense__fx-hint">{t('newExpense.fxHint')}</p>

          <label className="new-expense__field">
            <span className="new-expense__label">{t('newExpense.dateTime')}</span>
            <input
              className="new-expense__input"
              type="datetime-local"
              value={expenseDateLocal}
              onChange={(ev) => setExpenseDateLocal(ev.target.value)}
              required
            />
          </label>

          {submitError ? (
            <ApiErrorBanner className="new-expense__form-banner" error={submitError} />
          ) : null}

          <div className="new-expense__actions">
            <Link className="new-expense__cancel" to={`/travels/${travelId}`}>
              {t('common.cancel')}
            </Link>
            <button
              type="submit"
              className="new-expense__submit"
              disabled={submitting || members === null}
            >
              {submitting ? t('common.saving') : t('newExpense.saveExpense')}
            </button>
          </div>
        </form>
      ) : null}

      {createdExpense ? (
        <>
          <div className="new-expense__backdrop" aria-hidden="true" />
          <div
            className="new-expense__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={payerTitleId}
          >
            <form
              className="new-expense__form new-expense__form--sheet"
              onSubmit={onPayerSubmit}
            >
              <div className="new-expense__sheet-scroll">
                <h1 id={payerTitleId} className="new-expense__title new-expense__title--sheet">
                  {t('newExpense.whoPaid')}
                </h1>
                <p className="new-expense__hint">{t('newExpense.whoPaidHint')}</p>

                <fieldset className="new-expense__fieldset new-expense__fieldset--payer">
                  <legend className="new-expense__legend">{t('newExpense.payerLegend')}</legend>
                  {members?.map((m) => (
                    <label key={m.userId} className="new-expense__payer-option">
                      <input
                        type="radio"
                        name="payer"
                        value={m.userId}
                        checked={payerId === m.userId}
                        onChange={() => setPayerId(m.userId)}
                      />
                      <span className="new-expense__payer-option-label">
                        {m.displayName?.trim() || m.email}
                      </span>
                    </label>
                  ))}
                </fieldset>

                {submitError ? (
                  <ApiErrorBanner className="new-expense__form-banner" error={submitError} />
                ) : null}
              </div>

              <div className="new-expense__actions new-expense__actions--sheet">
                <button
                  type="button"
                  className="new-expense__cancel"
                  disabled={submitting}
                  onClick={() => setCreatedExpense(null)}
                >
                  {t('common.back')}
                </button>
                <button
                  type="submit"
                  className="new-expense__submit"
                  disabled={submitting || !payerId}
                >
                  {submitting ? t('common.saving') : t('common.continue')}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}
    </main>
  )
}

export function NewExpensePage() {
  const { t } = useTranslation()
  const { id: travelId } = useParams<{ id: string }>()

  return (
    <AppLayout>
      {!travelId ? (
        <main className="new-expense__main">
          <ApiErrorBanner error={t('newExpense.missingId')} />
        </main>
      ) : (
        <NewExpenseContent key={travelId} travelId={travelId} />
      )}
    </AppLayout>
  )
}

export default NewExpensePage
