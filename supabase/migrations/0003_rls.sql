-- Cloisonnement par utilisateur (FR-028, principe V): la règle est portée par la
-- base, pas par un filtre applicatif qu'on pourrait oublier.

alter table public.profiles  enable row level security;
alter table public.results   enable row level security;

-- Tables de référence: lecture publique, écriture réservée au seed (service role).
alter table public.nutrients        enable row level security;
alter table public.reference_intakes enable row level security;
alter table public.foods            enable row level security;
alter table public.seasonality      enable row level security;

drop policy if exists nutrients_read        on public.nutrients;
drop policy if exists reference_intakes_read on public.reference_intakes;
drop policy if exists foods_read            on public.foods;
drop policy if exists seasonality_read      on public.seasonality;

create policy nutrients_read         on public.nutrients         for select using (true);
create policy reference_intakes_read on public.reference_intakes for select using (true);
create policy foods_read             on public.foods             for select using (true);
create policy seasonality_read       on public.seasonality       for select using (true);

-- profiles: l'utilisateur est seul maître de son profil.
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

create policy profiles_select on public.profiles for select using (user_id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update using (user_id = auth.uid())
                                                  with check (user_id = auth.uid());
create policy profiles_delete on public.profiles for delete using (user_id = auth.uid());

-- results: select, insert et delete uniquement. L'absence volontaire de policy
-- update est ce qui rend l'historique immuable (FR-027).
drop policy if exists results_select on public.results;
drop policy if exists results_insert on public.results;
drop policy if exists results_delete on public.results;

create policy results_select on public.results for select using (user_id = auth.uid());
create policy results_insert on public.results for insert with check (user_id = auth.uid());
create policy results_delete on public.results for delete using (user_id = auth.uid());
