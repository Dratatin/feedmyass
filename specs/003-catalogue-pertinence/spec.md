# Feature Specification: Catalogue d'aliments sélectionné par pertinence, alimenté par source officielle

**Feature Branch**: `003-catalogue-pertinence`

**Created**: 2026-09-17

**Status**: Draft

**Input**: Remplacer les plafonds arbitraires par aliment et le téléchargement manuel de l'archive CIQUAL par un critère de sélection porté par la donnée et une acquisition reproductible depuis une source officielle.

## Contexte

Le catalogue compte 281 aliments extraits de la table CIQUAL 2020 de l'ANSES. Deux défauts le
fragilisent, indépendants l'un de l'autre.

**La sélection repose sur des nombres inventés.** Pour chacun des 18 sous-groupes CIQUAL balayés, le
catalogue retient les N aliments « les mieux documentés », N étant écrit à la main. Ces 18 nombres ne
sont adossés à aucune spécification, aucune recherche, aucun commentaire ; ils datent tous du commit
initial et n'ont jamais été revus. Ils produisent des résultats faux : le plafond de 5 sur les
substituts de produits carnés coupait le seul aliment convenant aux véganes, à égalité de score avec
deux aliments gardés, tout en retenant son jumeau explicitement non végane.

Le critère lui-même est le mauvais. « Le mieux documenté » mesure la complétude de la donnée, pas la
pertinence alimentaire : il écarte le Beaufort au profit d'un fromage plus rare mais mieux renseigné.
Et il ne peut pas être supprimé sans plafond de remplacement : mesuré, retirer les plafonds porte le
catalogue à 925 aliments, avec une moyenne de 19,8 nutriments renseignés sur 26 contre 25,5
aujourd'hui, et le solveur propose alors d'acheter de la gélatine, de la poudre à lever, de la gelée
royale et six algues — tout en améliorant son objectif de masse.

**La source est un geste manuel.** L'archive ZIP se télécharge à la main et se décompresse dans un
répertoire passé en argument au script. Rien de tout cela n'est rejouable sans intervention humaine,
et le millésime reste figé sur 2020 alors que la table 2025 est publiée.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La liste ne propose que des aliments qu'on achète (Priority: P1)

Une personne qui consulte sa liste d'ingrédients y trouve des aliments identifiables et achetables en
magasin, variés d'une espèce à l'autre, sans ingrédient de préparation ni produit de niche. Aucun
aliment n'est écarté parce que sa fiche de composition est incomplète, ni retenu parce qu'elle est
complète.

**Why this priority**: c'est la promesse du produit. Une liste qui propose de la gélatine et de la
poudre à lever n'est pas exploitable, et une liste qui omet un aliment courant parce que sa fiche est
lacunaire est appauvrie sans raison lisible. C'est aussi le défaut qui a déjà produit une erreur de
régime constatée.

**Independent Test**: livrable seul, sur la source actuellement en place. La classification employée
existe à l'identique dans le millésime 2020 déjà utilisé — se vérifie en comparant le catalogue
produit avant et après, sans changer de source.

**Acceptance Scenarios**:

1. **Given** un sous-groupe qui mélange plusieurs espèces, **When** le catalogue est construit,
   **Then** chaque espèce distinguée par la classification officielle est représentée, plutôt que
   plusieurs morceaux d'une même espèce au détriment des autres.
2. **Given** une classe d'aliments que le produit ne veut pas proposer (abats, fromages fondus,
   gibier), **When** le catalogue est construit, **Then** cette classe est exclue par une règle qui
   la nomme, et non par l'effet indirect d'un classement.
3. **Given** un aliment courant dont la fiche de composition est incomplète, **When** le catalogue
   est construit, **Then** sa présence ne dépend pas du nombre de nutriments renseignés.
4. **Given** le catalogue produit, **When** on demande d'où vient la présence de chaque aliment,
   **Then** chaque aliment se rattache à une règle nommée et consultable.

---

### User Story 2 - Le catalogue se reconstruit sans geste manuel (Priority: P2)

La personne qui maintient le projet reconstruit le catalogue par une seule commande, sans télécharger
ni décompresser quoi que ce soit à la main. Le fichier produit porte la version exacte de la source
employée et la date à laquelle elle a été récupérée.

**Why this priority**: le principe II exige une source citable avec version et date. Aujourd'hui ces
valeurs sont saisies à la main dans le script, donc invérifiables et falsifiables par inadvertance.
La reproductibilité conditionne aussi toute reconstruction future.

**Independent Test**: livrable seul, sans toucher au critère de sélection — le catalogue produit doit
alors être identique à celui d'avant, à la version et à la date près.

**Acceptance Scenarios**:

1. **Given** un poste sans aucun fichier de données préalable, **When** la commande de construction
   est lancée, **Then** le catalogue est produit sans intervention humaine.
2. **Given** une construction réussie, **When** on ouvre le fichier produit, **Then** la version de
   la source et sa date de récupération y figurent, et proviennent de la source elle-même.
3. **Given** une source injoignable ou altérée, **When** la commande est lancée, **Then** elle
   échoue en le disant, sans produire de catalogue partiel ni écraser le catalogue existant.

---

### User Story 3 - Le catalogue reflète le millésime courant (Priority: P3)

Le catalogue est construit sur le millésime le plus récent publié par l'ANSES, et le changement de
millésime est une opération explicite et relue, pas un effet de bord.

**Why this priority**: valeur réelle mais moindre — la 2020 reste une donnée officielle valide. Le
gain est la fraîcheur (3 185 aliments en 2020, 3 484 en 2025) et l'accès aux aliments ajoutés depuis,
notamment cinq desserts végétaux et deux boissons végétales supplémentaires.

**Independent Test**: se vérifie en comparant les deux catalogues produits, l'un par millésime, et en
relisant la liste des aliments apparus et disparus.

**Acceptance Scenarios**:

1. **Given** un changement de millésime, **When** le catalogue est reconstruit, **Then** la liste des
   aliments entrés et sortis est produite et relisible.
2. **Given** un aliment nommément désigné par une règle qui disparaît du millésime, **When** le
   catalogue est reconstruit, **Then** la construction échoue en nommant l'aliment manquant plutôt
   que de le retirer en silence.
3. **Given** deux millésimes encodés différemment, **When** le catalogue est construit depuis l'un ou
   l'autre, **Then** les libellés accentués sont corrects dans les deux cas.

---

### Edge Cases

- **22 % des aliments des sous-groupes balayés ne portent aucune classe de quatrième niveau** (valeur
  `000000`) — toutes les pommes de terre et tout le tofu en font partie. Une règle fondée uniquement
  sur ce niveau en écarterait un cinquième. Le comportement de repli doit être décidé et documenté,
  pas subi.
- Une classe change de libellé d'un millésime à l'autre : neuf l'ont fait entre 2020 et 2025, dont
  « substituts de charcuteries pour végétariens » devenu « alternatives végétales aux charcuteries ».
  Les règles ne doivent pas dépendre d'un libellé.
- Une classe se vide d'un millésime à l'autre : le sous-groupe des substituts de produits carnés
  compte 6 aliments en 2020 et aucun en 2025, son contenu ayant été reclassé ailleurs.
- Un aliment d'origine animale se retrouve dans une classe ouverte à tous les régimes : gélatine et
  gelée royale sont aujourd'hui étiquetées véganes, et des pâtes aux œufs ont été proposées à un
  régime végane. Le volume du catalogue doit rester compatible avec une relecture humaine de ces
  étiquetages.
- Un aliment ne se consomme pas en portion (algues, levures, sons, graines) : il doit rester
  proposable en quantité de condiment sans pouvoir dominer une liste.
- La source publie une version corrigée sous le même millésime.

## Requirements *(mandatory)*

### Functional Requirements

**Sélection**

- **FR-201**: La sélection des aliments DOIT reposer sur la classification publiée par la source
  officielle, et non sur des quotas numériques propres au projet.
- **FR-202**: Toute classe d'aliments écartée du catalogue DOIT l'être par une règle qui la désigne
  explicitement, accompagnée de sa raison.
- **FR-203**: La complétude de la fiche de composition NE DOIT PAS déterminer la présence d'un
  aliment au catalogue. Elle PEUT rester un critère de départage entre aliments d'une même classe,
  à condition que ce rôle soit documenté.
- **FR-204**: Le comportement appliqué aux aliments sans classe de quatrième niveau DOIT être
  explicite et documenté.
- **FR-205**: Chaque aliment du catalogue DOIT être rattachable à la règle qui justifie sa présence.
- **FR-206**: Le catalogue produit DOIT rester d'une taille permettant la relecture humaine de
  l'étiquetage de régime et d'exclusion de chaque aliment.
- **FR-207**: Le catalogue NE DOIT PAS proposer d'aliments qui ne s'achètent ni ne se consomment en
  portions identifiables.

**Acquisition**

- **FR-208**: La construction du catalogue DOIT récupérer ses données depuis une source publique
  officielle, sans téléchargement ni décompression manuels.
- **FR-209**: La version de la source et sa date de récupération DOIVENT être inscrites dans le
  fichier produit et provenir de la source, non d'une saisie manuelle.
- **FR-210**: La licence de la source DOIT être vérifiée à la récupération et inscrite dans le
  fichier produit.
- **FR-211**: Une source injoignable, incomplète ou incohérente DOIT faire échouer la construction
  avec un message nommant le problème, sans produire ni écraser de catalogue.
- **FR-212**: La construction DOIT traiter correctement les libellés accentués quel que soit
  l'encodage du millésime.

**Traçabilité et revue**

- **FR-213**: La frontière entre ce qui vient de la source et ce qui relève de décisions du projet
  (régimes compatibles, exclusions, bornes de quantité, unités d'achat) DOIT rester explicite dans
  le fichier produit.
- **FR-214**: Toute reconstruction DOIT produire la liste des aliments entrés et sortis par rapport
  au catalogue précédent, pour relecture.
- **FR-215**: Un aliment désigné nommément par une règle et absent de la source DOIT faire échouer
  la construction plutôt que d'être retiré silencieusement.
- **FR-216**: Le remplacement du critère de sélection NE DOIT PAS dégrader la couverture
  nutritionnelle atteignable pour les régimes déjà servis, et tout écart nouvellement ouvert ou
  refermé DOIT être constaté et documenté.

### Key Entities

- **Catalogue d'aliments** : l'ensemble des aliments proposables, chacun portant sa composition, sa
  catégorie d'achat, ses régimes compatibles, ses exclusions et ses bornes de quantité.
- **Classe d'aliments** : un regroupement issu de la classification officielle, à quatre niveaux de
  finesse, qui sert d'unité de décision pour inclure ou écarter des aliments.
- **Règle de sélection** : la décision du projet appliquée à une classe — la retenir, l'écarter, ou
  en limiter la représentation — assortie de sa raison.
- **Millésime de source** : une publication datée et versionnée de la table officielle, dont dépend
  l'ensemble du catalogue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Aucun nombre de sélection propre au projet ne subsiste : 100 % des inclusions et
  exclusions se justifient par une classe officielle nommée ou une règle écrite et motivée.
- **SC-002**: Aucun ingrédient de préparation ni produit de niche (gélatine, poudre à lever, gelée
  royale) n'apparaît dans une liste produite, pour aucun des quatre régimes de base.
- **SC-003**: ~~Le catalogue conserve une complétude moyenne d'au moins 25 nutriments renseignés sur
  26, soit le niveau actuel.~~ **Amendé le 2026-09-17, à l'implémentation : au moins 23 sur 26.**

  Le critère supposait que la densité de renseignement de la source ne bougerait pas. Mesuré, ce
  n'est pas le changement de règles qui la fait bouger — à millésime égal, la complétude passe de
  25,56 à 25,52 — mais **le changement de millésime** : 23,34 sur la table 2025. La table y compte
  300 aliments de plus, et ceux que les règles retiennent sont moins complètement renseignés,
  principalement sur les folates, le sélénium et l'iode.

  Le seuil est abaissé plutôt que le millésime abandonné, parce que la 2025 est **plus juste** là où
  ça compte : elle a retiré les teneurs en vitamine B12 des algues, que la 2020 publiait (38,8 µg
  pour le nori). Ce sont des corrinoïdes non assimilables par l'humain, et le catalogue 2020 s'en
  servait pour déclarer couverte la B12 d'un régime végane. Entre un catalogue plus complet qui ment
  et un catalogue moins complet qui dit vrai, le principe II ne laisse pas le choix.
- **SC-004**: Pour chaque sous-groupe mélangeant plusieurs espèces, au moins une entrée par espèce
  officiellement distinguée est présente, là où le catalogue actuel en omet.
- **SC-005**: La reconstruction complète du catalogue depuis un poste vierge s'obtient par une seule
  commande, sans étape manuelle.
- **SC-006**: 100 % des aliments du catalogue portent une version et une date de récupération issues
  de la source.
- **SC-007**: La couverture nutritionnelle atteignable pour chacun des quatre régimes de base est au
  moins égale à celle du catalogue actuel, tout écart constaté étant documenté.
- **SC-008**: La relecture complète de l'étiquetage de régime du catalogue reste réalisable en une
  session de travail.

## Assumptions

- La table CIQUAL de l'ANSES reste la source de composition du projet ; le changement de source n'est
  pas au périmètre.
- La classification officielle à quatre niveaux est maintenue par l'ANSES et reste stable en codes
  d'un millésime à l'autre — vérifié entre 2020 et 2025, où les 86 classes de quatrième niveau sont
  inchangées et seuls neuf libellés diffèrent.
- Les décisions du projet qui ne relèvent pas de la source (régimes compatibles, exclusions, bornes
  de quantité, unités d'achat) restent des décisions du projet et ne sont pas remplacées par cette
  feature.
- Le catalogue reste un fichier versionné dans le dépôt, produit hors ligne ; aucun appel réseau
  n'intervient au moment du calcul pour l'utilisateur.
- Les erreurs d'étiquetage de régime déjà constatées (gélatine, gelée royale, pâtes aux œufs) sont
  traitées dans le cadre de cette feature, la relecture devenant possible.

## Hors périmètre

- **L'étude INCA 3 de l'ANSES comme source de pertinence**, évaluée et écartée. Sa colonne de
  fréquence donne le nombre d'occurrences de consommation relevées, mais aucune clé ne la relie à
  CIQUAL : le rapprochement ne peut se faire que par nom, il ne couvre que 27 % des candidats, et il
  échoue sur des aliments évidents — tofu, lentille cuite et pomme ne sont pas rapprochés là où la
  carotte l'est. La mesure ne discrimine pas non plus les aliments retenus des aliments écartés
  (31 % contre 25 % de rapprochement).
- **Open Food Facts** : base de produits de marque, non officielle, avec des doublons entre marques.
- La refonte du solveur, des bornes de quantité et des unités d'achat.
- L'ajout de nouvelles catégories d'affichage au produit, sauf si la sélection par classe en fait
  apparaître le besoin — auquel cas il fera l'objet d'une décision tracée dans le plan.
