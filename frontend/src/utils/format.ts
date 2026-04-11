import type { ExpenseCategory, TravelStatus } from '../api/types'
import { i18n } from '../i18n'

/** TRY is always formatted with Turkish locale rules (₺ placement, grouping). */
const TRY_LOCALE = 'tr-TR'

export function formatTry(amount: number): string {
  return new Intl.NumberFormat(TRY_LOCALE, {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function intlLocaleForUi(): string {
  const lng = i18n.resolvedLanguage ?? i18n.language
  return lng === 'tr' ? 'tr-TR' : 'en-US'
}

/** Original expense line: ISO currency with UI locale (tr vs en). */
export function formatForeignAmount(amount: number, currency: string): string {
  const code = currency.trim().toUpperCase()
  if (code === 'TRY') return formatTry(amount)
  try {
    return new Intl.NumberFormat(intlLocaleForUi(), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount} ${code}`
  }
}

export function formatExpenseCategory(cat: string): string {
  const key = `expenseCategory.${cat}`
  const translated = i18n.t(key)
  return translated !== key ? translated : cat
}

export function travelStatusLabel(status: string): string {
  const key = `travelStatus.long.${status}`
  const translated = i18n.t(key)
  return translated !== key ? translated : status
}

/** Short label for status chips (travel list, detail bar). */
export function travelStatusShort(status: TravelStatus): string {
  const key = `travelStatus.short.${status}`
  const translated = i18n.t(key)
  return translated !== key ? translated : status
}

export type TravelStatusChipTone = 'active' | 'settling' | 'done'

export function travelStatusChipTone(status: TravelStatus): TravelStatusChipTone {
  if (status === 'active') return 'active'
  if (status === 'allFinished') return 'settling'
  return 'done'
}

const ALL_CATEGORIES: ExpenseCategory[] = [
  'food',
  'accommodation',
  'transfer',
  'souvenir',
  'activity',
]

export function expenseCategoriesForFilter(): ExpenseCategory[] {
  return ALL_CATEGORIES
}

export function invitationStatusLabel(status: string): string {
  const key = `invitationStatus.${status}`
  const translated = i18n.t(key)
  return translated !== key ? translated : status
}
