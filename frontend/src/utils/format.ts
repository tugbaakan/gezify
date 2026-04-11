import type { ExpenseCategory, TravelStatus } from '../api/types'

export function formatTry(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatExpenseCategory(cat: string): string {
  const map: Record<string, string> = {
    food: 'Food',
    accommodation: 'Accommodation',
    transfer: 'Transfer',
    souvenir: 'Souvenir',
    activity: 'Activity',
  }
  return map[cat] ?? cat
}

export function travelStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    allFinished: 'Everyone finished',
    settled: 'Settled',
  }
  return map[status] ?? status
}

/** Short label for status chips (travel list, detail bar). */
export function travelStatusShort(status: TravelStatus): string {
  const map: Record<TravelStatus, string> = {
    active: 'Active',
    allFinished: 'Settling',
    settled: 'Done',
  }
  return map[status] ?? status
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
  const map: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    expired: 'Expired',
  }
  return map[status] ?? status
}
