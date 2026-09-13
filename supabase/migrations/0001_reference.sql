-- Tables de référence: lecture seule pour l'application, chargées par seed.
-- Chaque table porte source, version et date de récupération (principe II de la constitution).

create extension if not exists btree_gist;

create table if not exists public.nutrients (
  code          text primary key,
  label         text not null,
  unit          text not null check (unit in ('kcal', 'g', 'mg', 'µg')),
  category      text not null check (category in ('energy', 'macro', 'vitamin', 'mineral')),
  is_priority   boolean not null default false,
  display_order integer not null
);

comment on column public.nutrients.is_priority is
  'Seuil de couverture de 100 % (FR-016): fer, calcium, magnésium, vitamine B12, vitamine D, vitamine C. 80 % sinon.';

create table if not exists public.reference_intakes (
  id            uuid primary key default gen_random_uuid(),
  nutrient_code text not null references public.nutrients (code) on delete restrict,
  reference_sex text not null check (reference_sex in ('female', 'male')),
  age_min       integer not null check (age_min >= 0),
  age_max       integer not null,
  kind          text not null check (kind in ('RNP', 'AS', 'BEM')),
  value         numeric not null check (value >= 0),
  source        text not null,
  version       text not null,
  retrieved_at  date not null,
  constraint reference_intakes_age_range check (age_max >= age_min)
);

-- Aucune tranche d'âge ne peut en chevaucher une autre pour un même
-- (nutrient_code, reference_sex, kind): un profil hors tranche est un refus
-- explicite, jamais une extrapolation (data-model.md).
alter table public.reference_intakes
  drop constraint if exists reference_intakes_no_age_overlap;
alter table public.reference_intakes
  add constraint reference_intakes_no_age_overlap
  exclude using gist (
    nutrient_code with =,
    reference_sex with =,
    kind with =,
    int4range(age_min, age_max, '[]') with &&
  );

create table if not exists public.foods (
  code               text primary key,
  label              text not null,
  category           text not null check (category in (
                       'legume', 'fruit', 'cereale', 'legumineuse', 'viande', 'poisson',
                       'oeuf', 'produit_laitier', 'matiere_grasse', 'fruit_a_coque', 'autre')),
  is_fruit_vegetable boolean not null default false,
  is_fortified       boolean not null default false,
  diet_tags          text[] not null default '{}',
  excluded_by        text[] not null default '{}',
  composition        jsonb not null,
  min_qty_g          numeric not null default 0 check (min_qty_g >= 0),
  max_qty_g          numeric not null check (max_qty_g > 0),
  unit_label         text not null,
  unit_grams         numeric not null check (unit_grams > 0),
  source             text not null,
  version            text not null,
  retrieved_at       date not null,
  constraint foods_qty_range check (max_qty_g >= min_qty_g)
);

comment on column public.foods.composition is
  'Apports pour 100 g, indexés par code nutriment.';
comment on column public.foods.diet_tags is
  'Régimes de base compatibles: omnivore, pescetarian, vegetarian, vegan (FR-013).';
comment on column public.foods.excluded_by is
  'Exclusions déclenchées: gluten, lactose, nuts (FR-013).';

create table if not exists public.seasonality (
  food_code text not null references public.foods (code) on delete cascade,
  month     integer not null check (month between 1 and 12),
  source    text not null,
  version   text not null,
  primary key (food_code, month)
);

comment on table public.seasonality is
  'Absence de ligne = hors saison ce mois-là (FR-014). France métropolitaine.';

create index if not exists foods_category_idx on public.foods (category);
create index if not exists foods_fruit_vegetable_idx on public.foods (is_fruit_vegetable);
create index if not exists reference_intakes_lookup_idx
  on public.reference_intakes (nutrient_code, reference_sex, kind);
