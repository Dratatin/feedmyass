# Phase 1 - Contracts: interfaces exposées

**Feature**: 001-nutrition-ingredient-planner | **Date**: 2026-09-13

Interfaces HTTP internes (route handlers Next.js) consommées par l'interface, plus le contrat de
sortie stable destiné au futur service de recettes. Toutes les entrées sont validées par un schéma;
toute erreur de validation renvoie `400` avec la liste des champs fautifs (FR-002).

Format d'erreur commun:

```json
{ "error": { "code": "validation_error", "message": "...", "fields": [{ "field": "weight_kg", "expected": "30..250" }] } }
```

Codes: `validation_error` (400), `profile_out_of_scope` (422, FR-011), `unauthorized` (401),
`not_found` (404), `reference_data_unavailable` (503, FR-036).

## POST /api/needs

Calcule les besoins. Accessible sans compte (FR-024).

**Requête**

```json
{
  "weight_kg": 72, "height_cm": 178, "age": 34,
  "reference_sex": "male", "activity_level": "active"
}
```

Le régime n'est volontairement pas accepté par ce point d'entrée: c'est la traduction en contrat du
principe III et de FR-008.

**Réponse 200**

```json
{
  "daily": [ { "nutrient": "energy", "label": "Énergie", "value": 2680, "unit": "kcal", "kind": "BEM", "reference": { "source": "ANSES", "version": "..." } } ],
  "weekly": [ { "nutrient": "energy", "value": 18760, "unit": "kcal" } ],
  "reference_versions": { "intakes": "...", "equations": "Henry 2005" },
  "disclaimer": "Estimation informative, sans valeur de diagnostic ou de conseil médical."
}
```

Invariant vérifié par test: deux requêtes identiques produisent des valeurs identiques, et aucune
entrée liée au régime ne peut modifier la réponse.

## POST /api/plan

Produit la liste d'ingrédients couvrant des besoins donnés. Accessible sans compte.

**Requête**

```json
{
  "needs_token": "...",
  "period": "week",
  "diet": { "base": "vegan", "exclusions": ["gluten"] },
  "generated_at": "2026-09-13T10:00:00Z"
}
```

`needs_token` référence le résultat de `/api/needs` calculé côté serveur; `generated_at` fixe le
mois retenu pour la saisonnalité (FR-014).

**Réponse 200**: un objet `IngredientPlan` conforme à
[ingredient-plan.schema.json](./ingredient-plan.schema.json).

## POST /api/results

Enregistre un résultat dans l'historique. Authentification requise (FR-024).

**Requête**: `{ "needs_token": "...", "plan_token": "..." }` — **Réponse 201**: `{ "id": "uuid" }`.

## POST /api/results/claim

Rattache un résultat généré en mode invité au compte qui vient de se connecter (FR-024, R8).
Authentification requise. **Requête**: `{ "guest_result_id": "..." }` — **Réponse 201**:
`{ "id": "uuid" }`. Un résultat invité expiré renvoie `404`, ce qui déclenche le message prévu.

## GET /api/results

Liste l'historique de l'utilisateur connecté, du plus récent au plus ancien.
**Réponse 200**: `{ "items": [ { "id": "...", "generated_at": "...", "period": "day", "profile_snapshot": {...} } ] }`.

## GET /api/results/{id}

Détail d'une entrée d'historique. `404` si l'entrée appartient à un autre utilisateur — le
cloisonnement est appliqué par RLS, pas par un filtre applicatif (FR-028).

## DELETE /api/results/{id}

Supprime une entrée d'historique. **Réponse 204**.

## GET /api/account/export

Export des données personnelles de l'utilisateur connecté (profil + historique) en JSON (FR-029).

## DELETE /api/account

Supprime le profil et tout l'historique de l'utilisateur connecté, puis révoque la session
(FR-029). **Réponse 204**.
