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
