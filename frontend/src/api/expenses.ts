import { apiFetch } from './client'
import type { ExpenseCategory, ExpenseDetail } from './types'

export type CreateExpenseBody = {
  category: ExpenseCategory
  location?: string | null
  amount: number
  currency: string
  expenseDate: string
  paidByUserId?: string | null
}

export function createExpense(travelId: string, body: CreateExpenseBody) {
  return apiFetch<ExpenseDetail>(`/travels/${travelId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function patchExpensePayer(expenseId: string, paidByUserId: string) {
  return apiFetch<ExpenseDetail>(`/expenses/${expenseId}/payer`, {
    method: 'PATCH',
    body: JSON.stringify({ paidByUserId }),
  })
}
