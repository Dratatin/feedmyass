-- Traçabilité de la sélection: pourquoi cet aliment est-il au catalogue ?
--
-- La feature 003 remplace dix-huit plafonds numériques écrits à la main par une
-- sélection fondée sur la classification de l'ANSES. Chaque aliment porte
-- désormais la classe qui justifie sa présence, et le niveau de classification
-- employé — le quatrième, ou le troisième en repli quand l'ANSES n'a pas
-- subdivisé le sous-groupe.
--
-- Sans cette colonne, la justification n'existerait que dans le fichier de
-- référence et se perdrait au chargement en base. FR-205 exige qu'elle survive:
-- c'est ce qui permet de répondre « d'où vient cet aliment » autrement qu'en
-- relisant le script de construction.
--
-- Forme: {"classe": "040201", "niveau": 4} — le code de classe, jamais son
-- libellé. Neuf libellés ont changé entre les millésimes 2020 et 2025 sans
-- qu'aucun code ne bouge.
--
-- La colonne est nullable: les aliments chargés avant cette feature n'ont pas de
-- classe d'origine, et inventer une valeur pour eux serait pire que l'absence.

alter table public.foods
  add column if not exists selected_by jsonb;

comment on column public.foods.selected_by is
  'Règle de sélection qui justifie la présence de l''aliment: {"classe": <code CIQUAL>, "niveau": 3 ou 4}. Le niveau 3 signale un repli, l''ANSES n''ayant pas subdivisé le sous-groupe. Nul pour les aliments chargés avant la feature 003.';
