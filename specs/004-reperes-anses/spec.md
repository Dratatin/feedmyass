# Feature Specification: Liste d'ingrédients fondée sur les repères de consommation de l'ANSES

**Feature Branch**: `004-reperes-anses`

**Created**: 2026-10-04

**Status**: Draft

**Input**: Remplacer l'objectif « masse minimale » du solveur par le modèle d'optimisation que l'ANSES
a employé pour actualiser les repères du PNNS (saisine 2012-SA-0103, décembre 2016).

## Contexte

La liste d'ingrédients n'est pas intégrable dans une alimentation réelle. Mesuré le 2026-10-03 sur
le profil de référence (homme, 75 kg, 178 cm, 35 ans, actif), au mois de septembre :

| Régime | Premiers aliments de la liste | Autres anomalies |
|---|---|---|
| Omnivore | sésame, spiruline, dulse, ascophylle, kombu | 350 g d'avocat, 250 g de biscotte briochée |
| Végétarien | kombu, laitue de mer, dulse, ascophylle | un seul légume (400 g de poivron) |
| Végan | les quatre mêmes algues | 1,5 l de boissons végétales, eau de coco |

**La cause est le critère que la liste optimise, pas le catalogue.** La liste est aujourd'hui la
combinaison qui couvre les besoins avec la **plus petite masse totale**. Ce critère récompense les
aliments les plus concentrés en nutriments par gramme : une algue séchée l'emporte sur n'importe quel
aliment courant, quel que soit le régime. Les garde-fous empilés depuis (plafond collectif des œufs
à 120 g, des condiments à 60 g, plancher de 400 g de fruits et légumes) limitent les dégâts sans
toucher à la cause, et ce sont des **valeurs propres au projet**, sans source — ce que le principe II
de la constitution interdit pour toute valeur qui pèse sur ce qui est affiché.

**Le problème a déjà été résolu, officiellement, et avec le même outil.** Pour actualiser les repères
du PNNS, l'ANSES a construit un modèle d'optimisation linéaire qui cherche une alimentation
couvrant les références nutritionnelles **tout en restant la plus proche possible de ce que les
Français mangent réellement** (enquête INCA 2). Son avis publie les paramètres du modèle : pour une
trentaine de sous-groupes d'aliments, et par sexe, la consommation moyenne, son écart-type, et des
bornes d'acceptabilité (5e et 95e centiles de consommation), ainsi que des plafonds fondés sur
l'épidémiologie pour la viande hors volaille, la charcuterie et les boissons sucrées.

Adopter ce modèle remplace un critère sans fondement alimentaire par le critère officiel français, et
remplace les seuils inventés par des chiffres publiés et citables.

### Ce que la simulation du 2026-10-04 a établi en plus

1 408 listes ont été générées (deux profils de référence × 20 régimes × 12 mois ; 96 profils ×
4 régimes × 2 mois ; 160 listes hebdomadaires). Outre les algues, présentes dans **toutes** les
listes, trois défauts du calcul actuel ont été mis au jour. Ils relèvent du même code que cette
feature réécrit, et sont donc traités ici plutôt que corrigés deux fois.

**Aucune limite de sécurité n'est appliquée.** La liste peut fournir plusieurs dizaines de fois la
limite supérieure de sécurité d'un nutriment. Constaté : jusqu'à **77 mg d'iode par jour**, 128 fois
la limite de 600 µg/j, à cause de 15 g de kombu ; du sélénium à 2,5 fois sa limite. La couverture
affichait simplement « 51 428 % ».

**La relaxation lève des plafonds qu'elle ne devrait pas toucher.** Quand les seuils sont
incompatibles entre eux, le calcul relâche les nutriments un à un, de façon cumulative, et un
nutriment relâché perd sa borne haute en même temps que sa borne basse. Constaté sur 58 listes :
l'énergie à **132 %** du besoin alors que le plafond est à 110 %, les lipides au-delà de leur
intervalle de référence — sans qu'aucun écart ne soit signalé, puisque ni l'un ni l'autre n'est
« sous le seuil ».

**Une résolution interrompue est prise pour une impossibilité.** L'échéance de 400 ms qui protège du
cyclage du solveur se déclenche en série sur certaines combinaisons : 78 listes ont pris plus d'une
seconde, jusqu'à 6,3 s. Chaque interruption est lue comme « ce nutriment est inatteignable », ce qui
alimente la cascade précédente. Les écarts produits portent en outre un taux calculé sur un maximum
théorique, et non sur la liste livrée : un écart de lipides affiché à « 1 375 % ».

## Clarifications

### Session 2026-10-04

- Q: Comment rattacher les substituts végétaux, et quelles bornes appliquer aux régimes qui
  excluent des sous-groupes ? → A: rattachement par usage au sous-groupe de l'ANSES remplacé
  (boisson végétale → lait, tofu/tempeh/seitan → légumineuses…), et levée de la borne haute des
  sous-groupes de substitution pour ces régimes, le plafond par aliment restant la limite
  (FR-310, FR-310a).
- Q: Quel seuil minimal pour qu'une quantité figure dans la liste ? → A: une demi-unité d'achat de
  l'aliment, sur la période de la liste (FR-323).
- Q: Les doublons de variantes, la variété hebdomadaire et les poids d'achat relèvent-ils de cette
  feature ? → A: les doublons et le seuil minimal oui (User Story 5) ; la variété hebdomadaire et
  les poids d'achat sont reportés (Hors périmètre).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Une liste qui ressemble à ce qu'on mange (Priority: P1)

Une personne omnivore qui consulte sa liste y trouve la structure d'une alimentation française
courante — du pain ou des féculents, des légumes et des fruits en quantité, des produits laitiers,
de la viande, du poisson, des œufs — dans des quantités comparables à ce que mange réellement un
adulte. Les écarts à cette alimentation courante ne sont que ceux qu'exige la couverture de ses
besoins, ou que recommande l'ANSES (plus de fruits, de légumes et de féculents complets ; moins de
viande rouge et de charcuterie).

**Why this priority**: c'est le défaut constaté, et c'est la promesse du produit. Une liste qui
commence par cinq algues n'est pas utilisable, quelle que soit la justesse de sa couverture
nutritionnelle. Le cas omnivore est celui que le modèle de l'ANSES couvre sans aucune adaptation :
il se livre seul.

**Independent Test**: générer la liste omnivore du profil de référence et comparer, sous-groupe par
sous-groupe, les quantités proposées aux bornes et aux moyennes publiées par l'ANSES.

**Acceptance Scenarios**:

1. **Given** le profil de référence en régime omnivore, **When** la liste est générée, **Then**
   aucune algue, aucune poudre (spiruline, levure) et aucun aliment rattaché à aucun sous-groupe de
   l'ANSES n'y figure.
2. **Given** une liste générée, **When** on additionne les quantités par sous-groupe d'aliments,
   **Then** chaque total est compris entre les bornes publiées par l'ANSES pour le sexe du profil.
3. **Given** une liste générée, **When** on regarde la viande hors volaille et la charcuterie,
   **Then** leurs quantités ne dépassent pas les plafonds épidémiologiques (71 g/j et 25 g/j).
4. **Given** deux profils ne différant que par le sexe, **When** les listes sont générées, **Then**
   les bornes et moyennes appliquées sont celles du sexe de chacun.

---

### User Story 2 - Les régimes végétarien et végan restent réalistes et calculables (Priority: P2)

Une personne végétarienne ou végane obtient une liste construite selon le même principe — rester
proche d'une alimentation courante — dont les groupes que son régime exclut ont été retirés, et
dont les aliments de substitution occupent une place cohérente avec leur usage.

**Why this priority**: le modèle de l'ANSES est établi sur une population omnivore. Retirer la
viande et le poisson sans rien changer d'autre rendrait le plan végan incalculable : les
légumineuses sont bornées à 64 g/j, très loin de ce qu'il faut pour couvrir les protéines sans
produit animal. L'adaptation est donc une décision du projet, à rendre explicite et documentée.

**Independent Test**: générer les listes végétarienne, végane et végane sans gluten du profil de
référence, et vérifier qu'elles se calculent, ne contiennent ni algue ni aliment hors sous-groupe,
et ne perdent aucune couverture par rapport à la mesure de départ.

**Acceptance Scenarios**:

1. **Given** un régime végétarien ou végan, **When** la liste est générée, **Then** les sous-groupes
   exclus par le régime n'y contribuent pas, et leurs termes disparaissent du calcul plutôt que de
   le contraindre.
2. **Given** un régime végan, **When** la liste est générée, **Then** le calcul aboutit et couvre au
   moins les mêmes nutriments qu'avant la feature.
3. **Given** un aliment de substitution (tofu, tempeh, seitan, boisson ou dessert végétal), **When**
   le catalogue est construit, **Then** il est rattaché au sous-groupe de l'ANSES dont il remplace
   l'usage (FR-310).
4. **Given** un régime qui exclut des sous-groupes, **When** la liste est générée, **Then** les
   sous-groupes de substitution correspondants peuvent dépasser leur borne haute, sans dépasser le
   plafond par aliment du catalogue ; leur borne basse et leur terme d'écart à la moyenne demeurent
   (FR-310a).
5. **Given** cette règle, **When** on consulte la documentation des sources, **Then** elle y figure
   comme écart assumé au modèle de l'ANSES, avec sa justification.

---

### User Story 3 - Chaque chiffre du modèle se rattache à sa source (Priority: P3)

La personne qui maintient le projet peut, pour chaque borne, moyenne, écart-type ou plafond employé
dans le calcul de la liste, retrouver le tableau et la page du rapport de l'ANSES dont il provient ;
et pour chaque aliment, le sous-groupe auquel il est rattaché et la règle qui l'y rattache.

**Why this priority**: c'est la condition du principe II, et ce qui permet de remplacer les seuils
actuels plutôt que d'en ajouter. La valeur pour l'utilisateur final est indirecte, d'où le rang.

**Independent Test**: tirer au hasard des paramètres du modèle et des aliments du catalogue, et
retrouver pour chacun sa source ou sa règle.

**Acceptance Scenarios**:

1. **Given** le jeu de paramètres du modèle, **When** il est chargé, **Then** il porte la référence
   de l'avis de l'ANSES, sa date, et pour chaque valeur le tableau et la page d'origine ; un jeu qui
   en manque est refusé, comme les autres données de référence.
2. **Given** le code de calcul de la liste, **When** on le relit, **Then** il ne contient plus de
   plafond ni de plancher en grammes propre au projet (plafonds par catégorie, plancher de fruits et
   légumes).
3. **Given** un aliment du catalogue, **When** on demande pourquoi il est ou n'est pas proposable,
   **Then** la réponse nomme son sous-groupe de l'ANSES, ou l'absence de sous-groupe.

---

### User Story 4 - La liste respecte toujours ses propres garde-fous (Priority: P1)

Quelle que soit la combinaison de profil, de régime, de mois et de période, la liste ne dépasse ni
le plafond énergétique, ni les intervalles de référence des macronutriments, ni la limite supérieure
de sécurité d'aucun nutriment ; et tout nutriment qu'elle ne peut pas couvrir est signalé avec le
taux réellement atteint par la liste affichée.

**Why this priority**: c'est une question de sécurité et de sincérité, pas de confort. Une liste
qui fournit 128 fois la limite de sécurité de l'iode ou 132 % de l'énergie, en l'affichant comme
réussie, contrevient au principe II plus gravement qu'une liste peu appétissante. Elle partage le
rang P1 avec la User Story 1, et se livre avec elle puisque les deux touchent au même calcul.

**Independent Test**: rejouer la simulation complète (toutes combinaisons) et vérifier, pour chaque
liste, le plafond énergétique, les intervalles de référence, les limites de sécurité, et la
cohérence entre écarts signalés et couverture affichée.

**Acceptance Scenarios**:

1. **Given** n'importe quelle combinaison simulée, **When** la liste est générée, **Then** l'énergie
   reste entre 100 % et 110 % du besoin, ou l'insuffisance est signalée comme écart.
2. **Given** des seuils incompatibles entre eux, **When** le calcul doit renoncer à couvrir un
   nutriment, **Then** il ne renonce qu'à son seuil bas : le plafond énergétique, les bornes hautes
   des intervalles de référence et les limites de sécurité restent appliqués.
3. **Given** un nutriment pourvu d'une limite supérieure de sécurité applicable à l'alimentation
   courante, **When** la liste est générée, **Then** l'apport fourni ne la dépasse pas.
4. **Given** un écart signalé, **When** on le compare à la couverture affichée, **Then** son taux
   est celui de la liste livrée.
5. **Given** une résolution interrompue par l'échéance, **When** le calcul se poursuit, **Then**
   l'interruption n'est jamais présentée comme l'impossibilité de couvrir un nutriment.

---

### User Story 5 - Une liste de courses qu'on peut acheter telle quelle (Priority: P2)

Une personne qui lit sa liste y trouve un lait, une huile par usage, une sorte de tofu, une sorte
d'œufs — pas deux variantes d'un même ingrédient le même jour. Chaque ligne porte une quantité
qu'on peut acheter et cuisiner : au moins une demi-portion, jamais quelques grammes.

**Why this priority**: constaté par la simulation du 2026-10-04, **1 131 listes sur 1 408**
proposent deux variantes d'un même ingrédient (400 g de lait à 1,2 % et 400 g de lait
demi-écrémé ; 500 g de boisson au riz et 4 g de boisson au soja), et **1 014 lignes** portent moins
d'un quart de portion. Le critère de l'ANSES (User Story 1) en réduira le nombre, mais ne les
interdit pas : il fixe une quantité par sous-groupe, pas la variante choisie à l'intérieur. La
règle doit donc être explicite. Elle vient après la User Story 1, dont elle affine le résultat.

**Independent Test**: rejouer la simulation complète et compter, dans chaque liste, les familles
représentées par plus d'une variante et les lignes sous la demi-portion.

**Acceptance Scenarios**:

1. **Given** n'importe quelle combinaison simulée, **When** la liste est générée, **Then** aucune
   famille d'aliments n'y est représentée par plus d'une variante.
2. **Given** n'importe quelle ligne de la liste, **When** on compare sa quantité à l'unité d'achat
   de l'aliment, **Then** elle vaut au moins une demi-unité (50 g pour une portion de 100 g, 5 g pour
   une cuillère à soupe de 10 g, un demi-verre, un demi-œuf…).
3. **Given** une liste où l'application de ces deux règles empêche de couvrir un nutriment,
   **When** la liste est générée, **Then** le nutriment est signalé comme écart, avec le taux
   réellement atteint ; les règles ne sont pas levées en silence.
4. **Given** une liste hebdomadaire, **When** elle est générée, **Then** les mêmes règles valent,
   la demi-portion s'entendant sur la semaine.

---

### Edge Cases

- **Sous-groupe sans aucun candidat.** La saison (l'hiver) ou le régime peuvent vider un sous-groupe
  dont la borne basse est non nulle (légumes : 16 g/j chez l'homme ; autres féculents raffinés :
  14 g/j). La borne basse est alors levée pour ce sous-groupe, et le calcul se poursuit : un plan
  ne doit jamais devenir incalculable pour une raison qui n'a rien de nutritionnel.
- **Sous-groupes couplés.** L'ANSES borne certaines paires de sous-groupes sur leur somme (pain
  raffiné et pain complet ; huiles riches et pauvres en acide alpha-linolénique). Le couplage est
  repris tel qu'elle le définit.
- **Sous-groupes sans borne haute.** Pain complet, féculents complets, huiles riches en ALA n'ont pas
  de borne haute dans le modèle de l'ANSES. Le plafond par aliment du catalogue reste alors la seule
  limite, et suffit à éviter une quantité absurde.
- **Sous-groupes absents du catalogue.** Boissons sucrées, jus, eaux, sel, produits sucrés : le
  catalogue ne les propose pas. Leurs termes n'entrent pas dans le calcul ; ce n'est pas une
  modification du modèle, c'est l'absence de candidats.
- **Période hebdomadaire.** Les bornes et moyennes de l'ANSES sont journalières ; sur une semaine,
  elles s'appliquent multipliées par sept, comme les besoins.
- **Nutriment hors d'atteinte.** Lorsqu'un nutriment ne peut pas être couvert (B12 végane), la
  relaxation existante continue de le nommer comme écart ; le changement de critère ne doit pas
  masquer un écart réel ni en créer un artificiel.
- **Iode sans algues.** En France, la première source d'iode est le sel iodé, que le catalogue ne
  propose pas. Une fois les algues écartées, l'iode peut devenir un écart pour les régimes sans
  poisson ni produits laitiers. C'est un écart réel, à signaler comme tel, et non une raison de
  réintroduire les algues.
- **Vitamine A.** La limite de sécurité porte sur le rétinol préformé, alors que la table de
  composition exprime la vitamine A totale, bêta-carotène compris. Appliquer la limite à ce total
  plafonnerait à tort les carottes ; elle ne s'applique donc que si la donnée permet de distinguer
  le rétinol.
- **Âge hors de la population de l'ANSES.** Les paramètres portent sur les hommes de 18 à 64 ans et
  les femmes de 18 à 54 ans ; l'application accepte les adultes jusqu'à 70 ans. Ils s'appliquent à
  tous, et cette extension est documentée.

## Requirements *(mandatory)*

### Functional Requirements

**Critère de la liste**

- **FR-301**: La liste d'ingrédients DOIT être la combinaison qui, tout en respectant les seuils de
  couverture nutritionnelle déjà en vigueur (FR-016), minimise la somme, sur les sous-groupes
  d'aliments de l'ANSES, des écarts à la consommation moyenne, chaque écart étant rapporté à
  l'écart-type de consommation du sous-groupe.
- **FR-302**: Le critère DOIT favoriser les fruits frais, les légumes et les féculents complets, et
  défavoriser la viande hors volaille et la charcuterie, selon le principe et la normalisation
  décrits par l'ANSES (consommation rapportée à la borne haute du sous-groupe). Pour ces
  sous-groupes, ce terme remplace l'écart à la moyenne, comme dans le modèle de l'ANSES.
- **FR-303**: La masse totale de la liste NE DOIT plus être le critère optimisé.

**Bornes par sous-groupe**

- **FR-304**: La quantité totale de chaque sous-groupe DOIT rester entre la borne basse et la borne
  haute publiées par l'ANSES pour le sexe du profil (tableau 9 de l'avis), sauf disposition contraire
  de FR-310 et des cas limites.
- **FR-305**: La viande hors volaille DOIT rester sous 71 g/j et la charcuterie sous 25 g/j,
  plafonds épidémiologiques de l'ANSES, qui remplacent pour ces sous-groupes le 95e centile.
- **FR-306**: Les sous-groupes que l'ANSES borne collectivement DOIVENT l'être de même, sur la somme.
- **FR-307**: Les plafonds collectifs par catégorie et le plancher de fruits et légumes propres au
  projet DOIVENT être retirés. Le plafond par aliment du catalogue demeure.

**Rattachement des aliments**

- **FR-308**: Chaque aliment du catalogue DOIT être rattaché à au plus un sous-groupe de l'ANSES, par
  une règle nommée et consultable, fondée sur la classification officielle des aliments déjà
  employée pour construire le catalogue.
- **FR-309**: Un aliment rattaché à aucun sous-groupe NE DOIT PAS être proposé dans la liste, et la
  documentation DOIT dire pourquoi : il n'appartient à aucun sous-groupe d'aliments consommés en
  France selon l'ANSES. Les algues, la spiruline, les levures et la gélatine sont dans ce cas.
- **FR-310**: Les aliments de substitution végétaux DOIVENT être rattachés au sous-groupe de
  l'ANSES dont ils remplacent l'usage : boissons végétales → lait ; desserts et spécialités type
  yaourt → produits laitiers frais ; spécialités type fromage → fromages ; tofu, tempeh, protéine de
  soja texturée, seitan et préparations à base de ces aliments → légumineuses. Le seitan, protéine
  de blé, n'est pas une légumineuse : il y est rattaché par usage, comme source végétale de
  protéines, et la documentation le dit. Un aliment sans usage de substitution identifiable (par
  exemple l'eau de coco) n'est rattaché à aucun sous-groupe et relève de FR-309.
- **FR-310a**: Pour un régime qui exclut un ou plusieurs sous-groupes, la borne haute des
  sous-groupes qui les remplacent DOIT être levée : légumineuses lorsque la viande, la volaille ou
  le poisson sont exclus ; lait, produits laitiers frais et fromages, alimentés alors par les seuls
  substituts, lorsque les produits laitiers sont exclus. Le plafond par aliment du catalogue reste
  la limite. Cette levée est un écart assumé au modèle de l'ANSES, établi pour une population
  omnivore, et DOIT être documentée comme tel, à l'image de l'écart sur le zinc.

**Régimes**

- **FR-311**: Pour un régime qui exclut des sous-groupes, ces sous-groupes et leurs termes DOIVENT
  être retirés du calcul.
- **FR-312**: Le régime NE DOIT intervenir que sur les aliments candidats et les sous-groupes
  retenus, jamais sur les besoins (principe III) ; l'invariant existant reste vérifié.

**Garde-fous et relaxation**

- **FR-316**: L'apport de la liste NE DOIT dépasser, pour aucun nutriment, la limite supérieure de
  sécurité officielle (ANSES, ou EFSA à défaut) lorsqu'elle s'applique à l'ensemble des apports
  alimentaires. Ces limites sont des données de référence, stockées avec leur source comme les
  apports de référence.
- **FR-317**: Renoncer à couvrir un nutriment NE DOIT lever que son seuil bas. Le plafond
  énergétique, les bornes hautes des intervalles de référence (lipides, glucides) et les limites de
  sécurité DOIVENT rester appliqués dans tous les cas.
- **FR-318**: Lorsque tous les seuils ne peuvent être tenus ensemble, le calcul DOIT rendre la liste
  qui s'en approche le plus, au sens des contraintes flexibles du modèle de l'ANSES (minimiser
  l'écart aux références non atteintes), plutôt que d'abandonner des nutriments un à un.
- **FR-319**: Une résolution interrompue par l'échéance NE DOIT PAS être interprétée comme
  l'impossibilité de couvrir un nutriment.
- **FR-320**: Le taux porté par un écart DOIT être celui de la liste livrée, et sa cause (régime,
  saison, aucune source) DOIT être établie sous les mêmes contraintes que la liste, plafond
  énergétique compris.

**Liste achetable**

- **FR-321**: Chaque aliment du catalogue DOIT appartenir à une famille, définie par une règle
  nommée et consultable. Une famille réunit les aliments interchangeables à l'achat :
  - les variantes d'un même ingrédient, qui ne diffèrent que par la teneur en matières grasses, la
    préparation, la cuisson ou une espèce voisine (laits de vache quelle que soit leur teneur en
    matières grasses ; œufs de poule et de cane ; riz blanc et riz étuvé ; haricots blancs et
    rouges ; tofus nature, fumé et soyeux) ;
  - pour les huiles, celles d'un même sous-groupe de l'ANSES (riches ou pauvres en acide
    alpha-linolénique), ce qui permet d'associer une huile de colza et une huile d'olive, comme le
    modèle de l'ANSES y incite ;
  - pour les boissons végétales, toutes celles d'un même usage.
- **FR-322**: Une liste NE DOIT contenir qu'une variante par famille.
- **FR-323**: Toute ligne de la liste DOIT porter au moins une demi-unité d'achat de l'aliment, sur
  la période de la liste. Ce seuil est une décision du projet (2026-10-04), faute de référence
  officielle, et DOIT être documenté comme tel.
- **FR-324**: Si FR-322 ou FR-323 empêche de couvrir un nutriment, celui-ci DOIT être signalé comme
  écart selon FR-320 ; les deux règles NE DOIVENT PAS être levées pour l'éviter.

**Traçabilité et mesure**

- **FR-313**: Les paramètres du modèle (bornes, moyennes, écarts-types, plafonds, couplages) DOIVENT
  être stockés comme donnée de référence, avec la référence de l'avis, sa date, et pour chaque valeur
  le tableau et la page d'origine. Un jeu de paramètres sans ces métadonnées DOIT être refusé.
- **FR-314**: Une mesure avant/après DOIT être produite sur le profil de référence, pour les régimes
  de base et les jeux d'exclusions déjà mesurés par la feature 003 : aliments proposés, quantités par
  sous-groupe, couverture par nutriment, écarts. La simulation complète du 2026-10-04 (profils ×
  régimes × mois × période) DOIT être rejouable par une commande, et ses contrôles servent de
  vérification aux critères de succès.
- **FR-315**: La documentation des sources DOIT décrire le modèle retenu, ses paramètres et chacun
  des écarts assumés (substituts végétaux, extension d'âge, termes absents faute de candidats).

### Key Entities

- **Sous-groupe d'aliments ANSES**: catégorie de consommation définie par l'ANSES (légumes, fruits
  frais, légumineuses, volaille, viande hors volaille, lait, fromages…). Porte, par sexe, une borne
  basse, une moyenne, un écart-type, une borne haute éventuelle, un éventuel plafond
  épidémiologique, un sens d'optimisation (rapprocher de la moyenne, favoriser, défavoriser) et un
  éventuel couplage avec un autre sous-groupe.
- **Rattachement**: lien d'un aliment du catalogue à un sous-groupe, avec la règle qui l'établit.
  Un aliment sans rattachement n'est pas proposable.
- **Famille d'aliments**: ensemble des aliments interchangeables à l'achat (FR-321). Un aliment
  appartient à exactement une famille ; une liste n'en retient qu'une variante.
- **Jeu de paramètres du modèle**: ensemble des sous-groupes et de leurs valeurs, avec la référence
  de la source, sa date et la provenance de chaque valeur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur les régimes de base et les jeux d'exclusions mesurés, **aucune** liste ne contient
  d'algue, de spiruline, de levure ou d'aliment sans sous-groupe (contre 4 à 5 aujourd'hui dans
  chaque liste).
- **SC-002**: Pour le régime omnivore, **100 %** des sous-groupes présents dans la liste respectent
  les bornes de l'ANSES du sexe du profil.
- **SC-003**: Pour le régime omnivore, la liste contient **au moins 400 g/j de fruits et légumes**
  — le repère « 5 par jour » du PNNS — sans que ce chiffre soit imposé par le calcul : il doit
  découler du critère de l'ANSES.
- **SC-004**: Pour le régime omnivore, la liste représente au moins **8 sous-groupes distincts**
  de l'ANSES, avec au moins **3 fruits et légumes distincts** (contre 2 aujourd'hui).
- **SC-005**: **Aucune régression de couverture** : aucun nutriment couvert avant la feature ne
  passe sous son seuil, pour aucune des combinaisons mesurées ; les écarts restants sont exactement
  ceux de la mesure de départ (B12 végane).
- **SC-006**: **Zéro** plafond ou plancher en grammes propre au projet ne subsiste dans le calcul de
  la liste, hors plafond par aliment du catalogue.
- **SC-007**: **100 %** des paramètres du modèle se rattachent à un tableau et une page de l'avis de
  l'ANSES, et 100 % des aliments du catalogue à un sous-groupe ou à l'absence motivée de sous-groupe.
- **SC-008**: Sur l'ensemble de la simulation, **aucune** liste ne prend plus d'une seconde à
  générer (contre 78 aujourd'hui, jusqu'à 6,3 s).
- **SC-009**: Sur l'ensemble de la simulation, **zéro** liste ne dépasse le plafond énergétique, un
  intervalle de référence ou une limite de sécurité (contre 58 au-delà du plafond énergétique, 150
  au-delà d'un intervalle, et des dépassements de la limite de l'iode dans toutes les listes
  contenant des algues).
- **SC-010**: **100 %** des écarts signalés portent le taux affiché dans la couverture.
- **SC-011**: Sur l'ensemble de la simulation, **zéro** liste ne contient deux variantes d'une même
  famille (contre 1 131 sur 1 408 aujourd'hui).
- **SC-012**: Sur l'ensemble de la simulation, **zéro** ligne ne porte moins d'une demi-unité
  d'achat (contre 1 014 lignes sous le quart d'unité aujourd'hui).
- **SC-013**: L'application de ces deux règles ne fait apparaître **aucun écart nouveau** par rapport
  à la même simulation sans elles, ou chaque écart nouveau est nommé dans la mesure avant/après
  avec sa cause.

## Assumptions

- **Source des paramètres : l'avis de l'ANSES de 2016, et non un recalcul sur INCA 3.** Les données
  d'INCA 3 (2017) sont publiées en données ouvertes et sont plus récentes, mais recalculer bornes et
  écarts-types à partir d'elles serait une dérivation du projet. Les valeurs de l'avis sont celles
  que l'ANSES a effectivement employées dans son modèle : elles sont reprises telles quelles.
  Référence : Anses, *Actualisation des repères du PNNS : révision des repères de consommations
  alimentaires*, avis et rapport, saisine 2012-SA-0103, décembre 2016 — tableau 5 (relations
  épidémiologiques), tableau 9 (bornes par sous-groupe, pages 73-74), annexe 6 (moyennes et
  écarts-types, pages 80-81).
- **Les contraintes de contaminants du modèle de l'ANSES sont hors périmètre.** Elles reposent sur
  des données d'exposition (EAT 2) que l'application n'a pas ; leur absence est documentée.
- **Les plafonds épidémiologiques sont cohérents avec le PNNS 4** : 71 g/j de viande hors volaille
  correspondent aux 500 g par semaine du repère grand public.
- **Le catalogue garde sa construction actuelle** (feature 003) ; seule s'y ajoute l'information de
  rattachement à un sous-groupe. Les aliments sans sous-groupe peuvent rester au catalogue, ils ne
  sont simplement plus proposables.
- **Les seuils de couverture nutritionnelle (FR-016) sont inchangés**, de même que la relaxation qui
  nomme les écarts.

## Hors périmètre

- Contraintes de contaminants et d'additifs du modèle de l'ANSES.
- Recalcul des paramètres à partir des données d'INCA 3.
- Ajout au catalogue des sous-groupes qu'il ne propose pas (boissons, produits sucrés, sel).
- Repères spécifiques aux enfants, aux personnes âgées, aux femmes enceintes ou allaitantes.
- Toute modification du calcul des besoins.
- **Variété sur la semaine** : la liste hebdomadaire reste la liste journalière multipliée par
  sept. Faire varier les aliments d'un jour à l'autre est reporté à une feature ultérieure
  (décision du 2026-10-04).
- **Poids d'achat** : la liste mélange aujourd'hui poids crus (riz, semoule) et poids cuits
  (légumineuses). Exprimer toutes les quantités dans la forme achetée (sec, cru, conserve) est
  reporté à une feature ultérieure (décision du 2026-10-04).
