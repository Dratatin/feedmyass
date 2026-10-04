# Comparaison avant / après (FR-314)

**Feature**: 004-reperes-anses | **Mesuré le**: 2026-10-04

Mesures produites par `npm run simulate:plans` sur 1 408 listes : deux profils de référence
(homme 75 kg actif, femme 60 kg peu active) × 4 régimes × 5 jeux d'exclusions × 12 mois ; 96 profils
(2 sexes × 4 âges × 3 poids × 4 niveaux d'activité) × 4 régimes × 2 mois ; 160 listes hebdomadaires.
« Avant » : calcul de `main` sur le catalogue corrigé de `db95134`
([simulation-avant.json](./simulation-avant.json)). « Après » : modèle de l'ANSES
([simulation-apres.json](./simulation-apres.json)).

## Critères de succès

| Critère | Avant | Après | Statut |
|---|---|---|---|
| SC-001 — algues ou aliments sans sous-groupe | 5 540 lignes, dans les 1 408 listes | **0** | ✅ |
| SC-002 — sous-groupes hors bornes (omnivore) | — | **0** | ✅ |
| SC-003 — ≥ 400 g/j de fruits et légumes (omnivore) | plancher imposé | **0 liste sous 400 g**, sans plancher | ✅ |
| SC-004 — ≥ 8 sous-groupes (omnivore) | — | **0 liste sous 8** | ✅ |
| SC-005 — aucune régression de couverture | — | **non tenu**, voir ci-dessous | ⚠️ |
| SC-006 — seuils en grammes propres au projet | 2 plafonds + 1 plancher | **0** | ✅ |
| SC-007 — paramètres sourcés | — | 100 % (tableau et page) | ✅ |
| SC-008 — aucune liste au-delà d'une seconde | 78 (jusqu'à 6,4 s) | **5** (jusqu'à 1,13 s) | ⚠️ presque |
| SC-009 — énergie, intervalles, limites de sécurité | 58 + 150 + iode dans toutes les listes à algues | **0 + 0 + 0** | ✅ |
| SC-010 — taux d'écart = taux affiché | faux (« lipides 1 375 % ») | **100 %** | ✅ |
| SC-011 — deux variantes d'une même famille | 1 131 listes | **0** | ✅ |
| SC-012 — lignes sous la demi-unité | 2 551 | **0** | ✅ |
| SC-013 — écarts nouveaux nommés | — | voir ci-dessous | ✅ |

Temps de génération : médiane 5 → 377 ms, p95 1 956 → 585 ms, maximum 6 396 → 1 126 ms. La médiane
monte parce que la consolidation résout plusieurs fois ; le pire cas baisse d'un facteur cinq.

## La même liste, avant et après

Homme de 35 ans, 75 kg, actif, omnivore, septembre.

**Avant** — dulse 15 g, sésame 15 g, spiruline 15 g, ascophylle 9 g, kombu 6 g, biscotte briochée
236 g, semoule 193 g, cassis 42 g, avocat 358 g, hareng 137 g, parmesan 15 g.

**Après** — muffin complet 209 g, riz complet 139 g, semoule 106 g, pain de seigle 102 g, riz blanc
50 g, raisin 260 g, cassis 71 g, figue de Barbarie 50 g, melon 50 g, avocat 277 g, poivron 50 g,
huile d'olive 6 g, œuf 28 g, bar 50 g, lait 112 g, camembert 50 g, yaourt de brebis 50 g, canard 69 g.

## Écarts nouveaux, et leur cause (SC-005, SC-013)

**Vitamine D — 1 408 listes sur 1 408**, couverte entre 11 % (p5) et 38 % (p95), médiane 21 %.
C'est le traitement de l'ANSES : sa référence ignore la synthèse cutanée, et son propre modèle
s'arrête à 5,4 µg/j sur 15 (36 %). La couverture de la mesure de départ reposait sur les algues et
sur des quantités de produits laitiers allant jusqu'à 1,15 kg par jour, que les bornes interdisent
désormais.

**Vitamine B12 hors régime végane — 113 listes** (végétarien 72, pescétarien 27, omnivore 14),
couverte en général entre 85 et 100 %. Les sources de B12 d'un végétarien — œufs, lait, fromages —
restent bornées à leur P95 omnivore (46 g d'œufs, 386 g de lait, 94 g de fromage pour un homme) ;
la mesure de départ en servait plus d'un kilo. Piste, à décider : déclarer œufs et produits laitiers
comme substituts de la viande et du poisson pour les régimes qui les excluent, comme les
légumineuses (FR-310a).

**Folates — 41 listes** (pescétarien 23, omnivore 7, végétarien 5…), surtout chez la femme de
60 kg peu active, entre 60 et 80 %. Les légumineuses, première source de folates, sont bornées à
50 g/j chez la femme omnivore ou pescétarienne.

**Autres, chacun sous 15 listes** : cuivre, potassium, fer, vitamines B5 et B6, souvent pour les
profils de 45 kg, dont le besoin énergétique réduit proportionnellement toutes les bornes.

**Écarts refermés** : lipides du végane (45 → 0), vitamine B2 du végane (35 → 5), vitamine B3
(23 → 9).

## Ce que la mesure a corrigé en cours de route

La simulation a été rejouée quatre fois ; chaque passage a changé la conception, et
[research.md](../research.md) consigne chaque amendement.

1. **Poids unique des manques** : tous les sous-groupes poussés à leur P95 pour grappiller la
   vitamine D → flexibilité de l'ANSES réservée à la vitamine D.
2. **Demi-portion par retrait seul** : poissons, œufs et fromages disparaissaient des listes
   journalières → relever entre le quart et la demi-unité, retirer en deçà.
3. **Bornes calibrées sur 2 600 kcal** : 21 listes de profils lourds et très actifs sous leur besoin
   énergétique → bornes proportionnées au besoin, plafonds épidémiologiques exclus.
4. **Quantités négatives rendues par le simplexe** : −589 g d'un légume, d'où énergie à 123 % et
   limites de sécurité dépassées → borne basse explicite et rejet de toute solution négative.

## Limites connues

- **Un aliment domine souvent son sous-groupe** : 277 g d'avocat comme principal légume, 260 g de
  raisin. Le modèle de l'ANSES travaille au sous-groupe ; la variété à l'intérieur d'un sous-groupe
  n'est pas une de ses contraintes.
- **Les substituts végétaux s'empilent** pour un végane : 200 g de seitan, de tempeh et de tofu,
  chacun au plafond de son aliment, la borne des légumineuses étant levée (FR-310a).
- **Cinq listes dépassent la seconde** (1,03 à 1,13 s) : quatre pour un homme de 110 kg très actif,
  omnivore, et une pour un pescétarien de 70 ans en juillet. Les profils lourds ont les bornes les
  plus larges, et la consolidation y fait le plus de tours.
