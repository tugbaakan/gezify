# Gezify — Technical Architecture Design Document

**Version:** 1.0  
**Date:** April 2026  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Application Name & Concept](#2-application-name--concept)
3. [Key Design Decisions](#3-key-design-decisions)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Component Descriptions](#6-component-descriptions)
7. [Data Model](#7-data-model)
8. [Core Workflows](#8-core-workflows)
9. [Settlement Algorithm](#9-settlement-algorithm)
10. [Security Considerations](#10-security-considerations)
11. [Deployment (Railway)](#11-deployment-railway)
12. [External Integrations](#12-external-integrations)
13. [Open Questions & Future Considerations](#13-open-questions--future-considerations)

---

## 1. Overview

Gezify is a web application that helps travel groups track shared expenses and settle debts at the end of a trip. Users can create travels, invite other members via email, log expenses in any currency, and receive a settlement summary denominated in Turkish Lira (TRY) once all group members mark the travel as finished.

---

## 2. Application Name & Concept

| Field | Value |
|---|---|
| **Name** | Gezify |
| **Etymology** | *Gez-* (Turkish root of *gezmek*, "to travel/roam") + *-ify* (modern product suffix) |
| **Target audience** | Turkish-speaking travel groups |
| **Core value proposition** | Seamless shared expense tracking with automatic TRY settlement |

---

## 3. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Expense split** | Equal split among all group members | Simplifies settlement math; each member owes an equal share of every expense |
| **Currency conversion timing** | At expense entry time | TRY value is locked when the expense is added, making settlement deterministic regardless of future rate fluctuations |
| **Settlement currency** | Turkish Lira (TRY) | All expenses are converted to TRY at entry; final settlement is calculated in TRY only |
| **Authentication** | Google OAuth 2.0 only | No username/password management; reduces security surface area |
| **Invitation mechanism** | Signed token in email link | Secure, self-contained; no account required before accepting an invitation |

---

## 4. Technology Stack

| Layer | Technology | Hosting |
|---|---|---|
| **Frontend** | React 18 + Vite (SPA) | Railway — Static |
| **Backend API** | .NET 8 (ASP.NET Core) | Railway — Service |
| **Database** | PostgreSQL 16 | Railway — Managed DB |
| **Authentication** | Google OAuth 2.0 | Google Cloud |
| **Email delivery** | SendGrid | External SaaS |
| **Currency rates** | ExchangeRate-API (exchangerate-api.com) | External API |
| **Deployment platform** | Railway | Cloud PaaS |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  USERS                                                          │
│  [Travel owner]        [Group member]        [Invited user]     │
└──────────┬──────────────────┬──────────────────────┬───────────┘
           │                  │                      │
           ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  (Railway Static)                                     │
│  React 18 + Vite SPA                                            │
│  Google OAuth redirect · Travel dashboard                       │
│  Expense form · Settlement summary view                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST / HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND  (Railway Service — .NET 8)                            │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  API Gateway    │  │  Core API        │  │  Settlement   │  │
│  │  Auth · Routing │─▶│  Travels         │─▶│  Engine       │  │
│  │  JWT validation │  │  Expenses        │  │  Debt min.    │  │
│  └─────────────────┘  │  Members         │  └───────────────┘  │
│                        └────────┬─────────┘                    │
│                        ┌────────┴─────────┐                    │
│                        │                  │                    │
│                 ┌──────▼──────┐   ┌───────▼──────┐            │
│                 │  Email      │   │  FX Fetch    │            │
│                 │  Service    │   │  Service     │            │
│                 │  (invites)  │   │  (TRY rates) │            │
│                 └─────────────┘   └──────────────┘            │
└────────────┬─────────────────────────────┬─────────────────────┘
             │                             │
             ▼                             ▼
┌─────────────────────┐      ┌─────────────────────────────────┐
│  PostgreSQL 16      │      │  External APIs                  │
│  Railway managed DB │      │  · ExchangeRate-API (TRY rates) │
│                     │      │  · SendGrid (email)             │
│                     │      │  · Google OAuth 2.0 (auth)      │
└─────────────────────┘      └─────────────────────────────────┘
```

---

## 6. Component Descriptions

### 6.1 Frontend — React SPA (Vite)

The frontend is a single-page application served as static files. Because the application is fully login-gated, server-side rendering is not required.

**Responsibilities:**
- Handle Google OAuth 2.0 redirect flow and store JWT access token
- Display travel list, travel detail, and expense list views
- Render the expense entry form (category, location, amount, currency, date/time)
- Show "who paid?" prompt after expense entry
- Display settlement summary once a travel is finalized
- Manage invitation acceptance flow (token validation via URL parameter)

**Key routes:**

| Route | Description |
|---|---|
| `/` | Travel list (authenticated) |
| `/travels/:id` | Travel detail and expense list |
| `/travels/:id/expenses/new` | Add expense form |
| `/travels/:id/settlement` | Settlement summary |
| `/invite/:token` | Invitation acceptance |
| `/auth/callback` | Google OAuth callback |

---

### 6.2 API Gateway

The entry point for all HTTP requests from the frontend.

**Responsibilities:**
- Validate Google-issued JWT tokens on every protected endpoint
- Extract user identity from the token and attach it to the request context
- Route requests to the appropriate Core API domain controller
- Return standardized error responses (401, 403, 404, 422, 500)

---

### 6.3 Core API (.NET 8 / ASP.NET Core)

The main domain logic layer.

**Domains:**

| Domain | Responsibilities |
|---|---|
| **Users** | Register/lookup user from Google profile on first login |
| **Travels** | Create, read, update travel; mark as "finished" per user |
| **Members** | Add members via accepted invitation; list group members |
| **Invitations** | Generate signed invitation tokens; validate on acceptance |
| **Expenses** | Create expense records; trigger FX conversion at creation time; record payer |

---

### 6.4 Settlement Engine

Activated when all group members have marked a travel as finished.

**Responsibilities:**
- Aggregate total TRY spend per member (as payer) and per member (as beneficiary)
- Calculate each member's net balance: `amount_paid − equal_share_owed`
- Apply a greedy debt minimization algorithm to produce the minimal set of transfers
- Persist settlement result and mark travel as fully settled

See [Section 9](#9-settlement-algorithm) for algorithm detail.

---

### 6.5 Email Service

A lightweight internal adapter around the SendGrid API.

**Responsibilities:**
- Send invitation emails containing the signed invitation link
- Send notification when a travel has been marked finished by all members
- (Optional future) send expense added notifications

---

### 6.6 FX Fetch Service

Called synchronously at the moment each expense is saved.

**Responsibilities:**
- Query ExchangeRate-API for the current `{source_currency} → TRY` rate
- Return the rate to the Core API, which stores `amount_try` alongside the original amount
- Cache rates for a short window (e.g. 15 minutes) to reduce external API calls

---

## 7. Data Model

### 7.1 Entity Relationship Overview

```
Users ────< TravelMembers >──── Travels
                                   │
                               Expenses
                                   │
                              (paid_by → Users)

Travels ──< Invitations
Travels ──< FinishedAcks (one per member)
Travels ──< SettlementTransfers
```

### 7.2 Table Definitions

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `google_id` | VARCHAR | Unique; from Google profile |
| `email` | VARCHAR | |
| `display_name` | VARCHAR | |
| `avatar_url` | VARCHAR | |
| `created_at` | TIMESTAMPTZ | |

#### `travels`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | VARCHAR | |
| `created_by` | UUID FK → users | |
| `status` | ENUM | `active`, `all_finished`, `settled` |
| `created_at` | TIMESTAMPTZ | |
| `settled_at` | TIMESTAMPTZ | Nullable |

#### `travel_members`

| Column | Type | Notes |
|---|---|---|
| `travel_id` | UUID FK → travels | |
| `user_id` | UUID FK → users | |
| `joined_at` | TIMESTAMPTZ | |
| **PK** | `(travel_id, user_id)` | |

#### `invitations`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `travel_id` | UUID FK → travels | |
| `invited_by` | UUID FK → users | |
| `token` | VARCHAR | Signed token embedded in link |
| `email` | VARCHAR | Recipient email address |
| `status` | ENUM | `pending`, `accepted`, `expired` |
| `created_at` | TIMESTAMPTZ | |
| `accepted_at` | TIMESTAMPTZ | Nullable |

#### `expenses`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `travel_id` | UUID FK → travels | |
| `added_by` | UUID FK → users | User who entered the expense |
| `paid_by` | UUID FK → users | User who physically paid |
| `category` | ENUM | `food`, `accommodation`, `transfer`, `souvenir`, `activity` |
| `location` | VARCHAR | Free text |
| `amount` | DECIMAL(12,2) | Original amount in source currency |
| `currency` | CHAR(3) | ISO 4217 code |
| `amount_try` | DECIMAL(12,2) | Locked TRY equivalent at entry time |
| `exchange_rate` | DECIMAL(18,8) | Rate used for conversion |
| `expense_date` | TIMESTAMPTZ | Date/time of the actual expense |
| `created_at` | TIMESTAMPTZ | |

#### `finished_acks`

| Column | Type | Notes |
|---|---|---|
| `travel_id` | UUID FK → travels | |
| `user_id` | UUID FK → users | |
| `acked_at` | TIMESTAMPTZ | |
| **PK** | `(travel_id, user_id)` | |

#### `settlement_transfers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `travel_id` | UUID FK → travels | |
| `from_user_id` | UUID FK → users | Owes money |
| `to_user_id` | UUID FK → users | Receives money |
| `amount_try` | DECIMAL(12,2) | Amount to transfer |
| `created_at` | TIMESTAMPTZ | |

---

## 8. Core Workflows

### 8.1 User Registration / Login

```
User clicks "Sign in with Google"
  → Frontend redirects to Google OAuth
  → Google returns authorization code to /auth/callback
  → Frontend sends code to Backend
  → Backend verifies code with Google, receives profile
  → If user.google_id not found → create new user record
  → Backend issues own JWT (or uses Google JWT directly)
  → Frontend stores token in memory / secure cookie
```

### 8.2 Creating a Travel

```
Owner fills travel name → POST /travels
  → Creates travel record (status: active)
  → Adds owner as first travel_member
  → Returns travel ID
```

### 8.3 Inviting a Member

```
Owner enters email → POST /travels/:id/invitations
  → Generates signed token (UUID or JWT with travel_id + email)
  → Creates invitation record (status: pending)
  → Email Service sends link: https://gezify.app/invite/{token}
```

### 8.4 Accepting an Invitation

```
Recipient clicks link → Frontend loads /invite/:token
  → If not logged in → trigger Google OAuth first
  → Frontend sends token to POST /invitations/accept
  → Backend validates token (not expired, not already accepted, email matches)
  → Adds user to travel_members
  → Updates invitation status to accepted
  → Redirects user to travel detail page
```

### 8.5 Adding an Expense

```
Member fills expense form → POST /travels/:id/expenses
  → FX Fetch Service queries ExchangeRate-API for rate
  → Backend stores expense with locked amount_try and exchange_rate
  → Frontend prompts: "Who paid?" (list of group members)
  → Member selects payer → PATCH /expenses/:id/payer
  → Expense record updated with paid_by
```

### 8.6 Settlement Flow

```
Each member clicks "Mark as finished" → POST /travels/:id/finish
  → Creates finished_ack record for that member
  → If finished_acks count = travel_members count:
      → Travel status → all_finished
      → Settlement Engine triggered (synchronously or via background job)
      → Settlement result persisted to settlement_transfers
      → Travel status → settled
      → All members notified (email or in-app)
```

---

## 9. Settlement Algorithm

### 9.1 Inputs

- `total_try` = sum of `amount_try` for all expenses in the travel
- `equal_share` = `total_try / member_count` (rounded to 2 decimal places)
- `paid_by_member[user_id]` = sum of `amount_try` of expenses where `paid_by = user_id`

### 9.2 Net Balance Calculation

For each member:

```
net_balance[user_id] = paid_by_member[user_id] - equal_share
```

- **Positive** net balance → member is owed money (creditor)
- **Negative** net balance → member owes money (debtor)

### 9.3 Debt Minimization (Greedy)

```
1. Sort creditors by balance descending (highest first)
2. Sort debtors by balance ascending (most negative first)
3. While debtors remain:
   a. Take the largest debtor (D) and largest creditor (C)
   b. transfer = min(|D.balance|, C.balance)
   c. Record: D pays C the amount `transfer` TRY
   d. D.balance += transfer
   e. C.balance -= transfer
   f. Remove D or C from list if their balance reaches 0
4. Repeat until all balances are zero
```

This produces the minimum number of transfers needed to settle all debts.

### 9.4 Example

3 members, expenses totalling 3,000 TRY:

| Member | Paid (TRY) | Equal share | Net balance |
|---|---|---|---|
| Alice | 2,000 | 1,000 | **+1,000** (creditor) |
| Bob | 800 | 1,000 | **-200** (debtor) |
| Carol | 200 | 1,000 | **-800** (debtor) |

Settlement transfers:
- Carol → Alice: 800 TRY
- Bob → Alice: 200 TRY

---

## 10. Security Considerations

| Area | Approach |
|---|---|
| **Authentication** | Google OAuth 2.0; JWTs validated on every backend request |
| **Authorization** | Every endpoint verifies that the calling user is a member of the requested travel |
| **Invitation tokens** | Signed with a server-side secret; include expiry (e.g. 7 days) and bound to a specific email address |
| **HTTPS** | Enforced end-to-end by Railway's reverse proxy |
| **API keys** | ExchangeRate-API and SendGrid keys stored as Railway environment variables; never exposed to the frontend |
| **Input validation** | All inputs validated at the API layer (amount ranges, enum values, date formats) |
| **CORS** | Backend configured to accept requests only from the known frontend origin |

---

## 11. Deployment (Railway)

### 11.1 Services

| Service | Railway type | Config |
|---|---|---|
| `gezify-frontend` | Static site | Build: `npm run build`, publish dir: `dist` |
| `gezify-api` | Service (Docker / Nixpacks) | .NET 8 app; exposes port 8080 |
| `gezify-db` | Managed PostgreSQL | Railway Postgres plugin |

### 11.2 Environment Variables (API service)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Railway-injected PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret |
| `JWT_SECRET` | Secret for signing invitation tokens |
| `EXCHANGE_RATE_API_KEY` | ExchangeRate-API key |
| `SENDGRID_API_KEY` | SendGrid API key |
| `INVITATION_BASE_URL` | Frontend base URL for invitation links |
| `ALLOWED_ORIGIN` | Frontend origin for CORS |

### 11.3 Database Migrations

Managed via EF Core migrations, applied automatically on API startup in non-production environments. In production, migrations are applied as a pre-deploy step.

---

## 12. External Integrations

### 12.1 Google OAuth 2.0

| Field | Detail |
|---|---|
| **Flow** | Authorization Code Flow |
| **Scopes** | `openid`, `email`, `profile` |
| **Callback URL** | `https://gezify.app/auth/callback` |
| **Token validation** | Backend validates ID token signature against Google's public keys |

### 12.2 ExchangeRate-API

| Field | Detail |
|---|---|
| **Endpoint** | `https://v6.exchangerate-api.com/v6/{key}/pair/{from}/TRY` |
| **Called** | Once per expense entry (with 15-minute in-memory cache) |
| **Failure handling** | If the API is unavailable, expense creation fails with a user-facing error; no silent fallback rate is used |

### 12.3 SendGrid

| Field | Detail |
|---|---|
| **Usage** | Transactional email only (invitations, settlement notifications) |
| **From address** | `noreply@gezify.app` |
| **Template approach** | Dynamic templates stored in SendGrid dashboard |

---

## 13. Open Questions & Future Considerations

| Topic | Note |
|---|---|
| **Rounding** | Equal share division may produce fractional TRY; define rounding rule (e.g. round to 2 decimal places, remainder assigned to first member) |
| **Partial finish** | Currently all members must mark finished before settlement runs; consider a timeout/override mechanism for unresponsive members |
| **Expense editing** | Not specified in v1; if supported, re-fetching the TRY rate or keeping the original locked rate should be decided |
| **Mobile app** | The React SPA can be wrapped as a PWA or later ported to React Native |
| **Multi-currency settlement** | Currently all settlement is in TRY; future versions could support multi-currency output |
| **Push notifications** | Email only in v1; in-app or mobile push notifications may be added later |
| **Receipt attachments** | Users may want to attach photos of receipts to expenses; would require object storage (e.g. Railway volumes or S3-compatible storage) |