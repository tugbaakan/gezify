import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createExpense, patchExpensePayer } from '../api/expenses'
import { fetchTravelMembers } from '../api/travels'
import type { ExpenseCategory, ExpenseDetail, TravelMember } from '../api/types'
import { ApiRequestError } from '../api/client'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../auth/useAuth'
import './NewExpensePage.css'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'souvenir', label: 'Souvenir' },
  { value: 'activity', label: 'Activity' },
]

function defaultDatetimeLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function NewExpenseContent({ travelId }: { travelId: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [members, setMembers] = useState<TravelMember[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [location, setLocation] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [expenseDateLocal, setExpenseDateLocal] = useState(defaultDatetimeLocal)

  const [createdExpense, setCreatedExpense] = useState<ExpenseDetail | null>(null)
  const [payerId, setPayerId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
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
          if (e instanceof ApiRequestError) setLoadError(e.message)
          else setLoadError('Could not load members.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [travelId, user?.id])

  const amountNum = useMemo(() => {
    const n = Number.parseFloat(amount.replace(',', '.'))
    return Number.isFinite(n) ? n : NaN
  }, [amount])

  const onCreateSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (submitting || !Number.isFinite(amountNum) || amountNum <= 0) return
    setSubmitError(null)
    setSubmitting(true)
    const expenseDate = new Date(expenseDateLocal).toISOString()
    createExpense(travelId, {
      category,
      location: location.trim() || null,
      amount: amountNum,
      currency: currency.trim().toUpperCase() || 'TRY',
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
        if (err instanceof ApiRequestError) setSubmitError(err.message)
        else setSubmitError('Could not save expense.')
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
        if (err instanceof ApiRequestError) setSubmitError(err.message)
        else setSubmitError('Could not set payer.')
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <main className="new-expense__main">
      <nav className="new-expense__crumb" aria-label="Breadcrumb">
        <Link to="/">Travels</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/travels/${travelId}`}>Trip</Link>
        <span aria-hidden="true"> / </span>
        <span>New expense</span>
      </nav>

      {loadError ? (
        <p className="new-expense__error" role="alert">
          {loadError}
        </p>
      ) : null}

      {!createdExpense ? (
        <form className="new-expense__form" onSubmit={onCreateSubmit}>
          <h1 className="new-expense__title">New expense</h1>

          <label className="new-expense__field">
            <span className="new-expense__label">Category</span>
            <select
              className="new-expense__input"
              value={category}
              onChange={(ev) => setCategory(ev.target.value as ExpenseCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="new-expense__field">
            <span className="new-expense__label">Location (optional)</span>
            <input
              className="new-expense__input"
              value={location}
              onChange={(ev) => setLocation(ev.target.value)}
              maxLength={1024}
              placeholder="Place or note"
            />
          </label>

          <div className="new-expense__row">
            <label className="new-expense__field new-expense__field--grow">
              <span className="new-expense__label">Amount</span>
              <input
                className="new-expense__input"
                inputMode="decimal"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label className="new-expense__field new-expense__field--currency">
              <span className="new-expense__label">Currency</span>
              <input
                className="new-expense__input"
                value={currency}
                onChange={(ev) => setCurrency(ev.target.value.toUpperCase())}
                maxLength={3}
                required
                aria-label="Currency code (ISO 4217)"
              />
            </label>
          </div>

          <label className="new-expense__field">
            <span className="new-expense__label">Date & time</span>
            <input
              className="new-expense__input"
              type="datetime-local"
              value={expenseDateLocal}
              onChange={(ev) => setExpenseDateLocal(ev.target.value)}
              required
            />
          </label>

          {submitError ? (
            <p className="new-expense__error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="new-expense__actions">
            <Link className="new-expense__cancel" to={`/travels/${travelId}`}>
              Cancel
            </Link>
            <button
              type="submit"
              className="new-expense__submit"
              disabled={submitting || members === null}
            >
              {submitting ? 'Saving…' : 'Save expense'}
            </button>
          </div>
        </form>
      ) : (
        <form className="new-expense__form" onSubmit={onPayerSubmit}>
          <h1 className="new-expense__title">Who paid?</h1>
          <p className="new-expense__hint">
            Choose who covered this expense so the split stays fair.
          </p>

          <fieldset className="new-expense__fieldset">
            <legend className="new-expense__legend">Payer</legend>
            {members?.map((m) => (
              <label key={m.userId} className="new-expense__radio">
                <input
                  type="radio"
                  name="payer"
                  value={m.userId}
                  checked={payerId === m.userId}
                  onChange={() => setPayerId(m.userId)}
                />
                <span>{m.displayName?.trim() || m.email}</span>
              </label>
            ))}
          </fieldset>

          {submitError ? (
            <p className="new-expense__error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="new-expense__actions">
            <button
              type="button"
              className="new-expense__cancel"
              disabled={submitting}
              onClick={() => setCreatedExpense(null)}
            >
              Back
            </button>
            <button type="submit" className="new-expense__submit" disabled={submitting || !payerId}>
              {submitting ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}

export function NewExpensePage() {
  const { id: travelId } = useParams<{ id: string }>()

  return (
    <AppLayout>
      {!travelId ? (
        <main className="new-expense__main">
          <p className="new-expense__error">Missing trip id.</p>
        </main>
      ) : (
        <NewExpenseContent key={travelId} travelId={travelId} />
      )}
    </AppLayout>
  )
}

export default NewExpensePage
