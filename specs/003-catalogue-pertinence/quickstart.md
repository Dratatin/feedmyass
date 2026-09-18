# Quickstart — construire et vérifier le catalogue

**Feature**: 003-catalogue-pertinence | **Date**: 2026-09-17

Scénarios de validation exécutables, dans l'ordre où ils doivent être joués. Le premier n'est pas
optionnel : joué trop tard, il ne prouve plus rien.

---

## Prérequis

- Node.js installé, dépendances du dépôt installées (`npm ci`)
- Accès réseau sortant vers `entrepot.recherche.data.gouv.fr` pour les scénarios 2 et suivants
- Aucun fichier de données préalable : c'est précisément ce que la feature doit rendre inutile

---

## Scénario 0 — Figer la référence (à jouer EN PREMIER)

**Prouve** : FR-216, SC-007 sont mesurables. Sans cette étape, la comparaison avant/après est perdue
pour de bon.

```bash
git switch 003-catalogue-pertinence
npm run measure:catalogue -- --out specs/003-catalogue-pertinence/baseline/coverage-before.json
```

**Attendu** : un fichier de mesure portant, pour chacun des quatre régimes de base et pour les jeux
d'exclusions, la couverture atteignable par nutriment et les écarts produits — ainsi que l'empreinte
du catalogue mesuré, pour qu'on sache toujours à quoi la référence se rapporte.

**À vérifier à l'œil** : le régime végane porte bien un écart sur la vitamine B12. C'est l'état de
départ ; s'il a déjà disparu, c'est que le catalogue n'est plus celui de `main` et la référence est
invalide.

---

## Scénario 1 — Sélection par classe, sur la source actuelle (User Story 1, P1)

**Prouve** : la sélection ne dépend plus de plafonds par sous-groupe, et la livraison P1 est bien
indépendante du changement de source.

```bash
npm run build:foods -- --from <répertoire XML 2020>
npm run build:seasonality   # le catalogue a changé: l'appariement DOIT être rejoué
```

**Attendu** :

- le rapport liste chaque classe avec son code, le niveau employé (4, ou repli en 3), sa décision et
  ses effectifs ;
- toute classe écartée porte un motif ;
- le catalogue compte de l'ordre de 270 aliments ;
- chaque aliment porte `selected_by` ;
- la saisonnalité ne signale **aucun** fruit ou légume sans correspondance.

**Ne pas mesurer avant d'avoir rejoué la saisonnalité.** Les codes d'aliments changent avec le
catalogue ; mesurer contre une table de saison périmée écarte tous les fruits et légumes du solveur
et produit des régressions qui n'existent pas. C'est l'erreur que cette ligne évite.

**À vérifier à l'œil** :

- les viandes ne sont plus dominées par une espèce : bœuf, porc, poulet, dinde et agneau sont tous
  représentés ;
- les abats, les fromages fondus et le gibier sont absents **et nommés dans les classes écartées** —
  absents sans motif serait un échec, pas un succès ;
- les pommes de terre et le tofu sont présents : ils portent `000000` en quatrième niveau et
  démontrent le repli (R9) ;
- les fruits et légumes ne sont pas réduits à quatre espèces : leur granularité vient du
  dédoublonnage par espèce, pas des classes (R10).

---

## Scénario 2 — Acquisition par API, sans changer la sélection (User Story 2, P2)

**Prouve** : FR-208, FR-209, FR-210.

```bash
rm -rf <répertoire XML local>
npm run build:foods
```

**Attendu** : le catalogue est produit sans qu'aucun fichier n'ait été téléchargé à la main, et
`_meta.dataset` porte le DOI, la version, la date de publication et la licence — **issus de la
réponse de l'API**, pas d'une constante du script.

**Prévoir du temps.** Le fichier de composition pèse près de 70 Mo et l'entrepôt coupe régulièrement
la connexion dessus : mesuré, un téléchargement d'une seule traite échoue plus souvent qu'il ne
réussit. Le script reprend automatiquement là où il s'est arrêté (en-tête `Range`, six tentatives) et
conserve le fragment dans `.cache/ciqual/`, hors dépôt. Relancer la commande reprend le
téléchargement ; il n'y a rien à nettoyer entre deux essais.

**Test décisif de la traçabilité** : modifier à la main `_meta.version` puis relancer la commande.
La valeur doit revenir à celle de la source. Si une saisie manuelle survit, FR-209 n'est pas tenue.

---

## Scénario 3 — Refus de produire (FR-211, FR-215)

**Prouve** : la commande échoue plutôt que de produire un catalogue partiel ou d'en retirer un
aliment en silence.

```bash
# Source injoignable
npm run build:foods            # réseau coupé
echo $?                        # non nul
git diff --stat src/data/reference/foods.json   # vide: rien n'a été écrit

# Classe inconnue
#   retirer une règle de classe, relancer: doit nommer la classe non couverte

# Aliment désigné disparu
#   désigner un code inexistant dans une règle, relancer: doit nommer le code
```

**Attendu** : à chaque fois, code de sortie non nul, message nommant l'élément fautif, et
`foods.json` **inchangé**.

---

## Scénario 4 — Millésime 2025 (User Story 3, P3)

**Prouve** : FR-212, FR-214.

```bash
npm run build:foods -- --version 1.0
```

**Attendu** : le rapport liste les aliments entrés et sortis par rapport au catalogue précédent, et
cette liste est relisible — c'est l'artefact que la porte de revue examine.

**À vérifier à l'œil** : les libellés accentués sont corrects. Les fichiers 2025 sont en UTF-8 avec
BOM là où les 2020 sont en windows-1252 ; un « é » devenu « Ã© » signale que l'encodage a été supposé
au lieu d'être déduit.

---

## Scénario 4 bis — Publier vers la base (indispensable avant les e2e)

**Prouve** : le catalogue reconstruit atteint vraiment l'application.

```bash
npx supabase db push       # applique les migrations en attente
npm run seed:reference     # charge nutrients, reference_intakes, foods, seasonality
```

**Pourquoi c'est une étape à part entière.** L'accueil et la page « De saison » importent
`foods.json` à la compilation, mais la **liste d'ingrédients** passe par l'API et lit la **base**.
Reconstruire le catalogue ne met donc à jour que la moitié visible du produit. Tant que le seed n'a
pas été rejoué, la liste continue d'être calculée sur l'ancien catalogue — et **les tests e2e passent
au vert sans rien démontrer du changement**.

**Attendu** : le seed annonce le nombre de lignes chargées et de lignes obsolètes supprimées. S'il
s'interrompt en nommant une colonne ou une contrainte, c'est que le schéma est en retard : la
migration correspondante manque, et le seed a refusé de charger une base partielle plutôt que
d'accepter des données que le schéma ne décrit pas.

---

## Scénario 5 — Portes qualité de la constitution

**Prouve** : les tests obligatoires de la section « Workflow de développement » passent après le
changement de catalogue.

```bash
npm run build:seasonality     # le catalogue a changé: l'appariement doit être rejoué
npm run typecheck
npm run lint
npm run test:unit
npm run test:contract
npm run test:e2e
```

**Attendu** : tout est vert, et le rapport de saisonnalité ne signale aucun fruit ou légume entrant
sans mois de saison — un tel aliment ne serait jamais proposable, ce qui en ferait un ajout inutile.

**Relecture manuelle obligatoire, que les tests ne remplacent pas** — la porte « compatibilité régime
de chaque ingrédient proposé » est humaine. Sur les aliments **entrés**, vérifier qu'aucun produit
d'origine animale ne porte l'étiquette végane. Trois anomalies de ce type sont déjà connues sur le
catalogue élargi : gélatine sèche, gelée royale et pâtes sèches aux œufs. Elles doivent être corrigées
et couvertes par un test, pas seulement constatées.

---

## Scénario 6 — Comparaison avant / après (FR-216, SC-007)

**Prouve** : le remplacement du critère n'a dégradé aucun régime.

```bash
npm run measure:catalogue -- --out /tmp/coverage-after.json
npm run measure:catalogue -- --compare specs/003-catalogue-pertinence/baseline/coverage-before.json /tmp/coverage-after.json
```

**Attendu** : aucun régime ne perd en couverture atteignable. Tout écart nouvellement ouvert ou
refermé est listé.

**Lecture du résultat, et c'est le piège de cette feature** : un écart qui se referme n'est pas
mécaniquement une bonne nouvelle. La B12 végane peut atteindre exactement 100,00 % du besoin en
saturant simultanément toutes les bornes hautes — un résultat sans aucune marge, que la moindre
exclusion ou la moindre borne revue à la baisse fait rebasculer. La comparaison doit distinguer
*couvert avec marge* de *couvert sur le fil*, et le test qui démontre la production d'écarts doit
s'appuyer sur un cas franc plutôt que limite.
