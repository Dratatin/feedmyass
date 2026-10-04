# Data Model: Liste d'ingrédients fondée sur les repères de l'ANSES

**Feature**: 004-reperes-anses | **Date**: 2026-10-04

Trois données de référence nouvelles ou étendues, et une transformation du calcul. Les formats
exacts des fichiers sont dans [contracts/](./contracts/).

## 1. Sous-groupe de consommation (nouveau)

Fichier `src/data/reference/consumption-model.json`, table `consumption_subgroups`.

| Champ | Type | Règle |
|---|---|---|
| `code` | texte | identifiant stable (`legumes`, `fruits_frais`, `viande_hors_volaille`…) |
| `label` | texte | libellé ANSES exact |
| `direction` | `mean` \| `maximize` \| `minimize` | `mean` par défaut ; `maximize` pour fruits frais, légumes, pain complet, autres féculents complets ; `minimize` pour viande hors volaille et charcuterie (tableau 5) |
| `by_sex.male` / `by_sex.female` | objet | `{ lower, mean, sd, upper, provenance }` en g/j |
| `lower` | nombre ≥ 0 | P5, tableau 9 |
| `mean` | nombre ≥ 0 | moyenne, tableau 9 |
| `sd` | nombre > 0 | écart-type, annexe 6 ; requis si `direction = mean` |
| `upper` | nombre ou `null` | P95, ou plafond épidémiologique ; `null` = « pas de limite supérieure » |
| `provenance` | objet | `{ table, page }` pour chaque valeur — refus au chargement si absent |
| `coupled_with` | code ou `null` | sous-groupe dont la somme est bornée par `coupled_upper` |
| `coupled_upper` | objet `{ male, female }` ou `null` | limite couplante, tableau 9 |
| `substitutes_for` | liste de codes | sous-groupes dont l'exclusion lève la borne haute de celui-ci (décision du projet, FR-310a) |

`_meta` : `source` (référence de l'avis), `version` (`2016-12`), `retrieved_at`, `notes` qui
signalent chaque décision du projet (substitutions, extension d'âge, contaminants hors périmètre).

**Validation** : `lower ≤ mean` sauf plafond épidémiologique (charcuterie : moyenne 39 > plafond
25, attendu) ; `lower ≤ upper` ; tout `coupled_with` désigne un sous-groupe existant qui pointe en
retour ; un sous-groupe `mean` sans `sd` est refusé.

## 2. Limite supérieure de sécurité (nouveau)

Fichier `src/data/reference/upper-limits.json`, table `upper_limits`.

| Champ | Type | Règle |
|---|---|---|
| `nutrient_code` | texte | code de composition (`iodine`, `selenium`…, ou `retinol`) |
| `value` | nombre > 0 | par jour, adulte |
| `unit` | texte | identique à l'unité du nutriment |
| `source` | texte | source **primaire** (EFSA, année, avis) |
| `scope_note` | texte | pourquoi la limite vaut pour l'alimentation entière |

Indépendante du sexe et du régime ; aucune incidence sur le calcul des besoins (principe III).

## 3. Aliment (étendu)

`src/data/reference/foods.json`, table `foods` — trois champs ajoutés par le script de construction :

| Champ | Type | Règle |
|---|---|---|
| `anses_subgroup` | code ou `null` | `null` = non proposable (FR-309), algues par exemple |
| `family` | texte | clé de famille (FR-321), jamais vide |
| `attached_by` | objet | `{ classe, regle, substitut }` : la ligne de la table de rattachement (research R4) et si le rattachement se fait par usage |

Champ de composition ajouté : `retinol` (µg/100 g), non affiché, issu du constituant CIQUAL 51200.

**Invariants** (vérifiés par test sur le catalogue réel) : tout aliment non algue d'une classe
retenue a un sous-groupe ; tout aliment à sous-groupe `null` porte une règle qui le motive ; les
poissons gras sont exactement ceux de la liste ANSES ; aucune famille ne mêle deux sous-groupes.

## 4. Transformation : de l'entrée du calcul à la liste

```
Entrée: besoins, nutriments, candidats (régime + saison), sexe, période,
        sous-groupes, limites de sécurité
  │
  ├─ sous-groupes actifs = ayant ≥ 1 candidat, et non exclus par le régime (R5)
  ├─ bornes hautes levées pour les substituts des sous-groupes exclus (FR-310a)
  ├─ modèle linéaire:
  │     coût = Σ écarts normalisés (mean) − Σ favorisés + Σ défavorisés
  │            + P × Σ manques normalisés (nutriments, flexibles)
  │     dur  = plafond énergétique, bornes hautes macro, limites de sécurité,
  │            bornes de sous-groupe (× période), couplages, plafond par aliment
  ├─ consolidation (R7): une variante par famille, ≥ demi-unité, re-résolution
  └─ écarts = nutriments à manque > 0 ; taux = couverture de la liste livrée ;
             cause = re-résolution sur « régime seul » puis catalogue entier
Sortie: liste conforme à ingredient-plan.schema.json (inchangé, v1.1.0)
```

États d'une résolution : `résolue` → liste ; `interrompue` → nouvel essai à précision 1e-4 →
`résolue` ou **erreur « calcul interrompu »** (jamais un écart, FR-319).

## 5. Ce qui est retiré

`CATEGORY_DAILY_CAP_G`, `PRODUCE_FLOOR_G_PER_DAY`, la relaxation séquentielle, `scripts/check-caps.ts`.
Les catégories d'affichage (`category`) restent : elles servent à l'interface, plus au calcul.
