-- Données utilisateur. Bornes de validation reprises de data-model.md; la même
-- validation est appliquée côté application (src/lib/validation.ts) mais la base
-- reste la dernière barrière.

create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  weight_kg      numeric not null check (weight_kg between 30 and 250),
  height_cm      numeric not null check (height_cm between 120 and 230),
  age            integer not null check (age between 18 and 70),
  reference_sex  text    not null check (reference_sex in ('female', 'male')),
  activity_level text    not null check (activity_level in ('sedentary', 'low_active', 'active', 'very_active')),
  diet_base      text    not null check (diet_base in ('omnivore', 'pescetarian', 'vegetarian', 'vegan')),
  exclusions     text[]  not null default '{}'
                   check (exclusions <@ array['gluten', 'lactose', 'nuts']::text[]),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.profiles.reference_sex is
  'Choix de la table de référence officielle utilisée pour le calcul, sans prétention d''identité de genre.';

-- Entrée d'historique immuable (FR-027): aucune politique update n'est créée en
-- 0003_rls.sql, et un trigger refuse toute mise à jour même par un rôle privilégié.
create table if not exists public.results (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  period             text not null check (period in ('day', 'week')),
  generated_at       timestamptz not null default now(),
  profile_snapshot   jsonb not null,
  needs              jsonb not null,
  plan               jsonb not null,
  reference_versions jsonb not null,
  created_at         timestamptz not null default now()
);

create index if not exists results_user_recent_idx
  on public.results (user_id, generated_at desc);

create or replace function public.reject_result_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Les entrées d''historique sont immuables (FR-027)';
end;
$$;

drop trigger if exists results_no_update on public.results;
create trigger results_no_update
  before update on public.results
  for each row execute function public.reject_result_update();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
