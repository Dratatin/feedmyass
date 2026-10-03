---

description: "Task list for 004-reperes-anses"
---

# Tasks: Liste d'ingrédients fondée sur les repères de l'ANSES

**Input**: Design documents from `/specs/004-reperes-anses/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: inclus et **obligatoires**. La constitution impose des tests de conformité aux sources
officielles (principe II), d'invariant besoins/régime (principe III), de compatibilité régime et de
saisonnalité. La simulation `npm run simulate:plans` vérifie en plus les critères de succès sur
1 408 listes.

**Organization**: tâches groupées par user story. US1 et US4 (toutes deux P1) touchent le même
calcul et se livrent ensemble ; US2 et US5 (P2) s'appuient dessus ; US3 (P3) clôt la traçabilité.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable — fichiers différents, aucune dépendance sur une tâche non terminée
- **[Story]**: user story de rattachement (US1 à US5)

---

## Phase 1: Setup

**Purpose**: figer la mesure de départ. Dès que le calcul change, l'état antérieur n'est plus
reconstituable (research R11).

**⚠️ CRITIQUE** : aucune tâche des phases suivantes ne modifie `src/domain/plan/` avant T003.

- [ ] T001 Créer `specs/004-reperes-anses/baseline/` avec un `.gitkeep`
- [ ] T002 Ajouter à `scripts/simulate-plans.ts` un résumé par contrôle (nombre d'occurrences par type, temps p50/p95/max, totaux par catégorie) écrit dans le fichier de sortie sous la clé `summary` — déjà calculé, à rendre stable et documenté dans l'en-tête du script pour servir à la comparaison
- [ ] T003 Exécuter `npm run simulate:plans -- specs/004-reperes-anses/baseline/simulation-avant.json` sur le commit courant (catalogue corrigé de `db95134`, calcul inchangé) et versionner le résultat. Vérifier qu'il contient bien les constats de la spec : algues dans toutes les listes, `energie_hors_cible` > 0, `lent` > 0 ; leur absence signifierait que le calcul mesuré n'est pas celui de `main`

**Checkpoint**: mesure de départ figée

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: les données dont dépendent toutes les user stories — paramètres du modèle, limites de
sécurité, rattachement des aliments — et leur chemin jusqu'à la base.

### Paramètres du modèle de consommation (research R1)

- [ ] T004 Créer `src/data/reference/consumption-model.json` conforme à `specs/004-reperes-anses/contracts/consumption-model.schema.json` : les 32 sous-groupes du tableau 9 de l'avis Anses 2012-SA-0103 (pages 73-74), pour `male` et `female`, avec `lower` (P5), `mean`, `upper` (P95 ou plafond épidémiologique, `null` si « pas de limite supérieure »), `sd` de l'annexe 6 (pages 80-81, **colonnes du sous-groupe**, pas du groupe), et la `provenance` `{ table, page }` de chaque valeur. **Relire chaque valeur sur le rendu du PDF**, pas sur une conversion texte. Points à contrôler : limite couplante des huiles (21 g/j hommes, 16 g/j femmes) sur la somme des deux sous-groupes d'huiles ; couplages pain raffiné/complet (284 et 177) et autres féculents raffinés/complets (257 et 193) ; charcuterie à moyenne 39 > plafond 25 (attendu)
- [ ] T005 Renseigner dans `src/data/reference/consumption-model.json` les champs `direction` (`maximize` pour fruits frais, légumes, pain complet, autres féculents complets ; `minimize` pour viande hors volaille et charcuterie ; `mean` pour les autres, tableau 5 page 31 et § 3.2.2.1 page 32), `coupled_with`/`coupled_upper`, `substitutes_for` (`legumineuses` ← viande hors volaille, volaille, poissons gras, autres poissons, œufs ; lait, produits laitiers frais nature et fromages ← eux-mêmes, research R5), et `_meta.notes` nommant chaque écart assumé : substitutions végétales (FR-310a), extension d'âge à 70 ans, contraintes de contaminants hors périmètre
- [ ] T006 [P] Écrire `tests/unit/consumption-model.test.ts` : le fichier respecte le schéma du contrat ; chaque valeur porte une provenance ; tout sous-groupe `direction = mean` a un `sd` strictement positif ; `lower ≤ upper` quand `upper` n'est pas nul ; `lower ≤ mean` sauf pour les sous-groupes dont `upper` est un plafond épidémiologique ; tout `coupled_with` est réciproque ; contrôles croisés tableau 9 / annexe 6 sur trois valeurs connues (légumes hommes : moyenne 123, écart-type 92,6 ; légumineuses hommes : 0 / 14 / 64)

### Limites de sécurité (research R6)

- [ ] T007 [P] Créer `src/data/reference/upper-limits.json` conforme à `specs/004-reperes-anses/contracts/upper-limits.schema.json` : iode, sélénium, zinc, cuivre, vitamine D, calcium, vitamine B6, vitamine E, `retinol`. **Confirmer chaque valeur sur l'avis primaire de l'EFSA** (ou de l'ANSES) et le citer dans `source` — les valeurs de `research.md` R6 viennent de sources secondaires. `_meta.notes` nomme les nutriments écartés (magnésium, vitamines B3 et B9 : limite visant les seuls suppléments)
- [ ] T008 [P] Écrire dans `tests/unit/consumption-model.test.ts` (ou un fichier voisin `tests/unit/upper-limits.test.ts`) : chaque limite a une source qui n'est pas vide ; son unité est celle du nutriment dans `src/data/reference/nutrients.json` (sauf `retinol`, en µg) ; aucune limite n'est inférieure à l'apport de référence du même nutriment dans `src/data/reference/reference-intakes.json`

### Rattachement, familles et rétinol dans le catalogue (research R4)

- [ ] T009 Ajouter à `scripts/build-foods-from-ciqual.mjs` la table de rattachement de `research.md` R4 (classe CIQUAL → sous-groupe, affinages par libellé), recopiée dans `_meta.rattachement` du fichier produit avec le motif de chaque ligne. Écrire `anses_subgroup` (code ou `null`) et `attached_by: { classe, regle, substitut }` sur chaque aliment. La construction **échoue sans écrire** si une classe retenue n'a pas de ligne, si une règle désigne un sous-groupe absent de `src/data/reference/consumption-model.json`, ou si un aliment d'une classe retenue autre que les algues et l'eau de coco reste sans sous-groupe
- [ ] T010 Ajouter à `scripts/build-foods-from-ciqual.mjs` le calcul de `family` (FR-321) : clé d'espèce ou de dédoublonnage déjà calculée par le script pour les variantes d'un même ingrédient (laits de vache, œufs de poule et de cane, riz blanc et étuvé, haricots blancs et rouges, tofus) ; code du sous-groupe pour les huiles et pour les boissons végétales. « Jamais vide »
- [ ] T011 Ajouter à `scripts/build-foods-from-ciqual.mjs` le champ de composition `retinol` (constituant CIQUAL 51200, µg/100 g), sans changer le calcul de `vitamin_a`
- [ ] T012 Exécuter `npm run build:foods` et relire le diff de `src/data/reference/foods.json` : seuls les champs nouveaux doivent changer ; les aliments à `anses_subgroup: null` sont les algues et l'eau de coco
- [ ] T013 [P] Ajouter à `tests/unit/catalogue-selection.test.ts` : tout aliment a un `attached_by` dont la `regle` figure dans `_meta.rattachement` ; les aliments à sous-groupe `null` sont exactement les algues et l'eau de coco ; les poissons gras sont exactement hareng, maquereau et saumon ; la pomme de terre est dans `autres_feculents_raffines` ; tofu, tempeh, seitan et protéine de soja sont dans `legumineuses` avec `substitut: true` ; aucune famille ne mêle deux sous-groupes ; aucune famille n'est vide

### Chemin jusqu'à la base

- [ ] T014 Écrire `supabase/migrations/0007_consumption_model.sql` : tables `consumption_subgroups` et `upper_limits` (colonnes de traçabilité `source`, `version`, `retrieved_at`, lecture publique par RLS comme les autres tables de référence) ; colonnes `anses_subgroup text null`, `family text not null default ''`, `attached_by jsonb null` sur `public.foods`, avec un commentaire par colonne dans le style de `0006_food_selected_by.sql`
- [ ] T015 Étendre `scripts/seed-reference.ts` aux deux fichiers nouveaux (stratégie `replace`, `required: true`), en conservant le refus de tout fichier sans `_meta.source`, `_meta.version`, `_meta.retrieved_at`
- [ ] T016 Ajouter à `src/domain/types.ts` les types `ConsumptionSubgroup` et `UpperLimit` (data-model §§ 1-2) et les champs `ansesSubgroup: string | null` et `family: string` à `Food`
- [ ] T017 Ajouter à `src/data/repositories/reference.ts` `fetchConsumptionModel()` et `fetchUpperLimits()`, et lire les nouvelles colonnes dans `fetchFoods()` ; ajouter les fixtures correspondantes à `tests/unit/fixtures/reference.ts` (lecture des fichiers JSON, comme les fixtures existantes)

**Checkpoint**: données prêtes — `npm run test:unit` vert, calcul encore inchangé

---

## Phase 3: User Story 1 + User Story 4 — Une liste qui ressemble à ce qu'on mange, et qui respecte ses garde-fous (P1) 🎯 MVP

**Goal**: remplacer le critère « masse minimale » par le critère de l'ANSES et la relaxation
séquentielle par des contraintes flexibles, avec limites de sécurité.

**Independent Test**: `npm run simulate:plans` — zéro algue, zéro dépassement du plafond
énergétique, d'un intervalle de référence ou d'une limite de sécurité, aucune liste au-delà d'une
seconde ; pour l'omnivore, sous-groupes dans leurs bornes et ≥ 400 g de fruits et légumes.

### Tests for User Story 1 + 4

- [ ] T018 [P] [US1] Réécrire `tests/unit/plan-solver.test.ts`, bloc omnivore : aucune algue ni aliment à sous-groupe `null` ; chaque sous-groupe présent entre ses bornes ANSES du sexe du profil ; viande hors volaille ≤ 71 g/j et charcuterie ≤ 25 g/j ; deux profils ne différant que par le sexe reçoivent les bornes de leur sexe ; supprimer le test « atteint le plancher de fruits et légumes », remplacé par « fournit au moins 400 g de fruits et légumes sans plancher imposé » (SC-003)
- [ ] T019 [P] [US4] Ajouter à `tests/unit/plan-solver.test.ts` un bloc « garde-fous » : énergie entre 100 % et 110 % ou écart signalé ; lipides et glucides jamais au-delà de leur borne haute ; aucun nutriment au-delà de sa limite de sécurité (iode compris) ; le taux de chaque écart égale celui de la couverture ; sur un jeu de candidats construit pour rendre un nutriment inatteignable, la liste sort quand même, avec ce seul écart et le plafond énergétique respecté
- [ ] T020 [P] [US4] Ajouter à `tests/unit/plan-solver.test.ts` un test d'interruption : un `solveBounded` simulé qui s'interrompt deux fois fait lever l'erreur `plan_computation_interrupted`, et ne produit aucun écart

### Implementation for User Story 1 + 4

- [ ] T021 [US1] Créer `src/domain/plan/consumption-model.ts` : à partir des sous-groupes, du sexe, de la période et des candidats, calculer les sous-groupes actifs (au moins un candidat), leurs bornes (× période), la borne basse levée pour un sous-groupe sans candidat, les couplages, et les coefficients du critère (`1/sd` pour `mean`, `−1/upper` ou `−1/coupled_upper` pour `maximize`, `+1/upper` pour `minimize`, research R2)
- [ ] T022 [US1] Réécrire `src/domain/plan/solver.ts` : variables d'aliments et variables `ecart_plus_g`/`ecart_moins_g` par sous-groupe actif ; contrainte d'équilibre par sous-groupe ; bornes de sous-groupe et couplages ; plafond par aliment ; objectif de minimisation du coût de R2. Supprimer `CATEGORY_DAILY_CAP_G`, `PRODUCE_FLOOR_G_PER_DAY` et leurs commentaires. Ne proposer aucun aliment à `ansesSubgroup` nul (FR-309)
- [ ] T023 [US4] Dans `src/domain/plan/solver.ts`, rendre chaque seuil bas de nutriment flexible : variable `manque_n` de coût `P × manque_n / seuil_n`, `P = 1000`, ×10 pour l'énergie, les protéines et les nutriments prioritaires (research R3) ; garder **dures** le plafond énergétique (`ENERGY_UPPER_TOLERANCE`), les bornes hautes `valueMax` et les limites de sécurité reçues en entrée. Exposer dans `SolverOutput` les manques par nutriment. Documenter le poids comme décision du projet
- [ ] T024 [US4] Créer `src/domain/plan/gaps.ts` : écarts = nutriments à manque positif dans la liste livrée ; taux = ratio de la couverture calculée par `computeCoverage` ; cause établie en rejouant le modèle flexible sur `dietOnly` (manque disparu → `seasonality_restriction`) puis sur `allFoods` (→ `diet_restriction`), sinon `no_source_available` — rejeux uniquement s'il existe un écart (FR-320)
- [ ] T025 [US4] Dans `src/domain/plan/bounded-solve.ts`, sur interruption, rejouer une fois à précision `1e-4` ; si la seconde résolution est aussi interrompue, lever une erreur typée que `buildIngredientPlan` propage sans la convertir en écart (FR-319, research R8)
- [ ] T026 [US1] Mettre à jour `src/domain/plan/index.ts` : `PlanInput` reçoit `referenceSex`, `subgroups`, `upperLimits` ; enchaîne `consumption-model` → `solver` → `gaps` ; supprimer `src/domain/plan/relax.ts` et ses exports (`maxAchievable`, `maxAchievableWithinEnergy`, `solveWithRelaxation`), et le filtre des écarts « réellement sous le seuil », devenu inutile
- [ ] T027 [US4] Ajouter le code `plan_computation_interrupted` (statut 503) à `src/lib/errors.ts`, le lever depuis `src/app/api/plan/route.ts`, et transmettre `referenceSex`, `fetchConsumptionModel()` et `fetchUpperLimits()` à `buildIngredientPlan` dans cette route ; afficher le message « Le calcul de la liste n'a pas abouti. Réessayez. » dans `src/app/(public)/liste/page.tsx` avec le composant `Notice` existant
- [ ] T028 [P] [US1] Adapter les appelants de `buildIngredientPlan` et de `solvePlan` : `scripts/simulate-plans.ts`, `scripts/measure-catalogue.ts`, `scripts/smoke-plan.ts`, `scripts/smoke-solver.ts`, en passant sexe, sous-groupes et limites
- [ ] T029 [P] [US4] Supprimer `scripts/check-caps.ts` et son entrée `check:caps` dans `package.json` (research R12)
- [ ] T030 [US4] Ajouter à `scripts/simulate-plans.ts` les contrôles : aliment à sous-groupe nul (SC-001), sous-groupe hors bornes pour l'omnivore (SC-002), limite de sécurité dépassée (SC-009), écart dont le taux diffère de la couverture (SC-010), nombre de sous-groupes et grammes de fruits et légumes de l'omnivore (SC-003, SC-004)
- [ ] T031 [US1] Exécuter `npm run test:unit` puis `npm run simulate:plans` ; si un nutriment couvert dans `baseline/simulation-avant.json` passe sous son seuil (SC-005), ajuster `P` et le documenter dans `src/domain/plan/solver.ts` et `research.md` R3 avant de poursuivre

**Checkpoint**: MVP — la liste suit le critère de l'ANSES, sans algue ni dépassement

---

## Phase 4: User Story 2 — Végétarien et végan réalistes et calculables (P2)

**Goal**: retirer les sous-groupes exclus par le régime et lever la borne haute de leurs substituts.

**Independent Test**: listes végétarienne, végane et végane sans gluten du profil de référence :
calculées, sans algue ni aliment hors sous-groupe, sans perte de couverture par rapport à la mesure
de départ.

### Tests for User Story 2

- [ ] T032 [P] [US2] Ajouter à `tests/unit/plan-solver.test.ts` : pour un régime végétarien, les sous-groupes viande, volaille, charcuterie et poissons sont inactifs et `legumineuses` n'a plus de borne haute ; pour un régime végan, `lait` reste actif, alimenté par les seules boissons végétales, sans borne haute ; aucun sous-groupe exclu n'apparaît dans le coût ; la B12 végane reste un écart `diet_restriction`
- [ ] T033 [P] [US2] Vérifier que `tests/unit/needs-diet-invariant.test.ts` et `tests/unit/diet-compatibility.test.ts` restent verts sans modification (principe III)

### Implementation for User Story 2

- [ ] T034 [US2] Dans `src/domain/plan/consumption-model.ts`, déterminer les sous-groupes exclus : tous leurs aliments **non substituts** (`attached_by.substitut = false`) sont incompatibles avec le régime (research R5) ; les retirer du critère et des contraintes ; lever la borne haute des sous-groupes dont `substitutes_for` contient un sous-groupe exclu, et d'un sous-groupe dont seuls les substituts restent
- [ ] T035 [US2] Exécuter `npm run simulate:plans` (sortie dans `specs/004-reperes-anses/baseline/`) et relire les listes végétariennes et véganes : aucun sous-groupe exclu présent, écarts limités à ceux de la mesure de départ, plus l'iode s'il apparaît (cas limite de la spec)

**Checkpoint**: les quatre régimes de base suivent le modèle

---

## Phase 5: User Story 5 — Une liste de courses qu'on peut acheter telle quelle (P2)

**Goal**: une variante par famille, au moins une demi-unité d'achat par ligne.

**Independent Test**: simulation complète — zéro liste à deux variantes d'une famille, zéro ligne
sous la demi-unité, aucun écart nouveau non expliqué.

### Tests for User Story 5

- [ ] T036 [P] [US5] Écrire `tests/unit/plan-consolidate.test.ts` : sur un jeu où le solveur répartit naturellement deux laits, la liste consolidée n'en garde qu'un, le plus abondant ; aucune ligne sous `unitGrams × période / 2` ; la boucle termine sur un jeu de candidats qui décroît ; un nutriment rendu inatteignable par la consolidation apparaît comme écart, la règle n'étant pas levée (FR-324)

### Implementation for User Story 5

- [ ] T037 [US5] Créer `src/domain/plan/consolidate.ts` : boucle « résoudre → garder la variante la plus abondante de chaque famille → retirer les lignes sous la demi-unité sur la période → résoudre à nouveau » tant qu'un aliment a été retiré (research R7) ; borne basse levée pour un sous-groupe vidé par la consolidation
- [ ] T038 [US5] Brancher la consolidation dans `src/domain/plan/index.ts` entre la résolution et le calcul des écarts ; supprimer dans `src/domain/plan/solver.ts` le relèvement au gramme (`MIN_DISPLAY_G`) devenu sans objet, la demi-unité le remplaçant
- [ ] T039 [US5] Ajouter à `scripts/simulate-plans.ts` le contrôle « deux variantes d'une même famille » (SC-011) ; le contrôle `sous_demi_portion` (SC-012) existe déjà
- [ ] T040 [US5] Exécuter `npm run simulate:plans` ; comparer les écarts à ceux de la phase 4 et nommer chaque écart nouveau avec sa cause (SC-013) ; si SC-013 échoue de façon inacceptable, consigner le constat dans `research.md` R7 et revenir vers le commanditaire avant d'envisager HiGHS

**Checkpoint**: liste achetable telle quelle

---

## Phase 6: User Story 3 — Chaque chiffre se rattache à sa source (P3)

**Goal**: traçabilité complète des paramètres, des limites et du rattachement.

**Independent Test**: tirer au hasard des paramètres et des aliments et retrouver pour chacun sa
source ou sa règle ; aucun seuil en grammes propre au projet dans le calcul.

- [ ] T041 [P] [US3] Ajouter à `docs/sources.md` une section « Modèle de consommation » (avis, tableaux et pages, écarts assumés : substitutions, extension d'âge, contaminants, demi-portion, poids des manques) et une section « Limites de sécurité » (une ligne par nutriment avec sa source primaire, nutriments écartés et pourquoi)
- [ ] T042 [P] [US3] Ajouter un test dans `tests/unit/plan-solver.test.ts` qui échoue si `src/domain/plan/` contient une constante numérique en grammes autre que celles issues des fichiers de référence — par recherche des anciens noms (`CATEGORY_DAILY_CAP_G`, `PRODUCE_FLOOR_G_PER_DAY`) et revue de `solver.ts` (SC-006)
- [ ] T043 [US3] Vérifier que `seed-reference.ts` refuse un `consumption-model.json` privé de la provenance d'une valeur (test manuel ou unitaire selon la structure du script)

**Checkpoint**: traçabilité vérifiable

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T044 Exécuter `npm run simulate:plans -- specs/004-reperes-anses/baseline/simulation-apres.json`, puis rédiger `specs/004-reperes-anses/baseline/comparaison.md` dans le style de `specs/003-catalogue-pertinence/baseline/comparaison.md` : tableau avant/après par critère de succès (SC-001 à SC-013), écarts nouveaux avec leur cause, constats inattendus
- [ ] T045 [P] Mettre à jour la spec si l'implémentation a révélé une divergence (principe I), et cocher la checklist `specs/004-reperes-anses/checklists/requirements.md`
- [ ] T046 [P] Contrôles statiques et tests du dépôt (`package.json`) : `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:contract`
- [ ] T047 `npm run build` puis `npm run check:build` (`scripts/check-build-output.ts`) (le worker du solveur et sa dépendance doivent rester dans la sortie de build)
- [ ] T048 Avec accord explicite du commanditaire : appliquer la migration `supabase/migrations/0007_consumption_model.sql` et `npm run seed:reference`, puis `npm run test:e2e` et le contrôle manuel de `quickstart.md` § 4
- [ ] T049 Montrer le résultat (`specs/004-reperes-anses/baseline/comparaison.md`, deux listes réelles omnivore et végane) et attendre l'accord avant tout commit final et la mise à jour de la PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance — **bloque** toute modification de `src/domain/plan/`
- **Foundational (Phase 2)** : après la phase 1 — bloque toutes les user stories
- **US1 + US4 (Phase 3)** : après la phase 2 — MVP
- **US2 (Phase 4)** : après la phase 3 (s'appuie sur `consumption-model.ts`)
- **US5 (Phase 5)** : après la phase 3 ; indépendante de US2 dans le code, mais sa mesure (T040) se compare à la phase 4 : la faire après
- **US3 (Phase 6)** : T041 et T043 dès la phase 2 terminée ; T042 après la phase 3
- **Polish (Phase 7)** : après toutes les phases

### Within Each Story

Tests écrits d'abord et vus en échec, puis implémentation ; la simulation clôt chaque phase.

### Parallel Opportunities

- Phase 2 : T006, T007, T008 en parallèle de T009-T011 (fichiers distincts) ; T013 dès T012
- Phase 3 : T018, T019, T020 ensemble ; T028 et T029 dès T026
- Phase 6 : T041 indépendant du code

## Parallel Example: Phase 2

```text
Task: "Créer src/data/reference/upper-limits.json (T007)"
Task: "Écrire tests/unit/consumption-model.test.ts (T006)"
Task: "Rattachement et familles dans scripts/build-foods-from-ciqual.mjs (T009-T011)"
```

## Implementation Strategy

### MVP (phases 1 à 3)

Mesure de départ, données, puis critère de l'ANSES avec garde-fous. À ce stade les algues ont
disparu, l'iode et l'énergie sont bornés, et la liste omnivore ressemble à une alimentation
courante : c'est le défaut qui a motivé la feature. Arrêt possible pour validation.

### Incrémental

1. Phases 1-3 → simulation → validation (MVP)
2. Phase 4 → régimes végétariens corrects
3. Phase 5 → liste achetable
4. Phases 6-7 → traçabilité, comparaison, mise en base

Chaque incrément est vérifié par `npm run simulate:plans` contre `baseline/simulation-avant.json`.
