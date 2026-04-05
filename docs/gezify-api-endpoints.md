# Gezify — API Endpoints

**Derived from:** [Gezify Technical Architecture Design Document](./gezify-technical-architecture-document.md)  
**Version:** 1.0 (draft)  
**Base URL:** `https://<api-host>` (e.g. Railway service URL)

---

## Conventions

| Item | Convention |
|------|------------|
| **Format** | JSON request/response bodies |
| **Auth** | `Authorization: Bearer <JWT>` on protected routes (Google-issued ID token or backend-issued JWT per implementation) |
| **Errors** | Standardized JSON error payloads; HTTP `401`, `403`, `404`, `422`, `500` as described in the architecture doc |
| **Authorization** | Protected travel-scoped endpoints MUST verify the caller is a `travel_member` for the relevant `travel_id` |

---

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/google` | No | Exchange Google OAuth authorization code for session/JWT; create or load `users` row from Google profile (see workflow §8.1). |
| `GET` | `/auth/me` | Yes | Return current user profile (`users` fields safe for the client). |

*Alternative naming:* `POST /auth/token` if the team prefers a generic token endpoint.

---

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me` | Yes | Same as `/auth/me` or alias; optional if only `/auth/me` is used. |

---

## Travels

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/travels` | Yes | List travels the current user belongs to (via `travel_members`). |
| `POST` | `/travels` | Yes | Create travel: body includes `name`; sets `status = active`, `created_by = current user`, adds creator as first member (§8.2). |
| `GET` | `/travels/{travelId}` | Yes | Travel detail (name, status, metadata); caller must be a member. |
| `PATCH` | `/travels/{travelId}` | Yes | Update allowed fields (e.g. `name`) while permitted by business rules. |

---

## Members

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/travels/{travelId}/members` | Yes | List group members (user id, display name, email as appropriate for UI). |

---

## Invitations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/travels/{travelId}/invitations` | Yes | Create invitation: body includes `email`; generates signed `token`, persists row `status = pending`, sends email with `https://<app>/invite/{token}` (§8.3). Caller must be a member (typically owner). |
| `POST` | `/invitations/accept` | Yes | Accept invitation: body includes `token` from URL; validates token (signature, expiry, email match, not already accepted); adds user to `travel_members`; sets invitation `accepted` (§8.4). |

*Optional:* `GET /invitations/validate?token=...` for a lightweight pre-check before OAuth (if the product needs it).

---

## Expenses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/travels/{travelId}/expenses` | Yes | List expenses for the travel (ordered by `expense_date` / `created_at`). |
| `POST` | `/travels/{travelId}/expenses` | Yes | Create expense: category, location, amount, currency, expense date/time; FX service resolves rate; stores `amount_try`, `exchange_rate`, `added_by`; `paid_by` may be set in same request or via patch (§8.5). |
| `GET` | `/expenses/{expenseId}` | Yes | Single expense; authorize via parent travel membership. |
| `PATCH` | `/expenses/{expenseId}/payer` | Yes | Set `paid_by` to a member’s `user_id` (§8.5). |

*Note:* Expense editing is an open question in §13; v1 may omit `PATCH /expenses/{id}` for general edits.

---

## Finish & settlement

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/travels/{travelId}/finish` | Yes | Record `finished_acks` for current user. When ack count equals member count: set travel `all_finished`, run settlement engine, write `settlement_transfers`, set travel `settled`, notify members (§8.6). |
| `GET` | `/travels/{travelId}/settlement` | Yes | Return settlement result: list of transfers (`from_user_id`, `to_user_id`, `amount_try`) and any summary fields (e.g. per-member net balance) if exposed. Available once `status` is `settled` (or as designed for `all_finished` preview). |

---

## Health & ops (deployment)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Liveness for Railway/load balancer. |

---

## Summary table (quick reference)

| Method | Path |
|--------|------|
| `POST` | `/auth/google` |
| `GET` | `/auth/me` |
| `GET` | `/travels` |
| `POST` | `/travels` |
| `GET` | `/travels/{travelId}` |
| `PATCH` | `/travels/{travelId}` |
| `GET` | `/travels/{travelId}/members` |
| `POST` | `/travels/{travelId}/invitations` |
| `POST` | `/invitations/accept` |
| `GET` | `/travels/{travelId}/expenses` |
| `POST` | `/travels/{travelId}/expenses` |
| `GET` | `/expenses/{expenseId}` |
| `PATCH` | `/expenses/{expenseId}/payer` |
| `POST` | `/travels/{travelId}/finish` |
| `GET` | `/travels/{travelId}/settlement` |
| `GET` | `/health` |

---

## Open items (from architecture §13)

- Rounding rules for `equal_share` should be reflected in any settlement-related response documentation once decided.
- If expense editing is added, document additional `PATCH`/`DELETE` routes and FX behavior explicitly.
