-- Private server-owned store. Never expose this schema through the Supabase Data API.
CREATE SCHEMA IF NOT EXISTS nep_store;
REVOKE ALL ON SCHEMA nep_store FROM PUBLIC;
CREATE TABLE IF NOT EXISTS nep_store.records (
  kind text NOT NULL,
  id text NOT NULL,
  owner text NOT NULL DEFAULT '',
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data ? 'id' AND jsonb_typeof(data->'id') = 'string' AND data->>'id' = id),
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS records_owner ON nep_store.records(kind, owner, sequence);
CREATE TABLE IF NOT EXISTS nep_store.identities (
  email text PRIMARY KEY CHECK (email = lower(email)),
  user_id text UNIQUE NOT NULL,
  user_kind text NOT NULL DEFAULT 'user' CHECK (user_kind = 'user'),
  FOREIGN KEY (user_kind, user_id) REFERENCES nep_store.records(kind, id)
);
CREATE TABLE IF NOT EXISTS nep_store.idempotency (
  owner text NOT NULL,
  key text NOT NULL,
  fingerprint text NOT NULL,
  order_id text NOT NULL,
  order_kind text NOT NULL DEFAULT 'order' CHECK (order_kind = 'order'),
  PRIMARY KEY (owner, key),
  FOREIGN KEY (order_kind, order_id) REFERENCES nep_store.records(kind, id)
);
-- Coarse write lock preserves the existing single-shop atomic stock/state contract.
CREATE TABLE IF NOT EXISTS nep_store.write_lock (id integer PRIMARY KEY CHECK (id = 1));
INSERT INTO nep_store.write_lock VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS nep_store.migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO nep_store.migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
REVOKE ALL ON ALL TABLES IN SCHEMA nep_store FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA nep_store FROM PUBLIC;
-- No anon/authenticated grants, public views or SECURITY DEFINER functions.
