-- Modèle de consommation de l'ANSES et limites de sécurité (feature 004).
--
-- La liste d'ingrédients cesse de minimiser sa masse totale: elle reprend le
-- modèle d'optimisation de l'avis Anses 2012-SA-0103 (décembre 2016), qui reste
-- au plus près de la consommation moyenne française, par sous-groupe d'aliments
-- et par sexe. Deux tables de référence nouvelles portent ses paramètres et les
-- limites supérieures de sécurité, et chaque aliment dit à quel sous-groupe et à
-- quelle famille il appartient.
--
-- Mêmes règles que les autres tables de référence: lecture publique, écriture par
-- le seed seul, source, version et date de récupération sur chaque ligne
-- (principe II).

create table if not exists public.consumption_subgroups (
  code            text primary key check (code ~ '^[a-z_]+$'),
  label           text not null,
  direction       text not null check (direction in ('mean', 'maximize', 'minimize')),
  by_sex          jsonb not null,
  coupled_with    text null,
  coupled_upper   jsonb null,
  substitutes_for text[] not null default '{}',
  reference_energy_kcal jsonb not null,
  source          text not null,
  version         text not null,
  retrieved_at    date not null
);

comment on table public.consumption_subgroups is
  'Sous-groupes d''aliments du modèle de consommation de l''ANSES (avis 2012-SA-0103, tableau 9 et annexe 6).';
comment on column public.consumption_subgroups.by_sex is
  'Par sexe ("male", "female"): {lower, mean, sd, upper, provenance} en g/j. upper nul = pas de limite supérieure. provenance = {table, page} pour chaque valeur.';
comment on column public.consumption_subgroups.direction is
  'mean: rapprocher de la moyenne; maximize: favoriser (fruits frais, légumes, féculents complets); minimize: défavoriser (viande hors volaille, charcuterie, boissons sucrées). Tableau 5 de l''avis.';
comment on column public.consumption_subgroups.coupled_upper is
  'Limite couplante {male, female, provenance}: borne la SOMME de ce sous-groupe et de coupled_with.';
comment on column public.consumption_subgroups.reference_energy_kcal is
  'Besoin énergétique sur lequel l''ANSES a calibré son modèle: {male: 2600, female: 2100, provenance} (avis, page 13). Les bornes sont proportionnées au besoin du profil, sauf les plafonds épidémiologiques.';
comment on column public.consumption_subgroups.substitutes_for is
  'Décision du projet, pas de l''ANSES (FR-310a): sous-groupes dont l''exclusion par le régime lève la borne haute de celui-ci.';

create table if not exists public.upper_limits (
  nutrient_code text primary key,
  value         numeric not null check (value > 0),
  unit          text not null check (unit in ('mg', 'µg')),
  scope_note    text not null,
  source        text not null,
  version       text not null,
  retrieved_at  date not null
);

comment on table public.upper_limits is
  'Limites supérieures de sécurité de l''adulte, applicables à l''ensemble des apports alimentaires (EFSA). Elles bornent la liste; ce ne sont pas des besoins (principe III).';
comment on column public.upper_limits.source is
  'Avis primaire dont la valeur est issue (SCF ou EFSA, année, référence).';

alter table public.foods add column if not exists anses_subgroup text null;
alter table public.foods add column if not exists family text not null default '';
alter table public.foods add column if not exists attached_by jsonb null;

comment on column public.foods.anses_subgroup is
  'Sous-groupe du modèle de consommation de l''ANSES (consumption_subgroups.code). Nul = aliment non proposable, rattaché à aucun sous-groupe consommé en France (algues, eau de coco).';
comment on column public.foods.family is
  'Famille d''aliments interchangeables à l''achat (FR-321): une liste n''en retient qu''une variante. Vide pour les aliments chargés avant la feature 004.';
comment on column public.foods.attached_by is
  'Règle de rattachement: {"classe": <code CIQUAL>, "regle": <identifiant>, "substitut": <booléen>}. La table des règles est dans _meta.rattachement de foods.json. Nul pour les aliments chargés avant la feature 004.';

alter table public.consumption_subgroups enable row level security;
alter table public.upper_limits enable row level security;

drop policy if exists consumption_subgroups_read on public.consumption_subgroups;
drop policy if exists upper_limits_read on public.upper_limits;

create policy consumption_subgroups_read on public.consumption_subgroups for select using (true);
create policy upper_limits_read on public.upper_limits for select using (true);
