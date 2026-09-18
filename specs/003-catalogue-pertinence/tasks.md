---

description: "Task list for 003-catalogue-pertinence"
---

# Tasks: Catalogue d'aliments sélectionné par pertinence

**Input**: Design documents from `/specs/003-catalogue-pertinence/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: inclus et **obligatoires**. La constitution impose une porte de tests sur la conformité aux
sources officielles, la compatibilité régime de chaque ingrédient proposé et la saisonnalité sur
douze mois. Ce ne sont pas des tests optionnels ajoutés par confort.

**Organization**: tâches groupées par récit utilisateur, chacun livrable et vérifiable séparément.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable — fichiers différents, aucune dépendance sur une tâche non terminée
- **[Story]**: récit de rattachement (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: câbler les commandes avant d'écrire quoi que ce soit qui les utilise

- [X] T001 Ajouter les scripts `build:foods` (`node scripts/build-foods-from-ciqual.mjs`) et `measure:catalogue` (`tsx scripts/measure-catalogue.ts`) dans `package.json`
- [X] T002 [P] Ajouter le script `build:seasonality` (`node scripts/build-seasonality.mjs`) dans `package.json` — il n'est aujourd'hui lançable qu'à la main, alors que tout changement de catalogue oblige à le rejouer
- [X] T003 [P] Créer le répertoire `specs/003-catalogue-pertinence/baseline/` avec un `.gitkeep`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: figer la référence de comparaison. Cette phase bloque tout le reste pour une raison de
fond : dès qu'une tâche modifie la sélection, la mesure du catalogue actuel est perdue et
FR-216/SC-007 deviennent invérifiables.

**⚠️ CRITIQUE** : aucune tâche de US1, US2 ou US3 ne peut commencer avant T007.

- [X] T004 Écrire `scripts/measure-catalogue.ts`: charge `src/data/reference/foods.json`, calcule pour chacun des 4 régimes de base et pour les jeux d'exclusions (`gluten`, `lactose`, `nuts`, et leurs combinaisons) la couverture atteignable par nutriment et les écarts produits, en réutilisant `buildIngredientPlan` et `maxAchievable` de `src/domain/plan`
- [X] T005 Étendre `scripts/measure-catalogue.ts` avec les métriques de catalogue: nombre d'aliments, complétude moyenne en nutriments renseignés sur 26, répartition par catégorie d'achat, et empreinte SHA-256 du fichier mesuré
- [X] T006 Ajouter à `scripts/measure-catalogue.ts` l'option `--compare <avant> <apres>` produisant la liste des régimes dont la couverture baisse, des écarts ouverts et des écarts refermés — en distinguant **couvert avec marge** de **couvert sur le fil** (ratio < 1,05), conformément à `data-model.md` § Mesure de référence
- [X] T007 Exécuter `npm run measure:catalogue -- --out specs/003-catalogue-pertinence/baseline/coverage-before.json` sur le catalogue actuel et versionner le résultat. Vérifier que le régime végane y porte bien un écart sur `vitamin_b12`: son absence signifierait que le catalogue mesuré n'est pas celui de `main`

**Checkpoint**: référence figée — le travail sur les récits peut commencer

---

## Phase 3: User Story 1 — La liste ne propose que des aliments qu'on achète (P1) 🎯 MVP

**Goal**: remplacer les 18 plafonds par sous-groupe par une sélection fondée sur la classification de
quatrième niveau de CIQUAL, avec repli sur le troisième.

**Independent Test**: jouable sur l'archive 2020 déjà en place, sans toucher à la source —
`npm run build:foods -- --from <répertoire XML 2020>` puis relecture du rapport.

### Tests for User Story 1

- [X] T008 [P] [US1] Écrire dans `tests/unit/catalogue-selection.test.ts` un test vérifiant que chaque aliment de `foods.json` porte un `selected_by` dont `classe` est non vide et `niveau` vaut 3 ou 4 (FR-205)
- [X] T009 [P] [US1] Écrire dans `tests/unit/catalogue-selection.test.ts` un test vérifiant qu'aucune classe retenue ne dépasse le quota, et qu'aucune classe écartée n'a d'aliment au catalogue
- [X] T010 [P] [US1] Étendre `tests/unit/diet-compatibility.test.ts`: aucun aliment dont le libellé nomme un ingrédient d'origine animale (`gélatine`, `gelée royale`, `aux œufs`, `au miel`) ne porte l'étiquette `vegan`
- [X] T011 [P] [US1] Étendre `tests/unit/diet-compatibility.test.ts`: tout aliment d'une classe d'alternatives végétales porte les quatre régimes et ne porte jamais l'exclusion `lactose`

### Implementation for User Story 1

- [X] T012 [US1] Dans `scripts/build-foods-from-ciqual.mjs`, lire `alim_ssssgrp_code` sur chaque `ALIM` et `alim_ssssgrp_nom_fr` dans `alim_grp`, et calculer la **clé de classe**: le quatrième niveau, avec repli sur `alim_ssgrp_code` quand il vaut `000000` (R9 — 22 % des candidats, dont toutes les pommes de terre et tout le tofu)
- [X] T013 [US1] Remplacer la table `SUBGROUPS` de `scripts/build-foods-from-ciqual.mjs` par `CLASS_RULES`, indexée **par code de classe et jamais par libellé** (R13 — 9 libellés ont changé entre 2020 et 2025 sans qu'aucun code ne bouge). Chaque entrée porte `décision` (`retenir`|`écarter`), `catégorie`, `régimes`, `exclusions`, et `motif` obligatoire si `écarter`
- [X] T014 [US1] Peupler `CLASS_RULES` pour les 63 classes peuplées du périmètre, en écartant nommément et avec motif au moins: abats, fromages fondus, gibier
- [X] T015 [US1] Remplacer le `take` par sous-groupe par un **quota unique** `QUOTA_PAR_CLASSE = 4`, documenté comme paramètre de capacité de relecture et non de pertinence (R11). La complétude de fiche ne sert plus qu'au départage intra-classe (FR-203)
- [X] T016 [US1] Rendre le départage à égalité **déterministe** dans `scripts/build-foods-from-ciqual.mjs`: à score égal, trancher par code CIQUAL croissant. L'ordre du tableau départageait jusqu'ici, ce qui avait coupé le jumeau végane au profit du non végane
- [X] T017 [US1] Faire échouer la construction quand une classe présente dans la source n'est couverte par aucune règle, en nommant la classe et son effectif (FR-215, `contracts/build-catalogue.md`)
- [X] T018 [US1] Faire échouer la construction quand une règle `écarter` n'a pas de motif (`contracts/build-catalogue.md`)
- [X] T019 [US1] Ajouter le champ `selected_by` `{classe, niveau}` à chaque aliment produit, conformément à `contracts/foods.schema.json`
- [X] T020 [US1] Enrichir `_meta.selection` de `foods.json` avec `quota_par_classe`, `classes_retenues` et `classes_ecartees` (chacune avec son motif), conformément à `contracts/foods.schema.json`
- [X] T021 [US1] Écrire le rapport de construction sur la sortie standard: taille, complétude moyenne, répartition par catégorie, et une ligne par classe (code, niveau employé, décision, candidats, retenus)
- [X] T022 [US1] Corriger le rapprochement des mots de condiment dans `scripts/build-foods-from-ciqual.mjs`: ils sont cherchés en sous-chaîne, si bien que « cre**sson** de fontaine » et « co**lin,** » sont plafonnés à 15 g comme des graines. Chercher en début de mot
- [X] T023 [US1] Corriger l'étiquetage de régime déduit du libellé dans `dietsFromLabel`: un libellé nommant un ingrédient d'origine animale retire `vegan` (les pâtes sèches aux œufs sont aujourd'hui proposées aux véganes). L'œuf reste compatible avec le régime végétarien
- [X] T024 [US1] Traiter gélatine et gelée royale: soit par le motif d'une classe écartée, soit par la règle de libellé de T023. Vérifier qu'aucune des deux n'apparaît dans un plan végane
- [X] T025 [US1] Conserver et documenter le dédoublonnage par espèce: le quatrième niveau ne subdivise pas les fruits et légumes — « légumes crus » est une classe de 132 aliments (R10). Les deux mécanismes coexistent et doivent être expliqués en commentaire

**Checkpoint**: US1 livrable — sélection par classe fonctionnelle sur la source actuelle

---

## Phase 4: User Story 2 — Le catalogue se reconstruit sans geste manuel (P2)

**Goal**: acquérir la table par l'API de Recherche Data Gouv, avec version, date et licence issues de
la source.

**Independent Test**: supprimer tout fichier XML local, lancer `npm run build:foods`, et vérifier que
le catalogue produit est identique à celui de US1 à `_meta.dataset` près.

### Tests for User Story 2

- [X] T026 [P] [US2] Écrire dans `tests/unit/catalogue-meta.test.ts` un test vérifiant que `_meta.dataset` de `foods.json` porte `doi`, `version`, `published_at` et `license` non vides (FR-209, FR-210)
- [X] T027 [P] [US2] Écrire dans `tests/contract/foods-schema.test.ts` la validation de `src/data/reference/foods.json` contre `specs/003-catalogue-pertinence/contracts/foods.schema.json`

### Implementation for User Story 2

- [X] T028 [US2] Dans `scripts/build-foods-from-ciqual.mjs`, interroger `https://entrepot.recherche.data.gouv.fr/api/datasets/:persistentId/?persistentId=doi:10.57745/RDMHWY` et extraire de `data.latestVersion`: numéro de version, `releaseTime`, licence et liste des fichiers avec leurs identifiants et tailles
- [X] T029 [US2] Télécharger les fichiers `alim_*`, `alim_grp_*` et `compo_*` par `https://entrepot.recherche.data.gouv.fr/api/access/datafile/<id>`, dans un cache local hors dépôt (le fichier de composition pèse 69 Mo et ne doit pas être versionné)
- [X] T030 [US2] Faire échouer la construction si la source est injoignable, si la licence est absente ou différente de `etalab 2.0`, si la version ou la date de publication manquent, ou si un fichier téléchargé ne correspond pas à la taille annoncée — **sans écrire ni écraser `foods.json`** (FR-211, FR-210, FR-209)
- [X] T031 [US2] Écrire `_meta.dataset` (`doi`, `version`, `published_at`, `license`, `files`) depuis la réponse de l'API, et alimenter `_meta.version` et `_meta.retrieved_at` depuis cette même réponse — plus aucune constante saisie à la main (FR-209)
- [X] T032 [US2] Ajouter les options `--version <doi-version>`, `--quota <n>`, `--from <dir>` et `--dry-run` décrites dans `contracts/build-catalogue.md`. Avec `--from`, version et date sont lues dans les fichiers et leur absence fait échouer la commande
- [X] T033 [US2] Vérifier à la main le test décisif de traçabilité du `quickstart.md` § Scénario 2: modifier `_meta.version` puis relancer la construction — la valeur doit revenir à celle de la source

**Checkpoint**: US1 + US2 livrables — construction reproductible en une commande

---

## Phase 5: User Story 3 — Le catalogue reflète le millésime courant (P3)

**Goal**: passer au millésime 2025 et rendre le changement de millésime relisible.

**Independent Test**: comparer les catalogues produits depuis les deux millésimes et relire la liste
des aliments entrés et sortis.

### Tests for User Story 3

- [X] T034 [P] [US3] Écrire dans `tests/unit/catalogue-encodage.test.ts` un test vérifiant qu'aucun libellé de `foods.json` ne contient les séquences de corruption `Ã©`, `Ã¨` ou `Ã ` (FR-212)
- [X] T035 [P] [US3] Étendre `tests/unit/seasonality.test.ts`: tout aliment `is_fruit_vegetable` du catalogue porte au moins un mois de saison — un fruit ou légume sans saison n'est jamais proposable

### Implementation for User Story 3

- [X] T036 [US3] Dans `scripts/build-foods-from-ciqual.mjs`, déduire l'encodage de chaque fichier XML de son BOM ou de sa déclaration `<?xml encoding=?>`, au lieu de décoder `windows-1252` en dur — les fichiers 2020 sont en windows-1252, les 2025 en UTF-8 avec BOM (R13)
- [X] T037 [US3] Basculer la construction sur le millésime 2025 et produire la liste des aliments **entrés** et **sortis** par rapport au catalogue précédent, dans le rapport (FR-214)
- [X] T038 [US3] **Réinterprétée.** La tâche supposait une table d'aliments épinglés par code, que la conception finale n'a pas retenue: aucun aliment n'est désigné individuellement, tout passe par des règles de classe. La garantie équivalente est en place — une classe présente dans le périmètre sans règle fait échouer la construction (T017) — et le rapport signale désormais les classes **retenues mais vides** dans le millésime, un cas réel puisque le sous-groupe des substituts de produits carnés compte 6 aliments en 2020 et aucun en 2025
- [X] T039 [US3] Statuer sur les classes d'alternatives végétales ouvertes par le nouveau périmètre (`060205` boissons végétales, `050205` desserts végétaux, `050306` alternatives aux fromages, `040309` alternatives aux charcuteries): les rattacher à une catégorie d'achat existante **ou** décider une catégorie nouvelle. Ranger une boisson de soja en `produit_laitier` lui collerait l'exclusion `lactose` et la retirerait des régimes végétaliens — ce serait faux
- [X] T040 [US3] **Si et seulement si** T039 conclut à une catégorie nouvelle: écrire la migration `supabase/migrations/0005_food_categories.sql` reprenant la contrainte `check` sur `public.foods.category` (ne jamais éditer une migration appliquée)
- [X] T041 [US3] **Si et seulement si** T039 conclut à une catégorie nouvelle: compléter les trois tables de `src/lib/months.ts` (`FAMILY_BY_CATEGORY`, `CATEGORY_LABELS`, `CATEGORY_GROUP_LABELS`)
- [X] T042 [US3] **Si et seulement si** T039 conclut à une famille d'affichage nouvelle: ajouter son jeton dans `src/styles/tokens.css` avec son **ratio de contraste mesuré consigné en commentaire**, plus son entrée dans `src/components/ds/FamilyDot.tsx` et `src/components/ds/FoodIcon.tsx` (porte VI)
- [X] T043 [US3] Rejouer `npm run build:seasonality` et vérifier le rapport: aucun fruit ou légume entrant ne doit rester sans mois de saison

**Checkpoint**: les trois récits livrés

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T044 Exécuter `npm run measure:catalogue -- --out` puis `--compare` contre `baseline/coverage-before.json`, et consigner le résultat dans `specs/003-catalogue-pertinence/baseline/comparaison.md` (FR-216, SC-007)
- [X] T045 Statuer sur le cas de test d'écart de `tests/unit/plan-solver.test.ts` au vu de T044: si l'écart B12 végane s'est refermé, le déplacer sur un cas franc plutôt que limite, et documenter dans le test **pourquoi** le cas a changé
- [X] T046 [P] Mettre à jour `docs/sources.md`: millésime, acquisition par API, règles de sélection par classe, quota et sa justification, classes écartées avec leurs motifs, et frontière donnée CIQUAL / décisions du projet
- [X] T047 [P] Mettre à jour le commentaire de `src/components/ds/FoodIcon.tsx` qui cite « 281 aliments », et vérifier que l'accueil affiche bien le compte dynamique
- [X] T048 Relecture manuelle de la porte « compatibilité régime »: parcourir les aliments **entrés** et vérifier qu'aucun produit d'origine animale ne porte l'étiquette végane. Les tests ne remplacent pas cette relecture, ils la verrouillent une fois faite
- [X] T049 Exécuter la chaîne complète: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:contract`, `npm run test:e2e`
- [X] T050 Dérouler `quickstart.md` de bout en bout, scénarios 0 à 6, et corriger le guide sur tout écart constaté

---

## Phase 7: Publication vers la base (ajoutée le 2026-09-17)

**Purpose**: reconstruire le catalogue ne le publie pas. L'accueil et la page « De saison » importent
`foods.json` à la compilation, mais la liste d'ingrédients lit la **base**. Sans cette phase, la
moitié visible du produit change et l'autre non — et les tests e2e passent au vert sans rien
démontrer du changement, puisqu'ils interrogent la base.

- [X] T051 Appliquer les migrations en attente sur le projet Supabase lié (`npx supabase db push`), après un `--dry-run` de contrôle
- [X] T052 Écrire `supabase/migrations/0006_food_selected_by.sql`: la colonne `selected_by` manquait au schéma, et le seed a refusé de charger plutôt que d'accepter une donnée que la table ne décrit pas. `0005` étant déjà appliquée, elle n'est pas modifiée
- [X] T053 Corriger `scripts/seed-reference.ts`, qui documentait `npm run seed:reference` sans jamais charger `.env.local`: l'usage documenté échouait sur une variable d'environnement manquante
- [X] T054 Exécuter `npm run seed:reference` et vérifier en base: 258 aliments, 133 lignes obsolètes supprimées, 451 lignes de saisonnalité, `selected_by` renseigné
- [X] T055 Rejouer les tests e2e **contre le catalogue réellement en base**: les exécutions précédentes portaient sur l'ancien catalogue et ne démontraient rien des nouvelles catégories
- [X] T056 Documenter le piège des deux chemins de données dans `docs/deploiement.md` et dans `quickstart.md`

- [X] T057 Borner l'exécution du solveur (`src/domain/plan/bounded-solve.ts` et `solver-worker.mjs`): il pouvait cycler indéfiniment et geler la boucle d'événements de Node, donc toutes les requêtes du serveur. Vérifié sur 384 combinaisons: aucune ne reste bloquée, pire cas 6,2 s
- [X] T058 Poser des plafonds COLLECTIFS par catégorie (`CATEGORY_DAILY_CAP_G` dans `solver.ts`): le solveur proposait sept œufs en cinq préparations et cinq algues séchées, le modèle voyant plusieurs aliments là où il n'y a qu'un ingrédient
- [X] T059 Dire à l'utilisateur qu'un complément sera probablement nécessaire quand aucune combinaison d'aliments ne peut couvrir un nutriment, en distinguant l'écart de saison (qui se referme seul) de l'écart structurel, et sans jamais prescrire (principe IV)
- [X] T060 Ajouter la section « Sans saison en France » à l'écran de saison: les fruits et légumes sans saison métropolitaine reviennent au catalogue et sont montrés comme tels, au lieu de disparaître en silence

**Checkpoint**: le produit sert le nouveau catalogue de bout en bout

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: aucune dépendance
- **Foundational (Phase 2)**: dépend du Setup — **bloque tous les récits**, pour une raison de fond et non d'organisation: la référence de comparaison est perdue dès la première modification de la sélection
- **US1 (Phase 3)**: dépend de la Phase 2. Indépendante de US2 et US3
- **US2 (Phase 4)**: dépend de la Phase 2. Techniquement indépendante de US1 — elle ne change que l'acquisition
- **US3 (Phase 5)**: dépend de la Phase 2. Dépend **en pratique** de US2: sans l'API, passer en 2025 revient à refaire un téléchargement manuel
- **Polish (Phase 6)**: dépend des récits livrés

### Within User Story 1

T012 (clé de classe) → T013 (structure des règles) → T014 (peuplement) → T015, T016 (quota, départage)
→ T017, T018 (échecs) → T019, T020, T021 (sorties). T022, T023, T024 sont indépendantes du reste et
parallélisables entre elles.

### Parallel Opportunities

- T002, T003 en Setup
- T008 à T011 (tests US1) entre eux, avant l'implémentation
- T022, T023, T024 (corrections d'anomalies) entre eux
- T026, T027 (tests US2) entre eux
- T034, T035 (tests US3) entre eux
- T046, T047 en Polish

---

## Implementation Strategy

### MVP (User Story 1 seule)

1. Phase 1 (Setup) → Phase 2 (référence figée) → Phase 3 (US1)
2. **ARRÊT et VALIDATION**: `quickstart.md` § Scénario 1, sur l'archive 2020
3. À ce stade, le défaut principal est corrigé — les 18 nombres ont disparu — sans avoir touché à la
   source. C'est un incrément complet et défendable.

### Livraison incrémentale

1. Setup + Foundational → référence figée
2. US1 → sélection par classe → valider → **MVP**
3. US2 → acquisition par API → valider
4. US3 → millésime 2025 → valider
5. Polish → mesure comparative, documentation, relecture

### Point d'attention transverse

La comparaison avant/après (T044) et l'arbitrage sur le test d'écart (T045) ne peuvent pas être
anticipés : ils dépendent de ce que la mesure montrera. La vitamine B12 du régime végane est le point
sensible — un écart qui se referme à exactement 100 % du besoin, en saturant toutes les bornes
hautes, n'est pas une amélioration à célébrer mais un résultat à documenter comme fragile.

---

## Notes

- `[P]` = fichiers différents, aucune dépendance
- Commiter après chaque tâche ou groupe logique cohérent
- T040, T041 et T042 sont **conditionnelles** à la décision prise en T039: si aucune catégorie
  nouvelle n'est nécessaire, elles sont sans objet et doivent être cochées comme telles, pas
  silencieusement ignorées
