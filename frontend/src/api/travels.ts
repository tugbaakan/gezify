import { apiFetch } from './client'
import type {
  ExpenseDetail,
  InvitationCreated,
  TravelDetail,
  TravelInvitationListItem,
  TravelListItem,
  TravelMember,
  TravelStatus,
} from './types'

export function fetchTravels() {
  return apiFetch<TravelListItem[]>('/travels')
}

export function fetchTravel(travelId: string) {
  return apiFetch<TravelDetail>(`/travels/${travelId}`)
}

export function createTravel(name: string) {
  return apiFetch<TravelDetail>('/travels', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function fetchTravelMembers(travelId: string) {
  return apiFetch<TravelMember[]>(`/travels/${travelId}/members`)
}

export function fetchTravelInvitations(travelId: string) {
  return apiFetch<TravelInvitationListItem[]>(`/travels/${travelId}/invitations`)
}

export function createTravelInvitation(travelId: string, email: string) {
  return apiFetch<InvitationCreated>(`/travels/${travelId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function fetchTravelExpenses(travelId: string) {
  return apiFetch<ExpenseDetail[]>(`/travels/${travelId}/expenses`)
}

export type SettlementTransferRow = {
  fromUserId: string
  fromEmail: string
  fromDisplayName: string | null
  toUserId: string
  toEmail: string
  toDisplayName: string | null
  amountTry: number
}

export type SettlementMemberBalance = {
  userId: string
  email: string
  displayName: string | null
  paidTry: number
  shareOwedTry: number
  netTry: number
}

export type SettlementSummary = {
  totalAmountTry: number
  memberCount: number
  equalShareTry: number
  members: SettlementMemberBalance[]
}

export type SettlementResponse = {
  status: TravelStatus
  transfers: SettlementTransferRow[]
  summary: SettlementSummary | null
  isSettlementPreview: boolean
}

export function fetchTravelSettlement(travelId: string) {
  return apiFetch<SettlementResponse>(`/travels/${travelId}/settlement`)
}
