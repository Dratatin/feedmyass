-- Le catalogue ne savait pas nommer les alternatives végétales.
--
-- Tofu, seitan et protéine de soja texturée tombaient dans « autre », aux côtés
-- des algues, des sons et des levures — une catégorie dont le plafond de 150 g
-- et le libellé « Autre » conviennent à un condiment, pas à une source de
-- protéines. Les boissons végétales, les yaourts au soja, les spécialités type
-- fromage et les saucisses végétales étaient, eux, absents du catalogue: leurs
-- classes CIQUAL vivent dans des sous-groupes que la sélection ne balayait pas,
-- et qu'on ne pouvait pas ouvrir sans prendre aussi toute la charcuterie et
-- tous les sodas.
--
-- Trois catégories les accueillent. Elles reprennent les bornes de l'aliment
-- d'origine: une protéine végétale se borne comme une viande (200 g), une
-- spécialité comme un produit laitier (400 g), une boisson se compte en verres.
--
-- Ces aliments ne portent PAS l'exclusion « lactose » et conviennent aux quatre
-- régimes, ce que la règle de sous-groupe ne permettait pas d'exprimer: un
-- yaourt au soja classé sous les produits laitiers frais héritait sinon des
-- régimes et des exclusions des laitages.

alter table public.foods
  drop constraint if exists foods_category_check;
alter table public.foods
  add constraint foods_category_check
  check (category in (
    'legume', 'fruit', 'cereale', 'legumineuse', 'viande', 'poisson',
    'oeuf', 'produit_laitier', 'matiere_grasse', 'fruit_a_coque',
    'proteine_vegetale', 'boisson_vegetale', 'specialite_vegetale', 'autre'));

comment on column public.foods.category is
  'Catégorie d''achat. proteine_vegetale (tofu, tempeh, seitan, saucisses végétales), boisson_vegetale (soja, avoine, amande, riz, coco) et specialite_vegetale (yaourts et fromages végétaux) sont les alternatives végétales: elles ne déclenchent jamais l''exclusion lactose et conviennent aux quatre régimes.';
