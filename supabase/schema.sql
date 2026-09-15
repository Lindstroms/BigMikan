-- Kør dette i Supabase → SQL Editor på dit projekt (én gang).
-- Se README.md for hele opsætningen.

create extension if not exists "pgcrypto";

create table if not exists crew_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  season int not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists signups (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid not null references crew_members(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  status text not null default 'mangler_svar'
    check (status in ('mangler_svar', 'tilmeldt', 'maaske', 'bekraeftet', 'frameldt')),
  note text,
  updated_at timestamptz not null default now(),
  unique (crew_member_id, activity_id)
);

-- Hold "updated_at" opdateret automatisk ved ændringer.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists signups_set_updated_at on signups;
create trigger signups_set_updated_at
  before update on signups
  for each row execute function set_updated_at();

-- Row Level Security:
-- Appen er en simpel, lukket besætningsapp uden rigtigt login - alle med
-- linket bruger samme offentlige "anon"-nøgle. Politikkerne herunder
-- tillader derfor fuld læs/skriv for alle. Det er en bevidst afvejning for
-- et lille, tillidsbaseret hold (se README "Sikkerhedsmodel") - brug IKKE
-- denne opsætning til følsomme data.
alter table crew_members enable row level security;
alter table activities enable row level security;
alter table signups enable row level security;

drop policy if exists "public read/write crew_members" on crew_members;
create policy "public read/write crew_members" on crew_members
  for all using (true) with check (true);

drop policy if exists "public read/write activities" on activities;
create policy "public read/write activities" on activities
  for all using (true) with check (true);

drop policy if exists "public read/write signups" on signups;
create policy "public read/write signups" on signups
  for all using (true) with check (true);
