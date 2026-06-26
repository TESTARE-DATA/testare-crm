-- ============================================================================
-- TESTÀRE CRM — schema iniziale (Supabase / Postgres)
-- Esegui questo file UNA VOLTA: Supabase Dashboard → SQL Editor → incolla → Run.
-- ============================================================================

-- Tabella generica per TUTTE le collezioni dell'app (rispecchia localStorage).
-- coll       = chiave collezione, es. "medical:torino", "events:empoli", "reports"
-- client_id  = società di appartenenza (per il multi-tenant / RLS futura), può essere NULL (globale)
-- id         = id dell'entità
-- data       = l'entità completa in JSON (stessa forma dei tipi in lib/types.ts)
create table if not exists public.collections (
  coll       text        not null,
  client_id  text,
  id         text        not null,
  data       jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);

create index if not exists collections_coll_idx   on public.collections (coll);
create index if not exists collections_client_idx on public.collections (client_id);

-- Row Level Security ABILITATA ma senza policy: la tabella NON è leggibile/scrivibile
-- con la publishable (anon) key. Per ora l'app accede solo lato server con la
-- service_role key, che bypassa RLS. Quando aggiungeremo il LOGIN, qui andranno le
-- policy tipo:  client_id = (select client_id from profiles where id = auth.uid())
-- e l'accesso passerà dal browser in sicurezza. Sicuro di default fin da subito.
alter table public.collections enable row level security;
