# EC08-BDD — Accommodation Rental Platform

Database design and implementation for a peer-to-peer accommodation rental platform (Airbnb-like). Built on **MySQL 8** and aligned with the EC08-BDD project specification.

---

## Project layout

```
.
├── 01_schema.sql                 # Tables, FKs, CHECK constraints, indexes (idempotent)
├── 02_constraints_triggers.sql   # Business-rule triggers
├── 03_views.sql                  # Reporting / dashboard views
├── 04_queries.sql                # 10 complex queries
├── 05_data.sql                   # Test dataset + commented invalid attempts
├── mcd.mmd                       # Conceptual ER diagram (Mermaid)
├── backend/                      # Express + TypeScript API on top of the schema
└── airbnb-platform-new/          # React + Vite client (uses the API)
```

---

## How to (re)create the database

The scripts are idempotent. Run them in order on an empty MySQL 8 instance:

```bash
mysql -u root -p -e "CREATE DATABASE rental_platform CHARACTER SET utf8mb4;"
mysql -u root -p rental_platform < 01_schema.sql
mysql -u root -p rental_platform < 02_constraints_triggers.sql
mysql -u root -p rental_platform < 05_data.sql
mysql -u root -p rental_platform < 03_views.sql
# Sanity check — each query in 04 prints a result set
mysql -u root -p rental_platform < 04_queries.sql
```

`01_schema.sql` starts with `DROP TABLE IF EXISTS` in dependency order so you can re-run it freely.

---

## Data model

11 base tables. See [mcd.mmd](mcd.mmd) for the ER diagram.

| Table | Role |
|---|---|
| `users` | Platform account; `is_host` flag lets the same account act as guest and/or host |
| `cancellation_policies` | Reusable refund rules (flexible / moderate / strict / no_refund) — § 3 |
| `accommodations` | Inherent property data; FK to `users` (host) and `cancellation_policies` |
| `amenities` + `accommodation_amenities` | Reference list and M:N junction |
| `accommodation_fees` | Cleaning / service / tax / pet / other fees, fixed or percentage |
| `availability` | Host-defined open / blocked windows |
| `pricing_rules` | Seasonal or event-based price adjustments |
| `bookings` | Lifecycle status (`pending` → `confirmed` → `completed`, or `cancelled`) |
| `reviews` | One per `booking`; reviewer & accommodation derived via the booking (3NF) |
| `payments` | Multi-step transactions per booking (deposit / balance / refund …) |
| `messages` | User-to-user communication, optionally tied to an accommodation |

### Key design decisions

- **3NF on reviews** — `reviews` only stores `booking_id`; the reviewer (`bookings.guest_id`) and the accommodation (`bookings.accommodation_id`) are reachable through one JOIN. No transitive duplication.
- **Validation gate** — `accommodations.is_validated` is `FALSE` by default. A row may only be flipped to `TRUE` if `has_alarm_system = TRUE` (CHECK + trigger). The booking trigger then refuses any insert against a non-validated or non-compliant accommodation. Implements § 4d and § 4e in one mechanism.
- **Cancellation policies as a reference table** — picked from a small list rather than free-form per listing. Refund computation in Q9 uses the policy + `bookings.cancelled_at` (auto-stamped by trigger).
- **Indexes** — composite `(type, city, is_validated, is_active)` on `accommodations` for the search filter (§ 4c); single-column indexes on FKs and statuses elsewhere.

---

## Coverage of the project specification

| § | Requirement | Implementation |
|---|---|---|
| 3 | Availability guarantee | Trigger `trg_booking_validate_before_insert` rejects bookings overlapping any `availability` row with `is_available = FALSE` |
| 3 | Cancellation policies + refund analysis | `cancellation_policies` table; `bookings.cancelled_at` set by trigger; Q9 computes the due refund per policy |
| 3 | Reconstruct the total cost of a stay | Q2 walks every night with a recursive CTE, applies the matching `pricing_rule`, sums `accommodation_fees` |
| 4a | Business constraints | PK / FK + CHECK constraints (dates, guests, prices, ratings, percentages) + 4 triggers |
| 4b | Daily dashboard | View `v_dashboard_lowest_ratings` — lowest rating per accommodation with comment, reviewer profile, reviewer's lifetime bookings; consumed by Q10 |
| 4c | Search performance by type | Composite index `idx_accommodations_search` covers the typical filter combination |
| 4d | Mandatory security (alarm) | Column `has_alarm_system`, CHECK preventing validation without it, trigger blocking bookings on non-compliant properties |
| 4e | Contrasting test data | 5 cases in `05_data.sql`: validated/not, compliant/not, never-booked, frequent vs single guest, plus 10 commented invalid attempts |
| 4f | Marketing list with average rating | View `v_accommodations_with_avg_rating` (LEFT JOIN keeps never-reviewed properties; renders `'No reviews'` when applicable) |

---

## Triggers (in `02_constraints_triggers.sql`)

| Trigger | Fires on | Enforces |
|---|---|---|
| `trg_booking_validate_before_insert` | `INSERT bookings` | Capacity, validation, alarm, listing active, min/max nights, blocked period, no overlap |
| `trg_booking_validate_before_update` | `UPDATE bookings` | Same checks if the booking returns to active state; auto-stamps `cancelled_at` on transition to `cancelled` |
| `trg_review_status_before_insert` | `INSERT reviews` | Only allow reviews on bookings with `status = 'completed'` whose stay has ended |
| `trg_accommodation_validation_consistency` | `UPDATE accommodations` | Cannot validate an accommodation without an alarm system (also enforced by CHECK) |

The schema also enforces:
- `chk_acc_validation_requires_alarm` — CHECK at the row level
- `chk_message_distinct` — sender ≠ receiver on `messages`
- `chk_booking_dates`, `chk_review_rating`, `chk_payment_amount`, `chk_pricing_pct_decrease_range`, etc.

---

## Views (in `03_views.sql`)

| View | Purpose |
|---|---|
| `v_accommodations_with_avg_rating` | Marketing list (§ 4f) |
| `v_dashboard_lowest_ratings` | Operational dashboard (§ 4b) |
| `v_booking_details_complete` | Denormalized booking detail for reporting |
| `v_host_earnings_summary` | Per-host KPIs |
| `v_cancellation_analysis` | Cancellation rate + cancelled value per policy |

---

## Test dataset highlights (`05_data.sql`)

- 15 users, 4 cancellation policies, 13 accommodations
- 17 completed bookings (with check-out ≤ today so reviews are accepted), 5 confirmed, 2 pending, 3 cancelled (with `cancelled_at` populated)
- Reviews include both highly negative (rating 1, 2) and highly positive (rating 5)
- Accommodation #11 — validated and compliant but **never booked** (covers the § 4e LEFT JOIN case)
- Accommodation #12 — pending platform validation
- Accommodation #13 — missing alarm system (cannot be validated, cannot be booked)
- 10 invalid attempts kept commented at the end of the file; uncomment to verify each rejection mechanism

---

## Backend (Express + TypeScript)

The `backend/` app sits on top of the schema:

- `accommodationController` — public listings filter on `is_validated = TRUE AND has_alarm_system = TRUE`. The host listing form requires `cancellationPolicyId`. The new listing is inserted with `is_validated = FALSE` (platform staff approves later). Endpoints expose the cancellation policy details and security flags.
- `bookingController` — performs explicit pre-checks (validation, alarm, capacity, blocked windows, overlap) before INSERT so the user gets a clear 4xx instead of a 500 from the trigger.
- `hostController` — `getHostProperties` returns every listing the host owns, including a `listing_status` field (`live` / `pending_validation` / `missing_alarm` / `inactive`).

New endpoint:
- `GET /api/accommodations/cancellation-policies` — returns the four reference policies for the listing form.

```bash
cd backend
npm install
npm run dev
```

---

## Notes / known limits

- The recursive CTE in Q2 requires MySQL 8.
- The validation trigger's error messages are deliberately specific (`"Accommodation does not meet mandatory security requirements (alarm system missing)"`) to ease debugging from the API layer.
- No status-history table is kept on bookings — `bookings.status`, `created_at`, `updated_at`, and `cancelled_at` are the audit trail. A dedicated history table is a possible extension but was deemed out of scope for this exercise.
