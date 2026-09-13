# Feature Specification: Besoins nutritionnels personnalisés et liste d'ingrédients de saison

**Feature Branch**: `001-nutrition-ingredient-planner`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Application web et mobile (responsive) permettant à chaque utilisateur, à partir de son poids, sa taille et son régime alimentaire (omnivore, végétarien, végane, etc.), d'obtenir la liste des nutriments dont son corps a besoin par jour et par semaine (calories, protéines, vitamines, minéraux), puis la liste des ingrédients et des quantités associées permettant de couvrir ces besoins. Chaque utilisateur doit avoir un espace personnel connecté (profil, historique, préférences); l'authentification ne doit pas être développée en interne mais déléguée à un outil externe gratuit, simple à intégrer et reconnu pour sa sécurité, couplé à une base de données applicative. Les besoins sont calculés à partir du poids, de la taille, de l'âge, du sexe, du niveau d'activité physique et du régime déclaré, sur la base de références nutritionnelles officielles (pas de diagnostic médical). Le régime déclaré influence les ingrédients proposés mais jamais le calcul des besoins. La liste d'ingrédients doit être compatible avec le régime et ne proposer que des fruits et légumes de saison au moment de la consultation. Pas de recettes pour cette version, mais l'architecture doit anticiper une génération de recettes par un outil IA externe. Sources: saisonnalité France métropolitaine (Agribalyse/ADEME, calendrier Greenpeace), composition nutritionnelle via API gratuite (USDA FoodData Central, Open Food Facts) ou base téléchargeable (CIQUAL/ANSES), références de besoins journaliers officielles (ANSES ou DRI). Le design doit réutiliser les composants du design system Figma 'BDD de composants de base' récupérés via le MCP Figma (33 écrans/composants de référence listés en Annexe A). Hors périmètre: génération de recettes ou de menus, suivi de consommation réelle, diagnostic ou conseil médical personnalisé."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connaître ses besoins nutritionnels (Priority: P1)

Une personne renseigne son poids, sa taille, son âge, son sexe de référence, son niveau d'activité
physique et son régime alimentaire, puis obtient immédiatement la liste des nutriments dont son
corps a besoin, exprimée par jour et par semaine: énergie, protéines, vitamines et minéraux
principaux, avec pour chacun la valeur, l'unité et l'apport de référence officiel utilisé.

**Why this priority**: c'est la promesse de base du produit et la donnée dont tout le reste dépend
(la liste d'ingrédients n'a aucun sens sans besoins calculés). Livrée seule, elle constitue déjà un
produit utilisable: un calculateur de besoins nutritionnels personnalisé et sourcé.

**Independent Test**: saisir un profil complet sans créer de compte et vérifier que les besoins
journaliers et hebdomadaires s'affichent, avec la source officielle indiquée pour chaque nutriment.

**Acceptance Scenarios**:

1. **Given** un visiteur sur la page de saisie, **When** il renseigne un profil complet et valide,
   **Then** le système affiche ses besoins journaliers et hebdomadaires pour l'énergie, les
   protéines et chaque vitamine et minéral du référentiel, avec valeur, unité et source.
2. **Given** un profil validé et des besoins affichés, **When** l'utilisateur bascule de la vue
   "par jour" à la vue "par semaine", **Then** chaque valeur hebdomadaire correspond exactement à
   sept fois la valeur journalière correspondante.
3. **Given** un champ du profil vide ou hors des bornes plausibles, **When** l'utilisateur valide,
   **Then** le système refuse le calcul et indique précisément le champ à corriger et la plage
   attendue.
4. **Given** des besoins affichés, **When** l'utilisateur consulte l'écran de résultats,
   **Then** une mention visible rappelle qu'il s'agit d'une estimation informative et non d'un avis
   médical.

---

### User Story 2 - Obtenir la liste d'ingrédients de saison couvrant ses besoins (Priority: P2)

À partir des besoins calculés, l'utilisateur choisit une période (jour ou semaine) et obtient une
liste d'ingrédients avec les quantités associées permettant de couvrir ces besoins. Tous les
ingrédients sont compatibles avec le régime déclaré, et les fruits et légumes proposés sont
uniquement ceux de saison à la date de consultation. Pour chaque nutriment, l'utilisateur voit le
taux de couverture atteint par la liste, et les éventuels écarts sont explicitement signalés.

**Why this priority**: c'est la seconde moitié de la valeur du produit, celle qui transforme des
chiffres en action concrète. Elle dépend de US1 mais peut être testée et démontrée séparément à
partir d'un jeu de besoins donné.

**Independent Test**: à partir d'un profil végane et d'un profil omnivore, générer la liste pour la
semaine en cours et vérifier qu'aucun ingrédient exclu par le régime n'apparaît, qu'aucun fruit ou
légume hors saison n'est proposé, et que le taux de couverture est affiché pour chaque nutriment.

**Acceptance Scenarios**:

1. **Given** des besoins calculés pour un profil végane, **When** l'utilisateur demande la liste
   pour la journée, **Then** la liste ne contient aucun produit d'origine animale et affiche pour
   chaque ligne un ingrédient, une quantité et une unité exploitables.
2. **Given** une consultation au mois de janvier, **When** la liste est générée, **Then** aucun
   fruit ni légume absent du calendrier de saison de janvier (France métropolitaine) n'est proposé.
3. **Given** une liste générée, **When** l'utilisateur consulte le détail de couverture, **Then**
   le système affiche pour chaque nutriment le pourcentage des besoins couvert par la liste.
4. **Given** un régime pour lequel un nutriment ne peut pas être couvert par les aliments courants
   compatibles, **When** la liste est générée, **Then** le système signale explicitement l'écart et
   propose les aliments enrichis compatibles disponibles, identifiés comme tels, sans recommander
   de complément alimentaire.
5. **Given** une liste générée pour la journée, **When** l'utilisateur bascule sur la période
   "semaine", **Then** une nouvelle liste cohérente avec les besoins hebdomadaires est proposée.

---

### User Story 3 - Retrouver son espace personnel connecté (Priority: P3)

L'utilisateur se connecte via un fournisseur d'identité externe, retrouve son profil pré-rempli,
ses préférences et l'historique daté de ses résultats précédents (besoins et listes), et peut
consulter, mettre à jour ou supprimer ses données.

**Why this priority**: l'espace personnel transforme un outil ponctuel en service récurrent, mais
la valeur du calcul existe sans lui. Il porte également les exigences de sécurité et de protection
des données personnelles.

**Independent Test**: se connecter, enregistrer un profil, se déconnecter, se reconnecter depuis un
autre appareil et vérifier que le profil et l'historique sont restitués à l'identique.

**Acceptance Scenarios**:

1. **Given** un utilisateur non connecté, **When** il se connecte via le fournisseur d'identité
   externe, **Then** il accède à son espace personnel sans que l'application ne lui demande ni ne
   stocke de mot de passe.
2. **Given** un utilisateur connecté ayant déjà enregistré un profil, **When** il revient sur
   l'application, **Then** son profil est pré-rempli et son dernier résultat est accessible.
3. **Given** un utilisateur connecté ayant généré plusieurs résultats, **When** il ouvre son
   historique, **Then** il voit chaque résultat daté avec le profil utilisé au moment du calcul.
4. **Given** un utilisateur ayant modifié son poids, **When** il consulte un ancien résultat,
   **Then** cet ancien résultat reste inchangé et conserve le profil d'origine.
5. **Given** un utilisateur connecté, **When** il demande la suppression de ses données, **Then**
   son profil et son historique sont supprimés et ne sont plus accessibles.
6. **Given** un visiteur ayant généré un résultat en mode invité, **When** il se connecte, **Then**
   le système lui propose de rattacher ce résultat à son compte.

---

### User Story 4 - Changer de régime sans fausser ses besoins (Priority: P4)

L'utilisateur modifie son régime alimentaire déclaré (par exemple d'omnivore à végétarien) et
constate que ses besoins nutritionnels restent identiques, tandis que la liste d'ingrédients
proposée est entièrement recomposée pour respecter le nouveau régime.

**Why this priority**: cet invariant est une exigence explicite du produit et la garantie de la
justesse du calcul; il mérite d'être démontrable en tant que parcours, mais il n'ajoute pas de
fonctionnalité nouvelle.

**Independent Test**: enregistrer deux profils identiques ne différant que par le régime, comparer
les besoins (strictement identiques) et les listes d'ingrédients (différentes et conformes à chaque
régime).

**Acceptance Scenarios**:

1. **Given** deux profils identiques sauf le régime, **When** les besoins sont calculés pour
   chacun, **Then** toutes les valeurs de besoins sont strictement identiques.
2. **Given** un utilisateur qui change de régime, **When** il régénère sa liste, **Then** la liste
   ne contient que des ingrédients compatibles avec le nouveau régime.

---

### Edge Cases

- Que se passe-t-il si le poids, la taille ou l'âge saisis sont hors des bornes physiologiques
  plausibles (par exemple 300 kg, 40 cm, 3 ans)? Le calcul doit être refusé avec un message
  explicite plutôt que de produire une estimation aberrante.
- Que se passe-t-il pour un profil hors périmètre (grossesse, allaitement, mineur, pathologie
  déclarée)? L'application doit informer que ces situations ne sont pas couvertes et renvoyer vers
  un professionnel de santé.
- Comment le système se comporte-t-il lorsqu'un régime très restrictif (végane et sans gluten, par
  exemple) rend certains nutriments impossibles à couvrir par les ingrédients disponibles?
  Les écarts doivent être signalés nutriment par nutriment.
- Comment la saisonnalité est-elle traitée lorsqu'une liste hebdomadaire chevauche deux mois?
  La règle appliquée doit être unique et documentée (mois de la date de consultation).
- Que se passe-t-il si la source externe de composition nutritionnelle est indisponible?
  Les besoins restent calculables et la liste reste générable à partir des données embarquées, avec
  indication de la fraîcheur des données.
- Que se passe-t-il si aucun fruit ni légume de saison n'est disponible dans une catégorie requise?
  Le système privilégie les autres catégories compatibles et signale la limite plutôt que de
  proposer un produit hors saison.
- Que se passe-t-il si un utilisateur non connecté génère un résultat puis crée un compte?
  Le système lui propose de rattacher ce résultat à son compte et l'avertit, avant la connexion,
  qu'un résultat non rattaché est perdu (FR-024).
- Que se passe-t-il si le fournisseur d'identité externe est indisponible? Les parcours ne
  nécessitant pas de compte restent utilisables et un message clair est affiché.
- Que se passe-t-il si un utilisateur conserve un onglet ouvert au passage d'un mois à l'autre?
  La liste générée porte la date de génération qui fait foi pour la saisonnalité.

## Requirements *(mandatory)*

### Functional Requirements

#### Profil et saisie

- **FR-001**: Le système DOIT permettre de saisir un profil composé du poids (kg), de la taille
  (cm), de l'âge (années), du sexe de référence utilisé pour les tables d'apports, du niveau
  d'activité physique choisi dans une échelle fermée, et du régime alimentaire déclaré.
- **FR-002**: Le système DOIT valider chaque champ du profil selon des bornes plausibles publiées
  et refuser le calcul en indiquant le champ fautif et la plage attendue.
- **FR-003**: Le système DOIT proposer une liste fermée de régimes alimentaires (base: omnivore,
  pescétarien, végétarien, végane) combinable avec des exclusions cumulables (sans gluten, sans
  lactose, sans fruits à coque).
- **FR-004**: Les utilisateurs DOIVENT pouvoir modifier leur profil et relancer un calcul à tout
  moment.

#### Calcul des besoins nutritionnels

- **FR-005**: Le système DOIT calculer, à partir du profil, les besoins journaliers en énergie, en
  protéines, et pour chaque vitamine et minéral du référentiel retenu (voir Assumptions).
- **FR-006**: Le système DOIT présenter les mêmes besoins sur une base hebdomadaire, égale à sept
  fois la valeur journalière.
- **FR-007**: Les besoins DOIVENT être dérivés de références nutritionnelles officielles publiées
  (type ANSES, EFSA ou DRI), et le système DOIT afficher pour chaque nutriment la référence et la
  version utilisées.
- **FR-008**: Le régime alimentaire déclaré NE DOIT avoir aucun effet sur les valeurs de besoins
  calculées: pour deux profils identiques ne différant que par le régime, les besoins DOIVENT être
  strictement identiques.
- **FR-009**: Le système DOIT afficher pour chaque nutriment sa valeur, son unité et la nature de
  la valeur de référence (apport satisfaisant, référence nutritionnelle pour la population, etc.).
- **FR-010**: Le système DOIT afficher une mention visible précisant qu'il s'agit d'une estimation
  informative, et NE DOIT produire ni diagnostic, ni prescription, ni objectif de poids.
- **FR-011**: Le système DOIT indiquer que les profils particuliers (grossesse, allaitement,
  personnes mineures, pathologies) ne sont pas couverts, et renvoyer vers un professionnel de santé.

#### Liste d'ingrédients et quantités

- **FR-012**: Le système DOIT produire, pour une période choisie (jour ou semaine), une liste
  d'ingrédients avec pour chacun une quantité et une unité exploitables pour l'achat ou la
  préparation.
- **FR-013**: Tous les ingrédients proposés DOIVENT être compatibles avec le régime déclaré et ses
  exclusions; aucun ingrédient exclu NE DOIT apparaître dans la liste.
- **FR-014**: Les fruits et légumes proposés DOIVENT être de saison à la date de génération de la
  liste, selon la table de saisonnalité de référence (France métropolitaine); aucun fruit ou légume
  hors saison NE DOIT être proposé par défaut.
- **FR-015**: Le système DOIT calculer et afficher, pour chaque nutriment, le taux de couverture
  des besoins atteint par la liste proposée.
- **FR-016**: La liste proposée DOIT atteindre au minimum 100 % des besoins en énergie, en
  protéines et en micronutriments prioritaires (fer, calcium, magnésium, vitamine B12, vitamine D,
  vitamine C), et au minimum 80 % des besoins pour les autres micronutriments du référentiel.
- **FR-017**: Le système DOIT signaler explicitement tout nutriment dont la couverture est
  inférieure au seuil qui lui est applicable (100 % ou 80 % selon FR-016), en le nommant et en
  indiquant le pourcentage atteint.
- **FR-018**: Lorsqu'un nutriment ne peut pas être couvert par les aliments courants compatibles
  avec le régime déclaré, le système DOIT signaler l'écart et proposer dans la liste les aliments
  enrichis compatibles disponibles (boisson végétale enrichie, levure maltée enrichie, sel iodé,
  etc.), identifiés explicitement comme enrichis. Le système NE DOIT recommander ni complément
  alimentaire, ni posologie, ni produit de complémentation.
- **FR-019**: Les valeurs nutritionnelles des ingrédients DOIVENT provenir d'une base de
  composition alimentaire publique reconnue, avec source et version traçables et affichables.
- **FR-020**: Le système DOIT permettre de basculer entre les périodes jour et semaine et produire
  une liste cohérente avec la période choisie.
- **FR-021**: Le système NE DOIT PAS proposer de recettes, de menus ou de répartition par repas
  dans cette version.

#### Compte, données personnelles et historique

- **FR-022**: L'authentification DOIT être assurée par un fournisseur d'identité externe géré;
  l'application NE DOIT stocker aucun mot de passe ni hash de mot de passe, ni implémenter sa propre
  gestion de sessions.
- **FR-023**: Le système DOIT rattacher les données applicatives (profil, régime, préférences,
  historique) à l'identifiant fourni par le fournisseur d'identité.
- **FR-024**: Le système DOIT permettre de lancer un calcul de besoins et d'obtenir une liste
  d'ingrédients sans compte (mode invité). La sauvegarde du profil, les préférences et l'historique
  DOIVENT être réservés aux utilisateurs connectés. Le système DOIT proposer à un visiteur qui se
  connecte juste après un calcul de rattacher ce résultat à son compte, et DOIT l'avertir avant la
  connexion qu'un résultat non rattaché est perdu.
- **FR-025**: Un utilisateur connecté DOIT retrouver son profil pré-rempli et ses préférences lors
  de ses visites suivantes, quel que soit l'appareil utilisé.
- **FR-026**: Le système DOIT conserver un historique des résultats comprenant la date, le profil
  utilisé au moment du calcul, les besoins calculés et la liste générée.
- **FR-027**: Une modification du profil NE DOIT PAS altérer les résultats déjà enregistrés dans
  l'historique.
- **FR-028**: Chaque utilisateur NE DOIT accéder qu'à ses propres données.
- **FR-029**: Les utilisateurs DOIVENT pouvoir consulter, exporter et supprimer leurs données
  personnelles, suppression du compte incluse.
- **FR-030**: Le système DOIT informer l'utilisateur de la nature des données collectées et de leur
  finalité avant la première sauvegarde.

#### Interface, design et accessibilité

- **FR-031**: L'interface DOIT être utilisable sans perte de fonctionnalité ni défilement
  horizontal de 320 px à 1920 px de large.
- **FR-032**: Les écrans DOIVENT être composés à partir des composants et tokens du design system
  existant "BDD de composants de base" (voir Annexe A); tout composant créé de zéro DOIT être
  justifié par l'absence d'équivalent dans ce design system.
- **FR-033**: L'interface DOIT respecter les contrastes WCAG 2.1 AA, être navigable au clavier et
  associer un libellé explicite à chaque champ de formulaire.
- **FR-034**: L'interface DOIT être rédigée en français.
- **FR-035**: Le système DOIT indiquer la progression pendant le calcul et afficher un message
  d'erreur actionnable en cas d'échec.

#### Fiabilité et évolutivité

- **FR-036**: En cas d'indisponibilité d'une source de données externe, le système DOIT continuer à
  fournir les besoins et une liste à partir des données de référence embarquées ou mises en cache,
  en signalant la date de dernière mise à jour des données.
- **FR-037**: La liste d'ingrédients générée DOIT être disponible sous une forme structurée et
  stable (ingrédient, quantité, unité, apports couverts), réutilisable ultérieurement par un service
  externe de génération de recettes sans refonte du modèle de données.
- **FR-038**: Le système DOIT journaliser la source et la version des données de référence
  utilisées pour chaque résultat produit, afin de rendre tout résultat reproductible.

### Key Entities *(include if feature involves data)*

- **Utilisateur**: personne identifiée par le fournisseur d'identité externe; l'application n'en
  conserve que l'identifiant externe et les préférences d'affichage. Aucun secret d'authentification
  n'est détenu par l'application.
- **Profil physiologique**: poids, taille, âge, sexe de référence, niveau d'activité physique,
  régime déclaré et exclusions; appartient à un utilisateur ou à une session anonyme.
- **Régime alimentaire**: régime de base et exclusions cumulables, exprimés sous forme de règles
  d'inclusion ou d'exclusion de catégories d'aliments; ne participe jamais au calcul des besoins.
- **Nutriment**: identifiant, libellé, unité, catégorie (énergie, macronutriment, vitamine,
  minéral) et priorité d'affichage.
- **Apport de référence**: valeur officielle d'un nutriment pour une combinaison sexe, tranche
  d'âge et niveau d'activité; porte sa source, sa version et sa date de récupération.
- **Besoins calculés**: résultat daté associant un instantané du profil, une période (jour ou
  semaine) et une valeur par nutriment, avec les références utilisées.
- **Aliment**: ingrédient identifié, catégorie, composition nutritionnelle pour une quantité de
  référence, compatibilité avec chaque régime, indicateur fruit ou légume, source et version de la
  composition.
- **Calendrier de saisonnalité**: association entre un fruit ou légume et les mois de disponibilité
  en France métropolitaine, avec sa source.
- **Liste d'ingrédients générée**: ensemble de lignes (aliment, quantité, unité) rattaché à des
  besoins calculés et à une période, accompagné du taux de couverture par nutriment, des écarts
  signalés et de la date de génération.
- **Entrée d'historique**: résultat conservé pour un utilisateur connecté, immuable, comprenant les
  besoins calculés et la liste générée.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un nouvel utilisateur obtient ses besoins journaliers et hebdomadaires en moins de
  2 minutes à partir de son arrivée sur l'application, saisie du profil comprise.
- **SC-002**: 100 % des listes générées ne contiennent aucun ingrédient incompatible avec le régime
  déclaré, vérifié sur un jeu de test couvrant tous les régimes et exclusions supportés.
- **SC-003**: 100 % des fruits et légumes proposés sont de saison au mois de consultation, vérifié
  pour les douze mois de l'année sur la table de référence.
- **SC-004**: Pour deux profils identiques ne différant que par le régime, l'écart entre les
  besoins calculés est de 0 %, vérifié automatiquement à chaque livraison.
- **SC-005**: Les besoins calculés correspondent aux valeurs des références officielles à moins de
  5 % d'écart sur un panel d'au moins dix profils de contrôle documentés.
- **SC-006**: La liste proposée couvre au moins 100 % des besoins en énergie, en protéines et en
  micronutriments prioritaires, au moins 80 % des besoins pour les autres micronutriments du
  référentiel, et tout nutriment situé sous son seuil est signalé dans 100 % des cas.
- **SC-007**: Après déconnexion puis reconnexion depuis un autre appareil, 100 % des profils et des
  entrées d'historique sont restitués à l'identique.
- **SC-008**: Les parcours principaux sont réalisables sans défilement horizontal ni perte de
  fonctionnalité de 320 px à 1920 px de large.
- **SC-009**: 90 % des utilisateurs testés complètent la saisie de leur profil et obtiennent une
  liste d'ingrédients au premier essai, sans assistance.
- **SC-010**: 95 % des demandes de calcul affichent un résultat en moins de 3 secondes.
- **SC-011**: L'application ne détient aucun secret d'authentification utilisateur, vérifié par
  revue: aucun mot de passe ni hash stocké dans les données applicatives.
- **SC-012**: Une demande de suppression de compte entraîne l'effacement de 100 % des données
  personnelles associées, vérifié sur un compte de test.

## Assumptions

- **Public visé**: adultes de 18 à 70 ans en bonne santé, résidant en France métropolitaine;
  langue de l'interface: français.
- **Périodes supportées**: jour et semaine uniquement; la semaine vaut sept fois la journée, sans
  variation de répartition entre les jours.
- **Référentiel de nutriments v1**: énergie, protéines, lipides, glucides, fibres; vitamines A,
  B1, B2, B3, B5, B6, B9, B12, C, D, E, K; minéraux calcium, fer, magnésium, potassium, zinc, iode,
  sélénium, cuivre, phosphore. Le référentiel exact et sa source sont figés lors du plan.
- **Sexe de référence**: le calcul s'appuie sur les tables officielles publiées par sexe; le champ
  est présenté comme le choix de la table de référence à utiliser, sans prétention d'identité de
  genre.
- **Niveau d'activité**: échelle fermée à quatre niveaux (sédentaire, peu actif, actif, très
  actif), rattachée aux coefficients d'activité physique de la source officielle retenue.
- **Régimes v1**: régime de base (omnivore, pescétarien, végétarien, végane) combiné à des
  exclusions cumulables (sans gluten, sans lactose, sans fruits à coque). Les allergies et
  intolérances non listées ne sont pas modélisées dans cette version.
- **Saisonnalité**: granularité mensuelle, périmètre France métropolitaine, table de référence
  embarquée dans l'application et mise à jour manuellement; la date de génération de la liste fait
  foi.
- **Composition des aliments**: catalogue d'aliments courants restreint et maîtrisé plutôt que
  l'intégralité d'une base externe, afin de garantir la qualité des correspondances.
- **Quantités**: exprimées en unités d'achat ou de préparation réalistes et arrondies; aucun prix,
  aucune gestion de stock, aucun lien avec un distributeur.
- **Historique**: conservé tant que le compte existe, supprimable à la demande par l'utilisateur.
- **Micronutriments prioritaires** (arbitrage du 2026-09-13): fer, calcium, magnésium, vitamine
  B12, vitamine D et vitamine C, soumis au seuil de couverture de 100 % (FR-016); les autres
  micronutriments du référentiel visent 80 %.
- **Aliments enrichis**: le catalogue d'aliments inclut les aliments enrichis courants compatibles
  avec chaque régime (boisson végétale enrichie, levure maltée enrichie, sel iodé), afin de rendre
  FR-018 applicable sans sortir du champ alimentaire.
- **Mode invité** (arbitrage du 2026-09-13): un résultat généré sans compte n'est conservé que le
  temps de la session; seule la connexion permet de le rattacher durablement.
- **Coûts**: les services externes retenus disposent d'une offre gratuite couvrant le volume attendu
  du projet.
- **Design**: les composants listés en Annexe A sont accessibles via le MCP Figma au moment de la
  phase de plan; cette phase de spécification n'a pas pu les analyser (serveur MCP Figma non
  connecté dans la session de rédaction).

## Dependencies

- **Fournisseur d'identité externe** gratuit, reconnu et simple à intégrer, couplable à une base de
  données applicative (candidats à arbitrer en phase de plan: Clerk, Supabase Auth, Auth.js).
- **Base de données applicative** hébergeant profils, préférences et historique, rattachés à
  l'identifiant externe.
- **Source de composition nutritionnelle** publique et gratuite (candidats: USDA FoodData Central,
  Open Food Facts, table CIQUAL de l'ANSES en base téléchargeable).
- **Référentiel d'apports nutritionnels officiels** (candidats: ANSES, EFSA, DRI internationaux),
  intégré comme donnée de référence versionnée.
- **Table de saisonnalité France métropolitaine** issue de sources publiques reconnues
  (Agribalyse/ADEME, calendrier Greenpeace).
- **Design system Figma "BDD de composants de base"** et accès au MCP Figma pour en extraire
  structure, styles et tokens (Annexe A).
- **Service externe de génération de recettes**: hors périmètre de cette version, mais la sortie
  structurée de la liste d'ingrédients doit rester consommable par un tel service.

## Out of Scope

- Génération de recettes, de menus ou de plannings de repas (évolution future via un outil IA
  externe; seule l'anticipation du format de sortie est dans le périmètre).
- Suivi de la consommation réelle au fil du temps (journal alimentaire).
- Diagnostic, conseil médical personnalisé, objectifs de perte ou de prise de poids, protocoles
  sportifs.
- Profils particuliers: grossesse, allaitement, personnes mineures, pathologies déclarées.
- Prix, courses en ligne, gestion de stock ou de garde-manger.
- Internationalisation (langues supplémentaires, saisonnalité hors France métropolitaine).
- Application native installable (le périmètre est une application web responsive).

## Annexe A - Références du design system Figma

Fichier source (design system existant, à ne pas recréer):
`https://www.figma.com/design/rjkPVphG56oIJElZVnK82I/BDD-de-composants-de-base`

Chaque noeud ci-dessous DOIT être analysé via le MCP Figma pendant la phase de plan (structure,
styles, tokens) puis réutilisé de façon cohérente dans l'implémentation. Ouvrir un noeud en
ajoutant `?node-id=<id>` à l'URL du fichier.

| # | node-id | # | node-id | # | node-id |
|---|---------|---|---------|---|---------|
| 1 | 1525-271581 | 12 | 1046-9312 | 23 | 1232-9 |
| 2 | 1023-36826 | 13 | 1046-10171 | 24 | 1107-70094 |
| 3 | 1345-407 | 14 | 1046-12310 | 25 | 1090-57817 |
| 4 | 1142-83268 | 15 | 1038-34411 | 26 | 1154-89981 |
| 5 | 1532-352912 | 16 | 7699-116817 | 27 | 124-2838 |
| 6 | 1532-352913 | 17 | 1256-130788 | 28 | 1096-8566 |
| 7 | 1532-353525 | 18 | 1097-63652 | 29 | 1086-534 |
| 8 | 1532-353584 | 19 | 1050-105632 | 30 | 1102-4208 |
| 9 | 1030-34389 | 20 | 1027-7346 | 31 | 1052-489 |
| 10 | 1046-3819 | 21 | 1102-5338 | 32 | 1664-398801 |
| 11 | 1046-8088 | 22 | 1345-1610 | 33 | 1622-261458 |
