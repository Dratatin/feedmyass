# Phase 1 — Modèle de données

**Feature**: 003-catalogue-pertinence | **Date**: 2026-09-17

Ce document décrit les entités manipulées par la construction du catalogue. Le fichier produit garde
sa forme actuelle : sa structure est contractualisée dans
[`contracts/foods.schema.json`](./contracts/foods.schema.json) et n'est pas modifiée par cette
feature, à l'exception des ajouts de `_meta` décrits plus bas.

---

## Classe d'aliments

L'unité de décision de la sélection. Remplace le sous-groupe comme grain de raisonnement.

| Champ | Origine | Description |
|---|---|---|
| `code` | CIQUAL | `alim_ssssgrp_code` quand il diffère de `000000`, sinon `alim_ssgrp_code` |
| `niveau` | déduit | `4` pour une classe de quatrième niveau, `3` pour une classe de repli |
| `libellé` | CIQUAL | Nom de la classe, **à titre informatif seulement** |

**Règles**

- Une classe est identifiée **par son code, jamais par son libellé**. Neuf libellés ont changé entre
  2020 et 2025 alors qu'aucun code ne bougeait : une règle écrite sur un libellé casserait au
  changement de millésime (R13).
- Le repli du quatrième vers le troisième niveau concerne 22 % des candidats, dont toutes les pommes
  de terre et tout le tofu. Il est obligatoire, et le niveau employé doit rester visible dans les
  traces de construction (R9).
- Une classe de repli n'est pas une classe mineure : la plus peuplée porte 105 aliments. Elle est
  soumise aux mêmes quotas et aux mêmes exclusions que les autres.

**Volumétrie mesurée** (CIQUAL 2025, périmètre visé, mots de rejet appliqués) : 63 classes peuplées,
dont 7 de repli portant 271 aliments.

---

## Règle de sélection

La décision du projet appliquée à une classe. C'est **la seule forme sous laquelle une décision de
sélection peut s'exprimer** : il n'existe plus de nombre par sous-groupe.

| Champ | Description |
|---|---|
| `classe` | Code de la classe visée |
| `décision` | `retenir` ou `écarter` |
| `catégorie` | Catégorie d'achat attribuée aux aliments retenus (voir plus bas) |
| `régimes` | Régimes de base compatibles, par défaut pour la classe |
| `exclusions` | Exclusions systématiques de la classe (`gluten`, `lactose`, `nuts`) |
| `motif` | Phrase obligatoire lorsque la décision est `écarter` |

**Règles**

- Toute classe présente dans la source et absente des règles **fait échouer la construction**. Une
  classe nouvelle dans un millésime doit être décidée, pas ignorée : c'est ce qui transforme un
  changement de millésime en décision relue (FR-214, FR-215).
- Une décision `écarter` sans motif est un défaut de construction. Le motif est ce qui distingue une
  exclusion d'un oubli — c'est précisément ce qui manquait aux dix-huit plafonds actuels.
- `régimes` et `exclusions` restent des **décisions du projet**, pas des données CIQUAL, et le
  restent après cette feature. La frontière est reportée dans `_meta` (FR-213).
- Les règles portées par le libellé d'un aliment individuel — « ne convient pas aux véganes » lu dans
  la donnée, gluten déduit du nom — s'appliquent **par-dessus** la règle de classe et peuvent
  seulement restreindre, jamais élargir.

---

## Quota par classe

Paramètre **unique** de la construction, et seul nombre de sélection subsistant.

| Champ | Valeur |
|---|---|
| `quota` | 4 (point de départ, voir R11) |
| `départage` | Complétude de la fiche, puis préférence aux formes crues |

**Règles**

- Le quota est justifié par la **capacité de relecture humaine** (FR-206, SC-008), pas par un
  jugement de pertinence. Sa valeur se révise en mesurant la couverture nutritionnelle, jamais en
  jugeant qu'une famille « mérite » plus de place.
- La complétude de la fiche **ne décide plus de l'admission** (FR-203). Elle ne sert qu'à départager
  des aliments d'une même classe déjà retenue, ce qui est son emploi légitime.
- Une classe moins peuplée que le quota fournit tous ses aliments, sans compensation ailleurs.

**Taille de catalogue attendue** : 239 aliments à quota 4, contre 281 aujourd'hui — sous le volume
actuel, donc dans une capacité de revue déjà éprouvée.

---

## Aliment de catalogue

Inchangé par cette feature dans sa forme. Rappel des champs et de leur provenance, la frontière
étant elle-même une exigence (FR-213).

| Champ | Vient de CIQUAL | Décision du projet |
|---|---|---|
| `code`, `label` | ✔ | |
| `composition` (26 nutriments) | ✔ | |
| `category` | | ✔ via la règle de classe |
| `is_fruit_vegetable` | | ✔ via la règle de classe |
| `is_fortified` | déduit du libellé | |
| `diet_tags` | restreint par le libellé quand il le dit | ✔ par défaut de classe |
| `excluded_by` | | ✔ règle de classe + heuristiques de libellé |
| `min_qty_g`, `max_qty_g` | | ✔ par catégorie d'achat |
| `unit_label`, `unit_grams` | | ✔ par catégorie d'achat |

**Nouveau champ de traçabilité** — `selected_by` : le code de la classe et le niveau qui ont justifié
la présence de l'aliment. C'est ce qui rend FR-205 vérifiable autrement que par relecture du script.

Il est porté **jusqu'en base** (`public.foods.selected_by`, `jsonb`, migration `0006`). Le laisser
dans le seul fichier de référence l'aurait perdu au chargement, et la question « d'où vient cet
aliment » serait redevenue une relecture de script. La colonne est nullable : les aliments chargés
avant cette feature n'ont pas de classe d'origine, et leur en inventer une serait pire que l'absence.

**Deux migrations, pas une.** `0005` ouvre les catégories d'achat, `0006` ajoute la colonne de
traçabilité. La seconde a été écrite après coup, le seed ayant refusé de charger — signalant une
colonne absente du schéma. Ce refus est le comportement attendu : mieux vaut une base non chargée
qu'une base partielle.

---

## Catégories d'achat

**Décision de Phase 1** : la sélection par classe **n'impose aucune catégorie d'affichage nouvelle**
pour livrer P1 et P2. Les 63 classes se rattachent aux 11 catégories existantes.

La question se rouvre en **P3 uniquement**, si l'ouverture de classes comme `060205` (boissons
végétales), `050205` (desserts végétaux), `050306` (alternatives aux fromages) ou `040309`
(alternatives aux charcuteries) fait entrer des aliments qu'aucune catégorie existante ne décrit
honnêtement. Ranger une boisson de soja en `produit_laitier` lui collerait l'exclusion `lactose` et
la retirerait des régimes végétaliens : ce serait faux.

Si une catégorie nouvelle est décidée, elle engage, et la porte VI s'applique :

1. la contrainte `check` de `foods.category` en base — par migration, jamais par édition d'une
   migration appliquée ;
2. les trois tables de libellés de `src/lib/months.ts` (famille, singulier, pluriel) ;
3. la famille d'affichage — et si une famille nouvelle est retenue, son token de couleur avec **ratio
   de contraste mesuré et consigné**, plus un pictogramme ;
4. les assertions e2e qui vérifient qu'aucune catégorie animale n'apparaît dans un plan végane.

---

## Mesure de référence

Artefact de revue, figé **avant** toute modification de la sélection (R14, FR-216). Sans lui, la
comparaison exigée par SC-007 est impossible : une fois la sélection changée, la référence est
perdue.

| Champ | Description |
|---|---|
| `catalogue` | Nombre d'aliments, complétude moyenne, répartition par catégorie |
| `couverture` | Par régime de base et par jeu d'exclusions : ratio atteignable par nutriment |
| `écarts` | Écarts produits, avec leur nutriment et leur cause |
| `mesuré_le` | Date, et empreinte du catalogue mesuré |

**Point de vigilance nommé** : la vitamine B12 d'un régime végane. Le catalogue actuel produit un
écart. Un travail exploratoire a montré que l'entrée d'alternatives végétales peut le refermer à
exactement 100,00 % du besoin, en saturant simultanément toutes les bornes hautes — donc sans marge.
Un écart qui se referme au gramme près n'est pas une amélioration à célébrer : la mesure doit
distinguer *couvert avec marge* de *couvert sur le fil*, et le test qui démontre la production
d'écarts doit s'appuyer sur un cas franc.
