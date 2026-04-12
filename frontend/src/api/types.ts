export type TravelStatus = 'active' | 'allFinished' | 'settled'

export type ExpenseCategory =
  | 'food'
  | 'accommodation'
  | 'transfer'
  | 'souvenir'
  | 'activity'

export type TravelListItem = {
  id: string
  name: string
  status: TravelStatus
  createdAt: string
  settledAt: string | null
}

export type TravelDetail = TravelListItem & {
  createdById: string
  /** Present when API supports GET travel finish progress. */
  youHaveAcked?: boolean
  finishedAckCount?: number
  memberCount?: number
}

/** Response from POST /travels/:id/finish */
export type TravelFinishResponse = {
  status: TravelStatus
  youHaveAcked: boolean
  allMembersHaveAcked: boolean
  yourAckedAt: string | null
}

export type TravelMember = {
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  joinedAt: string
}

export type ExpenseActor = {
  id: string
  email: string
  displayName: string | null
}

export type ExpenseDetail = {
  id: string
  travelId: string
  category: ExpenseCategory
  location: string | null
  amount: number
  currency: string
  amountTry: number
  exchangeRate: number
  expenseDate: string
  createdAt: string
  addedBy: ExpenseActor
  paidBy: ExpenseActor | null
}

export type InvitationValidation = {
  valid: boolean
  travelName: string | null
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export type InvitationCreated = {
  id: string
  email: string
  status: InvitationStatus
  createdAt: string
}

/** Row from GET /travels/:id/invitations (no token). */
export type TravelInvitationListItem = {
  id: string
  email: string
  status: InvitationStatus
  createdAt: string
  acceptedAt: string | null
  invitedByUserId: string
  invitedByEmail: string
  invitedByDisplayName: string | null
}

export type PublicUser = {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

export type AuthSuccess = {
  accessToken: string
  expiresIn: number
  user: PublicUser
}

export type ApiErrorEnvelope = {
  error: {
    status: number
    code: string
    message: string
    details?: Record<string, string[]>
  }
}
