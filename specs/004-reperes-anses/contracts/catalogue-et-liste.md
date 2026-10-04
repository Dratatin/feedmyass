# Contrats modifiés : catalogue et liste d'ingrédients

**Feature**: 004-reperes-anses

## Catalogue — `foods.json` (extension de [003/foods.schema.json](../../003-catalogue-pertinence/contracts/foods.schema.json))

Trois champs ajoutés à chaque aliment, tous produits par `npm run build:foods` :

```json
{
  "anses_subgroup": "legumineuses",
  "family": "tofu",
  "attached_by": { "classe": "ss:1009", "regle": "proteines-vegetales-par-usage", "substitut": true }
}
```

- `anses_subgroup` : code d'un sous-groupe de `consumption-model.json`, ou `null` (non proposable).
- `family` : chaîne non vide.
- `attached_by.regle` : identifiant d'une ligne de la table de rattachement (research R4), consultable
  dans `_meta.rattachement` du fichier, qui reprend la table avec le motif de chaque ligne.

Champ de composition ajouté : `retinol` (µg/100 g).

La construction échoue — sans écrire de fichier — si une classe retenue n'a pas de ligne de
rattachement, si une règle désigne un sous-groupe inconnu, ou si un aliment reste sans famille.

## Liste d'ingrédients — [001/ingredient-plan.schema.json](../../001-nutrition-ingredient-planner/contracts/ingredient-plan.schema.json)

**Inchangée** (version 1.1.0). Le futur service de recettes ne voit aucune différence de forme.
Deux changements de sens, sans changement de forme :

- `gaps[].ratio` vaut désormais la couverture de la liste livrée (FR-320) ; il était parfois un
  maximum théorique.
- `items[].displayQuantity` n'exprime plus jamais moins d'une demi-unité (FR-323).

## API — `POST /api/plan` ([001/api.md](../../001-nutrition-ingredient-planner/contracts/api.md))

Un code d'erreur ajouté :

```json
{ "error": { "code": "plan_computation_interrupted", "message": "Le calcul de la liste n'a pas abouti. Réessayez." } }
```

Statut 503. Renvoyé lorsque la résolution a été interrompue deux fois (FR-319). Il remplace le
comportement actuel, qui convertissait l'interruption en écarts nutritionnels.
