ALTER TABLE users ADD COLUMN specialty VARCHAR(255);
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE TABLE slots (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (doctor_id, start_time)
);

CREATE INDEX idx_slots_doctor_date ON slots (doctor_id, start_time);

CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed');

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES slots(id),
  patient_id INTEGER NOT NULL REFERENCES users(id),
  status booking_status NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX one_active_booking_per_slot
  ON bookings (slot_id)
  WHERE status IN ('confirmed', 'completed') AND deleted_at IS NULL;
