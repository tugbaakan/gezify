import { useTranslation } from 'react-i18next'
import { ApiRequestError } from '../api/client'
import { apiErrorToBannerContent } from '../utils/apiErrorDisplay'
import './ApiErrorBanner.css'

type Props = {
  /** `ApiRequestError` uses status-aware copy; plain string shows as a single message. */
  error: ApiRequestError | string | null | undefined
  className?: string
}

export function ApiErrorBanner({ error, className }: Props) {
  const { t } = useTranslation()
  if (error == null || error === '') return null

  const content =
    typeof error === 'string'
      ? { variant: 'danger' as const, title: error, body: undefined, status: -1 }
      : apiErrorToBannerContent(error, t)

  return (
    <div
      role="alert"
      className={`api-error-banner api-error-banner--${content.variant} ${className ?? ''}`.trim()}
      data-http-status={content.status >= 0 ? String(content.status) : undefined}
    >
      <strong className="api-error-banner__title">{content.title}</strong>
      {content.body ? <p className="api-error-banner__body">{content.body}</p> : null}
    </div>
  )
}
