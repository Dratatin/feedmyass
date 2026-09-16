# Implementation Plan: Refonte visuelle « Encre & Saison »

**Branch**: `002-refonte-visuelle` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-refonte-visuelle/spec.md`

## Summary

Remplacement intégral de l'habillage de l'application: nouveaux tokens, nouvelles familles
typographiques, composants réécrits, huit écrans recomposés. Le cœur métier, les données de référence
et les parcours ne bougent pas. Une seule extension fonctionnelle: le plan d'ingrédients transporte
désormais les mois de disponibilité de chaque aliment, sans quoi le ruban de saison par ligne
(FR-107) ne peut pas être rendu.

La maquette a été produite et validée avant tout code — c'est elle qui tient lieu de conception
d'écrans, et `docs/design-system.md` qui tient lieu de règle.

## Technical Context

**Language/Version**: inchangé — TypeScript 6.0 sur Node.js >= 22

**Primary Dependencies**: inchangées, à une près — Tailwind CSS 4.3 est désormais alimenté par les
tokens de `docs/design-system.md` et non plus par une extraction Figma; `next/font` charge Fraunces et
Recursive au build

**Storage**: inchangé. La table `seasonality` est déjà présente et porte les mois par aliment; seule
la requête de lecture change

**Testing**: inchangé — Vitest et Playwright. Aucune assertion fonctionnelle existante n'est modifiée,
ce qui fait de la suite actuelle le filet de sécurité de la refonte

**Target Platform**: inchangé, 320 px à 1920 px

**Project Type**: inchangé

**Performance Goals**: budget de 3 s maintenu (SC-105), polices comprises — d'où `next/font` plutôt
qu'une feuille de style tierce

**Constraints**: aucune valeur visuelle hors tokens; contraste 4,5:1 mesuré et consigné; la couleur
jamais seule porteuse de sens; libellés, titres et textes de boutons conservés à l'identique

**Scale/Scope**: 8 écrans, ~18 composants, 1 extension de contrat

## Constitution Check

*GATE: Must pass before implementation. Re-check after.*

| Principe | Porte | Vérification au design | Statut |
|----------|-------|------------------------|--------|
| I. Spécification d'abord | Spec validée avant le code | spec.md rédigée et validée le 2026-09-17, maquette approuvée | PASS |
| II. Exactitude nutritionnelle traçable | Aucune valeur affichée sans source | Aucune valeur nutritionnelle n'est touchée; l'affichage des sources et des versions est conservé écran par écran | PASS |
| III. Séparation besoins / régime | Le calcul ignore le régime | Aucune signature du domaine n'est modifiée; le régime reste un paramètre de la seule sélection d'aliments | PASS |
| IV. Information, jamais conseil médical | Mention visible sur tout écran de résultat | `DisclaimerBanner` conservé, remonté au-dessus des chiffres clés sur `/besoins` et `/liste` | PASS |
| V. Identité déléguée et minimisation | Rien de neuf côté identité | Aucune modification du flux d'authentification; seuls les styles de `SignInForm` changent | PASS |
| VI. Direction visuelle maison d'abord | Tokens uniques, contrastes mesurés, couleur jamais seule | `docs/design-system.md` publié, ratios consignés dans `tokens.css`, chaque état colorié porte aussi un mot | PASS |

Portes supplémentaires: la suite de tests existante doit passer **sans modification de ses assertions
fonctionnelles**. Toute assertion qu'il faudrait réécrire signale que la refonte a débordé de son
périmètre.

## Décisions techniques

### D1 — Tokens sémantiques plutôt qu'échelles de nuances

L'ancien fichier exposait treize familles de couleurs en onze nuances, dont l'écrasante majorité
n'était jamais employée. Les nouveaux tokens sont nommés par leur rôle (`ink`, `paper`, `saison`,
`miel`) et non par leur teinte et son niveau. Conséquence: une couleur ne peut pas être choisie « parce
qu'elle va bien », il faut qu'elle veuille dire quelque chose.

### D2 — `next/font` plutôt qu'une feuille Google Fonts

Des familles chargées depuis un tiers, ce sont autant de requêtes bloquantes et une fuite d'adresse IP vers
Google à chaque visite. `next/font` les sert depuis notre domaine, sans décalage de mise en page. Les
axes variables (`SOFT`, `WONK` de Fraunces, `CASL`, `MONO` de Recursive) sont demandés explicitement:
ils sont le caractère même de ces polices.

### D3 — Extension additive du plan d'ingrédients

`IngredientPlanItem` gagne `season_months`, tableau des mois de disponibilité, présent uniquement pour
les aliments soumis à saisonnalité. Le schéma passe de 1.0.0 à 1.1.0: un consommateur du 1.0.0 ignore
un champ supplémentaire et continue de fonctionner. Le dépôt de saisonnalité gagne une lecture « tous
les mois par aliment » à côté de la lecture « aliments du mois N », déjà présente.

### D4 — Le rail avant le contenu dans le DOM

Le rail de parcours est rendu avant la colonne principale, ce qui le place avant les champs dans
l'ordre de tabulation. Le test de navigation au clavier de la 001 borne à dix tabulations l'accès au
premier champ du formulaire de profil: l'en-tête est donc réduit à la marque et à l'état de connexion,
et le rail à trois liens. Marge disponible: quatre tabulations.

### D5 — Les vignettes en SVG dans le dépôt

Huit dessins de produits, définis une fois en `<symbol>` et appelés par `<use>`. Pas de fichier
d'image, pas de requête supplémentaire, et les couleurs viennent des tokens de familles.

## Structure des fichiers touchés

```
src/
├── styles/tokens.css            # réécrit: palette, typographie, géométrie
├── app/
│   ├── globals.css              # réécrit
│   ├── layout.tsx               # polices next/font
│   ├── (public)/                # 4 écrans recomposés
│   └── (account)/               # 3 écrans recomposés
├── components/
│   ├── ds/                      # composants de la direction
│   │   ├── Button · InputField · SelectField · CheckboxField
│   │   ├── Panel · Notice · Pill · Register
│   │   └── MonthRibbon · CoverageMeter · KeyFigures · Vignette · FamilyDot
│   └── features/                # composants métier restylés
├── domain/plan/                 # + season_months dans les items
├── data/repositories/           # + lecture des mois par aliment
└── lib/months.ts                # nouveau: mois, saisons, libellés
```

Fichiers supprimés: `ds/Card.tsx`, `ds/Badge.tsx`, `ds/Banner.tsx`, `ds/DataTable.tsx` — remplacés
respectivement par `Panel`, `Pill`, `Notice` et `Register`.

## Complexity Tracking

| Ajout | Pourquoi nécessaire | Alternative écartée |
|-------|---------------------|---------------------|
| Extension du schéma du plan (1.1.0) | FR-107: sans les mois par aliment, le ruban par ligne est irréalisable | Se contenter d'une étiquette « de saison » — écarté à la revue du 2026-09-17, le ruban étant l'élément distinctif de la direction |
| Deux familles typographiques | Trois rôles réellement distincts: titres, interface, données — Recursive couvrant les deux derniers par son axe MONO | Une seule famille — écartée: aucune ne couvre à la fois un display expressif et un mono tabulaire. Une troisième, manuscrite, a été essayée puis retirée à la revue du 2026-09-18 |
| Cinq composants d'affichage nouveaux | Ruban, jauge, chiffres clés, vignette et pastille n'ont aucun équivalent | Les composer écran par écran — écarté: c'est exactement ce que le principe VI interdit |
