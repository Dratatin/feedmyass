# Phase 0 - Research: Besoins nutritionnels et liste d'ingrédients de saison

**Feature**: 001-nutrition-ingredient-planner | **Date**: 2026-09-13 | **Plan**: [plan.md](./plan.md)

Chaque décision ci-dessous lève une inconnue du Technical Context. Aucun marqueur
NEEDS CLARIFICATION ne subsiste à l'issue de cette phase; les points encore à vérifier au moment de
l'implémentation sont listés en fin de document comme tâches, pas comme questions ouvertes.

## R1 - Plateforme et langage

**Décision**: application Next.js (App Router) en TypeScript, rendu serveur pour les écrans et route
handlers pour les calculs, déployée sur l'offre gratuite Vercel.

**Rationale**: une seule base de code couvre le web et le mobile responsive exigés par FR-031, sans
application native (hors périmètre). TypeScript donne un moyen direct d'inscrire le principe III
dans les types. L'écosystème Next est celui où les trois fournisseurs d'identité candidats sont le
mieux documentés, ce qui réduit le risque d'intégration.

**Alternatives considérées**: SPA Vite + API séparée (deux déployables, deux configurations, aucun
gain tant qu'il n'y a pas d'autre client); SvelteKit ou Nuxt (équivalents techniquement, moins de
documentation d'intégration pour les fournisseurs d'identité visés); application native (hors
périmètre explicite de la spec).

## R2 - Authentification et base de données

**Décision**: Supabase, pour l'authentification (Supabase Auth) et pour la base Postgres
applicative, avec Row Level Security sur toutes les tables portant des données utilisateur.

**Rationale**: la spec impose une authentification déléguée et « couplée facilement à une base de
données ». Supabase est le seul candidat qui fournit les deux dans le même service gratuit: les mots
de passe, les sessions et les fournisseurs OAuth sont gérés par le service (FR-022, principe V), et
`auth.uid()` est directement utilisable dans les politiques RLS, ce qui transforme FR-028
(cloisonnement par utilisateur) en règle de base de données plutôt qu'en contrôle applicatif à ne
pas oublier. La suppression de compte (FR-029) se propage par contraintes de clé étrangère.

**Alternatives considérées**: Clerk — meilleure expérience d'intégration côté UI et offre gratuite
confortable, mais impose une seconde brique pour la base de données et un pont d'identité à
maintenir entre les deux services; retenu comme repli si Supabase Auth pose problème.
Auth.js / NextAuth — bibliothèque exécutée dans l'application: la session redevient notre
responsabilité, ce que la spec demande explicitement d'éviter; écarté.

## R3 - Références des besoins nutritionnels

**Décision**: énergie estimée par les équations de Henry (2005) pour le métabolisme de base,
multipliées par un niveau d'activité physique (NAP) issu des travaux ANSES/EFSA; protéines,
vitamines et minéraux issus des références nutritionnelles ANSES (RNP, AS) par sexe et tranche
d'âge. Ces valeurs sont embarquées comme données de référence versionnées, jamais calculées à la
volée par une source externe.

**Rationale**: ce sont les équations que l'ANSES et l'EFSA retiennent pour estimer les besoins
énergétiques moyens d'une population saine, donc la source officielle attendue par le principe II
pour un public français. Embarquer les tables rend chaque résultat reproductible (FR-038) et rend
l'application insensible à l'indisponibilité d'un service tiers (FR-036).

**Alternatives considérées**: Mifflin-St Jeor ou Harris-Benedict — très répandues mais non retenues
par l'ANSES, donc non citables comme référence officielle; DRI américains — cohérents mais moins
pertinents pour un public France métropolitaine, conservés comme référence de recoupement.

**État au 2026-09-13**: fait. Les coefficients de Henry sont saisis dans
 depuis la table transmise par le commanditaire
(conservée dans ), et les valeurs RNP/AS dans
.

**Précision importante sur la variante retenue**: la table est celle des équations d'Oxford en
version POIDS SEUL. La taille n'entre donc pas dans le calcul énergétique, alors que la
spécification la cite parmi les entrées du calcul (FR-005). Elle reste collectée et validée au
profil, mais n'influence aucune valeur de besoin aujourd'hui. Deux issues: basculer sur la variante
poids + taille de Henry, ou amender FR-005. À trancher avant l'implémentation de T028.

**Reste à confirmer**: les valeurs de NAP par niveau d'activité proviennent de sources secondaires
citant l'ANSES; la valeur représentative retenue dans chaque intervalle est un choix du projet.

## R4 - Composition nutritionnelle des aliments

**Décision**: table CIQUAL de l'ANSES, publiée en open data sous Licence Ouverte (Etalab) et
téléchargeable (~3 500 aliments). Un sous-ensemble curé d'environ 250 aliments courants est extrait,
versionné dans le dépôt et chargé en base par seed.

**Rationale**: libellés français, couverture des vitamines et minéraux du référentiel, licence
compatible avec un usage applicatif, et absence totale d'appel réseau au moment du calcul. Le choix
d'un sous-ensemble curé plutôt que de la table entière est délibéré: la qualité de la liste dépend
davantage de la pertinence des aliments proposés que de leur nombre, et un catalogue restreint reste
vérifiable à la main lors des tests de compatibilité régime.

**Alternatives considérées**: USDA FoodData Central — API gratuite et très large, mais libellés
anglais et aliments du marché américain, donc mauvaise correspondance avec des courses en France, et
dépendance réseau sur le chemin critique; Open Food Facts — excellent pour les produits emballés et
les codes-barres, mais orienté produits de marque plutôt qu'ingrédients bruts: conservé comme piste
pour une évolution « scanner un produit », hors périmètre v1.

## R5 - Saisonnalité des fruits et légumes

**Décision**: table de saisonnalité mensuelle France métropolitaine, construite à partir des sources
publiques citées par la spec (calendrier Greenpeace, données ADEME/Agribalyse), stockée en JSON
versionné avec sa source, et chargée en base.

**Rationale**: la saisonnalité est une donnée lente (elle change d'une année sur l'autre à la
marge); une table embarquée à granularité mensuelle suffit, se teste exhaustivement sur douze mois
(SC-003) et évite une dépendance externe. La date de génération de la liste fait foi, ce qui donne
une règle unique pour les semaines à cheval sur deux mois.

**Alternatives considérées**: API de saisonnalité tierce (aucune source gratuite reconnue et stable
identifiée; ajouterait une dépendance réseau pour une donnée quasi statique); granularité
bimensuelle ou hebdomadaire (précision illusoire au regard des sources disponibles).

## R6 - Sélection des ingrédients et des quantités

**Décision**: programmation linéaire. Les variables sont les quantités d'aliments candidats (en
grammes), les contraintes sont les seuils de couverture de FR-016 (100 % pour l'énergie, les
protéines et les six micronutriments prioritaires, 80 % pour les autres) plus des bornes de quantité
réalistes par aliment et par catégorie, et l'objectif combine minimisation de la masse totale et
prime à la variété. Solveur embarqué côté serveur (`javascript-lp-solver`, ou `glpk.js` si la taille
du modèle l'exige). Si le modèle est infaisable, les contraintes des nutriments concernés sont
relaxées une à une et les écarts résiduels sont remontés tels quels (FR-017, FR-018).

**Rationale**: le problème est exactement un problème de couverture sous contraintes, et c'est la
seule approche qui donne à la fois une solution satisfaisant les seuils et une explication des
écarts quand aucune solution n'existe — ce que FR-017 et FR-018 exigent. Les bornes par aliment sont
ce qui empêche la solution mathématiquement optimale mais absurde (trois kilos de foie de veau pour
la vitamine A).

**Alternatives considérées**: heuristique gloutonne par nutriment déficitaire — simple, mais produit
des listes déséquilibrées et ne sait pas prouver l'infaisabilité; jeux de menus pré-calculés par
régime — ne couvre pas la personnalisation par profil; appel à un LLM pour composer la liste —
non reproductible, non traçable, contraire au principe II.

## R7 - Design system Figma

**Décision**: extraire structure, styles et tokens des 33 noeuds de l'Annexe A via le MCP Figma,
produire d'abord les tokens (couleurs, typographie, espacements, rayons) dans `src/styles`, puis les
composants React dans `src/components/ds`, et n'écrire les écrans qu'à partir de ces composants.

**Rationale**: l'ordre tokens puis composants puis écrans évite de dupliquer des valeurs en dur dans
les écrans et rend le principe VI vérifiable: tout style d'écran doit se ramener à un token.

**Statut**: EN COURS depuis le 2026-09-13, le serveur MCP Figma étant disponible.

Relevé effectué:
- Palette complète (145 couleurs: Base, Brand, Neutral, Red, Orange, Yellow, Green, Sky, Blue,
  Indigo, Purple, Pink, Rose, Slate) et échelle typographique Inter (Display 2xl à xs, Text xl à xs,
  en Regular, Medium, Semibold et Bold), depuis les noeuds de fondations 1525:271581 et 1023:36826.
- Composant Buttons/Button (1038:34411, 528 variantes): propriétés Size (sm, md, lg, xl),
  Hierarchy (7 valeurs), Icon (5 valeurs) et State (Default, Hover, Focused, Disabled).

Constat à retenir: le fichier n'est pas publié comme bibliothèque (le plan Figma est starter), donc
`search_design_system` ne renvoie rien. Le repérage des composants passe par `get_metadata` sur les
pages, puis `get_design_context` sur chaque variante. La page Buttons pèse 190 000 caractères de
métadonnées: la parcourir hors contexte (fichier + filtrage) est nécessaire.

Reste à relever: champ de saisie, sélecteur, carte, tableau, bandeau, navigation, et les cinq
hiérarchies de bouton non encore relevées.

## R8 - Mode invité et rattachement des résultats

**Décision**: un calcul sans compte s'exécute côté serveur et n'est conservé que dans la session du
navigateur (cookie de session signé portant l'identifiant du résultat, contenu stocké côté serveur
avec expiration courte). À la connexion, si un résultat de session existe, l'application propose de
le rattacher au compte via un point d'entrée dédié; sans rattachement explicite, il expire.

**Rationale**: FR-024 exige le mode invité, le rattachement proposé et l'avertissement préalable.
Garder le résultat côté serveur plutôt qu'en `localStorage` évite de dupliquer la logique de
validation et permet de rattacher le résultat exact qui a été affiché, avec ses versions de
références.

**Alternatives considérées**: tout garder dans le navigateur (`localStorage`) — perd les versions de
référence et complique le rattachement; ne rien conserver — contredit FR-024.

## R9 - Tests et vérification

**Décision**: Vitest pour le domaine pur et les invariants, Playwright pour les parcours et le
responsive. Les quatre tests rendus obligatoires par la constitution sont des tests de premier
niveau, écrits avant l'interface: invariant besoins/régime (SC-004), conformité des besoins aux
profils de contrôle officiels (SC-005), compatibilité régime de chaque ingrédient proposé (SC-002),
saisonnalité vérifiée sur les douze mois (SC-003).

**Rationale**: ces quatre propriétés sont les seules dont une régression rendrait le produit faux
plutôt que dégradé; elles doivent échouer bruyamment et ne dépendre ni de l'interface ni du réseau.

## R10 - Anticipation de la génération de recettes

**Décision**: la liste d'ingrédients est produite par `src/domain/plan` sous la forme d'un objet
`IngredientPlan` stable, décrit par un schéma JSON versionné
([contracts/ingredient-plan.schema.json](./contracts/ingredient-plan.schema.json)), que l'interface
et la base consomment sans le transformer.

**Rationale**: FR-037 demande que le futur service de recettes puisse consommer la liste sans
refonte. Un schéma explicite et versionné suffit, et évite d'introduire dès maintenant une
abstraction de service IA dont on ignore encore la forme.

**Alternatives considérées**: prévoir dès la v1 une interface de service de recettes avec
implémentation factice — complexité ajoutée sans consommateur, contraire à la sobriété attendue.

## Points à vérifier pendant l'implémentation

Ce ne sont pas des questions ouvertes sur le produit mais des vérifications factuelles à faire au
moment d'écrire le code, chacune tracée par le principe II:

1. Coefficients de Henry par sexe et tranche d'âge, et valeurs de NAP retenues par l'ANSES:
   relever la publication exacte, sa version et sa date.
2. Valeurs RNP/AS par nutriment, sexe et tranche d'âge: même traçabilité.
3. Version de la table CIQUAL téléchargée et libellé exact de sa licence dans le dépôt.
4. Sources datées du calendrier de saisonnalité retenu.
5. Limites réelles des offres gratuites Supabase et Vercel au moment du déploiement.
6. Analyse des 33 noeuds Figma (R7), dès que le serveur MCP est disponible dans la session.
