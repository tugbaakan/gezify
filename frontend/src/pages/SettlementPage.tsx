import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchTravel,
  fetchTravelSettlement,
  type SettlementResponse,
} from '../api/travels'
import type { TravelDetail } from '../api/types'
import { ApiRequestError } from '../api/client'
import { ApiErrorBanner } from '../components/ApiErrorBanner'
import { AppLayout } from '../components/AppLayout'
import { SettlementSkeleton } from '../components/SettlementSkeleton'
import { formatTry, travelStatusLabel } from '../utils/format'
import './SettlementPage.css'

function personLabel(email: string, displayName: string | null) {
  return displayName?.trim() || email
}

function SettlementContent({ travelId }: { travelId: string }) {
  const [travel, setTravel] = useState<TravelDetail | null>(null)
  const [travelError, setTravelError] = useState<ApiRequestError | string | null>(null)
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null)
  const [settlementLoading, setSettlementLoading] = useState(true)
  const [settlementError, setSettlementError] = useState<ApiRequestError | string | null>(
    null,
  )

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
          if (e instanceof ApiRequestError) setTravelError(e)
          else setTravelError('Gezi yüklenemedi.')
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
          if (e instanceof ApiRequestError) setSettlementError(e)
          else setSettlementError('Ödeme özeti yüklenemedi.')
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

  const settlementResolved =
    !settlementLoading && !settlementError && settlement !== null

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyTransferAmount = useCallback(
    async (amountTry: number, key: string) => {
      const text = formatTry(amountTry)
      try {
        await navigator.clipboard.writeText(text)
        setCopiedKey(key)
        window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000)
      } catch {
        setCopiedKey(null)
      }
    },
    [],
  )

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
        <ApiErrorBanner className="settlement__banner" error={travelError} />
      ) : !travel ? (
        <SettlementSkeleton />
      ) : (
        <>
          <header className="settlement__head">
            <h1 className="settlement__title">Settlement</h1>
            <p className="settlement__sub">
              {travel.name} · {travelStatusLabel(travel.status)}
            </p>
          </header>

          <nav className="settlement__flow" aria-label="Settlement steps">
            <span
              className={`settlement__flow-step${travel ? ' settlement__flow-step--on' : ''}`}
            >
              Trip
            </span>
            <span className="settlement__flow-sep" aria-hidden="true">
              →
            </span>
            <span
              className={`settlement__flow-step${summary ? ' settlement__flow-step--on' : ''}`}
            >
              Balances (TRY)
            </span>
            <span className="settlement__flow-sep" aria-hidden="true">
              →
            </span>
            <span
              className={`settlement__flow-step${settlementResolved ? ' settlement__flow-step--on' : ''}`}
            >
              Who pays whom
            </span>
          </nav>

          <section className="settlement__card" aria-labelledby="sett-heading">
            <h2 id="sett-heading" className="settlement__section-title">
              Suggested transfers
              {preview ? (
                <span className="settlement__muted"> (preview)</span>
              ) : null}
            </h2>
            {settlementLoading ? (
              <ul className="settlement__transfer-skel" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="settlement__transfer-skel-row">
                    <span className="settlement__transfer-skel-line" />
                    <span className="settlement__transfer-skel-amt" />
                  </li>
                ))}
              </ul>
            ) : settlementError ? (
              <ApiErrorBanner error={settlementError} />
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
              <ul className="settlement__transfer-cards motion-list">
                {transfers.map((row, i) => {
                  const rowKey = `${row.fromUserId}-${row.toUserId}-${i}`
                  return (
                    <li
                      key={rowKey}
                      className="settlement__transfer-card"
                      style={{ ['--stagger' as string]: String(i) } as CSSProperties}
                    >
                      <div className="settlement__transfer-flow">
                        <span className="settlement__party">
                          {personLabel(row.fromEmail, row.fromDisplayName)}
                        </span>
                        <span className="settlement__arrow" aria-hidden="true">
                          →
                        </span>
                        <span className="settlement__party">
                          {personLabel(row.toEmail, row.toDisplayName)}
                        </span>
                      </div>
                      <div className="settlement__transfer-footer">
                        <span className="settlement__amount">{formatTry(row.amountTry)}</span>
                        <button
                          type="button"
                          className="settlement__copy"
                          onClick={() => copyTransferAmount(row.amountTry, rowKey)}
                        >
                          {copiedKey === rowKey ? 'Copied' : 'Copy TRY'}
                        </button>
                      </div>
                    </li>
                  )
                })}
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
                <ul className="settlement__balance-list motion-list">
                  {summary.members.map((m, i) => (
                    <li
                      key={m.userId}
                      className="settlement__balance-row"
                      style={{ ['--stagger' as string]: String(i) } as CSSProperties}
                    >
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
          <ApiErrorBanner error="Gezi kimliği eksik." />
        </main>
      ) : (
        <SettlementContent key={travelId} travelId={travelId} />
      )}
    </AppLayout>
  )
}

export default SettlementPage
