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
  "profile": { "weight_kg": 75, "height_cm": 178, "age": 35, "reference_sex": "male", "activity_level": "active" },
  "diet": { "base": "vegan", "exclusions": ["gluten"] },
  "period": "week",
  "generated_at": "2026-09-13T10:00:00Z"
}
```

Le profil et le régime sont deux champs **séparés**: le profil sert au calcul des besoins, le régime
uniquement à la sélection des aliments. La séparation du principe III reste donc lisible dans le
contrat, même quand les deux voyagent dans la même requête. `generated_at` fixe le mois retenu pour
la saisonnalité (FR-014).

**Amendement du 2026-09-13**: la version initiale de ce contrat prévoyait un `needs_token`
référençant un résultat stocké côté serveur. Ce stockage arrive avec le mode invité et le
rattachement au compte (tâche T056); d'ici là, inventer un mécanisme de jeton aurait été une
complexité sans usage. Le profil est donc transmis en clair, et `needs_token` le remplacera quand le
stockage existera.

**Réponse 200**: un objet `IngredientPlan` conforme à
[ingredient-plan.schema.json](./ingredient-plan.schema.json).

**Amendement du 2026-09-17 (schéma 1.0.0 -> 1.1.0)**: chaque ingrédient soumis à saisonnalité porte
désormais `season_months`, la liste de ses mois de disponibilité de 1 à 12. Sans ce champ, l'écran de
la liste ne peut afficher que « de saison » ou « hors saison », jamais la période elle-même
(FR-107 de la 002). L'ajout est **additif**: le champ est facultatif, les consommateurs du 1.0.0
l'ignorent et continuent de fonctionner.

## POST /api/results

Enregistre un résultat dans l'historique, et sert aussi de rattachement d'un résultat obtenu en
mode invité (FR-024, FR-026). Authentification requise.

**Requête**

```json
{
  "profile": { "weight_kg": 75, "height_cm": 178, "age": 35, "reference_sex": "male", "activity_level": "active" },
  "period": "day",
  "diet": { "base": "vegan", "exclusions": [] }
}
```

**Réponse 201**: `{ "id": "uuid" }`.

Le client n'envoie PAS les besoins calculés: il envoie le profil, et le serveur recalcule avant
d'enregistrer. Une falsification côté navigateur est donc sans effet, et chaque entrée d'historique
reste reproductible depuis ses seules entrées (FR-038).

**Amendement du 2026-09-13**: la version initiale prévoyait un `needs_token` puis un point d'entrée
`POST /api/results/claim` distinct, adossés à un stockage serveur des résultats invités (décision
R8). Ce stockage a été abandonné: il aurait fallu une table lisible sans session, donc exposée à
l'énumération, pour des données de santé. Conserver le résultat invité dans la session du navigateur
et faire recalculer le serveur au moment de l'enregistrement atteint le même but sans cette surface
de risque. Le rattachement est donc devenu un simple appel à `POST /api/results`, et
`/api/results/claim` n'existe pas.

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
