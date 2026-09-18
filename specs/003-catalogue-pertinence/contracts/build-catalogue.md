# Contrat — commande de construction du catalogue

**Feature**: 003-catalogue-pertinence

L'interface exposée par cette feature est une commande de mainteneur, pas une API. Ce contrat définit
ce qu'elle accepte, ce qu'elle produit, et surtout **quand elle doit refuser de produire**.

---

## Invocation

```
npm run build:foods
```

Aucun argument obligatoire. C'est le changement principal : la commande actuelle exige un chemin vers
une archive décompressée à la main.

| Option | Effet | Défaut |
|---|---|---|
| `--version <doi-version>` | Fige la version du jeu de données à récupérer | dernière version publiée |
| `--quota <n>` | Force le même quota pour toutes les classes | 4 (classe fine) / 12 (classe de repli) |
| `--from <dir>` | Lit les fichiers XML d'un répertoire local au lieu de l'API | — |
| `--dry-run` | Produit le rapport sans écrire le catalogue | faux |

`--from` existe pour rejouer une construction hors ligne et pour les tests ; il n'exonère pas des
règles de traçabilité : la version et la date sont alors lues dans les fichiers, et leur absence fait
échouer la commande.

---

## Sortie

1. **`src/data/reference/foods.json`** — le catalogue, conforme à
   [`foods.schema.json`](./foods.schema.json).
2. **Un rapport sur la sortie standard**, destiné à la relecture :
   - taille du catalogue et complétude moyenne ;
   - répartition par catégorie d'achat ;
   - pour chaque classe : code, niveau employé (4 ou repli en 3), décision, nombre de candidats,
     nombre retenus ;
   - **aliments entrés et sortis** par rapport au catalogue précédent (FR-214) ;
   - nombre d'aliments dont l'énergie a été reconstituée par les coefficients d'Atwater.

Le rapport n'est pas un journal de mise au point : c'est l'artefact que relit la porte de revue. Il
doit tenir à l'écran et nommer les décisions, pas les détailler.

---

## Conditions d'échec

La commande **échoue sans rien écrire** — elle n'écrase jamais le catalogue existant par une version
partielle (FR-211) :

| Condition | Raison |
|---|---|
| Source injoignable ou réponse non conforme | FR-211 |
| Licence de la source absente ou différente de celle attendue | FR-210 — une licence qui change est une décision, pas un détail |
| Version ou date de publication absentes de la réponse | FR-209 — elles ne peuvent pas être suppléées par une saisie |
| Fichier téléchargé dont la taille ou le type ne correspond pas à l'annonce | FR-211 |
| Une classe présente dans la source n'est couverte par aucune règle | FR-215 — une classe nouvelle se décide |
| Un aliment nommément désigné par une règle est absent de la source | FR-215 — sinon il disparaît en silence |
| Une règle `écarter` sans motif | Le motif distingue une exclusion d'un oubli |
| Un aliment retenu sans énergie ni protéines | Inexploitable par le solveur — règle existante, conservée |

Le code de sortie est non nul et le message nomme la condition et l'élément fautif.

---

## Garanties

- **Déterminisme** : à version de source et quota identiques, deux exécutions produisent un fichier
  identique octet pour octet. L'ordre de sélection ne dépend d'aucun parcours non déterministe, et
  les départages à égalité sont tranchés par un critère stable et documenté — le classement actuel
  laissait un départage à l'ordre du tableau, ce qui avait coupé le jumeau végane au profit du non
  végane.
- **Aucun effet de bord réseau au moment du calcul utilisateur** : la commande est le seul point où
  le réseau intervient.
- **Encodage** : déduit du BOM ou de la déclaration XML, jamais supposé. Les millésimes 2020
  (windows-1252) et 2025 (UTF-8 avec BOM) doivent produire des libellés accentués corrects.
- **Reprise de téléchargement** : le fichier de composition pèse près de 70 Mo et l'entrepôt coupe
  régulièrement la connexion dessus. Le téléchargement reprend là où il s'est arrêté (en-tête
  `Range`, six tentatives) et conserve son fragment sous `.cache/ciqual/`, hors dépôt. Un fichier
  dont la taille finale ne correspond pas à l'annonce de l'API fait échouer la commande plutôt que de
  produire un catalogue silencieusement amputé.

---

## Commande de mesure

```
npm run measure:catalogue -- --out specs/003-catalogue-pertinence/baseline/coverage-before.json
```

Produit la mesure de référence décrite dans [`data-model.md`](../data-model.md). À exécuter **avant**
toute modification de la sélection : après, la référence est perdue. Rejouée ensuite pour la
comparaison exigée par FR-216 et SC-007.
