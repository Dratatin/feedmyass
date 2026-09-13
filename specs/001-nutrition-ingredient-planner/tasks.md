---

description: "Task list for feature implementation"
---

# Tasks: Besoins nutritionnels personnalisés et liste d'ingrédients de saison

**Input**: Design documents from `/specs/001-nutrition-ingredient-planner/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: OUI, et ils ne sont pas optionnels ici. La constitution du projet impose quatre tests
sous la section "Workflow de développement et portes qualité" (invariant besoins/régime, conformité
aux sources officielles, compatibilité régime, saisonnalité sur douze mois) et les critères SC-002 à
SC-005 exigent une vérification automatisée. Ces tests sont écrits avant l'implémentation de leur
story.

**Organization**: tâches groupées par user story pour permettre une implémentation et une
validation indépendantes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, aucune dépendance non satisfaite)
- **[Story]**: user story de rattachement (US1 à US4)
- Chaque tâche porte son chemin de fichier exact

## Path Conventions

Application web mono-déployable (décision de structure de plan.md): `src/` et `tests/` à la racine
du dépôt, migrations et seed sous `supabase/`.

## Dépendance Figma — levée

Le serveur MCP Figma est disponible depuis le 2026-09-13. Les tokens sont extraits (T022) et
`Button.tsx` est dérivé du composant Buttons/Button. Il reste à relever dans Figma les autres
composants de base avant d'écrire les écrans (T032, T033, T047, T048, T060, T061, T062), qui
dépendent toujours de T023.


**Constat du 2026-09-13**: le design system ne contient ni sélecteur, ni carte, ni tableau, ni
bandeau, ni navigation. Ses pages sont Buttons, Inputs, Badges, Tooltips, Modals, Icons, Logos et
des assets décoratifs. Les quatre composants manquants sont donc composés à partir des tokens, avec
la justification écrite qu'exige le principe VI.

**Limite d'appels MCP Figma atteinte** sur le plan Starter du compte. Les relevés restants (couleur
Warning du badge, tailles sm et lg, autres hiérarchies de bouton) attendent la réinitialisation du
quota ou un plan supérieur. Sans effet sur les écrans prévus, qui n'utilisent que ce qui est relevé.
---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: initialisation du projet et de l'outillage

- [X] T001 Initialiser le projet Next.js (App Router) en TypeScript à la racine: `package.json`, `tsconfig.json`, `next.config.ts`
- [X] T002 [P] Configurer ESLint et Prettier et les scripts `lint` / `typecheck` dans `package.json` et `eslint.config.mjs`
- [X] T003 [P] Configurer Vitest pour `tests/unit` et `tests/contract` dans `vitest.config.ts`
- [X] T004 [P] Configurer Playwright avec deux projets de viewport, 320 px et 1920 px, dans `playwright.config.ts`
- [X] T005 [P] Créer l'arborescence `src/{app,components,domain,data,lib,styles}` et `tests/{unit,contract,e2e}` conformément à plan.md
- [X] T006 [P] Créer `.env.example` avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`
- [X] T007 Créer le projet Supabase et le lier au dépôt via la CLI dans `supabase/config.toml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: schéma, données de référence et socle de domaine dont dépendent toutes les stories

**⚠️ CRITICAL**: aucune user story ne démarre avant la fin de cette phase, à l'exception des
tâches d'interface qui attendent en plus T022 et T023

- [X] T008 Écrire la migration du schéma de référence dans `supabase/migrations/0001_reference.sql`: tables `nutrients`, `reference_intakes`, `foods`, `seasonality` avec les colonnes de data-model.md, clé primaire `(food_code, month)` sur `seasonality` et contrainte de non-chevauchement des tranches d'âge sur `(nutrient_code, reference_sex, kind)`
- [X] T009 Écrire la migration des tables utilisateur dans `supabase/migrations/0002_user_data.sql`: `profiles` (PK `user_id`, FK `auth.users` en `ON DELETE CASCADE`) et `results` (`period` dans `day|week`, colonnes jsonb `profile_snapshot`, `needs`, `plan`, `reference_versions`)
- [X] T010 Écrire les politiques RLS dans `supabase/migrations/0003_rls.sql`: `profiles` en select/insert/update/delete si `user_id = auth.uid()`; `results` en select/insert/delete uniquement, sans aucune policy `update` (FR-027)
- [X] T011 [P] Constituer le référentiel des nutriments dans `src/data/reference/nutrients.json`: énergie, protéines, lipides, glucides, fibres, vitamines A, B1, B2, B3, B5, B6, B9, B12, C, D, E, K et minéraux calcium, fer, magnésium, potassium, zinc, iode, sélénium, cuivre, phosphore, avec `unit`, `category`, `display_order` et `is_priority` à vrai pour fer, calcium, magnésium, vitamine B12, vitamine D et vitamine C
- [X] T012 [P] Constituer les apports de référence ANSES (RNP et AS par nutriment, sexe et tranche d'âge) dans `src/data/reference/reference-intakes.json` avec `kind`, `source`, `version` et `retrieved_at` (R3). **24 nutriments sur 25 couverts**: le zinc reste à saisir à la main depuis le rapport ANSES (PDF image, valeurs par palier de phytates non extractibles)
- [X] T013 [P] Constituer les coefficients de Henry 2005 par sexe et tranche d'âge et les valeurs de NAP dans `src/data/reference/energy-equations.json` avec source et version (R3)
- [X] T014 [P] Extraire environ 250 aliments courants de la table CIQUAL dans `src/data/reference/foods.json`: composition pour 100 g indexée par code nutriment, `category`, `is_fruit_vegetable`, `is_fortified`, `diet_tags`, `excluded_by`, `min_qty_g`, `max_qty_g`, `unit_label`, `unit_grams`, source, version et licence (R4)
- [X] T015 [P] Constituer le calendrier de saisonnalité mensuel France métropolitaine dans `src/data/reference/seasonality.json` pour tous les aliments `is_fruit_vegetable`, avec sources datées (R5)
- [X] T016 Écrire le script de seed idempotent dans `scripts/seed-reference.ts`: refuse tout fichier de référence dépourvu de `source`, `version` ou `retrieved_at` (principe II) et charge les quatre tables. **Écrit et vérifié sur son chemin de refus; jamais exécuté contre une base** (dépend de T012 à T015 et du projet Supabase)
- [X] T017 [P] Définir les types du domaine dans `src/domain/types.ts`: `Profile` sans aucun champ de régime, `Diet`, `NutrientCode`, `Needs`, `IngredientPlan` aligné sur `contracts/ingredient-plan.schema.json`
- [X] T018 [P] Écrire les schémas de validation Zod dans `src/lib/validation.ts` avec les bornes exactes de data-model.md: `weight_kg` 30 à 250, `height_cm` 120 à 230, `age` 18 à 70, `reference_sex` dans `female|male`, `activity_level` dans `sedentary|low_active|active|very_active`, `diet_base` dans `omnivore|pescetarian|vegetarian|vegan`, `exclusions` sous-ensemble de `gluten|lactose|nuts`
- [X] T019 [P] Implémenter les clients Supabase navigateur et serveur dans `src/lib/supabase.ts` avec `@supabase/ssr`
- [X] T020 Implémenter le format d'erreur commun et les codes `validation_error` 400, `profile_out_of_scope` 422, `unauthorized` 401, `not_found` 404 et `reference_data_unavailable` 503 dans `src/lib/errors.ts` conformément à contracts/api.md
- [X] T021 [P] Implémenter les accès en lecture aux données de référence dans `src/data/repositories/reference.ts`, en exposant les versions utilisées pour alimenter `reference_versions` (FR-038)
- [X] T022 Extraire les tokens du design system Figma (33 noeuds de l'Annexe A) vers `src/styles/tokens.css` et la configuration Tailwind (R7) — tokens extraits des noeuds de fondations 1525:271581 et 1023:36826
- [X] T023 Générer les composants de base du design system dans `src/components/ds/` à partir des noeuds Figma. **Relevés dans Figma**: `Button.tsx` (1038:34411), `InputField.tsx` (1090:57817, avec son état destructif), `Badge.tsx` (1046:3819, couleurs Success et Error). **Composés à partir des tokens faute d'équivalent dans le design system, justification écrite dans chaque fichier (principe VI)**: `SelectField.tsx`, `Card.tsx`, `Banner.tsx`, `DataTable.tsx`. La navigation est laissée de côté: l'application n'a pas encore de parcours à naviguer.

**Checkpoint**: socle prêt; les stories peuvent démarrer, les écrans après T023

---

## Phase 3: User Story 1 - Connaître ses besoins nutritionnels (Priority: P1) 🎯 MVP

**Goal**: à partir d'un profil saisi sans compte, afficher les besoins journaliers et hebdomadaires
de tous les nutriments du référentiel, avec valeur, unité, nature et source de la référence.

**Independent Test**: scénario V1 de quickstart.md — saisir un profil complet sans créer de compte
et vérifier l'affichage complet, la relation hebdomadaire égale à sept fois le journalier, et le
refus motivé d'un profil hors bornes.

### Tests for User Story 1

> Écrire ces tests AVANT l'implémentation et vérifier qu'ils échouent

- [X] T024 [P] [US1] Test d'invariant besoins/régime dans `tests/unit/needs-diet-invariant.test.ts`: `computeNeeds` n'expose aucun paramètre de régime et deux profils identiques produisent des besoins strictement identiques (SC-004, principe III)
- [X] T025 [P] [US1] Tests de conformité sur au moins dix profils de contrôle documentés dans `tests/unit/needs-reference.test.ts`, écart inférieur à 5 % par rapport aux valeurs officielles (SC-005)
- [ ] T026 [P] [US1] Test de contrat de `POST /api/needs` dans `tests/contract/needs.test.ts`: rejet de toute entrée contenant un champ de régime, réponse portant `daily`, `weekly`, `reference_versions` et `disclaimer`
- [X] T027 [P] [US1] Test des bornes de validation du profil dans `tests/unit/profile-validation.test.ts`: hors bornes renvoie 400 avec le champ fautif, âge hors 18-70 renvoie `profile_out_of_scope`

### Implementation for User Story 1

- [X] T028 [US1] Implémenter le métabolisme de base par les équations de Henry et la dépense énergétique par NAP dans `src/domain/needs/energy.ts`
- [X] T029 [US1] Implémenter la résolution des apports de référence par nutriment, sexe et tranche d'âge dans `src/domain/needs/reference-intakes.ts`, avec refus explicite si le profil ne tombe dans aucune tranche
- [X] T030 [US1] Implémenter `computeNeeds(profile, period)` dans `src/domain/needs/index.ts`: signature sans régime (principe III), `weekly` égal à sept fois `daily` (FR-006), versions de référence remontées (dépend de T028, T029)
- [ ] T031 [US1] Implémenter le route handler `POST /api/needs` dans `src/app/api/needs/route.ts` conformément à contracts/api.md, avec production d'un `needs_token` côté serveur
- [ ] T032 [P] [US1] Écran de saisie du profil dans `src/app/(public)/profil/page.tsx`, composé uniquement de composants de `src/components/ds/` (dépend de T023)
- [ ] T033 [P] [US1] Écran des besoins dans `src/app/(public)/besoins/page.tsx`: valeur, unité, `kind` et source par nutriment, bascule jour/semaine (FR-009, dépend de T023)
- [ ] T034 [US1] Bandeau d'information non médicale et mention des profils non couverts dans `src/components/features/DisclaimerBanner.tsx`, affiché sur tout écran de résultat (FR-010, FR-011)
- [ ] T035 [US1] Test e2e du parcours V1 dans `tests/e2e/us1-besoins.spec.ts`

**Checkpoint**: US1 fonctionne seule — calculateur de besoins personnalisé et sourcé, utilisable sans compte

---

## Phase 4: User Story 2 - Liste d'ingrédients de saison (Priority: P2)

**Goal**: transformer les besoins en liste d'ingrédients et de quantités compatible avec le régime,
limitée aux fruits et légumes de saison, avec taux de couverture et écarts signalés.

**Independent Test**: scénarios V3 et V4 de quickstart.md — générer la liste pour un profil végane
sans gluten et vérifier l'absence d'ingrédient exclu, l'absence de produit hors saison, les seuils
de couverture et le signalement des écarts.

### Tests for User Story 2

- [ ] T036 [P] [US2] Test de compatibilité régime dans `tests/unit/diet-compatibility.test.ts`: pour chaque régime de base et chaque exclusion, aucun aliment exclu ne peut être candidat (SC-002)
- [ ] T037 [P] [US2] Test de saisonnalité sur les douze mois dans `tests/unit/seasonality.test.ts`: aucun fruit ni légume hors saison proposé, quel que soit le mois (SC-003)
- [ ] T038 [P] [US2] Tests du solveur dans `tests/unit/plan-solver.test.ts`: seuils de 100 % et 80 % respectés, bornes `min_qty_g` et `max_qty_g` respectées, cas infaisable produisant des `gaps` avec leur `reason`
- [ ] T039 [P] [US2] Test de contrat de `POST /api/plan` dans `tests/contract/plan.test.ts`, avec validation de la réponse contre `contracts/ingredient-plan.schema.json`

### Implementation for User Story 2

- [ ] T040 [P] [US2] Filtrage par régime dans `src/domain/diet/filter.ts`: un aliment est candidat si `diet_base` figure dans `diet_tags` et si aucune exclusion du profil n'apparaît dans `excluded_by` (FR-013)
- [ ] T041 [P] [US2] Filtrage par saison dans `src/domain/seasonality/filter.ts`: un aliment `is_fruit_vegetable` n'est candidat que s'il existe une ligne `seasonality` pour le mois de `generated_at` (FR-014)
- [ ] T042 [US2] Modèle de programmation linéaire et solveur dans `src/domain/plan/solver.ts`: variables de quantité, contraintes de couverture de FR-016, bornes par aliment, objectif combinant masse minimale et variété (R6, dépend de T040, T041)
- [ ] T043 [US2] Relaxation des contraintes infaisables et production des écarts dans `src/domain/plan/relax.ts`, avec `reason` dans `diet_restriction|seasonality_restriction|no_source_available` (FR-017, FR-018)
- [ ] T044 [US2] Calcul des taux de couverture et arrondi aux unités d'achat via `unit_label` et `unit_grams` dans `src/domain/plan/coverage.ts` (FR-015, FR-016)
- [ ] T045 [US2] Assemblage de l'`IngredientPlan` dans `src/domain/plan/index.ts`: `schema_version` 1.0.0, `coverage`, `gaps`, `reference_versions`, marquage `is_fortified` (FR-037)
- [ ] T046 [US2] Route handler `POST /api/plan` dans `src/app/api/plan/route.ts` conformément à contracts/api.md
- [ ] T047 [P] [US2] Écran de la liste d'ingrédients dans `src/app/(public)/liste/page.tsx`: quantité et unité par ligne, bascule jour/semaine, identification visible des aliments enrichis (dépend de T023)
- [ ] T048 [P] [US2] Panneau de couverture et d'écarts dans `src/components/features/CoveragePanel.tsx`: pourcentage par nutriment et nutriments sous leur seuil nommés (FR-015, FR-017)
- [ ] T049 [US2] Tests e2e des parcours V3 et V4 dans `tests/e2e/us2-liste.spec.ts`

**Checkpoint**: US1 et US2 fonctionnent indépendamment — le produit délivre sa valeur complète sans compte

---

## Phase 5: User Story 3 - Espace personnel connecté (Priority: P3)

**Goal**: connexion déléguée, profil persistant, historique immuable et daté, export et suppression
des données personnelles.

**Independent Test**: scénario V5 de quickstart.md — générer un résultat en invité, se connecter, le
rattacher, se reconnecter depuis un autre navigateur, vérifier l'immuabilité d'un ancien résultat,
le cloisonnement entre comptes et la suppression complète.

### Tests for User Story 3

- [ ] T050 [P] [US3] Tests RLS dans `tests/contract/rls.test.ts`: un utilisateur ne lit et ne supprime que ses propres résultats, l'identifiant d'un résultat d'autrui renvoie 404, aucune mise à jour de `results` n'est possible (FR-028, FR-027)
- [ ] T051 [P] [US3] Tests de contrat des points d'entrée `results`, `results/claim`, `account/export` et `account` dans `tests/contract/results.test.ts`
- [ ] T052 [P] [US3] Test d'immuabilité de l'historique dans `tests/unit/history-immutability.test.ts`: modifier le profil ne change aucune entrée existante (FR-027)

### Implementation for User Story 3

- [ ] T053 [US3] Intégrer Supabase Auth (connexion, session, protection des routes) dans `src/middleware.ts` et `src/app/(account)/layout.tsx`, sans stockage de mot de passe ni gestion de session maison (FR-022)
- [ ] T054 [P] [US3] Repository des profils dans `src/data/repositories/profiles.ts`
- [ ] T055 [P] [US3] Repository des résultats dans `src/data/repositories/results.ts`: insert, select et delete uniquement, jamais d'update (FR-027)
- [ ] T056 [US3] Stockage des résultats invités et cookie de session signé avec expiration courte dans `src/lib/guest-results.ts` (R8)
- [ ] T057 [US3] Route handlers `POST /api/results` et `POST /api/results/claim` dans `src/app/api/results/route.ts` et `src/app/api/results/claim/route.ts`, un résultat invité expiré renvoyant 404 (FR-024)
- [ ] T058 [P] [US3] Route handlers `GET /api/results`, `GET /api/results/{id}` et `DELETE /api/results/{id}` dans `src/app/api/results/[id]/route.ts`
- [ ] T059 [P] [US3] Route handlers `GET /api/account/export` et `DELETE /api/account` dans `src/app/api/account/route.ts` (FR-029)
- [ ] T060 [P] [US3] Écran de l'espace personnel avec profil pré-rempli dans `src/app/(account)/profil/page.tsx` (FR-025, dépend de T023)
- [ ] T061 [P] [US3] Écran d'historique dans `src/app/(account)/historique/page.tsx`: résultats datés avec le profil utilisé au moment du calcul (FR-026, dépend de T023)
- [ ] T062 [US3] Écran des données personnelles dans `src/app/(account)/donnees/page.tsx` (export, suppression de compte) et avertissement affiché avant connexion sur la perte d'un résultat non rattaché (FR-024, FR-029, FR-030, dépend de T023)
- [ ] T063 [US3] Test e2e du parcours V5 dans `tests/e2e/us3-compte.spec.ts`

**Checkpoint**: les trois premières stories fonctionnent indépendamment

---

## Phase 6: User Story 4 - Changer de régime sans fausser ses besoins (Priority: P4)

**Goal**: rendre l'invariant visible — changer de régime recompose entièrement la liste sans toucher
aux besoins.

**Independent Test**: scénario V2 de quickstart.md — deux profils identiques sauf le régime donnent
des besoins strictement identiques et des listes différentes, toutes deux conformes à leur régime.

- [ ] T064 [P] [US4] Test e2e du parcours V2 dans `tests/e2e/us4-regime.spec.ts`: besoins identiques, listes différentes et conformes
- [ ] T065 [US4] Action de changement de régime et régénération de la liste dans `src/app/(account)/profil/page.tsx` (FR-004, FR-013)
- [ ] T066 [US4] Message explicite indiquant que les besoins sont inchangés et que seule la liste est recomposée, dans `src/components/features/DietChangeNotice.tsx`

**Checkpoint**: les quatre stories sont fonctionnelles et testables indépendamment

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T067 [P] Vérification d'accessibilité (contrastes AA, libellés de champs, navigation clavier) dans `tests/e2e/a11y.spec.ts` (FR-033)
- [ ] T068 [P] Vérification responsive de 320 px à 1920 px sur tous les parcours dans `tests/e2e/responsive.spec.ts` (FR-031, SC-008)
- [ ] T069 [P] Indicateur de fraîcheur des données de référence dans `src/components/features/DataFreshness.tsx` (FR-036)
- [ ] T070 [P] Test de traçabilité dans `tests/unit/reference-versions.test.ts`: tout résultat enregistré porte les versions des tables utilisées (FR-038)
- [ ] T071 [P] Mesure de performance dans `tests/e2e/performance.spec.ts`: résultat affiché en moins de 3 s au 95e centile (SC-010)
- [ ] T072 [P] Documenter sources, versions et licences des données de référence dans `docs/sources.md` (CIQUAL sous Licence Ouverte, publications ANSES, calendrier de saisonnalité)
- [ ] T073 Exécuter l'intégralité des scénarios V1 à V6 de `specs/001-nutrition-ingredient-planner/quickstart.md` et consigner les résultats
- [ ] T074 Revue de conformité aux six principes de `.specify/memory/constitution.md` et mise à jour de `specs/001-nutrition-ingredient-planner/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: aucune dépendance, démarrage immédiat
- **Foundational (Phase 2)**: dépend de la Phase 1, bloque toutes les stories
- **User Stories (Phases 3 à 6)**: dépendent de la Phase 2; ensuite parallélisables ou séquentielles
  par priorité P1 puis P2 puis P3 puis P4
- **Polish (Phase 7)**: dépend des stories retenues

### User Story Dependencies

- **US1 (P1)**: démarre dès la fin de la Phase 2, aucune dépendance sur une autre story
- **US2 (P2)**: démarre dès la fin de la Phase 2; consomme des besoins, qui peuvent être fournis par
  une fixture en test, donc validable indépendamment d'US1
- **US3 (P3)**: démarre dès la fin de la Phase 2, indépendante d'US1 et US2
- **US4 (P4)**: n'a de sens qu'une fois US1 et US2 livrées, dont elle démontre l'invariant

### Dépendance Figma

T022 puis T023 conditionnent T032, T033, T047, T048, T060, T061 et T062. Tant que le MCP Figma n'est
pas disponible, ces sept tâches d'interface restent bloquées; les 67 autres ne le sont pas.

### Within Each User Story

- Les tests sont écrits et échouent avant l'implémentation
- Domaine avant route handlers, route handlers avant écrans
- La story est complète avant de passer à la priorité suivante

## Parallel Example: User Story 1

```bash
# Les quatre tests d'US1 en parallèle:
Task: "Test d'invariant besoins/régime dans tests/unit/needs-diet-invariant.test.ts"
Task: "Tests de conformité sur dix profils de contrôle dans tests/unit/needs-reference.test.ts"
Task: "Test de contrat POST /api/needs dans tests/contract/needs.test.ts"
Task: "Test des bornes de validation dans tests/unit/profile-validation.test.ts"

# Les données de référence de la Phase 2 en parallèle:
Task: "Référentiel des nutriments dans src/data/reference/nutrients.json"
Task: "Apports de référence ANSES dans src/data/reference/reference-intakes.json"
Task: "Coefficients de Henry et NAP dans src/data/reference/energy-equations.json"
Task: "Extrait CIQUAL dans src/data/reference/foods.json"
Task: "Calendrier de saisonnalité dans src/data/reference/seasonality.json"
```

## Implementation Strategy

### MVP d'abord (US1 seule)

1. Phase 1 Setup
2. Phase 2 Foundational — critique, bloque tout le reste
3. Phase 3 US1
4. **STOP et valider**: scénario V1 de quickstart.md
5. Le MVP est un calculateur de besoins personnalisé et sourcé, utilisable sans compte

### Livraison incrémentale

1. Setup et Foundational → socle prêt
2. US1 → validation V1 → démo (MVP)
3. US2 → validation V3 et V4 → démo: le produit délivre alors sa valeur complète sans compte
4. US3 → validation V5 → démo: le service devient récurrent
5. US4 → validation V2 → l'invariant devient visible à l'usage

### Ordre conseillé pour un développeur seul

Les tâches de données de référence (T011 à T015) sont les plus longues et les moins techniques:
les mener en parallèle des tâches de code, et les faire relire séparément, puisque c'est là que se
joue l'exactitude nutritionnelle exigée par le principe II.

## Notes

- `[P]` = fichiers différents, aucune dépendance non satisfaite
- Chaque story est complétable et testable indépendamment
- Vérifier que les tests échouent avant d'implémenter
- Committer après chaque tâche ou groupe cohérent
- Les quatre tests imposés par la constitution sont T024, T025, T036 et T037: leur échec bloque
  toute fusion
