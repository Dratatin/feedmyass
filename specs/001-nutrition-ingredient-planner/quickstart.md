# Phase 1 - Quickstart: vérifier que la feature fonctionne

**Feature**: 001-nutrition-ingredient-planner | **Date**: 2026-09-13 | **Plan**: [plan.md](./plan.md)

Guide de mise en route et de validation. Les détails de structure sont dans
[data-model.md](./data-model.md) et [contracts/api.md](./contracts/api.md); ce document ne décrit
que ce qu'il faut lancer et ce qu'il faut observer.

## Prérequis

- Node.js 22 LTS et pnpm (ou npm)
- Un projet Supabase gratuit (URL + clés anon et service role)
- Supabase CLI pour appliquer migrations et seed
- Les fichiers de référence présents dans `src/data/reference/` (apports ANSES, extrait CIQUAL,
  calendrier de saisonnalité), chacun accompagné de sa source et de sa version

## Mise en route

```bash
pnpm install
cp .env.example .env.local          # renseigner les clés Supabase
pnpm supabase db push               # schéma + politiques RLS
pnpm seed:reference                 # charge nutrients, reference_intakes, foods, seasonality
pnpm dev                            # http://localhost:3000
```

`pnpm seed:reference` est idempotent et refuse de charger un fichier de référence dépourvu de
`source`, `version` et `retrieved_at` — c'est la mise en application du principe II au niveau de
l'outillage.

## Commandes de vérification

```bash
pnpm test:unit          # domaine pur: besoins, régimes, saisonnalité, solveur
pnpm test:contract      # route handlers contre contracts/api.md
pnpm test:e2e           # parcours US1 à US4, y compris 320 px et 1920 px
pnpm lint && pnpm typecheck
pnpm test:a11y          # contrastes, labels, navigation clavier
```

## Scénarios de validation

### V1 - Besoins nutritionnels (US1, SC-001, SC-005)

1. Ouvrir l'application sans se connecter, saisir un profil complet, valider.
2. Attendu: besoins journaliers et hebdomadaires affichés pour tous les nutriments du référentiel,
   chacun avec valeur, unité, nature de la référence et source; bandeau d'information visible.
3. Attendu: chaque valeur hebdomadaire vaut exactement sept fois la valeur journalière.
4. Recommencer avec un poids de 400 kg: le calcul est refusé et le champ fautif est nommé.

### V2 - Invariant besoins / régime (US4, SC-004, principe III)

1. Calculer les besoins pour deux profils identiques, l'un omnivore, l'autre végane.
2. Attendu: valeurs de besoins strictement identiques; seules les listes d'ingrédients diffèrent.
3. Ce scénario est doublé par un test unitaire qui doit échouer si le régime atteint un jour le
   calcul.

### V3 - Liste d'ingrédients, régime et saison (US2, SC-002, SC-003)

1. Générer une liste hebdomadaire pour un profil végane sans gluten.
2. Attendu: aucun produit d'origine animale, aucun aliment marqué `gluten`, chaque ligne portant une
   quantité et une unité d'achat lisibles.
3. Attendu: tous les fruits et légumes proposés sont de saison au mois courant.
4. Rejouer le test automatisé de saisonnalité sur les douze mois: aucune proposition hors saison.

### V4 - Couverture et écarts (SC-006, FR-016 à FR-018)

1. Consulter le détail de couverture de la liste générée en V3.
2. Attendu: énergie, protéines et micronutriments prioritaires à 100 % au moins; autres
   micronutriments à 80 % au moins; tout nutriment sous son seuil est nommé avec son pourcentage.
3. Attendu pour un profil végane: si la B12 ne peut pas être couverte par les aliments courants,
   l'écart est signalé et un aliment enrichi compatible est proposé, identifié comme enrichi, sans
   aucune mention de complément alimentaire.

### V5 - Compte, historique et immuabilité (US3, SC-007, SC-011, SC-012)

1. Générer un résultat en mode invité, puis se connecter: le rattachement est proposé, avec
   l'avertissement préalable.
2. Se déconnecter, se reconnecter depuis un autre navigateur: profil et historique restitués à
   l'identique.
3. Modifier son poids, rouvrir l'ancien résultat: il est inchangé.
4. Tenter d'ouvrir l'identifiant d'un résultat appartenant à un autre compte: `404`.
5. Supprimer le compte: profil et historique effacés, y compris vérifié directement en base.
6. Vérifier qu'aucune table applicative ne contient de mot de passe ni de hash.

### V6 - Responsive, accessibilité et résilience (SC-008, FR-031 à FR-036)

1. Rejouer le parcours complet à 320 px puis à 1920 px: aucune perte de fonctionnalité, aucun
   défilement horizontal.
2. Parcourir les formulaires au clavier uniquement; vérifier les contrastes AA.
3. Couper l'accès réseau aux services externes autres que Supabase: le calcul et la génération de
   liste restent possibles, les données de référence affichent leur date de mise à jour.

## Ce qui reste bloqué

Les écrans ne peuvent pas être implémentés tant que les composants et tokens du design system Figma
(Annexe A de la spec, décision R7) n'ont pas été extraits via le MCP Figma. Le domaine métier, les
données de référence, le schéma de base et les contrats ne dépendent pas de cette extraction et
peuvent être réalisés en parallèle.
