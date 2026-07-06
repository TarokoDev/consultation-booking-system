-- ============================================================================
-- Consultation Booking System — database schema
--
-- Run ONCE against a fresh, empty PostgreSQL database:
--
--   psql "$DATABASE_URL" -f migrations/000_init.sql
--
-- Then seed users and slots with `npm run seed`.
--
-- This file is not idempotent (plain CREATEs, no IF NOT EXISTS) — rerunning
-- it against an already-initialised database will fail loudly rather than
-- silently patching a half-built schema. Drop and recreate the database if
-- you need a clean start.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Enums
--
-- Roles and booking statuses are Postgres ENUMs rather than free-text
-- VARCHARs: the database rejects invalid values outright, and the full set of
-- legal states is visible in the schema itself.
--
-- Booking states are deliberately only these three — there is no 'pending'.
-- Booking creation is atomic (a single transaction): it either commits as
-- 'confirmed' or fails outright. With no asynchronous step (payment,
-- approval) between request and confirmation, a 'pending' state would only
-- introduce invalid intermediate states to handle.
-- ----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');

CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed');


-- ----------------------------------------------------------------------------
-- users — all roles in one table
--
-- Patients, doctors, and admins share a single table, discriminated by the
-- `role` column and enforced per-route by application middleware
-- (requireAuth / requireRole). One table means one auth path; role-specific
-- data (currently just `specialty` for doctors) lives in nullable columns,
-- and would be split into per-role profile tables if it grew.
--
-- Name is stored as split fields (title / first / middle / last) rather than
-- a single string, so the UI can format names correctly ("Dr. Tan" vs
-- "Alice Goh") without parsing.
--
-- `deleted_at` implements soft delete (here and on every table below):
-- medical-adjacent records should be recoverable and auditable, so rows are
-- flagged rather than destroyed, and all queries filter on
-- `deleted_at IS NULL`.
-- ----------------------------------------------------------------------------

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(20),                -- e.g. "Dr.", nullable for patients/admins
  first_name    VARCHAR(255) NOT NULL,
  middle_name   VARCHAR(255),
  last_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,      -- bcrypt
  role          user_role NOT NULL,
  specialty     VARCHAR(255),               -- doctors only, e.g. "Cardiology"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ                 -- soft delete
);


-- ----------------------------------------------------------------------------
-- slots — pre-generated bookable time windows
--
-- Slots are generated ahead of time by the seed script (30-minute blocks
-- within Singapore clinic hours, 20-day rolling window) rather than computed
-- on the fly from doctor schedules. This makes "what can be booked" an
-- explicit database fact, and reduces the booking transaction to a single
-- row lock on the slot (see bookings below).
--
-- Note there is NO status/availability column. Availability is derived: a
-- slot is available if no active booking references it. A stored status
-- would be a cache of the bookings table that could drift out of sync;
-- deriving it keeps one source of truth.
--
-- All timestamps are TIMESTAMPTZ (stored as UTC). Conversion to Singapore
-- wall-clock time happens explicitly at the query boundary
-- (AT TIME ZONE 'Asia/Singapore'), never implicitly.
--
-- UNIQUE (doctor_id, start_time) guards against the seed/generation job ever
-- producing overlapping duplicate slots for a doctor.
-- ----------------------------------------------------------------------------

CREATE TABLE slots (
  id         SERIAL PRIMARY KEY,
  doctor_id  INTEGER NOT NULL REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,                   -- soft delete
  UNIQUE (doctor_id, start_time)
);

-- Serves the main read path: "available slots for doctor X on date Y".
CREATE INDEX idx_slots_doctor_date ON slots (doctor_id, start_time);


-- ----------------------------------------------------------------------------
-- bookings — a patient's claim on a slot
--
-- Created directly as 'confirmed' (no pending state, see enum note above).
-- Valid transitions, enforced in the service layer's UPDATE conditions:
--
--   confirmed -> cancelled   (patient, upcoming bookings only)
--   confirmed -> completed   (doctor, only after the slot's start time)
--
-- 'cancelled' and 'completed' are terminal.
-- ----------------------------------------------------------------------------

CREATE TABLE bookings (
  id         SERIAL PRIMARY KEY,
  slot_id    INTEGER NOT NULL REFERENCES slots(id),
  patient_id INTEGER NOT NULL REFERENCES users(id),
  status     booking_status NOT NULL DEFAULT 'confirmed',
  notes      TEXT NOT NULL DEFAULT '',      -- patient note to the doctor (API requires non-empty)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ                    -- soft delete
);

-- ----------------------------------------------------------------------------
-- Double-booking backstop.
--
-- Partial unique index: at most ONE active (confirmed or completed,
-- non-deleted) booking may exist per slot. Cancelled or soft-deleted
-- bookings fall outside the predicate, so a cancelled slot can be rebooked.
--
-- This is the second line of defence against the double-booking race. The
-- first is pessimistic locking in the createBooking transaction
-- (SELECT ... FOR UPDATE on the slot row — see bookings.service.ts). Even if
-- some future code path forgets the lock, Postgres itself makes two active
-- bookings for one slot impossible; the service maps the unique violation
-- (error 23505) to the same 409 conflict response.
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX one_active_booking_per_slot
  ON bookings (slot_id)
  WHERE status IN ('confirmed', 'completed') AND deleted_at IS NULL;
