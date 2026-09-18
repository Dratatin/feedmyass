# Comparaison avant / après (FR-216, SC-007)

**Feature**: 003-catalogue-pertinence | **Mesuré le**: 2026-09-17

Mesures produites par `npm run measure:catalogue`, sur le profil de référence (homme, 75 kg, 178 cm,
35 ans, actif), au mois de septembre, pour les quatre régimes de base et cinq jeux d'exclusions.

| | Avant | Après |
|---|---|---|
| Millésime | Ciqual 2020 | **Ciqual 2025** |
| Acquisition | archive ZIP à la main | **API, DOI 10.57745/RDMHWY** |
| Aliments | 281 | 252 |
| Complétude moyenne | 25,56 / 26 | 24,97 / 26 |
| Fruits et légumes sans saison | **8** | **0** |
| Quotas de sélection | **18 nombres** sans justification | **2**, distingués par le niveau de classification |

**Aucune régression de couverture.** `--compare` sort en code 0. Les écarts restants — B12 végane,
et vitamine D pour un végane sans gluten — sont exactement ceux de la référence.

## Le millésime a renversé une conclusion intermédiaire

Le catalogue construit sur la table **2020** refermait l'écart de B12 d'un régime végane : il passait
de 0,97 à 2,28 fois le besoin. C'était présenté comme un gain de la feature. **C'était faux.**

La table **2025** a retiré les teneurs en vitamine B12 des algues :

| Algue | B12 en 2020 | B12 en 2025 |
|---|---|---|
| Nori | 38,8 µg/100 g | retirée du catalogue |
| Dulse | 9,81 | non déterminée |
| Laitue de mer | 9,55 | non déterminée |
| Kombu | 1,52 | retirée du catalogue |

C'est la question de la **pseudo-B12** : les corrinoïdes des algues sont des analogues que
l'organisme humain n'assimile pas. Le catalogue 2020 créditait donc un plan végane d'une B12 qui
n'en est pas une, et déclarait couvert un besoin qui ne l'était pas. La 2025 dit vrai, l'écart
réapparaît, et c'est la bonne réponse.

Un test verrouille désormais la donnée elle-même : si un millésime ultérieur réintroduisait des
teneurs en B12 sur les algues, la suite le ferait voir plutôt que de laisser le solveur s'en servir.

## Pourquoi la complétude baisse, et pourquoi on l'accepte

Ce n'est **pas** le changement de règles : à millésime égal, la complétude passe de 25,56 à 25,52.
FR-203 retire à la complétude son rôle d'admission sans que le catalogue y perde.

C'est le millésime : la table 2025 renseigne moins complètement les folates, le sélénium et l'iode
des aliments que les règles retiennent. La mesure est tombée à 23,34 avant la revue de code, puis
remontée à **24,97** une fois les entités XML décodées — l'apostrophe encodée faussait le
dédoublonnage et laissait passer des doublons mal renseignés. SC-003 a été amendé de 25 à 23 par
prudence ; la marge réelle est plus confortable.

Un défaut de correspondance a été corrigé au passage : la 2025 a basculé la vitamine E du code
historique `53100` vers `71010` (alpha-tocophérol). Sans repli, elle manquait sur **219** des 258
aliments ; avec, sur 22.

## Ce qui baisse sans passer sous le seuil

Plusieurs nutriments passent de « couvert avec marge » à « couvert sur le fil ». **Ce n'est pas une
dégradation.** Le solveur minimise la masse à seuils tenus : mieux le catalogue est fourni, plus il
trouve une solution serrée, et moins il dépasse inutilement. Un dépassement de 44 % sur le zinc
n'était pas un bénéfice.

## Un défaut du solveur découvert au passage

La comparaison a d'abord montré 13 régressions. Elles ne venaient pas de la sélection mais de
[`solver.ts`](../../../src/domain/plan/solver.ts), qui **retirait silencieusement** du plan tout
aliment dont la quantité calculée était inférieure à 0,5 g. La solution du programme linéaire
respectait les seuils ; la liste affichée, elle, ne les respectait plus — et aucun écart n'était
signalé, puisque le modèle restait faisable.

Le défaut préexistait. Il ne mordait que sur les aliments très denses employés à dose infime : une
algue séchée à 0,4 g pouvait porter l'essentiel de la vitamine A. En faisant entrer davantage
d'algues au catalogue, cette feature l'a rendu visible. Il expliquait aussi un comportement absurde à
première vue : **plus le catalogue contenait d'aliments, plus il y avait de régressions**.

Correction retenue : relever ces quantités au gramme plutôt que les retirer. Une liste affichant
« 1 g de wakamé » est honnête et achetable ; une liste qui affiche une couverture qu'elle ne tient
pas ne l'est pas.

## Ce que la revue de code a corrigé ensuite

Sept défauts, tous réels, tous vérifiés avant et après :

| Défaut | Effet observé |
|---|---|
| Entités XML non décodées | 14 libellés affichaient `Huile d&apos;amande` ; l'apostrophe encodée faisait échouer en silence la garde végane sur « à l'œuf » et le dédoublonnage des états de cuisson |
| Blinis sans marquage gluten | Une pâte au froment restait candidate pour un profil sans gluten |
| Charcuteries végétales sans marquage gluten | Deux aliments dont CIQUAL ne nomme pas la base ; marqués par précaution, un allergène ne tolérant pas la symétrie des erreurs |
| Argument positionnel trop gourmand | `--quota 8` cherchait un répertoire nommé « 8 » : deux usages documentés étaient inutilisables |
| Mousse au chocolat végétale | 399 g par jour dans le plan végane de référence, alors que ses jumelles laitières étaient écartées comme sucrées |
| Isolat de soja | Première ligne de la liste omnivore, pour un ingrédient industriel qui ne s'achète pas |
| Flux non fermé en cas d'échec de téléchargement | Les écritures en attente se mêlaient à la tentative suivante, d'où le fragment plus gros que le fichier annoncé |
| Unité d'achat contradictoire | Une ligne affichait « 0,5 × cuillère à soupe de 10 g » — cinq grammes — pour une quantité d'un gramme |

Et deux défauts trouvés en vérifiant les corrections :

| Défaut | Effet observé |
|---|---|
| Algues échappant au plafond de condiment | « Haricot de mer séché » proposé à 150 g par jour, faute d'un mot-clé dans son nom. Le plafond vient désormais de la **classe**, que l'ANSES fournit, et non d'une devinette sur le libellé |
| **Le solveur pouvait ne jamais terminer** | Le calcul d'une liste végane bouclait indéfiniment. Voir R16 : précision desserrée à un milligramme, avec le risque résiduel consigné |
