# Tasks: Refonte visuelle « Encre & Saison »

**Branch**: `002-refonte-visuelle` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Règle d'or de cette feature: **aucune assertion fonctionnelle des tests existants ne doit être
modifiée**. Libellés de champs, titres, textes de boutons et chaînes vérifiées par les tests de bout en
bout sont conservés à l'identique.

## Phase 0 — Direction et gouvernance

- [X] T001 Produire la maquette de référence et la faire valider (6 écrans, palette, typographie)
- [X] T002 Rédiger `docs/design-system.md`: palette avec ratios mesurés, typographie, géométrie, inventaire des composants, règles de composition
- [X] T003 Amender la constitution: principe VI « Direction visuelle maison d'abord », version 2.0.0, Sync Impact Report
- [X] T004 Rédiger `specs/002-refonte-visuelle/{spec,plan,tasks}.md`

## Phase 1 — Fondations

- [X] T005 Réécrire `src/styles/tokens.css`: encre, papier, filets, couleurs de sens, quatre saisons, sept familles, échelle typographique, géométrie. Ratio de contraste consigné pour chaque couleur portant du texte (FR-101, FR-103)
- [X] T006 Réécrire `src/app/globals.css`: fond, couleur de texte, famille par défaut, titres en display, anneau de focus
- [X] T007 Charger Fraunces, Recursive et Caveat par `next/font` dans `src/app/layout.tsx`, avec leurs axes variables (FR-105)
- [X] T008 Créer `src/lib/months.ts`: initiales, noms, saison de chaque mois, libellés de famille d'aliment

## Phase 2 — Composants de la direction

- [X] T009 [P] `ds/Button.tsx` — hiérarchies primary, secondary, danger; gélule
- [X] T010 [P] `ds/InputField.tsx` et `ds/SelectField.tsx` — bordure `line-strong`, état de refus framboise
- [X] T011 [P] `ds/CheckboxField.tsx` — case à cocher avec libellé associé (exclusions de régime)
- [X] T012 [P] `ds/Panel.tsx` — bloc encadré, réservé aux formulaires et blocs d'action
- [X] T013 [P] `ds/Notice.tsx` — message encadré: information, précaution, saison
- [X] T014 [P] `ds/Pill.tsx` — étiquette d'état
- [X] T015 `ds/Register.tsx` — tableau sans cartouche, conteneur défilant focusable, ligne mise en avant
- [X] T016 `ds/MonthRibbon.tsx` — ruban des douze mois teinté par saison, exposé comme image porteuse de sens (FR-106, FR-107)
- [X] T017 `ds/CoverageMeter.tsx` — jauge avec seuil matérialisé à sa position réelle (FR-110)
- [X] T018 [P] `ds/KeyFigures.tsx` — chiffres clés (FR-108)
- [X] T019 [P] `ds/Vignette.tsx` — huit dessins SVG de produits de saison
- [X] T020 [P] `ds/FamilyDot.tsx` — pastille de famille, toujours suivie du nom (FR-111, FR-104)
- [X] T021 `ds/PageShell.tsx` — rail + colonne principale, bascule en une colonne sous 760 px
- [X] T022 `features/StepRail.tsx` — parcours en trois étapes (FR-109)
- [X] T023 Supprimer `ds/Card.tsx`, `ds/Badge.tsx`, `ds/Banner.tsx`, `ds/DataTable.tsx`

## Phase 3 — Extension du contrat (FR-112)

- [X] T024 Ajouter `seasonMonths` à `IngredientPlanItem` dans `src/domain/types.ts`
- [X] T025 Lire les mois par aliment: `fetchSeasonalMonthsByFood` dans `src/data/repositories/reference.ts`
- [X] T026 Renseigner `seasonMonths` à la construction du plan dans `src/domain/plan/`
- [X] T027 Passer le schéma à 1.1.0 et documenter le champ dans `specs/001-nutrition-ingredient-planner/contracts/api.md`
- [X] T028 Étendre les tests de contrat du plan: présence des mois pour un fruit ou légume, absence pour un aliment non saisonnier

## Phase 4 — Écrans

- [X] T029 `features/SiteHeader.tsx` — barre d'encre, marque avec vignette, état de connexion
- [X] T030 [P] `features/DisclaimerBanner.tsx`, `DietChangeNotice.tsx`, `DataFreshness.tsx` — portés sur `Notice` et les nouveaux tokens
- [X] T031 `(public)/page.tsx` — accueil: héros, ardoise du marché, étal de saison
- [X] T032 `(public)/profil/page.tsx` — rail de parcours, formulaire, coefficient NAP affiché
- [X] T033 `(public)/besoins/page.tsx` — chiffres clés, registre, bascule jour/semaine (FR-108)
- [X] T034 `(public)/liste/page.tsx` — commandes de régime dans le rail, rubans par ligne, pastilles de familles (FR-107, FR-111)
- [X] T035 `features/CoveragePanel.tsx` — jauges à seuil et écarts nommés (FR-110)
- [X] T036 [P] `features/SignInForm.tsx`, `SignOutButton.tsx`, `SaveResultButton.tsx`
- [X] T037 `(account)/layout.tsx` + `mon-profil`, `historique`, `donnees` — rail de compte, historique coloré par mois de calcul

## Phase 5 — Vérification

- [X] T038 `npm run typecheck` et `npm run lint` au vert
- [X] T039 `npm run test:unit` et `npm run test:contract` au vert, assertions fonctionnelles inchangées (SC-103)
- [X] T040 `npm run build` au vert, polices comprises
- [X] T041 Tests de bout en bout: accessibilité, responsive, performance, parcours US1 à US4 (SC-101, SC-102, SC-105)
- [X] T042 Vérifier l'absence de valeur visuelle hors tokens dans `src/components` et `src/app` (SC-104)

## Phase 6 — Traçabilité documentaire

- [X] T043 `specs/001-.../spec.md`: réécrire FR-032, marquer l'Annexe A comme abandonnée, noter la refonte en tête de document (FR-113, FR-114)
- [X] T044 `specs/001-.../plan.md`: porte VI et mentions Figma renvoyées vers la direction maison
- [X] T045 `specs/001-.../tasks.md`: section « Dépendance Figma » marquée caduque, T022 et T023 annotés
- [X] T046 `specs/001-.../checklists/constitution.md`: aligner les points relatifs au principe VI

## Dépendances

- T005 à T008 conditionnent toute la phase 2.
- T016 et T017 conditionnent T034 et T035.
- T024 à T026 conditionnent T034 (ruban par ligne).
- T023 ne peut être fait qu'après T029 à T037, dernier consommateur des anciens composants.
- La phase 5 clôt les phases 1 à 4; la phase 6 est indépendante et peut être menée en parallèle.
