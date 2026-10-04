# Research: Liste d'ingrédients fondée sur les repères de l'ANSES

**Feature**: 004-reperes-anses | **Date**: 2026-10-04

Source principale, notée **[ANSES 2016]** : Anses, *Actualisation des repères du PNNS : révision des
repères de consommations alimentaires*, avis et rapport, saisine 2012-SA-0103, décembre 2016 —
`https://www.anses.fr/fr/system/files/NUT2012SA0103Ra-1.pdf`. Les pages citées sont celles de
l'avis (« Page n/82 »).

---

## R1 — Paramètres du modèle : d'où vient chaque nombre

**Decision**: transcrire dans un fichier de référence, pour chaque sous-groupe et chaque sexe :

| Valeur | Origine | Page |
|---|---|---|
| Borne basse (P5), moyenne, borne haute (P95) | Tableau 9 | 73-74 |
| Plafonds épidémiologiques (viande hors volaille 71 g/j, charcuterie 25 g/j) | Tableau 5 et tableau 9 (cases « rouges ») | 31, 73 |
| Limites couplantes | Tableau 9, colonne « limite supérieure couplante » | 73-74 |
| Écart-type | Annexe 6, colonnes du sous-groupe | 80-81 |
| Sens d’optimisation | Tableau 5 et § 3.2.2.1 | 31, 32 |

Les valeurs ont été extraites du PDF par conversion en texte. La conversion perd la mise en page
des cellules fusionnées : **chaque valeur est relue sur le rendu du PDF au moment de la saisie**
(tâche dédiée). Trois points demandent cette relecture en particulier :

- l'annexe 6 juxtapose, pour chaque sexe, les colonnes du sous-groupe et celles du groupe ; seules
  les premières sont reprises (contrôle : la moyenne de l'annexe 6 doit égaler celle du tableau 9,
  par exemple légumes hommes 123,1 contre 123) ;
- la limite couplante des huiles (21 g/j hommes, 16 g/j femmes) porte sur la somme des deux
  sous-groupes d'huiles ;
- la charcuterie a une moyenne (39 g/j hommes) supérieure à sa borne haute (25 g/j) : ce n'est pas
  une erreur, le plafond épidémiologique remplace le P95.

**Rationale**: ce sont les valeurs que l'ANSES a effectivement employées. Recalculer des centiles
sur INCA 3 serait une dérivation du projet, que le principe II rendrait plus difficile à défendre
qu'une transcription.

**Alternatives considered**: INCA 3 en données ouvertes (plus récent, 44 groupes) — rejeté pour la
raison ci-dessus, et parce que ses groupes ne correspondent pas aux sous-groupes du modèle ; repères
grand public du PNNS 4 (« 5 par jour », « 2 fois par semaine ») — rejetés comme paramètres car ce
sont des fréquences, pas des grammes, mais conservés comme contrôle de cohérence (71 g/j × 7 ≈
500 g/semaine de viande rouge).

---

## R2 — Formulation linéaire du critère de l'ANSES

**Decision**: le critère est exprimé dans le programme linéaire existant, sans changer de
bibliothèque.

Pour chaque sous-groupe *g* retenu et ayant au moins un candidat :

- **Rapprocher de la moyenne** (cas général) : deux variables positives `ecart_plus_g` et
  `ecart_moins_g` liées par `Σ quantités(g) − ecart_plus_g + ecart_moins_g = moyenne(g)`. Coût :
  `(ecart_plus_g + ecart_moins_g) / écart-type(g)`. C’est la formule du rapport [ANSES 2016] (description de la fonction objectif),
  qui linéarise la valeur absolue.
- **Favoriser** (fruits frais, légumes, pain complet, autres féculents complets) : coût
  `− Σ quantités(g) / borne haute(g)`. Pour les féculents complets, sans borne haute propre, la
  normalisation emploie la limite couplante du sous-groupe (284 g/j et 257 g/j chez l'homme).
- **Défavoriser** (viande hors volaille, charcuterie) : coût `+ Σ quantités(g) / plafond(g)`.

Contraintes dures : `borne basse(g) ≤ Σ quantités(g) ≤ borne haute(g)`, limites couplantes sur les
sommes de paires, plafond par aliment du catalogue.

**Rationale**: reproduit le modèle publié terme à terme ; `javascript-lp-solver` traite déjà des
modèles de cette taille (≈ 250 variables d'aliments + 2 par sous-groupe).

**Alternatives considered**: écart quadratique (plus « naturel », non linéaire, exigerait un autre
solveur) ; pondération propre au projet entre les termes — rejetée, l'ANSES somme les termes
normalisés sans pondération et c'est ce qui est repris.

---

## R3 — Contraintes nutritionnelles flexibles (FR-317, FR-318)

**Decision**: chaque seuil bas de nutriment devient **flexible** : une variable de manque
`manque_n ≥ 0` s'ajoute au membre de gauche (`apport_n + manque_n ≥ seuil_n`), avec un coût
`P × manque_n / seuil_n`. Le poids `P` est grand devant le critère de consommation (1 000 pour un
manque de 100 %, ×10 pour l'énergie, les protéines et les nutriments prioritaires), de sorte qu'un
nutriment n'est jamais sacrifié à une habitude alimentaire tant qu'une solution existe.

Restent **dures**, toujours : le plafond énergétique (110 %), les bornes hautes des intervalles de
référence (lipides, glucides), les limites de sécurité (R6), les bornes des sous-groupes, le plafond
par aliment.

Un écart est un nutriment dont `manque_n > 0` dans la liste finale ; son taux est celui de la
couverture calculée sur la liste livrée (FR-320). Sa cause s'établit en rejouant le même modèle
flexible sur le jeu « régime seul » puis sur le catalogue entier : si le manque disparaît sans le
filtre de saison, c'est la saison ; sans le filtre de régime, le régime ; sinon, aucune source.
Ces deux résolutions n'ont lieu que s'il y a un écart.

**Rationale**: c'est la notion de « contrainte flexible » de [ANSES 2016] (avis, § 3.3.3, page 40 :
« minimiser la violation des contraintes nutritionnelles rendues flexibles »). Le modèle est
toujours réalisable, d'où une résolution unique au lieu d'une cascade, et la disparition par
construction des trois défauts constatés : plafond énergétique levé, abandon cumulatif, taux
d'écart théorique.

**Alternatives considered**: corriger la cascade actuelle en ne levant que le seuil bas — rejeté :
elle reste séquentielle (jusqu'à 26 résolutions), donc lente et exposée au cyclage, et l'ordre
d'abandon reste arbitraire ; optimisation lexicographique en deux temps (couvrir d'abord, puis
rapprocher des habitudes) — équivalente en pratique au grand poids, pour deux fois plus de
résolutions.

---

### Amendement à l'implémentation (2026-10-04) — la vitamine D, et elle seule

> **Remplacé** par la décision ci-dessous, après mesure. Le texte des deux passages est conservé
> pour l'historique.

La démarche en deux passages a été mesurée sur la simulation complète : un nutriment à peine hors
d'atteinte (couvrable à 79 %) recevait le poids d'une habitude et chutait à 25 % — folates d'un
omnivore sans gluten, B12 d'un pescétarien. L'ANSES, elle, n'a rendu flexible **que la vitamine D**,
pour une raison qui lui est propre : sa référence ignore la synthèse cutanée (avis, pages 41-42).

**Decision** : la vitamine D reçoit le coût de l'ANSES ; tout autre manque coûte 1 000 (×10 pour les
nutriments prioritaires), en un seul passage. Résultat mesuré : la vitamine D se stabilise entre
11 et 38 % (médiane 21 %) — l'ANSES obtient 36 % (5,4 µg sur 15) —, et les écarts nouveaux sur les folates et la
B12 disparaissent.

### Amendement à l'implémentation (2026-10-04) — mise à l'échelle énergétique

Les bornes de l'ANSES sont calibrées sur un besoin de 2 600 kcal/j (hommes) et 2 100 kcal/j
(femmes), avis page 13. Mesuré : 21 listes restaient sous leur besoin énergétique, toutes pour des
profils lourds et très actifs (jusqu'à 4 400 kcal), à 75-78 %.

**Decision** : bornes, moyennes, écarts-types et limites couplantes sont multipliés par le rapport
entre le besoin du profil et l'énergie de référence de son sexe — à composition d'assiette
constante. Les plafonds épidémiologiques ne le sont pas : un seuil de risque ne grandit pas avec
l'appétit. L'énergie de référence est une donnée du fichier, avec sa provenance.

**Alternatives considered** : lever les bornes hautes au-delà d'un certain besoin (seuil inventé) ;
laisser l'écart d'énergie (une liste qui ne nourrit pas n'est pas une liste).

### Amendement à l'implémentation (2026-10-04) — deux passages, comme l'ANSES (remplacé)

Le poids unique de 1 000 s'est révélé faux à la première mesure. La vitamine D n'est pas couverte
par une alimentation courante : le premier essai poussait **tous** les sous-groupes à leur P95
(386 g de lait, 376 g de coing, 260 g de pain) pour grappiller les derniers pourcents de vitamine D.

Le rapport de l'ANSES décrit précisément ce cas (scénarios B0 et B1, avis page 40 et rapport) : les
seuils sont durs, l'ajout des bornes de consommation rend le modèle infaisable, et **seule la
vitamine D** est alors rendue flexible ; sa « variable de goal », rapportée à la référence, est
sommée **sans pondération** aux autres termes. L'ANSES accepte ainsi 5,4 µg/j de vitamine D sur 15.

**Decision** : la démarche est automatisée en deux temps.

1. Un premier passage, où chaque manque coûte 1 000 (×10 pour les nutriments prioritaires), sur le
   jeu de candidats complet, repère les nutriments **hors d'atteinte**.
2. Ces nutriments reçoivent ensuite le coût de l'ANSES (1 par manque de 100 %) ; tous les autres
   gardent le coût de 1 000, ce qui équivaut à un seuil dur sans jamais rendre le modèle infaisable.

Le repérage se fait **une seule fois**, avant la consolidation : refait à chaque tour, il désignait
comme hors d'atteinte ce que la consolidation venait de retirer, et le laissait chuter (vitamine A à
47 % pour un omnivore, constaté).

**Conséquence assumée** : la vitamine D devient un écart pour la plupart des profils, à un taux de
l'ordre de 10 à 20 %. La mesure de départ la déclarait couverte grâce aux algues et à des quantités
que les bornes de l'ANSES interdisent désormais. C'est le traitement de l'ANSES ; SC-005 est amendé
en conséquence dans la spec.

## R4 — Rattachement des aliments aux sous-groupes, et familles

**Decision**: le rattachement est calculé par le script de construction du catalogue, à partir de
la classe CIQUAL déjà portée par chaque aliment (`selected_by.classe`), affinée par le libellé
lorsque la classe mélange deux sous-groupes. La règle appliquée est enregistrée avec l'aliment.

| Classe CIQUAL | Sous-groupe ANSES | Affinage par libellé |
|---|---|---|
| 020101, 020102 | Légumes | — |
| ss:0202 (pommes de terre, patate douce, topinambour) | Autres féculents raffinés | — (l’ANSES range la pomme de terre dans les féculents, page 38) |
| 020301-020303 | Légumineuses | — |
| 020401 | Fruits frais | — |
| 020404 | Fruits secs | — |
| 030101, 030102 | Autres féculents raffinés | « complet » → Autres féculents complets |
| 030201, 030202 | Pain et panification raffinés | « complet » → complets ; « brioch » → Produits à base d'amidon transformés sucrés/gras |
| 040201, 040202, 040205 | Viande hors volaille | — |
| 040203, 040204 | Volaille | — |
| 040207 | Viande hors volaille | « canard » → Volaille |
| 0410xx | Œufs | — |
| 050101, 050102 | Lait | — |
| 050201, 050202 | Produits laitiers frais nature | « sucré », « aux fruits » → frais sucrés |
| 0503xx | Fromages | — |
| ss:0406 | Autres poissons | hareng, maquereau, saumon, sardine, anchois → Poissons gras (exemples de [ANSES 2016], page 38) |
| ss:0408 | Autres poissons, mollusques et crustacés | — |
| ss:0205 (fruits à coque et graines) | Oléagineux | — |
| ss:0902 | Huiles pauvres en ALA | colza, noix, lin, cameline → Huiles riches en ALA (exemples page 38) |
| ss:1009, 040309 (protéines végétales) | Légumineuses, **par usage** | — (FR-310) |
| 060205 (boissons végétales) | Lait, **par usage** | « eau de coco » → aucun (FR-309) |
| 050306 (spécialités type fromage) | Fromages, **par usage** | — |
| ss:1007 (algues) | **aucun** | — (FR-309) |

Les poissons gras du catalogue (hareng 11,7 %, maquereau 13,5 %, saumon 12,4 % de lipides) sont
exactement ceux que nomme l'ANSES ; tous les autres sont sous 3 %. La règle par libellé et un seuil
de lipides donneraient le même partage ; le libellé est retenu parce qu'il cite l'ANSES.

Une **classe nouvelle** apparue dans un millésime ultérieur, sans ligne dans cette table, fait
échouer la construction en la nommant — même discipline que les classes de sélection de la 003.

La **famille** (FR-321) est calculée au même endroit : clé dérivée du libellé normalisé pour les
variantes d'un même ingrédient (le dédoublonnage par espèce de la 003 fournit déjà cette clé),
sous-groupe entier pour les huiles et les boissons végétales. Elle est enregistrée avec l'aliment.

**Rationale**: la classe CIQUAL est déjà la colonne vertébrale de la sélection ; s'en servir garde
une seule taxonomie de référence, et rend chaque rattachement explicable par une ligne de table.

**Alternatives considered**: rattachement à la main aliment par aliment (250 décisions non
reproductibles au changement de millésime) ; réutiliser les 14 catégories d'affichage (trop
grossières : elles ne distinguent ni complet et raffiné, ni volaille et viande, ni poissons gras).

---

## R5 — Régimes qui excluent des sous-groupes (FR-310a, FR-311)

**Decision**: un sous-groupe est **exclu** pour un régime lorsque tous ses aliments **non
substituts** sont incompatibles avec ce régime. Il sort alors du critère et des contraintes. La
borne haute est levée pour les sous-groupes déclarés **de substitution** d'un sous-groupe exclu, et
pour un sous-groupe dont seuls les substituts restent :

| Sous-groupes exclus | Borne haute levée |
|---|---|
| Viande hors volaille, volaille, poissons, œufs (un ou plusieurs) | Légumineuses |
| Lait / frais / fromages (aliments animaux) | Le même sous-groupe, alimenté par ses substituts |

La table de substitution est une donnée du fichier de paramètres, marquée comme décision du projet.

**Rationale**: la règle se lit sur les données (régime et rattachement), pas sur une liste de
régimes codée en dur ; un régime ajouté plus tard en hérite sans changement.

**Alternatives considered**: table indexée par régime (`vegan → [...]`) — rejetée, elle dupliquerait
la compatibilité déjà portée par les aliments.

---

## R6 — Limites supérieures de sécurité (FR-316)

**Decision**: un fichier de référence distinct des apports de référence porte les limites
applicables à l'ensemble de l'alimentation, pour l'adulte. Valeurs candidates, **à confirmer sur
source primaire au moment de la saisie** (le principe II interdit de reprendre une source
secondaire) :

| Nutriment | Limite | Source primaire à citer |
|---|---|---|
| Iode | 600 µg/j | EFSA (2006), reprise par l'ANSES |
| Sélénium | 255 µg/j | EFSA (2023) |
| Zinc | 25 mg/j | EFSA (2006) |
| Cuivre | 5 mg/j | EFSA (2022) |
| Vitamine D | 100 µg/j | EFSA (2023) |
| Calcium | 2 500 mg/j | EFSA (2012) |
| Vitamine B6 | 12 mg/j | EFSA (2023) |
| Vitamine E | 300 mg/j | EFSA (2024) |
| Rétinol (vitamine A préformée) | 3 000 µg/j | EFSA (2006) |

Exclues parce que leur limite ne vise que les suppléments ou les formes de synthèse : magnésium,
vitamine B3, vitamine B9.

**Vitamine A** : le catalogue ne porte aujourd'hui que la vitamine A totale (rétinol + bêta-carotène
/ 6). La table CIQUAL publie le rétinol séparément (constituant 51200) : le script l'ajoute à la
composition sous le code `retinol`, non affiché, et la limite porte sur lui seul — ce qui évite de
plafonner les carottes.

**Rationale**: limites et besoins sont deux notions distinctes ; les mêler dans le fichier des
apports de référence exposerait le calcul des besoins (principe III) à une ligne qui n'en est pas un.

**Alternatives considered**: ajouter un `kind: 'LSS'` aux apports de référence — rejeté pour la
raison ci-dessus.

---

## R7 — Une variante par famille, au moins une demi-portion (FR-322, FR-323)

**Decision**: une **consolidation itérative** après la résolution :

1. résoudre le modèle sur tous les candidats ;
2. dans chaque famille représentée par plusieurs aliments, ne garder que celui dont la quantité est
   la plus grande ;
3. retirer tout aliment sous la demi-unité d'achat sur la période ;
4. résoudre à nouveau sur les candidats restants ; recommencer en 2 tant qu'un aliment a été retiré.

Le jeu de candidats ne fait que décroître, donc la boucle termine ; mesuré sur des listes de 10 à 22
lignes, deux à quatre tours sont attendus. Le modèle étant flexible (R3), chaque tour reste
réalisable : un nutriment que la consolidation rend inatteignable apparaît comme écart (FR-324), il
n'est jamais couvert en levant la règle. Seule exception à surveiller : un sous-groupe à borne
basse non nulle vidé par la consolidation voit sa borne basse levée, comme un sous-groupe sans
candidat (cas limite de la spec).

**Rationale**: les deux règles sont combinatoires (choisir *une* variante, *zéro ou au moins* une
demi-portion) : un programme linéaire seul ne peut pas les garantir. La consolidation les garantit
par construction, sans dépendance nouvelle.

**Alternatives considered**: programme linéaire en nombres entiers (une variable binaire par aliment)
avec `javascript-lp-solver` — rejeté : sa recherche arborescente n'a pas d'échéance (R16 de la 003)
et le simplexe sous-jacent cycle déjà ; solveur HiGHS en WebAssembly — rejeté pour cette feature :
dépendance binaire nouvelle à embarquer dans la sortie de build, dont la 003 a montré le coût
(worker absent en production), pour un gain d'optimalité que la mesure n'a pas montré nécessaire.
À reconsidérer si SC-013 échoue.

---

### Amendement à l'implémentation (2026-10-04) — relever ou retirer

Retirer toute ligne sous la demi-unité vidait les listes journalières de ce que l'on mange moins
d'une fois par jour : l'ANSES place les autres poissons à 23 g/j, les œufs à 13 g/j, sous leur
demi-unité. L'omnivore perdait poisson, œufs et fromages, et manquait de B12.

**Decision** : une ligne sous la demi-unité est **relevée** à la demi-unité si elle dépasse le quart
d'unité, **retirée** sinon — l'arrondi usuel d'un choix « zéro ou au moins X ». Une ligne relevée ne
redescend plus ; si le relèvement contredit une contrainte dure, les lignes relevées au dernier tour
sont retirées. Chaque tour retire ou relève au moins un aliment : la boucle termine.

Les aliments dont la demi-unité dépasse la borne haute de leur sous-groupe (ou sa limite couplante)
sont écartés **avant** la consolidation : les oléagineux, plafonnés à 9 g/j chez l'homme et 5 g/j chez
la femme pour une demi-poignée de 15 g, ne peuvent figurer sur aucune liste journalière. Les laisser
candidats faisait tourner la consolidation une vingtaine de tours (le solveur en ajoutait quelques
grammes, la consolidation les retirait, un autre prenait leur place) et lui faisait perdre au passage
des sources de folates. Sur une liste hebdomadaire, ils restent possibles.

**Anti-cyclage** : au second essai d'une résolution interrompue, un coût infime et propre à chaque
aliment (un millionième par gramme) rend les sommets deux à deux distincts — la parade classique d'un
simplexe dégénéré. Changer seulement de précision ne suffisait pas sur un cas mesuré.

### Amendement à l'implémentation (2026-10-04) — positivité des quantités

La simulation a fait apparaître des listes qui violaient des contraintes dures : énergie à 123 %,
légumes à 866 g pour une borne de 277, cuivre et sélénium au-delà de leur limite de sécurité — tous
sur des profils véganes extrêmes. Cause : sur une instance dégénérée, le simplexe de
`javascript-lp-solver` a rendu **−589 g** d'un légume dans une solution déclarée réalisable. La
contrainte, vraie sur la solution du solveur, était fausse sur la liste affichée, qui écarte toute
quantité négative comme du bruit.

**Decision** : borne basse à zéro explicite sur chaque aliment ; une solution portant une quantité
négative est traitée comme une résolution ratée (second essai perturbé, puis erreur franche). Un
modèle déclaré infaisable reçoit le même second essai : constaté sur une liste végane après le seul
retrait d'aliments, ce qui ne peut pas rendre infaisable un modèle aux seuils flexibles.

Une borne basse de sous-groupe qui dépasse ce que les candidats restants peuvent fournir est aussi
ramenée à cette capacité : un seul féculent, plafonné à 15 g, restait pour une borne de 16 g.

## R8 — Échéance et cyclage (FR-319)

**Decision**: le worker borné de la 003 est conservé. Une résolution interrompue est rejouée une fois
avec une précision différente (1e-4) ; si elle l'est encore, le calcul échoue avec une erreur
explicite (« calcul interrompu ») que l'API et l'écran présentent comme telle. Elle n'est jamais
convertie en écart nutritionnel.

**Rationale**: avec le modèle flexible, le nombre de résolutions par liste passe d'un maximum de 26 à
un nominal de 3 à 5 (consolidation comprise) : l'exposition au cyclage baisse d'autant. Une erreur
franche vaut mieux qu'un écart fabriqué (leçon de la 003-fix-worker-build).

**Alternatives considered**: allonger l'échéance — ne traite pas le cyclage, seulement son coût.

---

## R9 — Le sexe entre dans la construction de la liste

**Decision**: `PlanInput` reçoit `referenceSex`, déjà connu de la route `/api/plan`. Il ne sert qu'à
choisir les paramètres du modèle de consommation.

**Rationale**: principe III : le régime ne touche pas aux besoins ; ici c'est le sexe qui touche à
la sélection, ce que rien n'interdit — le sexe intervient déjà dans les besoins eux-mêmes.

---

## R10 — Stockage et chargement

**Decision**: deux fichiers de référence nouveaux, chacun avec `_meta` (source, version,
`retrieved_at`) et la provenance de chaque valeur — `consumption-model.json` et
`upper-limits.json` ; deux tables nouvelles et deux colonnes sur `foods` (`anses_subgroup`,
`family`, plus la règle de rattachement), par une migration `0007`. Le seed refuse un fichier sans
provenance, comme pour les autres. Les tests et la simulation lisent les fichiers, l'application la
base — même partage qu'aujourd'hui.

---

## R11 — Mesure avant/après (FR-314)

**Decision**: la simulation `npm run simulate:plans` est rejouée **avant toute modification du
calcul**, sur le catalogue corrigé du commit `db95134`, et son résultat est conservé dans
`specs/004-reperes-anses/baseline/`. La comparaison finale porte sur les mêmes 1 408 listes.
Le contrôle des familles (SC-011) s'ajoute à la simulation dès que les familles existent.

**Rationale**: même leçon que la 003 — une fois le calcul changé, l'état antérieur n'est plus
reconstituable.

---

## R12 — Ce qui disparaît

**Decision**: `CATEGORY_DAILY_CAP_G`, le plancher de 400 g de fruits et légumes, la relaxation
séquentielle (`relax.ts`) et le script `check:caps`, dont l'objet — vérifier que les plafonds maison
ne coûtent ni énergie ni protéines — disparaît avec eux. Ses contrôles utiles sont repris par la
simulation.
