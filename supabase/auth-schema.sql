-- ============================================================================
-- TESTÀRE CRM — schema AUTENTICAZIONE (Supabase / Postgres)
-- Esegui questo file UNA VOLTA: Supabase Dashboard → SQL Editor → incolla → Run.
-- Crea la tabella `profiles` che lega ogni utente auth a un RUOLO e a un TENANT.
-- ============================================================================

-- Un profilo per ogni utente registrato (auth.users). Cancellando l'utente si
-- cancella il profilo (on delete cascade).
--  role       : 'superadmin' (staff TESTÀRE, vede tutto) | 'staff' (una società) | 'athlete'
--  client_id  : slug società (es. 'torino'); NULL per il superadmin
--  athlete_id : id atleta; valorizzato solo per role='athlete'
create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  role       text        not null check (role in ('superadmin', 'staff', 'athlete')),
  client_id  text,
  athlete_id text,
  full_name  text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_client_idx on public.profiles (client_id);

-- Row Level Security: ogni utente può leggere SOLO il proprio profilo.
-- (La creazione/gestione dei profili avviene lato server con la service_role key,
--  che bypassa la RLS, dentro il pannello admin protetto da controllo ruolo.)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);
