<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0 (MAJOR: redéfinition incompatible du principe VI)
- Principe modifié:
  - VI. « Design system d'abord » -> « Direction visuelle maison d'abord »
    Le design system Figma « BDD de composants de base » cessait de servir le produit: interface
    générique, sans rapport avec le sujet, et rejetée à la revue du 2026-09-16. La règle change de
    référence, pas de nature: elle impose toujours une source unique de vérité visuelle, mais celle
    du projet ("Encre & Saison", docs/design-system.md) et non plus celle d'un fichier Figma tiers.
    Deux exigences sont ajoutées: le ratio de contraste consigné à côté de chaque token, et
    l'interdiction de la couleur comme seul véhicule d'une information.
- Principes inchangés: I, II, III, IV, V
- Sections inchangées: Contraintes techniques et sources de données; Workflow de développement et
  portes qualité; Governance
- Modèles dépendants: plan-template.md, spec-template.md, tasks-template.md, checklist-template.md
  -> aucune modification requise (la constitution est lue au runtime)
- Artefacts à aligner: specs/001-nutrition-ingredient-planner/{spec,plan,tasks}.md (FR-032, Annexe A,
  porte VI du plan) -> traité par la feature 002-refonte-visuelle (FR-113, FR-114)
- TODO restants: aucun
- Note: ce rapport est un artefact de revue temporaire, à retirer avant commit de l'amendement.
-->

# FeedMyAss Constitution

## Core Principles

### I. Spécification d'abord (SDD)

Toute évolution fonctionnelle DOIT passer par le cycle Spec Kit specify -> plan -> tasks ->
implement. Aucun code applicatif n'est écrit avant qu'une spécification validée n'existe dans
`specs/<feature>/spec.md`. La spécification décrit le QUOI et le POURQUOI; les choix techniques
appartiennent au plan. Toute divergence constatée entre le code et la spécification DOIT être
résolue en amendant la spécification ou en corrigeant le code, jamais en laissant les deux diverger.

**Rationale**: le projet est mono-développeur et assisté par IA; la spécification est la seule
source de vérité partagée entre les sessions de travail.

### II. Exactitude nutritionnelle traçable (NON NÉGOCIABLE)

Toute valeur nutritionnelle affichée (apport de référence, composition d'un aliment, saisonnalité)
DOIT provenir d'une source publique officielle identifiée, et être stockée avec sa source, sa
version et sa date de récupération. Aucune valeur nutritionnelle NE DOIT être codée en dur sans
source citable. Les formules de calcul (métabolisme de base, niveau d'activité, extrapolation
hebdomadaire) DOIVENT être documentées avec leur référence et couvertes par des tests sur des
profils de contrôle dont les résultats attendus sont issus de la source officielle.

**Rationale**: le produit donne des chiffres que l'utilisateur appliquera à son alimentation;
une valeur non traçable est une valeur non vérifiable, donc non publiable.

### III. Séparation stricte besoins / régime (NON NÉGOCIABLE)

Le calcul des besoins nutritionnels DOIT être indépendant du régime alimentaire déclaré.
Le régime NE DOIT intervenir QUE dans la sélection des ingrédients proposés en sortie.
Pour deux profils identiques ne différant que par le régime, les besoins calculés DOIVENT être
strictement identiques; cet invariant DOIT être vérifié par un test automatisé.

**Rationale**: un régime est un choix d'apport, pas une modification de la physiologie; biaiser
les besoins selon le régime produirait des recommandations fausses et non comparables.

### IV. Information, jamais conseil médical

L'application DOIT présenter ses résultats comme une estimation informative. Elle NE DOIT produire
ni diagnostic, ni prescription, ni recommandation thérapeutique, ni objectif de perte ou de prise
de poids. Tout écran affichant des résultats DOIT porter une mention visible rappelant ce cadre et
renvoyant vers un professionnel de santé pour les situations particulières (grossesse, allaitement,
pathologie, minorité, trouble du comportement alimentaire).

**Rationale**: le périmètre santé impose une frontière explicite et constante entre information
nutritionnelle générale et acte médical.

### V. Identité déléguée et minimisation des données personnelles

L'authentification DOIT être déléguée à un fournisseur d'identité externe géré et reconnu.
L'application NE DOIT jamais stocker de mot de passe ni de hash de mot de passe, ni implémenter sa
propre gestion de sessions. Elle ne conserve que l'identifiant externe et les données applicatives
strictement nécessaires (profil physiologique, régime, historique). Toute donnée utilisateur DOIT
être cloisonnée par identifiant, consultable, exportable et supprimable à la demande, suppression
de compte incluse.

**Rationale**: les données saisies (poids, taille, âge, sexe) sont des données de santé au sens du
RGPD; en déléguer l'accès et en minimiser la conservation réduit la surface de risque à son minimum.

### VI. Direction visuelle maison d'abord, responsive et accessible

Chaque écran DOIT être composé à partir des tokens et des composants de la direction visuelle du
projet, "Encre & Saison", dont la référence unique est `docs/design-system.md`. Aucune valeur
visuelle — couleur, taille, interligne, rayon, graisse — NE DOIT apparaître dans un composant sans
passer par un token de `src/styles/tokens.css`. La création d'un composant nouveau exige une
justification écrite, dans le fichier du composant, nommant ce qu'il apporte que les composants
existants ne couvrent pas.

Toute interface DOIT être utilisable de 320 px à 1920 px de large sans perte de fonctionnalité ni
défilement horizontal, être navigable au clavier et étiqueter tous les champs de formulaire. Tout
couple texte/fond DOIT atteindre au moins 4,5:1 (WCAG 2.1 AA, texte courant), et le ratio mesuré
DOIT être consigné à côté de la définition du token. La couleur NE DOIT jamais être le seul véhicule
d'une information: tout état qu'une couleur signale DOIT l'être aussi par un mot, une forme ou une
position.

**Rationale**: une source unique de vérité visuelle garantit la cohérence et évite qu'une valeur
soit inventée écran par écran. Le design system Figma "BDD de composants de base" jouait ce rôle
jusqu'au 2026-09-16; il produisait une interface générique, sans rapport avec un produit dont le
sujet est la saison et la table de référence. La contrainte demeure, sa référence change — et elle
se durcit sur deux points que le Figma ne couvrait pas: le contraste mesuré et l'interdiction du
codage par la seule couleur.

## Contraintes techniques et sources de données

- **Sources de données autorisées**: apports de référence officiels (ANSES, EFSA ou DRI
  internationaux); composition des aliments issue d'une source publique gratuite (USDA FoodData
  Central, Open Food Facts, ou table CIQUAL de l'ANSES); saisonnalité des fruits et légumes basée
  sur une table de référence France métropolitaine issue de sources publiques reconnues
  (Agribalyse/ADEME, calendrier Greenpeace).
- **Coût**: les services externes retenus DOIVENT disposer d'une offre gratuite couvrant le volume
  attendu du projet; toute dépendance payante exige une validation explicite.
- **Résilience**: l'indisponibilité d'une source externe NE DOIT PAS rendre l'application
  inutilisable; les données de référence critiques sont embarquées ou mises en cache, avec
  indication de leur fraîcheur.
- **Ouverture aux évolutions**: la liste d'ingrédients produite DOIT être exposée sous une forme
  structurée et stable (ingrédient, quantité, unité, apports), consommable ultérieurement par un
  service externe de génération de recettes, sans refonte du modèle de données.
- **Périmètre géographique et linguistique v1**: France métropolitaine, langue française.

## Workflow de développement et portes qualité

- **Portes du cycle**: specify -> revue de la spécification -> plan -> revue du plan -> tasks ->
  implement. Une porte rejetée interrompt le cycle.
- **Clarifications**: au plus 3 marqueurs NEEDS CLARIFICATION par spécification; ils DOIVENT être
  résolus avant de lancer implement.
- **Tests obligatoires**: invariant besoins/régime (Principe III), conformité des valeurs aux
  sources officielles (Principe II), compatibilité régime de chaque ingrédient proposé, et
  saisonnalité des fruits et légumes vérifiée sur les 12 mois.
- **Revue avant fusion**: toute modification DOIT être vérifiée contre les principes ci-dessus;
  une complexité ajoutée DOIT être justifiée dans le plan (section Complexity Tracking).
- **Traçabilité des données**: toute mise à jour d'une table de référence (apports, composition,
  saisonnalité) DOIT être accompagnée de sa source et de sa date.

## Governance

Cette constitution prévaut sur toute autre pratique du projet. Tout amendement DOIT être documenté
dans ce fichier, accompagné d'un Sync Impact Report et d'une justification, et versionné selon le
versionnement sémantique:

- **MAJOR**: suppression ou redéfinition incompatible d'un principe ou d'une règle de gouvernance.
- **MINOR**: ajout d'un principe ou d'une section, ou extension matérielle d'une règle existante.
- **PATCH**: clarification, reformulation ou correction sans effet sémantique.

Toute revue de spécification, de plan ou de code DOIT vérifier la conformité aux principes.
Les principes marqués NON NÉGOCIABLE ne peuvent pas faire l'objet d'une dérogation ponctuelle:
seule une modification de cette constitution peut les faire évoluer. Les règles d'exécution au
quotidien (commandes, conventions d'outillage) sont tenues à jour dans les fichiers `.specify/`
et dans les instructions agent du dépôt.

**Version**: 2.0.0 | **Ratified**: 2026-09-13 | **Last Amended**: 2026-09-17
