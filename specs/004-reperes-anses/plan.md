# Implementation Plan: Liste d'ingrédients fondée sur les repères de l'ANSES

**Branch**: `004-reperes-anses` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-reperes-anses/spec.md`

## Summary

La liste cesse de minimiser sa masse totale et reprend le **modèle d'optimisation de l'ANSES**
(avis 2012-SA-0103, décembre 2016) : rester au plus près de la consommation moyenne française, par
sous-groupe d'aliments et par sexe, dans les bornes publiées, en favorisant fruits, légumes et
féculents complets et en défavorisant viande rouge et charcuterie. Le modèle reste un programme
linéaire, résolu par la bibliothèque déjà en place (research R2).

Trois changements de structure l'accompagnent :

1. **Contraintes nutritionnelles flexibles** (R3) : un manque devient un coût très élevé au lieu
   d'une impossibilité. Le modèle est toujours réalisable, se résout en une fois, et la relaxation
   séquentielle — qui levait le plafond énergétique et fabriquait des écarts — disparaît.
2. **Limites de sécurité** (R6) : bornes dures sur l'iode, le sélénium, le zinc, le cuivre, les
   vitamines D, B6, E, le calcium et le rétinol.
3. **Consolidation** (R7) : une variante par famille et au moins une demi-portion, garanties par une
   re-résolution itérative.

Côté données, chaque aliment du catalogue est rattaché à un sous-groupe de l'ANSES et à une famille
par le script de construction, à partir de sa classe CIQUAL (R4) ; les paramètres du modèle et les
limites de sécurité deviennent deux fichiers de référence avec provenance valeur par valeur.

## Technical Context

**Language/Version**: TypeScript 5 (application, Next.js 16), Node.js ESM pour les scripts de
données

**Primary Dependencies**: `javascript-lp-solver` (inchangé) ; aucune dépendance nouvelle — HiGHS
écarté (R7)

**Storage**: fichiers de référence versionnés dans `src/data/reference/`, chargés dans Supabase par
`npm run seed:reference` ; migration `0007` (deux tables, trois colonnes sur `foods`)

**Testing**: Vitest (unitaires, contrat), Playwright (e2e), et la simulation `npm run simulate:plans`
comme vérification des critères de succès

**Target Platform**: serveur Next.js (route `/api/plan`), solveur dans un worker borné

**Project Type**: application web Next.js avec scripts de génération de données

**Performance Goals**: aucune liste au-delà d'une seconde sur les 1 408 combinaisons simulées
(SC-008) ; 3 à 5 résolutions par liste au lieu de 26 au pire

**Constraints**: aucune valeur sans source primaire (principe II) ; besoins indépendants du régime
(principe III) ; forme de la liste inchangée (contrat 1.1.0) ; écarts jamais fabriqués par une
interruption

**Scale/Scope**: ≈ 250 aliments, 32 sous-groupes × 2 sexes (dont une vingtaine alimentés par le catalogue), 9 limites de sécurité, 26 nutriments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Porte | Vérification au design | Statut |
|----------|-------|------------------------|--------|
| I. Spécification d'abord | Spec validée avant tout code | Spec complète, aucun marqueur ouvert, 3 clarifications consignées ; aucun code applicatif modifié avant ce plan (la PR #5 ne contient que la correction du catalogue et la spec) | PASS |
| II. Exactitude nutritionnelle traçable | Toute valeur sourcée, version et date | La feature **retire** les seuils sans source (plafonds par catégorie, plancher de 400 g) et ajoute deux fichiers où chaque valeur porte tableau et page. Deux points de vigilance, traités par des tâches : relecture des valeurs sur le rendu du PDF (R1), et confirmation des limites de sécurité sur source primaire (R6). Les décisions du projet (substitutions, demi-portion, poids des manques) sont nommées comme telles dans `_meta.notes` | PASS sous condition des deux relectures |
| III. Séparation besoins / régime | Le calcul des besoins ignore le régime | Aucun changement du calcul des besoins. Le régime agit sur les candidats et les sous-groupes actifs, le sexe sur les paramètres du modèle ; les limites de sécurité ne sont pas des besoins et vivent hors des apports de référence (R6). Le test d'invariant reste vert | PASS |
| IV. Information, jamais conseil médical | Pas de prescription | Aucune sortie nouvelle. L'écart d'iode attendu pour certains régimes est présenté comme les autres écarts, avec le renvoi existant vers un professionnel | PASS |
| V. Identité déléguée et minimisation | Aucune donnée personnelle nouvelle | Le sexe est déjà saisi et déjà transmis à la route | PASS |
| VI. Direction visuelle maison | Tokens, contrastes, couleur jamais seule | Aucun écran modifié. Le seul affichage nouveau est le message d'erreur « calcul interrompu », rendu par le composant `Notice` existant | PASS |

**Portes qualité supplémentaires** :

- *Compatibilité régime de chaque ingrédient proposé* — inchangée dans son principe ; la simulation
  la contrôle sur les 1 408 listes.
- *Conformité des valeurs aux sources officielles* — un test compare chaque paramètre du modèle à
  sa provenance déclarée et vérifie les invariants (moyennes de l'annexe 6 = moyennes du tableau 9).
- *Saisonnalité sur douze mois* — inchangée ; la pomme de terre change de sous-groupe mais garde
  son calendrier.
- *Traçabilité des données* — `docs/sources.md` reçoit une section « Modèle de consommation » et
  une section « Limites de sécurité », avec les écarts assumés, dans le même commit que les fichiers.

**Re-vérification après la phase 1** : le modèle de données et les contrats ne font apparaître aucune
violation nouvelle. Pas de complexité à justifier : aucune dépendance, aucun service, aucun niveau
d'abstraction ajouté — un module de construction du modèle remplace la relaxation.

## Project Structure

### Documentation (this feature)

```text
specs/004-reperes-anses/
├── spec.md
├── plan.md                 # ce fichier
├── research.md             # R1-R12
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── consumption-model.schema.json
│   ├── upper-limits.schema.json
│   └── catalogue-et-liste.md
├── baseline/               # simulations avant / après, comparaison (R11)
├── checklists/requirements.md
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── data/
│   ├── reference/
│   │   ├── consumption-model.json        # NOUVEAU — paramètres ANSES (R1)
│   │   ├── upper-limits.json             # NOUVEAU — limites de sécurité (R6)
│   │   └── foods.json                    # + anses_subgroup, family, attached_by, retinol
│   └── repositories/reference.ts         # + fetchConsumptionModel, fetchUpperLimits
├── domain/
│   ├── types.ts                          # + ConsumptionSubgroup, UpperLimit ; Food étendu
│   └── plan/
│       ├── index.ts                      # PlanInput + referenceSex, subgroups, upperLimits
│       ├── consumption-model.ts          # NOUVEAU — sous-groupes actifs, substitutions (R5)
│       ├── solver.ts                     # réécrit — critère ANSES, manques flexibles (R2, R3)
│       ├── consolidate.ts                # NOUVEAU — familles, demi-portion (R7)
│       ├── gaps.ts                       # NOUVEAU — écarts depuis les manques, causes (R3)
│       ├── relax.ts                      # SUPPRIMÉ
│       ├── coverage.ts                   # inchangé
│       └── bounded-solve.ts              # + nouvel essai à précision 1e-4 (R8)
├── app/api/plan/route.ts                 # transmet le sexe ; erreur plan_computation_interrupted
└── lib/errors.ts                         # + code d'erreur

scripts/
├── build-foods-from-ciqual.mjs           # table de rattachement, familles, rétinol (R4)
├── seed-reference.ts                     # + deux fichiers
├── simulate-plans.ts                     # + contrôles SC-001, SC-002, SC-009, SC-010, SC-011
└── check-caps.ts                         # SUPPRIMÉ (R12)

supabase/migrations/0007_consumption_model.sql   # NOUVEAU

tests/unit/
├── consumption-model.test.ts             # NOUVEAU — provenance, invariants des paramètres
├── catalogue-selection.test.ts           # + invariants de rattachement et de famille
├── plan-solver.test.ts                   # réécrit — critère, flexibilité, garde-fous
├── plan-consolidate.test.ts              # NOUVEAU
└── needs-diet-invariant.test.ts          # inchangé, doit rester vert

docs/sources.md                           # + modèle de consommation, limites de sécurité
```

**Structure Decision**: structure existante conservée. Le calcul reste dans `src/domain/plan/`,
découpé par responsabilité : construction du modèle, résolution, consolidation, écarts. Les données
suivent le chemin déjà établi par la 003 : script de construction → fichier de référence versionné
→ seed → base.

## Ordre de livraison

Les user stories partagent le même calcul ; l'ordre suit les dépendances, chaque étape restant
vérifiable par la simulation.

1. **Mesure de départ** (R11) — avant tout code.
2. **Données** : `consumption-model.json` (relu sur le PDF), `upper-limits.json` (sources
   primaires), rattachement et familles dans le catalogue, migration, seed. Tests de provenance.
3. **US4 + US1 (P1)** : solveur réécrit — critère ANSES, manques flexibles, limites de sécurité,
   écarts depuis les manques. Suppression de la relaxation et des plafonds maison.
4. **US2 (P2)** : sous-groupes exclus et substitutions.
5. **US5 (P2)** : consolidation.
6. **US3 (P3)** : `docs/sources.md`, `_meta.notes`, test « aucun seuil en grammes propre au projet ».
7. **Mesure finale** et comparaison ; seed en base avec accord explicite.

## Risques

| Risque | Effet | Parade |
|---|---|---|
| Poids des manques mal calibré | habitudes privilégiées au détriment d'un nutriment | SC-005 : aucune régression de couverture sur la simulation ; poids ajusté et documenté si besoin |
| Végan infaisable malgré la levée des bornes | écarts nombreux | modèle flexible : une liste sort toujours, les écarts sont nommés ; mesure avant/après |
| Consolidation qui crée des écarts | couverture dégradée | SC-013 : écarts nouveaux nommés ; HiGHS en repli identifié (R7) |
| Cyclage persistant | listes lentes | moins de résolutions ; second essai ; erreur franche (R8) |
| Valeurs mal transcrites du PDF | modèle faux mais « sourcé » | relecture sur rendu + invariants croisés tableau 9 / annexe 6 |

## Complexity Tracking

Aucune violation de la constitution à justifier.
