-- ============================================================
--  Symptom Log : database schema
--  Run this once in the Supabase SQL editor.
--  Safe to re-run (everything is IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ---------- helper: updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- ============================================================
--  med_courses : one row per drug you are on, with dates
-- ============================================================
create table if not exists public.med_courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  drug        text not null,                -- anastrozole | letrozole | exemestane | tamoxifen | other
  brand       text,
  dose_mg     numeric,
  schedule    text default 'daily',
  is_endocrine boolean not null default true,   -- true = the AI/SERM itself, false = adjunct (Lupron, Zometa, vit D)
  started_on  date not null,
  ended_on    date,                          -- null = still on it
  stop_reason text,
  note        text,
  slot        smallint not null default 1,   -- 1..3, drives the chart band colour
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint med_dates_ok check (ended_on is null or ended_on >= started_on)
);

create index if not exists med_courses_user_start_idx
  on public.med_courses (user_id, started_on desc);


-- ============================================================
--  symptoms : the catalog of things you track
--  Seeded per-user by the app on first sign-in, then editable.
-- ============================================================
create table if not exists public.symptoms (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  key             text not null,
  label           text not null,
  category        text not null,             -- musculoskeletal|vasomotor|genitourinary|neuro|systemic|emotional
  scale           text not null default 'sev', -- sev (0-10) | count | mins | bool
  higher_is_worse boolean not null default true,
  tracks_location boolean not null default false,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists symptoms_user_active_idx
  on public.symptoms (user_id, is_active, sort_order);


-- ============================================================
--  daily_logs : one row per day
-- ============================================================
create table if not exists public.daily_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  log_date      date not null,
  took_med      text,                        -- yes | no | na
  med_time      time,
  sleep_hours   numeric,
  sleep_quality smallint,                    -- 0 rough .. 10 great
  energy        smallint,                    -- 0 none  .. 10 full
  mood          smallint,                    -- 0 worst .. 10 best
  self_energy   smallint,                    -- IFS: 0 fully blended .. 10 lots of Self
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, log_date),
  constraint took_med_ok check (took_med is null or took_med in ('yes','no','na'))
);

create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, log_date desc);

drop trigger if exists daily_logs_touch on public.daily_logs;
create trigger daily_logs_touch before update on public.daily_logs
  for each row execute function public.touch_updated_at();


-- ============================================================
--  symptom_entries : one row per symptom per day
-- ============================================================
create table if not exists public.symptom_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null,
  symptom_id uuid not null references public.symptoms(id) on delete cascade,
  value      numeric not null,
  locations  text[],
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date, symptom_id)
);

create index if not exists symptom_entries_user_date_idx
  on public.symptom_entries (user_id, log_date desc);
create index if not exists symptom_entries_symptom_idx
  on public.symptom_entries (user_id, symptom_id, log_date);


-- ============================================================
--  parts : the IFS layer
-- ============================================================
create table if not exists public.parts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  role       text,                           -- manager | firefighter | exile | unsure
  note       text,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.part_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null,
  part_id    uuid not null references public.parts(id) on delete cascade,
  intensity  smallint not null default 5,    -- how loud it was, 0..10
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date, part_id)
);

create index if not exists part_entries_user_date_idx
  on public.part_entries (user_id, log_date desc);


-- ============================================================
--  events : things to annotate the timeline with
-- ============================================================
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  kind        text not null default 'other', -- appointment|scan|infusion|dose_change|surgery|life|other
  title       text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists events_user_date_idx
  on public.events (user_id, occurred_on desc);


-- ============================================================
--  Row level security : you can only ever see your own rows
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'med_courses','symptoms','daily_logs','symptom_entries',
    'parts','part_entries','events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t);
  end loop;
end $$;
