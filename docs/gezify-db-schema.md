# Gezify — Database Schema (PostgreSQL 16)

**Derived from:** [Gezify Technical Architecture Design Document](./gezify-technical-architecture-document.md)  
**Version:** 1.0 (draft)  
**Migrations:** EF Core (per architecture §11.3)

---

## Entity relationship (overview)

```
users ────< travel_members >──── travels
                                   │
                               expenses
                                   │
                              (paid_by → users)
                              (added_by → users)

travels ──< invitations
travels ──< finished_acks (one row per member)
travels ──< settlement_transfers
```

---

## Enumerations

### `travel_status` (column: `travels.status`)

| Value | Meaning |
|-------|---------|
| `active` | Trip in progress |
| `all_finished` | All members acknowledged finish; settlement may be in progress (transitional if engine is async) |
| `settled` | Settlement computed and stored |

### `invitation_status` (column: `invitations.status`)

| Value | Meaning |
|-------|---------|
| `pending` | Awaiting acceptance |
| `accepted` | User joined via token |
| `expired` | No longer valid |

### `expense_category` (column: `expenses.category`)

| Value |
|-------|
| `food` |
| `accommodation` |
| `transfer` |
| `souvenir` |
| `activity` |

---

## Tables

### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY`, default `gen_random_uuid()` | |
| `google_id` | `VARCHAR` | `NOT NULL`, `UNIQUE` | From Google profile |
| `email` | `VARCHAR` | `NOT NULL` | |
| `display_name` | `VARCHAR` | | |
| `avatar_url` | `VARCHAR` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | |

**Suggested indexes:** unique on `google_id`; optional index on `email` if lookups by email are frequent (invitation matching).

---

### `travels`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY`, default `gen_random_uuid()` | |
| `name` | `VARCHAR` | `NOT NULL` | |
| `created_by` | `UUID` | `NOT NULL`, `FK → users(id)` **`ON DELETE RESTRICT`** | Keeps creator reference; user cannot be deleted while still referenced as creator |
| `status` | `travel_status` | `NOT NULL`, default `active` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | |
| `settled_at` | `TIMESTAMPTZ` | `NULL` | Set when settlement completes |

**Suggested indexes:** `created_by`; `status` (if filtering admin/reporting).

---

### `travel_members`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `travel_id` | `UUID` | `NOT NULL`, `FK → travels(id)` `ON DELETE CASCADE` | |
| `user_id` | `UUID` | `NOT NULL`, `FK → users(id)` | |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | |

**Primary key:** `(travel_id, user_id)`

**Suggested indexes:** `(user_id)` for “list my travels” queries.

---

### `invitations`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY`, default `gen_random_uuid()` | |
| `travel_id` | `UUID` | `NOT NULL`, `FK → travels(id)` `ON DELETE CASCADE` | |
| `invited_by` | `UUID` | `NOT NULL`, `FK → users(id)` | |
| `token` | `VARCHAR` | `NOT NULL`, `UNIQUE` | Signed token in email link |
| `email` | `VARCHAR` | `NOT NULL` | Recipient; must match acceptor’s email |
| `status` | `invitation_status` | `NOT NULL`, default `pending` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | |
| `accepted_at` | `TIMESTAMPTZ` | `NULL` | |

**Suggested indexes:** `token` (unique already supports lookup); `(travel_id, status)` for listing pending invites.

---

### `expenses`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY`, default `gen_random_uuid()` | |
| `travel_id` | `UUID` | `NOT NULL`, `FK → travels(id)` `ON DELETE CASCADE` | |
| `added_by` | `UUID` | `NOT NULL`, `FK → users(id)` | Who entered the row |
| `paid_by` | `UUID` | `NULL`, `FK → users(id)` | Who paid; `NULL` until `PATCH /expenses/{id}/payer` (two-step UX) |
| `category` | `expense_category` | `NOT NULL` | |
| `location` | `VARCHAR` | | Free text |
| `amount` | `DECIMAL(12,2)` | `NOT NULL` | Original amount in `currency` |
| `currency` | `CHAR(3)` | `NOT NULL` | ISO 4217 |
| `amount_try` | `DECIMAL(12,2)` | `NOT NULL` | Locked TRY at entry time |
| `exchange_rate` | `DECIMAL(18,8)` | `NOT NULL` | Rate used for conversion |
| `expense_date` | `TIMESTAMPTZ` | `NOT NULL` | When the expense occurred |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | |

**Suggested indexes:** `(travel_id, expense_date DESC)` or `(travel_id, created_at DESC)` for list views; `(travel_id, paid_by)` for settlement aggregation.

---

### `finished_acks`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `travel_id` | `UUID` | `NOT NULL`, `FK → travels(id)` `ON DELETE CASCADE` | |
| `user_id` | `UUID` | `NOT NULL`, `FK → users(id)` | |
| `acked_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | |

**Primary key:** `(travel_id, user_id)`

---

### `settlement_transfers`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY`, default `gen_random_uuid()` | |
| `travel_id` | `UUID` | `NOT NULL`, `FK → travels(id)` `ON DELETE CASCADE` | |
| `from_user_id` | `UUID` | `NOT NULL`, `FK → users(id)` | Debtor (pays) |
| `to_user_id` | `UUID` | `NOT NULL`, `FK → users(id)` | Creditor (receives) |
| `amount_try` | `DECIMAL(12,2)` | `NOT NULL` | Transfer amount in TRY |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | |

**Suggested indexes:** `(travel_id)` for settlement GET.

**Check constraint (recommended):** `from_user_id <> to_user_id`.

---

## Referential integrity summary

| Child table | Parent | On delete (suggested) |
|-------------|--------|------------------------|
| `travels.created_by` | `users` | **`RESTRICT`** (v1 product policy) |
| `travel_members` | `travels`, `users` | `CASCADE` on travel |
| `invitations` | `travels`, `users` | `CASCADE` on travel |
| `expenses` | `travels`, `users` | `CASCADE` on travel |
| `finished_acks` | `travels`, `users` | `CASCADE` on travel |
| `settlement_transfers` | `travels`, `users` | `CASCADE` on travel |

---

## DDL sketch (optional reference)

```sql
CREATE TYPE travel_status AS ENUM ('active', 'all_finished', 'settled');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired');
CREATE TYPE expense_category AS ENUM (
  'food', 'accommodation', 'transfer', 'souvenir', 'activity'
);

-- users, travels, travel_members, invitations, expenses, finished_acks,
-- settlement_transfers as per tables above; add FKs and PKs accordingly.
```

*EF Core will generate concrete migration SQL; this sketch mirrors the architecture document only.*

---

## Open items (from architecture §13)

- **Rounding:** `equal_share = total_try / member_count` may need a documented rounding rule; does not require extra columns if computed at settlement time only.
- **Expense editing:** If added, decide whether to store revised `amount_try` / `exchange_rate` history.
