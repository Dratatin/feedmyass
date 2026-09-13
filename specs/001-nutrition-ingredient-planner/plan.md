# Implementation Plan: Besoins nutritionnels personnalisés et liste d'ingrédients de saison

**Branch**: `001-nutrition-ingredient-planner` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-nutrition-ingredient-planner/spec.md`

## Summary

Application web responsive qui calcule les besoins nutritionnels journaliers et hebdomadaires d'un
profil (poids, taille, âge, sexe de référence, niveau d'activité) à partir des références officielles
françaises, puis propose une liste d'ingrédients et de quantités couvrant ces besoins, compatible
avec le régime déclaré et limitée aux fruits et légumes de saison.

Approche technique retenue: une application Next.js (App Router, TypeScript) unique, avec un coeur
métier pur isolé dans `src/domain`, des données de référence versionnées et embarquées (apports
ANSES, composition CIQUAL, calendrier de saisonnalité), une sélection d'ingrédients par
programmation linéaire sous contraintes de couverture, et Supabase pour l'identité déléguée et le
stockage applicatif cloisonné par utilisateur. Aucune API externe n'est appelée sur le chemin
critique, ce qui satisfait l'exigence de résilience sans mécanisme de repli complexe.

## Technical Context

**Language/Version**: TypeScript 5.x sur Node.js 22 LTS

**Primary Dependencies**: Next.js (App Router, React) en version stable majeure courante (>= 15);
Tailwind CSS alimenté par les tokens extraits du design system Figma; `@supabase/supabase-js` et
`@supabase/ssr`; solveur de programmation linéaire embarqué (`javascript-lp-solver` ou `glpk.js`);
Zod pour la validation des entrées

**Storage**: Supabase Postgres. Données applicatives (profils, historique) protégées par Row Level
Security; données de référence (nutriments, apports, aliments, saisonnalité) versionnées dans le
dépôt et chargées par migration/seed

**Testing**: Vitest pour les tests unitaires et les invariants métier; Playwright pour les parcours
de bout en bout et le rendu responsive

**Target Platform**: navigateurs desktop et mobile modernes, de 320 px à 1920 px de large;
déploiement sur offre gratuite (Vercel + Supabase)

**Project Type**: application web full-stack mono-déployable (UI + route handlers dans le même
projet)

**Performance Goals**: résultat affiché en moins de 3 s pour 95 % des demandes (SC-010); calcul des
besoins sous 100 ms; génération d'une liste d'ingrédients sous 1,5 s au 95e centile

**Constraints**: aucune dépendance à une API externe sur le chemin critique (FR-036); aucun mot de
passe ni session gérés par l'application (FR-022); accessibilité WCAG 2.1 AA (FR-033); services
externes limités à leurs offres gratuites; données de référence traçables (source + version) pour
chaque résultat produit (FR-038)

**Scale/Scope**: quelques centaines d'utilisateurs, ~25 nutriments suivis, ~250 aliments de
référence curés, ~8 écrans

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Porte | Vérification au design | Statut |
|----------|-------|------------------------|--------|
| I. Spécification d'abord | La spec est validée avant tout code | spec.md complet, checklist 16/16, aucun marqueur ouvert | PASS |
| II. Exactitude nutritionnelle traçable | Aucune valeur sans source + version; tests sur profils de contrôle | Tables `nutrients`, `reference_intakes`, `foods`, `seasonality` portent `source` et `version`; `reference_versions` figé dans chaque résultat; suite de profils de contrôle en test unitaire | PASS |
| III. Séparation besoins / régime | Le calcul des besoins ignore le régime | `computeNeeds(profile)` ne reçoit pas le régime: il est absent du type d'entrée, donc la violation est impossible à écrire; test d'invariant sur deux profils ne différant que par le régime | PASS |
| IV. Information, jamais conseil médical | Pas de diagnostic, de posologie ni d'objectif de poids | Bandeau sur tout écran de résultat; aucun champ objectif de poids; FR-018 limité aux aliments enrichis; vocabulaire des écarts non prescriptif | PASS |
| V. Identité déléguée et minimisation | Aucun mot de passe, aucune session maison, cloisonnement par utilisateur | Supabase Auth gère identité et session; RLS `user_id = auth.uid()` sur toutes les tables applicatives; export et suppression de compte prévus | PASS |
| VI. Design system d'abord | Composants et tokens issus du Figma existant | `src/components/ds` généré depuis les 33 noeuds de l'Annexe A; aucun composant hors design system sans justification | PASS sous réserve: l'extraction Figma reste à faire (R7), c'est une tâche bloquante de la phase d'implémentation, pas une dérogation |

Portes supplémentaires issues de la section "Workflow de développement et portes qualité":
tests obligatoires sur l'invariant besoins/régime, la conformité aux sources officielles, la
compatibilité régime de chaque ingrédient proposé et la saisonnalité vérifiée sur les douze mois —
tous planifiés en Phase 1 et repris dans `quickstart.md`.


### Re-évaluation après la Phase 1

Reprise des portes une fois `research.md`, `data-model.md`, `contracts/` et `quickstart.md` écrits:

- **II** renforcé: `source`, `version` et `retrieved_at` sont des colonnes obligatoires des quatre
  tables de référence, le seed refuse un fichier qui en manque, et `results.reference_versions`
  fige les versions utilisées par chaque résultat.
- **III** renforcé: `POST /api/needs` n'accepte pas le régime dans son schéma d'entrée et
  `reference_intakes` n'a aucune colonne liée au régime — le principe est devenu une propriété du
  contrat et du schéma, pas seulement une consigne.
- **IV** tenu: `gaps` et `is_fortified` expriment les écarts et les aliments enrichis; aucun champ
  du contrat ne permet d'exprimer une posologie ou un objectif de poids.
- **V** tenu: RLS sur `profiles` et `results`, absence volontaire de politique `update` sur
  `results` (FR-027), export et suppression de compte contractualisés.
- **VI** inchangé: toujours en attente de l'extraction Figma (R7), sans autre effet que de bloquer
  les tâches d'interface.

Aucune violation nouvelle; la section Complexity Tracking reste vide.
## Project Structure

### Documentation (this feature)

```text
specs/001-nutrition-ingredient-planner/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── api.md
│   └── ingredient-plan.schema.json
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (public)/            # accueil, saisie du profil, résultats (mode invité)
│   ├── (account)/           # espace personnel: profil, historique, données
│   └── api/                 # route handlers: needs, plan, results, account
├── components/
│   ├── ds/                  # composants dérivés du design system Figma (Annexe A)
│   └── features/            # formulaire profil, tableau des besoins, liste d'ingrédients
├── domain/
│   ├── needs/               # calcul des besoins: Henry + NAP, apports de référence
│   ├── diet/                # régimes, exclusions, filtrage des aliments
│   ├── seasonality/         # disponibilité mensuelle des fruits et légumes
│   └── plan/                # sélection d'ingrédients, couverture, écarts
├── data/
│   ├── reference/           # données de référence versionnées (JSON + métadonnées de source)
│   └── repositories/        # accès Supabase (profils, résultats)
├── lib/                     # client Supabase, validation Zod, formatage
└── styles/                  # tokens et thème issus du design system

supabase/
├── migrations/              # schéma, RLS, index
└── seed/                    # chargement des tables de référence

tests/
├── unit/                    # domaine pur: besoins, régimes, saisonnalité, solveur
├── contract/                # route handlers contre contracts/api.md
└── e2e/                     # parcours US1 à US4, responsive 320 px et 1920 px
```

**Structure Decision**: application web unique Next.js plutôt qu'un couple backend/frontend séparés.
Il n'existe aujourd'hui aucun autre consommateur de l'API, un seul déployable tient dans les offres
gratuites, et la frontière qui compte pour l'évolutivité n'est pas HTTP mais `src/domain`: ce coeur
est pur, sans dépendance à Next.js ni à Supabase, testable isolément et réutilisable tel quel par le
futur service de génération de recettes (FR-037). `src/domain/needs` ne reçoit jamais le régime en
entrée, ce qui inscrit le principe III dans les types plutôt que dans une convention.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Aucune violation: toutes les portes de la constitution sont passées. La seule réserve (extraction
des composants Figma, R7) est une tâche à exécuter, pas une dérogation à justifier.
