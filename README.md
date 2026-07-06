# Consultation Booking System

A simplified consultation booking system built for the Rapidr take-home assessment. Patients can browse doctors, view available 30-minute slots, and book an in-person consultation.

---

## Live demo

**App:** [https://rapidr-consultation-booking-system.netlify.app](https://rapidr-consultation-booking-system.netlify.app)

The live deployment is built from the `prod` branch. Work happens on `main` and is promptly merged into `prod`, so the two are kept in sync — what you see live matches the latest code.

Log in with any of the [demo accounts](#demo-accounts) — e.g. patient `alice_goh@godoc.test` / `password123`.

> Note: the backend runs on Render's free tier, which spins down when idle — the first request after a quiet period can take up to a minute while the instance wakes. Requests after that are fast.

The database is a Render-hosted PostgreSQL instance. No real secrets are committed — `.env.example` documents the required variable shape for both packages. If you want to run against the live database (or need the deployed app's configuration), contact me at [austin.nathan.miranda@gmail.com](mailto:austin.nathan.miranda@gmail.com) / +65 92322754 for the environment variable values or any issues faced.

---

## Contents

- [Live demo](#live-demo)
- [How the clinic works](#how-the-clinic-works)
- [MVP user flows](#mvp-user-flows)
- [Tech stack & why](#tech-stack--why)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend](#1-backend)
  - [2. Frontend](#2-frontend)
  - [3. Tests](#3-tests)
- [Demo accounts](#demo-accounts)
- [How to use the app](#how-to-use-the-app)
- [Features by role](#features-by-role)
  - [Per-feature assumptions & limitations](#per-feature-assumptions--limitations)
- [API reference](#api-reference)
  - [Conventions](#conventions)
  - [Sample requests & responses](#sample-requests--responses)
- [Database schema](#database-schema)
- [Concurrency: preventing double-booking](#concurrency-preventing-double-booking)
- [Booking states & transitions](#booking-states--transitions)
- [Design decisions & trade-offs](#design-decisions--trade-offs)
  - [UI/UX flows & edge cases](#uiux-flows--edge-cases)
- [Known limitations / future work](#known-limitations--future-work)

---

## How the clinic works

The system models a single physical clinic with a small roster of doctors. Understanding the domain assumptions makes the rest of the design (pre-generated slots, no pending state, no scheduling module) follow naturally.

**The clinic model:**

- One clinic, **in-person consultations only**. The app books the slot; everything after the patient walks in (consultation, payment, follow-ups) happens offline and outside the system.
- **Opening hours** (Singapore time): Mon–Fri 08:00–13:00 and 14:00–17:00 (closed for lunch 13:00–14:00), Sat 08:00–13:00, closed Sunday.
- Appointments are **fixed 30-minute blocks**, one patient per slot per doctor. A consultation that runs over into the next slot is not modelled.
- **Every doctor works all clinic hours.** There are no shifts, leave days, or per-doctor schedules yet — so a doctor's bookable slots are simply the clinic's opening hours, pre-generated 20 days ahead (this is not automatic).
- **Patients are pre-registered** by the clinic. There is no self-signup; accounts come from the seed data for now. The core focus is in the patient/doctor flows, auth can be managed later for more realistic signup process.
- A booking is an immediate commitment — no payment or approval step sits between "book" and "confirmed", which is why the system has no `pending` state.

**Assumptions made where the brief was ambiguous:**


| Assumption                                                                | Consequence in the design                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Patients choose a specific doctor (not "next available")                  | Booking flow starts with doctor selection                                  |
| A patient can hold multiple future bookings, but not at overlapping times | Overlap check inside the booking transaction                               |
| Cancelling frees the slot for anyone immediately                          | Availability is derived from active bookings, so no cleanup step is needed |
| Only the patient cancels; doctors don't (out of scope)                    | Single cancel code path in the patient's Upcoming view                     |
| A past booking left `confirmed` is a no-show                              | Tolerated as valid data; no automatic status transition                    |
| All times are Singapore wall-clock                                        | Stored as UTC (`TIMESTAMPTZ`), converted explicitly at query boundaries    |


## MVP user flows

Before building, I sketched the full UI/UX as a wireframe prototype — patient and doctor flows, including the conflict, empty, and error states. The implemented app follows it closely:

UI/UX wireframe prototype — patient and doctor flows

**Patient — book an appointment** (the core flow):

1. Log in → lands on the patient dashboard.
2. Start a booking: pick a **doctor** (name + specialty list).
3. Pick a **date** on the calendar (within the 20-day booking window).
4. Pick a **time slot** — only slots with no active booking are shown; times where the patient already has a booking elsewhere are flagged to prevent double-booking themselves.
5. Add a **note** for the doctor (reason for visit — required, so the doctor always has context).
6. **Confirm** → booking is created atomically as `confirmed` → success screen.

*Conflict path:* if someone else takes the slot between selection and confirmation (stale list, concurrent booking), the API returns `409` and the UI shows a conflict modal explaining the slot was just taken, then returns the patient to a refreshed slot list. This is an expected outcome, not an error page.

**Patient — manage bookings:**

- *Upcoming* tab: future confirmed bookings, each with a cancel action. Cancelling immediately frees the slot for other patients.
- *History* tab: completed and cancelled bookings.

**Doctor — run their day:**

1. Log in → doctor dashboard with a month calendar; dates that have confirmed bookings are highlighted.
2. Pick a day → see that day's confirmed appointments in order, with patient names and booking notes.
3. After an appointment's start time has passed, a **Mark as completed** action becomes available (enforced server-side, not just hidden in the UI).
4. *History* tab: past appointments across all days.

**Admin:**

- Logs in to a view-only dashboard: browse all users with a Patients/Doctors tab filter, click a user to see their profile and their bookings split into Upcoming and History. Strictly read-only — no create/edit/delete.

Product-level gaps (no reminders, no walk-in handling, no doctor cancellations) are listed under [Known limitations / future work](#known-limitations--future-work).

## Tech stack & why


| Layer      | Choice                                                  | Reasoning                                                                                                                                                                             |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend   | React 19 + Vite + TypeScript                            | Familiarity, Fast iteration, typed API layer shared with backend response shapes                                                                                                      |
| Styling    | Tailwind CSS 4 + DaisyUI                                | Utility-first speed for an MVP; DaisyUI for accessible prebuilt components for speedier implementation and eliminates design fatigue / making custom components                       |
| Backend    | Node.js + Express 5 + TypeScript                        | familiar with this better than fast-api/python framework from experience                                                                                                              |
| Database   | PostgreSQL (`pg` driver, raw SQL)                       | Familiar and real transactional guarantees (`SELECT ... FOR UPDATE`, partial unique indexes). Raw SQL over an ORM so the locking strategy is explicit and reviewable                  |
| Auth       | JWT (Bearer token) + bcrypt                             | Stateless, simple for MVP. The primary focus was to do the core features such as patient/doctor flows, auth can be reinforced later depending on direction of project moving forward. |
| Deployment | Netlify (frontend) + Render (backend + hosted Postgres) | Free-tier friendly, matches the brief's suggested targets                                                                                                                             |


The schema is 3 tables in one commented SQL file (`backend/migrations/000_init.sql`), applied once to a fresh database. 

## Repository structure

```
consultation-booking-system/
├── backend/
│   ├── migrations/        # 000_init.sql — full schema, commented, run once
│   ├── seed/              # seed.ts — users + slots; --history flag adds past bookings
│   └── src/
│       ├── index.ts       # Express app entry
│       ├── db.ts          # pg Pool
│       ├── middleware/    # requireAuth / requireRole (JWT)
│       └── features/      # Feature-sliced: auth, doctors, slots, bookings, admin
│           └── bookings/  # createBooking (concurrency-critical path),
│                          # patient.routes.ts, doctor.routes.ts
└── frontend/
    └── src/
        ├── api/           # Typed axios client + response types
        ├── auth/          # AuthContext (session state)
        ├── routes/        # ProtectedRoute (role-gated routing)
        ├── booking/       # Multi-step booking flow (doctor → date → slot → confirm)
        └── pages/         # Role dashboards: patient, doctor, admin
```

Backend and frontend are independent npm packages — run commands from within each directory.

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (local or hosted — a connection string is all that's needed)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in real values, contact me for values
```

`.env` values:


| Variable       | Description                                             |
| -------------- | ------------------------------------------------------- |
| `DATABASE_URL` | Postgres connection string                              |
| `JWT_SECRET`   | Long random string used to sign JWTs                    |
| `PORT`         | API port (defaults to 3000)                             |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |


Create the schema — a single commented SQL file, run once against a fresh database:

```bash
psql "$DATABASE_URL" -f migrations/000_init.sql
```

Seed users and slots, then start the dev server:

```bash
npm run seed           # full wipe + reseed: users and a 20-day rolling window of slots
npm run seed:history   # optional, run after seed: past slots + booking history for the history tabs
npm run dev            # tsx watch, http://localhost:3000
```

> ⚠️ `npm run seed` runs `TRUNCATE ... RESTART IDENTITY CASCADE` — it wipes all users, slots, and bookings.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:3000
# (optional for local dev — vite.config.ts proxies API routes to :3000; required for production builds)
npm run dev            # http://localhost:5173
```

Other frontend scripts: `npm run build` (type-check + build), `npm run lint` (oxlint), `npm run preview`.

### 3. Tests

One automated check exists, aimed squarely at the graded question — the double-booking race:

```bash
cd backend
npm test                     # backend must be running and seeded
# API_URL=https://... npm test   to point it at a deployed backend
```

`scripts/concurrency-check.ts` logs in all five seeded patients, picks a slot none of them has a conflicting booking on, fires five booking requests at it **simultaneously**, and asserts: exactly one `201`, four `409`s, and the slot gone from public availability. It then cancels the winning booking, so it's safe to run repeatedly. Sample output:

```
Firing 5 concurrent booking requests at slot 11...
  alice_goh@godoc.test         -> HTTP 201
  marcus_lim@godoc.test        -> HTTP 409 (This slot is already booked)
  priya_nair@godoc.test        -> HTTP 409 (This slot is already booked)
  daniel_wong@godoc.test       -> HTTP 409 (This slot is already booked)
  nurul_aisyah@godoc.test      -> HTTP 409 (This slot is already booked)

Created: 1 (expected 1)
Conflicts (409): 4 (expected 4)
PASS — exactly one booking won the race.
```

There is no unit or E2E suite beyond this - a deliberate trade-off (see limitations): one integration check that proves the core correctness claim beat broad scaffolding under the deadline.

Other testing considered, done manually for now:

1. **End-to-end (browser) tests** — Cypress/Playwright driving the real UI through the booking flow, conflict modal, and cancel/complete actions. Covered manually via the flows in [How to use the app](#how-to-use-the-app), including the two-browser double-booking race.
2. **Unit tests** — pure logic like the upcoming/history split, slot-overlap checks, and name/date formatting. Verified manually through the UI against seeded data.
3. **API contract tests** — per-endpoint checks of auth requirements, role gates (`403`s), and validation errors (`400`s). Exercised manually with curl and via the live demo; the shapes are documented in [Sample requests & responses](#sample-requests--responses).

These would be the build-out order if the project continued: contract tests first, then unit tests as logic grows, E2E last.

## Demo accounts

All seeded accounts use the password `password123`.


| Role    | Email                     | Notes               |
| ------- | ------------------------- | ------------------- |
| Admin   | `carol_ng@godoc.test`     | View-only dashboard |
| Doctor  | `pamela_goh@godoc.test`   | General Practice    |
| Doctor  | `wei_ming_tan@godoc.test` | Cardiology          |
| Doctor  | `sarah_lim@godoc.test`    | Pediatrics          |
| Patient | `alice_goh@godoc.test`    |                     |
| Patient | `marcus_lim@godoc.test`   |                     |
| Patient | `priya_nair@godoc.test`   |                     |
| Patient | `daniel_wong@godoc.test`  |                     |
| Patient | `nurul_aisyah@godoc.test` |                     |


Slots follow Singapore clinic hours: Mon–Fri 08:00–13:00 and 14:00–17:00, Sat 08:00–13:00, closed Sunday. 30-minute blocks, generated for a 20-day rolling window from the seed date (`Asia/Singapore` wall-clock time).

## How to use the app

Works the same on the [live demo](#live-demo) or a local run. All passwords are `password123`.

**As a patient** (e.g. `alice_goh@godoc.test`):

1. Log in → **Book** a consultation: pick a doctor → pick a date → pick a time slot → write a short reason for visit → confirm.
2. **Upcoming** tab: see the booking you just made; cancel it from here if needed.
3. **History** tab: past completed/cancelled visits (run `npm run seed:history` locally to populate, already populated on live).

**As a doctor** (e.g. `pamela_goh@godoc.test`):

1. Log in → today's appointments are listed; use the calendar to jump to other days (dates with bookings are highlighted).
2. Once an appointment's start time has passed, press **Mark as complete**.
3. **History** tab: everything already seen or cancelled.

**Try the double-booking race** (the core of this assessment):

1. Open two browsers (or one normal + one incognito) and log in as two different patients.
2. In both, navigate to the *same doctor, date, and slot*, up to the confirm screen.
3. Confirm in browser A, then confirm in browser B → B gets a "slot already booked" dialog and is sent back to a refreshed slot list. Exactly one booking exists.

**As admin** (`carol_ng@godoc.test`): switch between the Patients and Doctors tabs, pick any user to view their details and their upcoming/past bookings. View-only — admins can't modify anything (for now).

## Features by role

**Patient**

- Login / logout
- Book an appointment: select doctor → date → available slot → add a note for the doctor → confirm
- View upcoming appointments and cancel them
- View booking history (completed / cancelled)
- Conflict handling: if the chosen slot was taken while confirming (stale UI, concurrent booking), a conflict modal prompts re-selection instead of failing silently
- Prevented from double-booking themselves into overlapping times

**Doctor**

- View upcoming appointments per day (calendar highlights dates with bookings)
- Mark an appointment as completed — only enabled once the slot's start time has passed
- View appointment history

**Admin**

- View all users, filterable by role (Patients / Doctors tabs)
- Drill into any user: profile details plus their bookings, split into Upcoming and History
- Strictly view-only — no user or booking management (see trade-offs)

### Per-feature assumptions & limitations

Summary view — one row per implemented feature, including why each line was drawn where it was. Deeper reasoning lives in [Design decisions & trade-offs](#design-decisions--trade-offs) and [Known limitations / future work](#known-limitations--future-work).


| Feature                   | Assumptions                                                                                                                 | Known limitations                                                                                                                               | Why?                                                                                                                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login / auth              | Users are pre-registered via the seed script; a stateless JWT is sufficient for an MVP                                      | No signup or password reset; 24 h token expiry isn't intercepted client-side; localStorage storage is XSS-exposed (see trade-offs)              | The brief centres on the booking flow, not account management. A simple JWT was the fastest auth I could implement confidently, freeing time for the core flow — signup/reset add forms and flows that earn no marks here                                                                     |
| Doctor & slot browsing    | Patients pick a specific doctor (not "next available"); slots pre-generated 20 days ahead at fixed clinic hours             | Slot window is seed-time only (no rolling extension job); today's already-elapsed slots still listed; calendar doesn't show the 20-day boundary | Pre-generated slots keep the booking transaction a single row lock . A scheduling module (shifts, leave, slot admin) is days of work and i felt could be decided later on if its worth impmenting from assessor recommendation.                                                               |
| Booking creation          | Booking is an immediate commitment — no payment/approval step, hence no `pending` state; the note to the doctor is required | Fixed 30-minute blocks; consultation overrun not handled; no confirmation email/SMS                                                             | Every state added multiplies transitions to reason about and test. With no async step in scope, `pending` would a liability and extra scope such as stale data, cache, extra updates, considering the timeline.                                                                               |
| Double-booking prevention | Contention happens per slot; making the second request wait a few ms on a row lock is acceptable                            | Proven by `npm test` (5 concurrent requests, exactly one wins); no unit/E2E coverage beyond that check                                          | This is the graded core (i assume).                                                                                                                                                                                                                                                           |
| Self-overlap prevention   | A patient can't attend two consultations at the same time                                                                   | The pre-warning in the slot grid depends on fetched booked-times; only the in-transaction server check is authoritative                         | The server check is a few lines inside a transaction that already exists. The UI dimming was quick to add since frontend is where I'm fastest                                                                                                                                                 |
| Cancellation              | Only the patient cancels, only upcoming bookings; a freed slot is immediately rebookable by anyone                          | No doctor-initiated cancel or reschedule; the doctor learns of a cancellation only by its absence from their list                               | One cancel path Doctor-initiated cancellation drags in notifications and rebooking flows                                                                                                                                                                                                      |
| Mark as complete          | The doctor confirms attendance manually, and only after the slot's start time (enforced in SQL)                             | No auto-complete job; a past booking left `confirmed` (no-show) stays that way forever                                                          | Manual + an SQL time guard is a few safe lines. An auto-complete job means scheduled infrastructure (cron/worker) — not important yet for this assessment.                                                                                                                                    |
| History views             | Patient history = completed/cancelled; doctor history also includes past confirmed (no-shows)                               | No pagination or sorting — lists grow unbounded                                                                                                 | Needed so the demo feels real (seeded history) and doctors can spot no-shows. Pagination is pointless at seed-data scale; it's listed as future work instead of half-built                                                                                                                    |
| Admin dashboard           | Read-only oversight is enough for the MVP; Patients/Doctors tabs cover the useful role filters                              | No user CRUD, booking overrides, or slot creation; user list not paginated                                                                      | Deliberately built last: least core to the patient/doctor flow the brief describes. Read-only views reuse the existing tab/card patterns, so it was cheap. New features such as Management rights and scheduling are new flows entirely and can be done later if decided to be a requirement. |


## API reference

All routes except `/auth/login` and `/health` require `Authorization: Bearer <token>`.


| Method  | Path                                   | Role    | Description                                                           |
| ------- | -------------------------------------- | ------- | --------------------------------------------------------------------- |
| `GET`   | `/health`                              | —       | Health check                                                          |
| `POST`  | `/auth/login`                          | —       | Login; returns `{ user, token }`                                      |
| `POST`  | `/auth/logout`                         | any     | Logout (client discards token)                                        |
| `GET`   | `/auth/me`                             | any     | Current user                                                          |
| `GET`   | `/doctors`                             | any     | List doctors                                                          |
| `GET`   | `/slots?doctorId=&date=`               | any     | Available slots for a doctor on a date                                |
| `POST`  | `/bookings`                            | patient | Create booking `{ slotId, notes }`                                    |
| `GET`   | `/bookings/patient/upcoming`           | patient | Upcoming confirmed bookings                                           |
| `GET`   | `/bookings/patient/past`               | patient | Completed / cancelled bookings                                        |
| `GET`   | `/bookings/patient/booked-times?date=` | patient | Patient's own booked times on a date (for overlap warnings in the UI) |
| `PATCH` | `/bookings/patient/:id/cancel`         | patient | Cancel own confirmed booking                                          |
| `GET`   | `/bookings/doctor/booked-dates?month=` | doctor  | Dates in a month with confirmed bookings                              |
| `GET`   | `/bookings/doctor/upcoming?date=`      | doctor  | Confirmed bookings for a day (defaults to today, SGT)                 |
| `GET`   | `/bookings/doctor/past`                | doctor  | Past appointments                                                     |
| `PATCH` | `/bookings/doctor/:id/complete`        | doctor  | Mark booking completed (only if slot has started)                     |
| `GET`   | `/admin/users?role=`                   | admin   | List users, optional role filter (`patient` / `doctor` / `admin`)     |
| `GET`   | `/admin/users/:id/bookings`            | admin   | All bookings where the user is the patient or the doctor              |


Booking conflicts return `409` with an error message; the frontend uses this to trigger the slot-conflict modal.

### Conventions

- All timestamps are ISO 8601 UTC strings (stored as `TIMESTAMPTZ`); the frontend converts to Singapore time for display.
- Errors share one shape at every status code: `{ "error": "<message>" }`.
- Booking list rows are flat SQL join results — the joined party's name fields are prefixed (`doctor_`* on patient endpoints, `patient_`* on doctor endpoints).

### Sample requests & responses

`POST /auth/login`

```jsonc
// Request
{ "email": "alice_goh@godoc.test", "password": "password123" }

// 200
{
  "user": {
    "id": 5, "title": null, "first_name": "Alice", "middle_name": null,
    "last_name": "Goh", "email": "alice_goh@godoc.test", "role": "patient"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

// 401 — { "error": "Invalid email or password" }
```

`POST /auth/logout` — no body → `200 { "ok": true }` (stateless JWT; the client discards the token).

`GET /auth/me` → `200 { "user": { ...same shape as login } }`

`GET /doctors`

```jsonc
// 200
{
  "doctors": [
    { "id": 2, "title": "Dr.", "first_name": "Pamela", "middle_name": null,
      "last_name": "Goh", "specialty": "General Practice" }
  ]
}
```

`GET /slots?doctorId=2&date=2026-07-08`

```jsonc
// 200 — only slots with no active booking are returned
{
  "slots": [
    { "id": 341, "start_time": "2026-07-08T00:00:00.000Z", "end_time": "2026-07-08T00:30:00.000Z" },
    { "id": 342, "start_time": "2026-07-08T00:30:00.000Z", "end_time": "2026-07-08T01:00:00.000Z" }
  ]
}
// (00:00 UTC = 08:00 Singapore)
```

`POST /bookings` (patient)

```jsonc
// Request — both fields required; notes must be non-empty
{ "slotId": 341, "notes": "Persistent cough for two weeks" }

// 201
{
  "booking": {
    "id": 87, "slot_id": 341, "patient_id": 5, "status": "confirmed",
    "notes": "Persistent cough for two weeks", "created_at": "2026-07-06T09:15:23.101Z"
  }
}

// 409 — slot taken (concurrent booking / stale list); triggers the conflict modal
{ "error": "This slot is already booked" }

// 409 — patient already booked elsewhere at an overlapping time
{ "error": "You already have a booking at this time" }

// 400 — { "error": "slotId is required" } or { "error": "notes is required" }
// 404 — { "error": "Slot not found" }
```

`GET /bookings/patient/upcoming` (and `/past` — same shape, statuses `completed`/`cancelled`)

```jsonc
// 200
{
  "bookings": [
    {
      "id": 87, "status": "confirmed", "created_at": "2026-07-06T09:15:23.101Z",
      "notes": "Persistent cough for two weeks",
      "slot_id": 341, "start_time": "2026-07-08T00:00:00.000Z", "end_time": "2026-07-08T00:30:00.000Z",
      "doctor_id": 2, "doctor_title": "Dr.", "doctor_first_name": "Pamela",
      "doctor_middle_name": null, "doctor_last_name": "Goh",
      "doctor_specialty": "General Practice"
    }
  ]
}
```

`GET /bookings/patient/booked-times?date=2026-07-08`

```jsonc
// 200 — the patient's own confirmed times that day (UI flags overlaps during slot selection)
{ "bookedTimes": [ { "start_time": "2026-07-08T00:00:00.000Z", "end_time": "2026-07-08T00:30:00.000Z" } ] }
```

`PATCH /bookings/patient/87/cancel` — no body

```jsonc
// 200 — { "message": "Booking cancelled" }
// 404 — { "error": "Booking not found" }
```

`GET /bookings/doctor/booked-dates?month=2026-07`

```jsonc
// 200 — Singapore-local dates with ≥1 confirmed booking (drives calendar highlights)
{ "dates": ["2026-07-07", "2026-07-08", "2026-07-10"] }
```

`GET /bookings/doctor/upcoming?date=2026-07-08` (and `/past` — same shape)

```jsonc
// 200 — that day's confirmed bookings (date defaults to today, Singapore time)
{
  "bookings": [
    {
      "id": 87, "status": "confirmed", "created_at": "2026-07-06T09:15:23.101Z",
      "notes": "Persistent cough for two weeks",
      "slot_id": 341, "start_time": "2026-07-08T00:00:00.000Z", "end_time": "2026-07-08T00:30:00.000Z",
      "patient_id": 5, "patient_title": null, "patient_first_name": "Alice",
      "patient_middle_name": null, "patient_last_name": "Goh"
    }
  ]
}
```

`PATCH /bookings/doctor/87/complete` — no body

```jsonc
// 200 — { "message": "Booking marked as completed" }
// 404 — { "error": "Booking not found or not eligible to complete" }
//       (not this doctor's, not confirmed, or the slot hasn't started yet)
```

`GET /admin/users?role=doctor` (admin)

```jsonc
// 200
{
  "users": [
    { "id": 2, "title": "Dr.", "first_name": "Pamela", "middle_name": null, "last_name": "Goh",
      "email": "pamela_goh@godoc.test", "role": "doctor", "specialty": "General Practice",
      "created_at": "2026-07-04T21:44:25.000Z" }
  ]
}
// 400 — { "error": "role must be one of: patient, doctor, admin" }
```

`GET /admin/users/5/bookings` (admin)

```jsonc
// 200 — bookings where user 5 is either the patient or the doctor; both parties' names included
{
  "bookings": [
    {
      "id": 277, "status": "confirmed", "notes": "Stomach Ache", "created_at": "2026-07-05T16:36:10.601Z",
      "slot_id": 4, "start_time": "2026-07-06T01:30:00.000Z", "end_time": "2026-07-06T02:00:00.000Z",
      "doctor_id": 2, "doctor_title": "Dr.", "doctor_first_name": "Pamela",
      "doctor_middle_name": null, "doctor_last_name": "Goh", "doctor_specialty": "General Practice",
      "patient_id": 5, "patient_title": null, "patient_first_name": "Alice",
      "patient_middle_name": null, "patient_last_name": "Goh"
    }
  ]
}
```

## Database schema

Three tables (see `backend/migrations/000_init.sql` for the full commented DDL):

Entity-relationship diagram of users, slots, and bookings


| Table      | What it stores                            | Notable details                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`    | All roles in one table                    | `patient` / `doctor` / `admin` enum; split name fields (`title`, `first_name`, `middle_name`, `last_name`); `specialty` for doctors; bcrypt `password_hash`; soft-delete via `deleted_at`                                               |
| `slots`    | Pre-generated bookable windows per doctor | `doctor_id`, `start_time`, `end_time`; `UNIQUE (doctor_id, start_time)`. Availability is **derived**, not stored — a slot is available if it has no active booking. Avoids a status column that could drift out of sync with `bookings` |
| `bookings` | A patient's reservation for a slot        | `slot_id`, `patient_id`, `status` (`confirmed` / `cancelled` / `completed`), free-text `notes`; soft-delete via `deleted_at`                                                                                                            |


The critical constraint:

```sql
CREATE UNIQUE INDEX one_active_booking_per_slot
  ON bookings (slot_id)
  WHERE status IN ('confirmed', 'completed') AND deleted_at IS NULL;
```

Each slot can only have one live booking at a time (`confirmed` or `completed`). Cancelled bookings don't count toward that limit, so a cancelled slot can be booked again.

## Concurrency: preventing double-booking

**Scenario:** Two patients both tap "Confirm" on the same 10:00 slot at nearly the same moment. Patient A's request hits the server first — it locks the slot row, creates the booking, and commits. Patient B's request was blocked waiting on that lock; when A finishes, B runs its check, sees the slot is already taken, and gets a `409`. The UI treats that as expected and offers to pick another slot.

Two layers of defence in `createBooking` (`backend/src/features/bookings/bookings.service.ts`):

1. **Lock the slot while booking.** When someone confirms, the server temporarily holds that slot (`SELECT ... FOR UPDATE`) so a second request for the same slot has to wait. The first booking finishes; the second then sees the slot is taken and gets a `409`. That turns "check if free → book" into one safe step instead of a race.
2. **Database safety net.** If application code ever skipped the lock, Postgres still won't store two live bookings on the same slot — the `one_active_booking_per_slot` index blocks it. That failure is caught and returned as the same `409`.

Within the same transaction, the service also rejects bookings that would overlap another confirmed booking held by the same patient (a patient can't be in two places at once).

**Why lock instead of "try and retry"?** The common case is two people wanting the same slot — not rare edge cases. Making the second person wait a few milliseconds on a lock is simple and cheap. A "book first, fix conflicts later" approach would need retry logic and is harder to get right for a take-home.

**Will this scale?** Locks only queue up requests for the *same* slot — bookings for different slots still run at the same time. If traffic grew further: pool DB connections (already in place), add read replicas for listing pages, and eventually split booking data by doctor or date if writes became the bottleneck.

**Client-side handling:** the UI treats `409` as an expected outcome, not an error — a conflict modal explains the slot was just taken and returns the patient to slot selection with fresh data.

## Booking states & transitions

Every booking is one of three statuses: **confirmed**, **cancelled**, or **completed**. There is no **pending**.

**Why no `pending`?** Booking here is all-or-nothing: the patient taps Confirm, and the server either saves a **confirmed** booking or rejects the request (slot taken, overlap, etc.) due to the MVP constraints of scenarios such as no payment step, no admin approval, nothing that needs to sit in a "waiting" state. Adding `pending` would mean handling half-finished bookings and it's decided to be not in this scope of this assessment for now.

Booking states and transitions


| Transition                | Who               | Why this rule                                                                                                                                                                   |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| → `confirmed`             | Patient (on book) | Atomic: Either booking is a success or fails. Simpler for now.                                                                                                                  |
| `confirmed` → `cancelled` | Patient           | Only a patient can cancel their appointment from the Upcoming tab section in UI.                                                                                                |
| `confirmed` → `completed` | Doctor            | Marks the visit as done. Server also requires `s.start_time <= now()` so you can't complete a future appointment. For now it doesn't auto-mark, this could be a future feature. |
| `cancelled` / `completed` | —                 | Terminal — no further changes                                                                                                                                                   |


## Design decisions & trade-offs


| Decision                                 | Rationale & trade-off                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single `users` table with role enum      | One auth path with `requireRole` middleware instead of separate patient/doctor tables. Doctor-specific fields (`specialty`) are nullable; would split into profile tables if role-specific data grew.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Pre-generated slots                      | The initial idea was the admin would have a dashboard that allows them to create slots for doctors, but due to time constraints, this is decided to pre-generate slots for now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Derived availability (no `slots.status`) | Adding `slots.status` I foresaw would be extra work, so I decided against it for now. A stored status is also a cache that could go stale.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Soft deletes everywhere (`deleted_at`)   | For audit purposes, useful for admin dashboards, see more paper trail, see docs who lepaks, etc. kidding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Timezone discipline                      | For simplicity, for now its set to `Asia/Singapore` since the app would only be used in Singapore.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| JWT in localStorage with Bearer header   | Initial idea was to use a microservice such as Supabase for built-in authentication module, but since user data is gonna be seeded and if we were to scale and make changes, I thought to create a simple JWT with bearer header would be doable and faster to implement first to quickly finish the auth part of the app, so i can focus on the actual user flows such as making bookings, etc. Simple and works across the Netlify/Render split without cross-site cookie configuration. Trade-off: susceptible to token theft via XSS; production would use httpOnly cookies with proper `SameSite`/CORS, or short-lived tokens with refresh rotation. |
| Admin is view-only                       | The admin can view user data and profiles and drill into each user's appointments and history (Patients/Doctors tabs → user → bookings), but stays strictly read-only. Management rights aren't core to the flow since the app is mainly used by patients and doctors. As the app grows, admin would get more rights such as managing users, creating slots on UI, and interfering with status changes such as cancelling an appointment for a user.                                                                                                                                                                                                      |
| Deployment to live                       | Decided to use Render for backend deployment and Netlify for frontend. Postgres is hosted on Render as well, not stored locally. Since the end goal is to make it live so users can use it immediately on the web, I chose Netlify and Render for its simplicity, free-tiers, and familiarity with my experience in deploying personal apps to the web.                                                                                                                                                                                                                                                                                                   |
| Live deployment over Docker              | Considered Docker (docker-compose with Postgres + backend + frontend) for reproducible local setup, but given the deadline and my unfamiliarity with Docker, I prioritised a live deployment instead — the assessor can use the app immediately via the link, no local setup at all. Local setup still works via the Getting started steps; a docker-compose (even just a Postgres-only one) is the natural next step for contributor onboarding.                                                                                                                                                                                                         |


### UI/UX flows & edge cases

Edge cases the UI handles deliberately:


| Edge case                                                | How it's handled                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slot taken by someone else between selection and confirm | The API's two `409`s are distinguished by the client (`BookingFlow.tsx`): a stolen slot opens the conflict modal and routes back to a refreshed slot list.                                                                                                                                                                           |
| Patient double-books themselves at the same time         | Different treatment from the stolen-slot case — a warning toast + return to slot selection (own mistake needs a nudge, not a modal). Also warned before confirm: booked times are fetched during slot selection and overlapping slots are dimmed (`SlotSelect.tsx`), while the server re-checks the overlap inside the transaction. |
| Stale slot list (no polling)                             | Treated as a first-class state: staleness is reconciled at the only moment it matters — confirmation — via the `409` path, rather than pretending the list is live. Polling or web sockets can be implemented later.                                                                                                                 |
| Accidental cancellation                                  | Confirmation modal before cancelling; the cancel button renders only on `confirmed` bookings.                                                                                                                                                                                                                                        |
| Empty / loading / failure states                         | No slots for a date shows a message + retry button (not a blank grid); empty upcoming/history tabs say so; every fetch has a loading state; a non-conflict booking failure gets a dedicated error screen.                                                                                                                            |
| Changing your mind mid-booking                           | Doctor/date/slot/notes selections survive going back a step. Success or abandonment resets the flow cleanly.                                                                                                                                                                                                                         |
| Page refresh while logged in                             | `AuthContext` re-validates the stored token against `/auth/me` before rendering role-gated routes                                                                                                                                                                                                                                    |
| Booking in the past                                      | The booking calendar disables days before today.                                                                                                                                                                                                                                                                                     |
| Mobile use                                               | Buttons and tap targets keep a 44px minimum height per touch guidelines; layouts are single-column and widen on desktop.                                                                                                                                                                                                             |


Edge cases known and **not** handled (deliberate scope calls):


| Edge case                                               | Why not / next step                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Today's already-elapsed slots still listed and bookable | The slots query filters by date but not time-of-day, and the calendar only blocks past *dates* — at 5 PM you can still book today's 8 AM slot. Fix is a one-line `start_time > now()` filter in the slots query; first thing to add. |
| Times render in the browser's timezone, unlabelled      | Correct for the assumed Singapore user; a viewer in another timezone sees shifted times with no `SGT` label. Server-side date logic is timezone-explicit — only the display layer assumes.                                           |
| Calendar allows dates beyond the 20-day slot window     | Picking day 25 just shows the "no slots" empty state rather than disabling the date — functional, but the booking-window boundary is invisible to the patient.                                                                       |
| Token expiry (24 h) not intercepted                     | A mid-session expiry surfaces as a failed-request message, not an automatic redirect to login.                                                                                                                                       |
| Doctor's view doesn't update live                       | New bookings and cancellations appear on next fetch, not via polling/websockets                                                                                                                                                      |
| No cancellation notice to the doctor                    | A patient's cancellation is visible only as the slot's absence from the doctor's list; ties into the notifications gap in the limitations below.                                                                                     |
| Modal accessibility is partial                          | Modals are DaisyUI class-toggles without focus trapping or `Esc` handling; a production build would use `<dialog>` or something better.                                                                                              |


## Known limitations / future work


| Limitation                                       | Details                                                                                                                                                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minimal automated tests                          | One integration check exists — `npm test` fires 5 concurrent bookings at one slot and asserts exactly one succeeds (see Tests). No unit or E2E suite beyond it for now due to time constraints.                             |
| No signup/registration                           | Users are preseeded; the design (single `users` table, role enum) transitions cleanly to self-registration later when there's user and role management feature added later.                                                 |
| No doctor scheduling                             | Doctors implicitly work all clinic hours — no shifts, leave, or off-days. Slot generation is seed-time only (20-day window); a real deployment needs a scheduled job to extend it. Doctors will hate working here (for now) |
| Fixed 30-minute slots                            | Consultations running over into the next slot aren't handled.                                                                                                                                                               |
| In-person only                                   | No teleconsult; disputes, payments, etc. are handled in the clinic.                                                                                                                                                         |
| No notifications or reminders                    | No email/SMS confirmations; patients and doctors see state changes only when they open the app. Will implement websockets or another if it's a core requirement.                                                            |
| No doctor-initiated cancellation or rescheduling | If a doctor becomes unavailable, there is no in-app path to notify or rebook affected patients.                                                                                                                             |
| No no-show handling                              | A past booking left `confirmed` just stays that way; no automatic transition or follow-up.                                                                                                                                  |
| Admin is read-only                               | Admin can browse users and their bookings but can't manage them — no user CRUD, no booking overrides, no slot creation from the UI.                                                                                         |
| No pagination or sorting on list endpoints       | If time permits or its a core requirement can add pagination to endpoints and UI.                                                                                                                                           |


