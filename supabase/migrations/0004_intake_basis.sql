-- Les références ANSES ne sont pas toutes des valeurs absolues par jour:
--   - protéines        : 0,83 g par kg de poids corporel
--   - vitamines B1 et B3 : exprimées par MJ d'apport énergétique
--   - lipides, glucides : intervalle de pourcentage de l'apport énergétique
-- Le modèle d'origine ne savait porter qu'une valeur absolue. Plutôt que de
-- convertir ces références en nombres figés (ce qui reviendrait à inventer une
-- valeur non traçable), on décrit leur nature.

alter table public.reference_intakes
  add column if not exists basis text not null default 'absolute',
  add column if not exists value_max numeric;

alter table public.reference_intakes
  drop constraint if exists reference_intakes_basis_check;
alter table public.reference_intakes
  add constraint reference_intakes_basis_check
  check (basis in ('absolute', 'per_kg', 'per_mj', 'percent_energy'));

-- Seules les références en pourcentage de l'apport énergétique portent une
-- borne haute, et elle doit être supérieure à la borne basse.
alter table public.reference_intakes
  drop constraint if exists reference_intakes_value_max_check;
alter table public.reference_intakes
  add constraint reference_intakes_value_max_check
  check (
    (basis = 'percent_energy' and value_max is not null and value_max >= value)
    or (basis <> 'percent_energy' and value_max is null)
  );

comment on column public.reference_intakes.basis is
  'absolute: valeur par jour. per_kg: par kg de poids corporel. per_mj: par MJ d''apport énergétique. percent_energy: intervalle en % de l''apport énergétique, borne basse dans value et borne haute dans value_max.';
