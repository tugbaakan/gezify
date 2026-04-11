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
 * Maps backend HTTP statuses (401 / 403 / 404 / 422 / 500 / 502) to concise Turkish copy,
 * aligned with Gezify’s standardized JSON errors (see architecture doc).
 */
export function apiErrorToBannerContent(err: ApiRequestError): ApiErrorBannerContent {
  const backendMsg = err.body?.error.message?.trim()
  const validationLine = firstValidationDetailMessage(err)

  switch (err.status) {
    case 401:
      return {
        variant: 'warning',
        status: 401,
        title: 'Oturum gerekli veya süresi doldu',
        body: backendMsg || 'Google ile tekrar giriş yap.',
      }
    case 403:
      return {
        variant: 'warning',
        status: 403,
        title: 'Bu işlem için yetkin yok',
        body: backendMsg || 'Bu geziye üye değilsen erişemezsin.',
      }
    case 404:
      return {
        variant: 'info',
        status: 404,
        title: 'Bulunamadı',
        body: backendMsg || 'Aradığın kayıt yok veya kaldırılmış olabilir.',
      }
    case 422:
      return {
        variant: 'danger',
        status: 422,
        title: 'Girdiğin bilgileri kontrol et',
        body: validationLine ?? backendMsg ?? err.message,
      }
    case 500:
      return {
        variant: 'danger',
        status: 500,
        title: 'Sunucu hatası',
        body:
          backendMsg ||
          'Kısa süre sonra tekrar dene. Sorun sürerse gezi sahibiyle iletişime geç.',
      }
    case 502:
      return {
        variant: 'danger',
        status: 502,
        title: 'Harici servis yanıt vermiyor',
        body: backendMsg || 'Kur veya e-posta servisi geçici olarak kullanılamıyor olabilir.',
      }
    case 0:
      return {
        variant: 'danger',
        status: 0,
        title: 'API adresi eksik veya ağ hatası',
        body: err.message,
      }
    default:
      return {
        variant: 'danger',
        status: err.status,
        title: 'Bir şeyler ters gitti',
        body: backendMsg || err.message,
      }
  }
}
