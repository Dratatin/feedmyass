# Implementation Plan: Catalogue d'aliments sélectionné par pertinence

**Branch**: `003-catalogue-pertinence` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-catalogue-pertinence/spec.md`

## Summary

Le catalogue cesse d'être sélectionné par dix-huit plafonds numériques écrits à la main, et le
devient par la **classification de quatrième niveau que l'ANSES publie avec la table** — 63 classes
peuplées sur le périmètre visé, contre 18 sous-groupes aujourd'hui. Chaque classe est soit retenue
avec un quota uniforme, soit écartée par une règle qui la nomme et la motive. La complétude de la
fiche de composition, aujourd'hui critère d'admission, redevient ce qu'elle aurait dû rester : un
départage entre aliments d'une même classe.

En parallèle, l'acquisition passe de l'archive ZIP décompressée à la main à l'**API de Recherche Data
Gouv**, qui fournit la table sous DOI avec sa version, sa date de publication et sa licence — les
trois valeurs que `_meta` porte aujourd'hui par saisie manuelle, donc sans garantie. Le millésime
passe de 2020 à 2025.

Trois livraisons indépendantes, dans l'ordre des priorités de la spec : la sélection (P1) est
livrable sur la source actuelle, l'acquisition (P2) sans toucher à la sélection, le millésime (P3)
une fois l'acquisition en place.

## Technical Context

**Language/Version**: Node.js (script de génération en ESM, `.mjs`, sans dépendance) ; TypeScript 5
côté application

**Primary Dependencies**: aucune nouvelle. Le script n'utilise que `node:fs` et `fetch` natif —
l'analyse XML se fait déjà par découpage de chaînes, approche conservée : ces fichiers sont plats et
réguliers, et ajouter un analyseur XML pour eux ne se justifie pas

**Storage**: fichier de référence versionné dans le dépôt (`src/data/reference/foods.json`), chargé
en base par le seed existant ; aucun appel réseau au moment du calcul utilisateur

**Testing**: Vitest (unitaires et contrat), Playwright (e2e) — suites existantes

**Target Platform**: script exécuté hors ligne par le mainteneur ; l'application consomme le fichier
produit

**Project Type**: application web Next.js avec scripts de génération de données

**Performance Goals**: sans objet côté utilisateur — le fichier est produit hors ligne. Le script
doit rester exécutable en une commande sur un poste ordinaire, fichier de composition de 69 Mo
compris

**Constraints**: aucune valeur nutritionnelle sans source, version et date issues de la source
(principe II) ; frontière explicite entre donnée CIQUAL et décisions du projet ; catalogue de taille
relisible à la main ; reconstruction reproductible sans geste manuel

**Scale/Scope**: 3 484 aliments en entrée, ~240 attendus en sortie, 63 classes de sélection,
26 nutriments par aliment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Porte | Vérification au design | Statut |
|----------|-------|------------------------|--------|
| I. Spécification d'abord | Spec validée avant tout code | `spec.md` complet, checklist 16/16, aucun marqueur ouvert ; aucun code écrit avant ce plan | PASS |
| II. Exactitude nutritionnelle traçable | Aucune valeur sans source + version ; traçabilité vérifiable | La feature **renforce** cette porte : version, date et licence cessent d'être saisies à la main et viennent de l'API (FR-209, FR-210). La frontière donnée/décision reste dans `_meta` (FR-213) | PASS |
| III. Séparation besoins / régime | Le calcul des besoins ignore le régime | Hors périmètre : la feature ne touche qu'au catalogue d'aliments, jamais au calcul des besoins. Le test d'invariant existant reste vert | PASS |
| IV. Information, jamais conseil médical | Pas de diagnostic ni de posologie | Sans objet : aucune sortie utilisateur nouvelle. Attention toutefois à ne pas présenter la fermeture d'un écart B12 comme une garantie nutritionnelle (R14) | PASS |
| V. Identité déléguée et minimisation | Aucun mot de passe, cloisonnement | Sans objet : aucune donnée personnelle touchée | PASS |
| VI. Direction visuelle maison d'abord | Tokens uniques, contrastes mesurés, couleur jamais seule | S'applique **uniquement si** la sélection par classe fait apparaître le besoin de catégories d'affichage nouvelles. Le cas échéant : token avec ratio mesuré, et libellé en clair à côté de toute pastille | PASS sous condition |

**Portes qualité supplémentaires** (section « Workflow de développement ») :

- *Compatibilité régime de chaque ingrédient proposé* — porte la plus exposée ici. Le changement de
  sélection fait entrer des aliments jamais relus, et trois erreurs d'étiquetage sont déjà connues
  (gélatine, gelée royale, pâtes aux œufs). La relecture est une tâche du plan, pas un effet
  attendu.
- *Conformité des valeurs aux sources officielles* — le changement de millésime modifie des teneurs.
  La liste des entrées et sorties (FR-214) est ce qui rend la porte franchissable.
- *Saisonnalité vérifiée sur douze mois* — le catalogue change, donc l'appariement avec le calendrier
  ADEME doit être rejoué : un fruit ou légume entrant sans saison ne serait jamais proposable.
- *Traçabilité des données* — `docs/sources.md` doit être repris dans le même commit que le
  changement de millésime.

### Re-évaluation après la Phase 1

Reprise des portes une fois `research.md`, `data-model.md`, `contracts/` et `quickstart.md` écrits :

- **II renforcé**, et au-delà de l'attendu : le contrat de construction impose l'échec plutôt que la
  production d'un catalogue partiel quand la source est injoignable ou incohérente (FR-211), et
  impose l'échec quand un aliment nommément désigné disparaît du millésime (FR-215). La traçabilité
  cesse d'être déclarative pour devenir une condition d'exécution.
- **VI levé de sa condition** : la Phase 1 conclut qu'aucune catégorie d'affichage nouvelle n'est
  nécessaire pour livrer P1 et P2. La question se repose en P3 uniquement, si des classes comme les
  boissons végétales entrent au catalogue — elle est alors traitée comme une décision tracée, avec
  token et ratio mesuré. Voir `data-model.md`, section *Catégories d'achat*.
- **Une tension assumée, consignée en Complexity Tracking** : la feature ne supprime pas tout nombre
  de sélection ; elle remplace dix-huit jugements de pertinence non motivés par un paramètre unique
  de capacité de revue. SC-001 est satisfait au sens où plus aucune inclusion ne dépend d'un
  jugement de pertinence propre au projet, mais la formule « aucun nombre de sélection ne subsiste »
  serait fausse si on la lisait littéralement.

Aucune violation nouvelle.

## Project Structure

### Documentation (this feature)

```text
specs/003-catalogue-pertinence/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — R8 à R14
├── data-model.md        # Phase 1 — classes, règles, aliment de catalogue
├── quickstart.md        # Phase 1 — comment construire et vérifier
├── contracts/
│   ├── build-catalogue.md   # Contrat de la commande de construction
│   └── foods.schema.json    # Forme du fichier produit
├── checklists/
│   └── requirements.md  # Qualité de la spécification
└── tasks.md             # Phase 2 — produit par /speckit-tasks
```

### Source Code (repository root)

```text
scripts/
├── build-foods-from-ciqual.mjs   # Réécrit: acquisition par API + sélection par classe
├── build-seasonality.mjs         # Rejoué après changement de catalogue
└── measure-catalogue.mjs         # NOUVEAU: mesure avant/après (R14, FR-216)

src/data/reference/
├── foods.json                    # Produit, versionné
└── seasonality.json              # Régénéré

specs/003-catalogue-pertinence/
└── baseline/
    └── coverage-before.json      # NOUVEAU: référence figée avant changement

docs/
└── sources.md                    # Millésime, API, règles de sélection

tests/unit/
├── diet-compatibility.test.ts    # Étendu: aucun ingrédient animal étiqueté végane
└── plan-solver.test.ts           # Cas d'écart révisé si la mesure le montre
```

**Structure Decision**: aucune structure nouvelle. La feature réécrit un script de génération
existant et le fichier qu'il produit ; l'application consomme ce fichier sans changement d'interface.
Deux ajouts seulement : un script de mesure, et un dossier `baseline/` dans la feature pour figer la
référence de comparaison — placé dans la feature et non dans `src/`, parce que c'est un artefact de
revue daté, pas une donnée de production.

## Complexity Tracking

*Mis à jour le 2026-09-17 après implémentation: le premier tableau annonçait un quota unique, la
mesure en a imposé deux. Voir R11.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Deux** paramètres numériques de sélection subsistent (quota de classe fine, quota de classe de repli) | Le principe II et la porte de revue exigent que l'étiquetage de régime de chaque aliment reste relisible à la main. Sans borne, le catalogue passe à 925 aliments — mesuré — avec une complétude moyenne chutant de 25,5 à 19,8 nutriments sur 26 et des ingrédients de préparation proposés à l'achat | **Aucun quota** : mesuré, produit un catalogue non relisible et des listes absurdes. **Un quota unique** : traiterait également des choses inégales — une classe de quatrième niveau est une subdivision fine de l'ANSES, une classe de repli est un sous-groupe qu'elle n'a pas subdivisé et qui compte jusqu'à 105 aliments. Mesuré, le quota unique ramenait le catalogue à huit poissons pour toutes les mers. La distinction porte sur une propriété de la donnée, pas sur un avis |
| Trois mécanismes de granularité coexistent | Le quatrième niveau ne subdivise pas les fruits et légumes : « légumes crus » est une classe de 121 aliments. Leur pertinence vient du **calendrier de saison de l'ADEME**, et le dédoublonnage par espèce fusionne ensuite les états de cuisson | **Sélection par classe seule** : mesuré, 13 légumes au catalogue. **Espèce sans borne** : mesuré, 127 légumes et une complétude sous le plancher de SC-003. **Dédoublonnage seul** : c'est l'état antérieur, il fusionne les doublons mais ne choisit pas. Les trois traitent des problèmes différents |
| Une correction hors périmètre déclaré, dans `src/domain/plan/solver.ts` | FR-216 était intenable sans elle : le solveur retirait silencieusement du plan les aliments sous 0,5 g, faisant mentir la couverture affichée. Le défaut préexistait et n'était visible qu'avec des aliments très denses employés à dose infime | **Laisser en l'état** : 13 régressions de couverture, toutes imputées à tort à la sélection. La spécification exclut « la refonte du solveur » ; une correction d'une ligne sur une troncature n'en est pas une. Voir R15 |
