# Quickstart : valider la feature 004

## Prérequis

- Branche `004-reperes-anses`, dépendances installées (`npm ci`).
- Pour l'étape finale uniquement : `.env.local` avec la clé service role Supabase.

## 0. Mesure de départ (avant toute modification du calcul)

```bash
npm run simulate:plans -- specs/004-reperes-anses/baseline/simulation-avant.json
```

Attendu, sur le catalogue du commit `db95134` : algues dans 1 408 listes sur 1 408, iode au-delà
de 600 µg/j, 58 listes au-delà du plafond énergétique, 78 listes à plus d'une seconde.

## 1. Données de référence

```bash
npm run build:foods          # rattachement, familles, rétinol
npm run test:unit            # dont : provenance de chaque paramètre, invariants de rattachement
```

Attendu : la construction liste les aliments sans sous-groupe (algues, eau de coco) avec leur
motif ; aucun aliment sans famille ; les trois poissons gras sont hareng, maquereau et saumon.

## 2. Simulation complète

```bash
npm run simulate:plans -- specs/004-reperes-anses/baseline/simulation-apres.json
```

Critères vérifiés par la sortie (zéro occurrence attendue pour chacun) :

| Contrôle de la simulation | Critère |
|---|---|
| `algue`, aliment sans sous-groupe | SC-001 |
| sous-groupe hors bornes (omnivore) | SC-002 |
| `energie_hors_cible`, `depasse_borne_haute`, limite de sécurité dépassée | SC-009 |
| `lent` (> 1 s) | SC-008 |
| écart dont le taux diffère de la couverture | SC-010 |
| deux variantes d'une famille | SC-011 |
| `sous_demi_portion` | SC-012 |
| `regime_incompatible`, `hors_saison` | portes de la constitution |

À lire dans la sortie : fruits et légumes ≥ 400 g/j et ≥ 8 sous-groupes pour l'omnivore (SC-003,
SC-004).

## 3. Comparaison avant / après

Comparer les deux fichiers de `baseline/` : aucun nutriment couvert avant ne doit passer sous son
seuil (SC-005) ; tout écart nouveau est nommé avec sa cause dans `baseline/comparaison.md`
(SC-013). L'iode est l'écart nouveau attendu pour les régimes sans poisson ni produits laitiers.

## 4. Application

```bash
npm run seed:reference       # écrit dans Supabase — avec accord explicite
npm run build && npm run check:build
npm run test:e2e
```

Contrôle manuel : générer la liste du profil de référence en omnivore puis en végan ; aucune algue,
un lait, une huile par usage, des quantités d'au moins une demi-portion.
