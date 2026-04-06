import { apiFetch } from './client'
import type { InvitationValidation } from './types'

export function validateInvitationToken(token: string) {
  const q = new URLSearchParams({ token })
  return apiFetch<InvitationValidation>(`/invitations/validate?${q}`, {
    anonymous: true,
  })
}

export function acceptInvitation(token: string) {
  return apiFetch<{ travelId: string }>('/invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
