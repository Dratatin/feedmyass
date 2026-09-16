# Phase 1 - Data Model: Besoins nutritionnels et liste d'ingrédients de saison

**Feature**: 001-nutrition-ingredient-planner | **Date**: 2026-09-13 | **Plan**: [plan.md](./plan.md)

Deux familles de données, gouvernées par des règles différentes:

- **Données de référence** (`nutrients`, `reference_intakes`, `foods`, `seasonality`): en lecture
  seule pour l'application, versionnées dans le dépôt, chargées par seed, lisibles par tous, porteuses
  de leur source et de leur version (principe II).
- **Données utilisateur** (`profiles`, `results`): écrites par l'application, cloisonnées par
  Row Level Security sur `auth.uid()` (principe V, FR-028).

## Données de référence

### nutrients

| Champ | Type | Règles |
|-------|------|--------|
| `code` | text, PK | identifiant stable (`energy`, `protein`, `vitamin_b12`, `iron`...) |
| `label` | text | libellé français affiché |
| `unit` | text | `kcal`, `g`, `mg`, `µg` |
| `category` | text | `energy`, `macro`, `vitamin`, `mineral` |
| `is_priority` | boolean | vrai pour fer, calcium, magnésium, B12, D, C (seuil 100 %, FR-016) |
| `display_order` | integer | ordre d'affichage |

### reference_intakes

| Champ | Type | Règles |
|-------|------|--------|
| `id` | uuid, PK | |
| `nutrient_code` | text, FK -> nutrients | |
| `reference_sex` | text | `female`, `male` |
| `age_min`, `age_max` | integer | bornes incluses, en années |
| `kind` | text | `RNP`, `AS`, `BEM` — nature de la valeur, affichée (FR-009) |
| `value` | numeric | exprimée dans l'unité du nutriment |
| `source` | text | publication officielle citée |
| `version` | text | version ou millésime de la publication |
| `retrieved_at` | date | date de récupération |

Contrainte: pas de chevauchement de tranches d'âge pour un même triplet
(`nutrient_code`, `reference_sex`, `kind`). Un profil hors de toute tranche est un refus explicite,
pas une extrapolation.

### foods

| Champ | Type | Règles |
|-------|------|--------|
| `code` | text, PK | code CIQUAL ou code interne pour les aliments enrichis |
| `label` | text | libellé français |
| `category` | text | `legume`, `fruit`, `cereale`, `legumineuse`, `viande`, `poisson`, `oeuf`, `produit_laitier`, `matiere_grasse`, `fruit_a_coque`, `autre` |
| `is_fruit_vegetable` | boolean | soumet l'aliment à la règle de saisonnalité (FR-014) |
| `is_fortified` | boolean | aliment enrichi, affiché comme tel (FR-018) |
| `diet_tags` | text[] | régimes de base compatibles |
| `excluded_by` | text[] | exclusions déclenchées (`gluten`, `lactose`, `nuts`) |
| `composition` | jsonb | apports pour 100 g, indexés par `nutrient_code` |
| `min_qty_g`, `max_qty_g` | numeric | bornes réalistes par période, utilisées par le solveur (R6) |
| `unit_label` | text | unité d'achat affichée (`botte`, `boîte`, `portion de 100 g`) |
| `unit_grams` | numeric | conversion vers l'unité affichée, pour les arrondis (FR-016) |
| `source`, `version`, `retrieved_at` | text/date | traçabilité |

### seasonality

| Champ | Type | Règles |
|-------|------|--------|
| `food_code` | text, FK -> foods | uniquement des aliments `is_fruit_vegetable` |
| `month` | integer | 1 à 12 |
| `source`, `version` | text | traçabilité |

Clé primaire (`food_code`, `month`). Absence de ligne = hors saison ce mois-là.

## Données utilisateur

### profiles

Un profil courant par utilisateur; l'historique conserve ses propres instantanés.

| Champ | Type | Règles de validation (FR-002) |
|-------|------|-------------------------------|
| `user_id` | uuid, PK, FK -> auth.users | supprimé en cascade (FR-029) |
| `weight_kg` | numeric | 30 à 250, refus hors bornes |
| `height_cm` | numeric | 120 à 230 |
| `age` | integer | 18 à 70; hors bornes = profil non couvert (FR-011) |
| `reference_sex` | text | `female` ou `male`, présenté comme choix de table de référence |
| `activity_level` | text | `sedentary`, `low_active`, `active`, `very_active` |
| `diet_base` | text | `omnivore`, `pescetarian`, `vegetarian`, `vegan` |
| `exclusions` | text[] | sous-ensemble de `gluten`, `lactose`, `nuts` |
| `created_at`, `updated_at` | timestamptz | |

RLS: `select`, `insert`, `update`, `delete` autorisés si `user_id = auth.uid()`.

### results

Entrée d'historique **immuable** (FR-027): aucune politique `update`.

| Champ | Type | Règles |
|-------|------|--------|
| `id` | uuid, PK | |
| `user_id` | uuid, FK -> auth.users | cascade à la suppression du compte |
| `period` | text | `day` ou `week` |
| `generated_at` | timestamptz | fait foi pour la saisonnalité (FR-014) |
| `profile_snapshot` | jsonb | copie du profil au moment du calcul |
| `needs` | jsonb | valeur, unité, `kind` et référence par nutriment |
| `plan` | jsonb | `IngredientPlan` conforme au schéma de contrat |
| `reference_versions` | jsonb | versions des tables utilisées (FR-038) |

RLS: `select`, `insert`, `delete` si `user_id = auth.uid()`; pas d'`update`.

### Résultat invité (hors base utilisateur)

Stocké côté serveur avec une durée de vie courte, référencé par un cookie de session signé
(R8). Mêmes champs que `results`, sans `user_id`. Le rattachement au compte crée une ligne `results`
et supprime l'entrée invité.

## Relations

```text
auth.users (Supabase)
   |
   +--1:1--> profiles
   |
   +--1:N--> results

nutrients --1:N--> reference_intakes
nutrients <--référencé par-- foods.composition (clés jsonb)
foods --1:N--> seasonality
```

## Règles métier portées par le modèle

- **Principe III / FR-008**: `reference_intakes` n'a aucune colonne liée au régime. Le régime
  n'existe que sur `profiles` et sur `foods`; il est structurellement incapable d'influer sur les
  besoins.
- **FR-016 / FR-017**: `nutrients.is_priority` porte le seuil applicable (100 % ou 80 %); le taux de
  couverture atteint et les écarts sont calculés puis figés dans `results.plan`.
- **FR-014**: un aliment `is_fruit_vegetable` n'est candidat que s'il existe une ligne `seasonality`
  pour le mois de `generated_at`.
- **FR-013**: un aliment est candidat si `diet_base` figure dans `diet_tags` et si aucune exclusion
  du profil n'apparaît dans `excluded_by`.
- **FR-018**: les aliments enrichis (`is_fortified`) sont candidats comme les autres mais restent
  identifiés comme tels dans la liste rendue.
- **FR-038**: `reference_versions` fige les versions utilisées, ce qui rend chaque résultat
  reproductible même après mise à jour d'une table de référence.

## États et transitions

```text
Profil saisi (invité)  --calcul-->  Résultat invité (expirable)
        |                                   |
        | connexion                         | rattachement explicite
        v                                   v
Profil enregistré      --calcul-->  Entrée d'historique (immuable)
        |
        | suppression du compte
        v
Profil et historique effacés (cascade)
```
