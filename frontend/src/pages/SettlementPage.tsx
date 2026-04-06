import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchTravel,
  fetchTravelSettlement,
  type SettlementResponse,
} from '../api/travels'
import type { TravelDetail } from '../api/types'
import { ApiRequestError } from '../api/client'
import { AppLayout } from '../components/AppLayout'
import { formatTry, travelStatusLabel } from '../utils/format'
import './SettlementPage.css'

function personLabel(email: string, displayName: string | null) {
  return displayName?.trim() || email
}

function SettlementContent({ travelId }: { travelId: string }) {
  const [travel, setTravel] = useState<TravelDetail | null>(null)
  const [travelError, setTravelError] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null)
  const [settlementLoading, setSettlementLoading] = useState(true)
  const [settlementError, setSettlementError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchTravel(travelId)
      .then((t) => {
        if (!cancelled) {
          setTravelError(null)
          setTravel(t)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (e instanceof ApiRequestError) setTravelError(e.message)
          else setTravelError('Could not load trip.')
        }
      })

    fetchTravelSettlement(travelId)
      .then((s) => {
        if (!cancelled) {
          setSettlementError(null)
          setSettlement(s)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (e instanceof ApiRequestError) setSettlementError(e.message)
          else setSettlementError('Could not load settlement.')
        }
      })
      .finally(() => {
        if (!cancelled) setSettlementLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [travelId])

  const transfers = settlement?.transfers ?? []
  const st = settlement?.status
  const preview = settlement?.isSettlementPreview ?? false
  const summary = settlement?.summary ?? null
  const blockedAllFinished =
    st === 'allFinished' && preview && !summary && transfers.length === 0

  return (
    <main className="settlement__main">
      <nav className="settlement__crumb" aria-label="Breadcrumb">
        <Link to="/">Travels</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/travels/${travelId}`}>{travel?.name ?? 'Trip'}</Link>
        <span aria-hidden="true"> / </span>
        <span>Settlement</span>
      </nav>

      {travelError ? (
        <p className="settlement__error" role="alert">
          {travelError}
        </p>
      ) : !travel ? (
        <p className="settlement__loading">Loading…</p>
      ) : (
        <>
          <header className="settlement__head">
            <h1 className="settlement__title">Settlement</h1>
            <p className="settlement__sub">
              {travel.name} · {travelStatusLabel(travel.status)}
            </p>
          </header>

          <section className="settlement__card" aria-labelledby="sett-heading">
            <h2 id="sett-heading" className="settlement__section-title">
              Suggested transfers
              {preview ? (
                <span className="settlement__muted"> (preview)</span>
              ) : null}
            </h2>
            {settlementLoading ? (
              <p className="settlement__muted">Loading settlement…</p>
            ) : settlementError ? (
              <p className="settlement__warn" role="alert">
                {settlementError}
              </p>
            ) : st === 'active' && transfers.length === 0 ? (
              <p className="settlement__muted">
                No settlement transfers yet. When everyone has finished the trip and
                balances are computed, who should pay whom will appear here.
              </p>
            ) : blockedAllFinished ? (
              <p className="settlement__muted">
                Everyone has finished, but balances cannot be computed yet. Make sure
                every expense has a payer, then mark the trip finished again from the
                trip page.
              </p>
            ) : transfers.length === 0 ? (
              <p className="settlement__muted">Everyone is even — no transfers needed.</p>
            ) : (
              <ul className="settlement__list">
                {transfers.map((row, i) => (
                  <li key={`${row.fromUserId}-${row.toUserId}-${i}`} className="settlement__row">
                    <span className="settlement__party">
                      {personLabel(row.fromEmail, row.fromDisplayName)}
                    </span>
                    <span className="settlement__arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="settlement__party">
                      {personLabel(row.toEmail, row.toDisplayName)}
                    </span>
                    <span className="settlement__amount">{formatTry(row.amountTry)}</span>
                  </li>
                ))}
              </ul>
            )}
            {!settlementLoading && !settlementError && summary ? (
              <div className="settlement__summary" aria-labelledby="sett-sum-heading">
                <h3 id="sett-sum-heading" className="settlement__section-title">
                  Balances (TRY)
                </h3>
                <p className="settlement__muted">
                  Total {formatTry(summary.totalAmountTry)} · {summary.memberCount}{' '}
                  {summary.memberCount === 1 ? 'person' : 'people'} · ~{' '}
                  {formatTry(summary.equalShareTry)} each (rounded)
                </p>
                <ul className="settlement__balance-list">
                  {summary.members.map((m) => (
                    <li key={m.userId} className="settlement__balance-row">
                      <span className="settlement__party">
                        {personLabel(m.email, m.displayName)}
                      </span>
                      <span className="settlement__amount">
                        paid {formatTry(m.paidTry)} · share {formatTry(m.shareOwedTry)} · net{' '}
                        {formatTry(m.netTry)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <p className="settlement__back">
            <Link to={`/travels/${travel.id}`}>← Back to trip</Link>
          </p>
        </>
      )}
    </main>
  )
}

export function SettlementPage() {
  const { id: travelId } = useParams<{ id: string }>()

  return (
    <AppLayout>
      {!travelId ? (
        <main className="settlement__main">
          <p className="settlement__error">Missing trip id.</p>
        </main>
      ) : (
        <SettlementContent key={travelId} travelId={travelId} />
      )}
    </AppLayout>
  )
}

export default SettlementPage
