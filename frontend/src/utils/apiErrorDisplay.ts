import type { TFunction } from 'i18next'
import { ApiRequestError } from '../api/client'

/** First field message from a `422` validation envelope, if any. */
export function firstValidationDetailMessage(err: ApiRequestError): string | null {
  const d = err.body?.error.details
  if (!d) return null
  for (const msgs of Object.values(d)) {
    if (msgs?.[0]) return msgs[0]
  }
  return null
}

export type ApiErrorBannerVariant = 'danger' | 'warning' | 'info'

export type ApiErrorBannerContent = {
  variant: ApiErrorBannerVariant
  title: string
  body?: string
  status: number
}

/**
 * Maps backend HTTP statuses (401 / 403 / 404 / 422 / 500 / 502) to concise copy,
 * aligned with Gezify’s standardized JSON errors (see architecture doc).
 */
export function apiErrorToBannerContent(
  err: ApiRequestError,
  t: TFunction,
): ApiErrorBannerContent {
  const backendMsg = err.body?.error.message?.trim()
  const validationLine = firstValidationDetailMessage(err)

  switch (err.status) {
    case 401:
      return {
        variant: 'warning',
        status: 401,
        title: t('apiErrors.401.title'),
        body: backendMsg || t('apiErrors.401.body'),
      }
    case 403:
      return {
        variant: 'warning',
        status: 403,
        title: t('apiErrors.403.title'),
        body: backendMsg || t('apiErrors.403.body'),
      }
    case 404:
      return {
        variant: 'info',
        status: 404,
        title: t('apiErrors.404.title'),
        body: backendMsg || t('apiErrors.404.body'),
      }
    case 422:
      return {
        variant: 'danger',
        status: 422,
        title: t('apiErrors.422.title'),
        body: validationLine ?? backendMsg ?? err.message,
      }
    case 500:
      return {
        variant: 'danger',
        status: 500,
        title: t('apiErrors.500.title'),
        body: backendMsg || t('apiErrors.500.body'),
      }
    case 502:
      return {
        variant: 'danger',
        status: 502,
        title: t('apiErrors.502.title'),
        body: backendMsg || t('apiErrors.502.body'),
      }
    case 0:
      return {
        variant: 'danger',
        status: 0,
        title: t('apiErrors.0.title'),
        body: err.message,
      }
    default:
      return {
        variant: 'danger',
        status: err.status,
        title: t('apiErrors.default.title'),
        body: backendMsg || err.message,
      }
  }
}
