# Gezify — implementation task list

**Sources:** [gezify-technical-architecture-document.md](./gezify-technical-architecture-document.md), [gezify-db-schema.md](./gezify-db-schema.md), [gezify-api-endpoints.md](./gezify-api-endpoints.md)

---

## Project setup

- [x] Scaffold **React 18 + Vite** SPA (frontend).
- [x] Scaffold **.NET 8 ASP.NET Core** API (backend).
- [x] Configure **PostgreSQL 16** (local + Railway).
- [x] Add **EF Core** and wire **migrations** (dev on startup vs prod pre-deploy per §11.3).

## Database (PostgreSQL / EF Core)

- [x] Define enums: `travel_status`, `invitation_status`, `expense_category`.
- [x] Implement tables: `users`, `travels`, `travel_members`, `invitations`, `expenses`, `finished_acks`, `settlement_transfers`.
- [x] Add FKs, PKs, and suggested indexes (incl. `settlement_transfers`: `from_user_id <> to_user_id`).
- [x] Resolve policy for `travels.created_by` on user delete (`RESTRICT` vs `SET NULL`).
- [x] Align `expenses.paid_by` nullability with two-step “who paid?” UX.

## Backend — auth & gateway

- [x] **POST `/auth/google`** — exchange code, verify with Google, create/load `users`, issue JWT (or validate Google JWT consistently).
- [x] **GET `/auth/me`** — current user (safe fields).
- [x] JWT validation middleware on protected routes; standardized **401/403/404/422/500** JSON errors.
- [x] **CORS** restricted to `ALLOWED_ORIGIN`.

## Backend — domain APIs (travel-scoped auth: must be `travel_member`)

- [x] **GET/POST `/travels`**, **GET/PATCH `/travels/{travelId}`** — create adds creator as first member, `status = active`.
- [x] **GET `/travels/{travelId}/members`**.
- [x] **POST `/travels/{travelId}/invitations`** — signed `token`, `pending`, SendGrid email with `INVITATION_BASE_URL`/invite link.
- [x] **POST `/invitations/accept`** — validate signature, expiry, email match, add member, set `accepted`.
- [x] Optional: **GET `/invitations/validate?token=...`** for pre-OAuth check.
- [x] **GET/POST `/travels/{travelId}/expenses`** — FX at save; store `amount_try`, `exchange_rate`, `added_by`.
- [x] **GET `/expenses/{expenseId}`**, **PATCH `/expenses/{expenseId}/payer`** — set `paid_by`.

## Services (backend)

- [ ] **Email (SendGrid)** — invitation emails; notify all when travel fully finished (optional: expense-added later).
- [ ] **FX (ExchangeRate-API)** — `{from}/TRY`, **~15 min cache**; on failure, fail expense create (no silent fallback).

## Settlement engine

- [ ] On **POST `/travels/{travelId}/finish`**: upsert `finished_acks` for current user.
- [ ] When all members acked: set `all_finished` → run settlement (sync or job) → write `settlement_transfers` → `settled`, `settled_at`.
- [ ] Implement §9 math: `equal_share`, per-member net, greedy debt minimization.
- [ ] **GET `/travels/{travelId}/settlement`** — transfers (+ optional summary); behavior for `all_finished` vs `settled` as designed.

## Frontend (routes & behavior)

- [ ] **`/`** — travel list (authenticated).
- [ ] **`/travels/:id`** — detail + expenses.
- [ ] **`/travels/:id/expenses/new`** — expense form (category, location, amount, currency, date/time).
- [ ] Post-create **“Who paid?”** → PATCH payer.
- [ ] **`/travels/:id/settlement`** — settlement UI when ready.
- [ ] **`/invite/:token`** — accept flow; OAuth first if needed.
- [ ] **`/auth/callback`** — Google redirect; token storage (memory / secure cookie).

## Ops & deployment (Railway)

- [ ] **GET `/health`** (liveness).
- [ ] Services: static frontend (`npm run build` → `dist`), API (port **8080**), managed Postgres.
- [ ] Env vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `EXCHANGE_RATE_API_KEY`, `SENDGRID_API_KEY`, `INVITATION_BASE_URL`, `ALLOWED_ORIGIN`.
- [ ] Google OAuth app: Authorization Code, scopes `openid`, `email`, `profile`, callback `https://gezify.app/auth/callback` (or env-specific).

## Security (cross-cutting)

- [ ] Travel membership checks on every travel-scoped endpoint.
- [ ] Invitation tokens: secret, expiry (~7 days), bound to email.
- [ ] Input validation (amounts, enums, dates).
- [ ] API keys only server-side (Railway env).

## Open / decide later (§13 + schema/API notes)

- [ ] **Document and implement** `equal_share` **rounding** (e.g. 2 dp + remainder rule).
- [ ] **Expense editing** (if ever): `PATCH`/`DELETE`, FX vs locked rate, optional history columns.
- [ ] **Partial finish / timeout** for inactive members (product decision).
- [ ] Settlement response docs once rounding is fixed.
- [ ] Future backlog (out of v1): PWA/RN, multi-currency settlement, push, receipt storage.
