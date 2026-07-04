CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
