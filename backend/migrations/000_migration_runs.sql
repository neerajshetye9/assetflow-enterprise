-- Migration runner tracking table
CREATE TABLE IF NOT EXISTS migration_runs (
  id SERIAL PRIMARY KEY,
  filename VARCHAR NOT NULL UNIQUE,
  ran_at TIMESTAMP DEFAULT NOW()
);
