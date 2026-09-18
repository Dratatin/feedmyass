# Phase 0 — Recherche : catalogue sélectionné par pertinence

**Feature**: 003-catalogue-pertinence | **Date**: 2026-09-17

La numérotation continue celle de la feature 001, qui s'arrête à R7 et dont `docs/sources.md` cite
les décisions. Toutes les mesures ci-dessous ont été jouées sur les tables CIQUAL 2020 et 2025
réelles, pas estimées.

---

## R8 — Source de pertinence : la classification CIQUAL de quatrième niveau

**Décision**: la sélection s'appuie sur `alim_ssssgrp_code`, le quatrième niveau de la classification
CIQUAL, que le script actuel n'exploite pas — il s'arrête au troisième (`alim_ssgrp_code`).

**Rationale**: c'est une classification maintenue par l'ANSES, livrée avec la donnée, stable en codes
d'un millésime à l'autre, et qui porte exactement les distinctions dont le produit a besoin. Là où le
script ne voit que « viandes crues », elle distingue bœuf et veau, porc, poulet, dinde, agneau et
mouton, gibier, abats et autres viandes. Là où il ne voit que « fromages », elle distingue pâte
molle, pâte pressée ou dure, pâte persillée, fondus, autres spécialités, et alternatives végétales.
Sélectionner par classe donne la variété sans arbitrage du projet, et permet d'écarter une classe
entière — abats, fromages fondus, gibier — par une règle qui la nomme, au lieu d'espérer qu'un
classement par complétude s'en charge.

**Mesure**: 86 classes de quatrième niveau dans la table, dont 63 peuplées sur le périmètre visé
après application des mots de rejet existants.

**Alternatives considérées**:

- **Étude INCA 3 de l'ANSES** — évaluée en détail et **écartée**. Son fichier `nomenclature.csv`
  porte une colonne `Freq` donnant le nombre d'occurrences de consommation relevées par l'enquête :
  le signal de pertinence idéal sur le papier. Mais aucune clé ne relie INCA à CIQUAL — INCA code en
  FoodEx2, et CIQUAL ne publie pas de code FoodEx2. Le rapprochement ne peut donc se faire que par
  libellé. Mesuré : **27 %** des candidats rapprochés (408 sur 1516), et surtout un échec sur les
  aliments les plus évidents — *tofu*, *lentille cuite* et *pomme* ne sont pas rapprochés là où
  *carotte* l'est à 1464 occurrences. La mesure ne discrimine pas non plus ce qu'on veut garder de ce
  qu'on veut écarter : 31 % de rapprochement sur le catalogue actuel contre 25 % sur les 628 aliments
  écartés. Un critère incapable de noter le tofu ne peut pas piloter une sélection.
- **Open Food Facts** — base de produits de marque, non officielle, avec doublons entre marques.
  Déjà écartée par R4 (feature 001) pour la composition ; les mêmes raisons valent pour la
  pertinence.
- **Conserver le classement par complétude de fiche** — c'est le défaut à corriger : il mesure la
  qualité de la donnée, pas la pertinence alimentaire.

---

## R9 — Les aliments sans classe de quatrième niveau

**Décision**: replier sur le troisième niveau (`alim_ssgrp_code`) pour tout aliment dont le quatrième
vaut `000000`, et traiter ces replis comme des classes ordinaires, soumises aux mêmes règles.

**Rationale**: la classification de quatrième niveau est incomplète. Mesuré sur le périmètre visé :
**22 %** des candidats portent `000000` — dont **toutes les pommes de terre et tout le tofu**. Une
règle fondée sur le seul quatrième niveau en écarterait un cinquième, y compris des aliments que le
catalogue doit manifestement proposer. Le repli est donc obligatoire, et il doit être visible plutôt
que silencieux.

**Mesure**: 7 à 8 classes de repli selon le millésime, portant 271 à 281 aliments. La plus peuplée
est le repli du sous-groupe des poissons crus, avec 105 aliments — une classe de repli n'est pas
petite, elle doit supporter les mêmes quotas et les mêmes exclusions que les autres.

**Alternatives considérées**:

- **Écarter les aliments sans quatrième niveau** — perd les pommes de terre et le tofu. Rejeté.
- **Leur attribuer une classe à la main** — réintroduit exactement le type de décision de projet non
  traçable que la feature supprime.

---

## R10 — Ce que le quatrième niveau ne règle pas, et ce qui le remplace

**Constat**: la classification de quatrième niveau ne subdivise pas les fruits et légumes. « Légumes
crus » compte 121 aliments et « légumes cuits » 135, en une seule classe chacun. Le dédoublonnage par
espèce déjà en place reste donc indispensable et **n'est pas remplacé** par cette feature.

**Amendement du 2026-09-17, à l'implémentation.** Le dédoublonnage ne suffit pas : il fusionne les
doublons, il ne choisit pas. Mesuré, un quota par classe appliqué aux fruits et légumes ramenait le
catalogue à **13 légumes**, et le grain de l'espèce sans borne le portait à **127 légumes et 69
fruits**, avec une complétude moyenne tombant à 23,4 — sous le plancher de SC-003.

**Décision**: pour les fruits et légumes, le critère de pertinence est le **calendrier de saison de
l'ADEME**, déjà présent au dépôt comme source de la table de saisonnalité. Une espèce absente du
calendrier n'a aucun mois de disponibilité, donc ne sera jamais proposée (FR-014) : l'inscrire au
catalogue revient à y ajouter un aliment mort.

**Rationale**: c'est un critère officiel, maintenu hors du projet, qui dit exactement ce qu'on
cherche — ce qui s'achète en France métropolitaine. Il ne demande aucun nombre. Et il corrige un
défaut existant : le catalogue précédent portait **huit** fruits et légumes sans aucune saison, donc
jamais proposables. Après la bascule, le rapport de saisonnalité en compte **zéro**, par construction.

**Conséquence**: la table d'alias du calendrier est désormais partagée entre le script de
construction et celui de saisonnalité (`scripts/lib/produce-calendar.mjs`). Deux copies divergentes
produiraient exactement l'aliment mort qu'on cherche à éviter — apparié ici, pas là.

---

## R11 — Le quota par classe : un nombre subsiste, et il change de nature

**Décision**: un quota **unique et uniforme** d'aliments par classe, paramètre unique du script,
justifié par la capacité de relecture humaine (FR-206, SC-008) et non par un jugement de pertinence.

**Rationale**: la feature supprime 18 nombres qui encodaient chacun un jugement implicite de
pertinence — pourquoi 55 légumes et 5 substituts de produits carnés ? Personne ne le sait. Elle ne
supprime pas tout nombre : il faut encore borner la taille du catalogue, parce que le principe II et
la porte de revue exigent que l'étiquetage de régime de chaque aliment reste relisible à la main, et
parce que sans borne le catalogue passe à 925 aliments avec les effets mesurés dans la spec.

La différence est réelle et doit être assumée : **un paramètre de capacité de revue, motivé et
unique, remplace dix-huit jugements de pertinence non motivés.** Le quota ne décide plus *quels*
aliments méritent d'être proposés — c'est la classe officielle qui le fait — il décide seulement
combien de représentants d'une même classe le catalogue peut porter.

**Amendement du 2026-09-17, à l'implémentation: deux quotas, pas un.** Un quota unique traitait
également des choses inégales. Une classe de quatrième niveau est une subdivision fine décidée par
l'ANSES — « bœuf et veau », « fromages à pâte persillée » — où quatre représentants suffisent. Une
classe de **repli** est un sous-groupe que l'ANSES n'a pas subdivisé : « poissons crus » en compte
105 à elle seule. Mesuré, le quota unique de 4 ramenait le catalogue à **huit poissons pour toutes
les mers**, et les fruits à coque à quatre.

La distinction retenue porte donc sur une **propriété de la donnée** — la finesse de la
classification — et non sur un avis : `QUOTA_CLASSE_FINE = 4`, `QUOTA_CLASSE_LARGE = 12`.

**Mesure retenue** (CIQUAL 2020, périmètre final incluant les alternatives végétales) :

| | Avant | Après |
|---|---|---|
| Aliments | 281 | **269** |
| Complétude moyenne | 25,56 / 26 | **25,52 / 26** |
| Régressions de couverture | — | **aucune** |

Deux nombres subsistent donc là où il y en avait dix-huit. Ils ne décident plus *quels* aliments
méritent d'être proposés — la classe officielle le fait — ils bornent seulement combien de
représentants d'une même classe le catalogue peut porter.

**Alternatives considérées**:

- **Aucun quota** — mesuré : 925 aliments, complétude moyenne tombant de 25,5 à 19,8 nutriments sur
  26, et gélatine, poudre à lever et gelée royale proposées à l'achat. Rejeté.
- **Un quota par classe, différencié** — rétablit dans un vocabulaire neuf le défaut qu'on corrige.
  Rejeté.

---

## R12 — Acquisition : API Recherche Data Gouv

**Décision**: récupérer la table par l'API de **Recherche Data Gouv**
(`entrepot.recherche.data.gouv.fr`), dépôt Dataverse gouvernemental, qui publie la table Ciqual sous
DOI. Le jeu de données expose ses métadonnées (titre, numéro de version, date de publication,
licence) et chaque fichier par un identifiant stable téléchargeable directement.

**Rationale**: c'est ce que le principe II demande sans pouvoir l'obtenir aujourd'hui. La version et
la date inscrites dans `_meta` viennent actuellement d'une saisie à la main dans le script : elles
sont invérifiables. L'API les fournit à la source. Elle supprime aussi le geste manuel — télécharger
un ZIP et le décompresser dans un répertoire passé en argument — qui rend la construction
non rejouable.

**Vérifié**: l'API répond `OK`, annonce la version `1.0` publiée le 2025-11-19, la licence
`etalab 2.0`, et liste les cinq fichiers XML attendus plus les documents. Un fichier téléchargé par
son identifiant est bien le XML annoncé.

**Alternatives considérées**:

- **API de data.gouv.fr** — expose bien le jeu de données Ciqual 2020 et sa licence `fr-lo`, mais
  pointe vers la même archive ZIP à décompresser, et ne publie pas la 2025. Retenue comme source de
  repli documentaire, pas comme source d'acquisition.
- **Conserver l'archive manuelle** — ne satisfait ni FR-208 ni FR-209.
- **Committer les XML dans le dépôt** — 69 Mo pour le seul fichier de composition, et fige le
  millésime sans rien résoudre.

---

## R13 — Millésime et encodage

**Décision**: passer au millésime **2025**, et détecter l'encodage à la lecture plutôt que de le
supposer.

**Rationale**: 3 484 aliments en 2025 contre 3 185 en 2020. Le gain porte notamment sur les desserts
végétaux (10 → 15) et les boissons végétales (13 → 15).

**Correction d'une hypothèse initiale**: le passage en 2025 avait d'abord été justifié par l'arrivée
des alternatives végétales. **C'est faux.** Les classes `040309` (alternatives végétales aux
charcuteries, 5 aliments dont deux saucisses végétales), `050306` (alternatives aux fromages) et
`060205` (boissons végétales) **existent déjà dans la table 2020**, avec des effectifs identiques ou
proches. Les 86 classes de quatrième niveau sont les mêmes dans les deux millésimes ; seuls **neuf
libellés** ont changé, dont « substituts de charcuteries pour végétariens » devenu « alternatives
végétales aux charcuteries ». Deux conséquences : le millésime 2025 se justifie par la fraîcheur et
le volume, pas par la couverture végétale ; et **les règles ne doivent jamais être écrites sur un
libellé de classe**, seulement sur son code.

**Contrainte technique**: les fichiers 2020 sont encodés en **windows-1252**, les 2025 en **UTF-8
avec BOM**. Le script décode windows-1252 en dur. L'encodage doit être déduit de la déclaration XML
ou de la présence d'un BOM, sans quoi tous les libellés accentués sont corrompus.

**Amendement du 2026-09-17, à l'implémentation: le millésime tranche une question nutritionnelle,
pas seulement une question de fraîcheur.**

La table 2025 a **retiré les teneurs en vitamine B12 des algues** — 38,8 µg/100 g pour le nori en
2020, 9,81 pour la dulse, désormais « non déterminées » ou retirées du catalogue. C'est la question
de la pseudo-B12: les corrinoïdes des algues sont des analogues que l'organisme humain n'assimile
pas.

La conséquence est directe et va à rebours de ce que la mesure semblait d'abord dire. Construit sur
la 2020, le catalogue refermait l'écart de B12 d'un régime végane (0,97 → 2,28) et cela paraissait un
gain de la feature. C'était un **artefact d'une donnée périmée**: le solveur atteignait le besoin avec
de la dulse séchée. Sur la 2025, l'écart réapparaît, et c'est la bonne réponse.

Deux autres constats de millésime :

- **Vitamine E**: la 2025 a basculé du code `53100` vers `71010` (alpha-tocophérol), que CIQUAL
  libelle elle-même « Alpha-tocophérol (vitamine E) » — 595 valeurs contre 1734. Sans repli, la
  vitamine E manquait sur 219 aliments du catalogue. Le repli est ajouté, sur le même modèle que les
  doubles codes déjà traités pour l'énergie et les protéines.
- **Vitamine B9**: la 2025 publie `56700` (folates totaux, 1525 valeurs) et `56702` (équivalents
  folates alimentaires, 908). La référence ANSES du projet est de 330 µg en **EFA**, donc `56702`
  serait le code juste et `56700` une approximation. Les mélanger dans une même colonne serait pire
  qu'une valeur absente (principe II): le repli n'est PAS ajouté, et l'écart entre la référence et le
  code employé est signalé ici comme une question ouverte, antérieure à cette feature.

- **Tofu, tempeh et seitan ont changé de classe**: du sous-groupe « substituts de produits carnés »
  en 2020 à « ingrédients divers » en 2025, sans quatrième niveau. Ils retombaient donc en `autre`,
  plafonnés à 150 g comme un condiment — le défaut même que la feature corrige. Une règle de libellé
  courte les rattache à `proteine_vegetale`, sur le modèle des heuristiques de gluten et de fruits à
  coque. Elle est à reconfronter à chaque changement de millésime.

---

## R14 — Mesure avant / après

**Décision**: figer la mesure du catalogue actuel **avant** toute modification de la sélection, et la
conserver comme référence de comparaison dans le dépôt.

**Rationale**: FR-216 et SC-007 exigent que la couverture nutritionnelle atteignable ne se dégrade
pour aucun régime. Cette comparaison est impossible à faire après coup : une fois la sélection
changée, la référence est perdue. La mesure doit porter, pour chacun des quatre régimes de base et
pour les exclusions, sur la couverture atteignable par nutriment et sur les écarts produits.

**Effet de bord connu à surveiller**: la vitamine B12 d'un régime végane est le point sensible. Le
catalogue actuel produit un écart nommé ; toute entrée d'alternatives végétales au catalogue le
rapproche du seuil, et un travail exploratoire a montré qu'il pouvait se refermer à exactement
100,00 % du besoin — en saturant simultanément toutes les bornes hautes, donc sans aucune marge. Un
écart qui se referme n'est pas en soi une amélioration s'il tient au gramme près : la mesure doit le
dire, et le test qui démontre la production d'écarts doit s'appuyer sur un cas franc plutôt que
limite.

**Anomalies d'étiquetage à corriger dans la foulée**, toutes constatées sur la donnée réelle :

| Anomalie | Nature |
|---|---|
| Gélatine sèche étiquetée végane | classe ouverte à tous les régimes, ingrédient animal |
| Gelée royale étiquetée végane | idem, produit de la ruche — et effectivement retenue par le solveur |
| Pâtes sèches aux œufs étiquetées véganes | libellé nommant un ingrédient animal, non lu |
| « Cresson de fontaine » plafonné à 15 g | mot de condiment cherché en sous-chaîne : « cre**sson** » |
| « Lieu jaune ou co**lin,** » plafonné à 15 g | même cause, via le mot « lin, » |

Les deux dernières ne concernent pas la sélection mais seront corrigées ici : elles touchent le même
script et fausseraient la mesure avant/après.

---

## R15 — Un défaut du solveur découvert par la mesure (ajouté le 2026-09-17)

**Constat**: la première comparaison avant/après a montré **13 régressions de couverture**. Aucune ne
venait de la sélection. `src/domain/plan/solver.ts` **retirait silencieusement** du plan tout aliment
dont la quantité calculée était inférieure à 0,5 g. La solution du programme linéaire respectait les
seuils ; la liste affichée, elle, ne les respectait plus — et aucun écart n'était signalé, puisque le
modèle restait faisable.

Le défaut préexistait à cette feature. Il ne mordait que sur les aliments très denses employés à dose
infime : une algue séchée à 0,4 g pouvait porter l'essentiel de la vitamine A d'une liste. En faisant
entrer davantage d'algues au catalogue, la sélection par classe l'a rendu visible. C'est aussi ce qui
expliquait un comportement absurde à première vue : **plus le catalogue contenait d'aliments, plus il
y avait de régressions**.

**Décision**: relever ces quantités au gramme plutôt que les retirer. Une liste affichant « 1 g de
wakamé » est honnête et achetable ; une liste qui affiche une couverture qu'elle ne tient pas ne
l'est pas. Vérifié : les 13 régressions disparaissent.

**Portée**: la spécification met « la refonte du solveur » hors périmètre. Une correction d'une ligne
sur une troncature qui fait mentir la couverture affichée n'est pas une refonte, et FR-216 ne pouvait
pas être tenue sans elle. L'écart est assumé et consigné ici.

---

## R16 — Le solveur pouvait ne jamais rendre la main (ajouté le 2026-09-18)

**Constat**: après les corrections de revue, le calcul d'une liste **végane** au mois de septembre ne
terminait plus. Pas « lent » — jamais. Le même modèle privé de ses matières grasses se résolvait en
12 ms, et le catalogue d'avant la feature en 12 ms également. Un utilisateur végane aurait bloqué
l'API.

Le diagnostic a écarté plusieurs hypothèses avant la bonne :

| Hypothèse | Vérification |
|---|---|
| Un aliment fautif | Retirer les cinq huiles aux colonnes quasi identiques ne change rien |
| Les options de la bibliothèque | `exitOnCycles` est déjà actif par défaut ; `presolve` et `tolerance` ne changent rien |
| La borne de temps de la bibliothèque | `model.timeout` n'est lu que dans la boucle *branch and bound*, réservée aux problèmes en nombres entiers — notre modèle est un LP pur, elle ne s'applique jamais |

**Cause**: le simplexe de `javascript-lp-solver` cycle sur une instance dégénérée, à sa précision par
défaut de l'ordre de `1e-9`.

**Décision**: passer la précision à `1e-3` grammes, soit un milligramme. Résolution en 12 ms.

**Rationale**: la précision perdue est nulle en pratique. Les quantités s'affichent au gramme, et le
solveur écarte déjà tout ce qui est sous `NUMERICAL_NOISE_G` (0,01 g), dix fois plus grossier. Ce
qu'on gagne, c'est qu'aucun profil ne peut faire tourner le calcul indéfiniment.

### Ce n'est PAS une correction, et un cas reste ouvert

Vérification exhaustive sur les 4 régimes × 8 jeux d'exclusions × 12 mois, contre la base :

| Précision | Résultat |
|---|---|
| `1e-9` (défaut) | un régime végane boucle indéfiniment |
| **`1e-3` (retenu)** | toute la suite passe ; **« végane sans gluten » boucle encore, au mois de décembre** |
| `0,1` | termine plus souvent, mais rend des plans **faux** — sept nutriments sous leur seuil pour un omnivore |

La précision **déplace** l'instance qui cycle, elle ne garantit pas la terminaison ; et trop
desserrée, elle sacrifie la justesse nutritionnelle, ce que le principe II interdit.

**Le cas ouvert est une régression de cette feature, et il faut le dire ainsi.** Sur le catalogue
d'avant, « végane sans gluten » se résout en 40 ms. Sur le nouveau, il boucle. La faiblesse du
solveur préexistait — le catalogue d'avant avait simplement la chance de ne pas la réveiller.

Écarté comme cause après mesure : un aliment fautif (retirer les cinq huiles quasi identiques ne
change rien), une catégorie fautive (retirer presque n'importe laquelle débloque, ce qui est la
signature d'une dégénérescence et non d'un coupable), le plancher de fruits et légumes (capacité
16 800 g pour un plancher de 400 g, rien de dégénéré), et toutes les options de la bibliothèque.

**Un utilisateur végane et sans gluten bloquerait l'API.** Le solveur étant synchrone, il gèle la
boucle d'événements de Node : toutes les requêtes du serveur expirent, y compris celles qui ne le
touchent pas. C'est ainsi que le défaut s'est manifesté — des tests e2e qui expirent sur `page.goto`,
et un serveur à 1 191 secondes de CPU.

### Parade retenue: borner l'exécution (implémentée le 2026-09-18)

Le solveur part dans un **worker**, que l'appelant peut terminer. Celui-ci l'attend sur
`Atomics.wait` avec une échéance, ce qui garde `solvePlan` **synchrone**: aucune signature ne change,
ni dans le domaine, ni dans les routes, ni dans les tests. Le dialogue passe par mémoire partagée et
non par `postMessage`, parce qu'un appelant bloqué sur `Atomics.wait` n'a plus de boucle d'événements
pour recevoir un message.

Au-delà de l'échéance, le modèle est déclaré infaisable et la relaxation prend le relais: elle nomme
les nutriments hors d'atteinte, et l'écran de couverture explique qu'un complément sera sans doute
nécessaire. Un écart nommé vaut mieux qu'une page qui ne répond plus.

**Vérifié sur les 384 combinaisons** — 4 régimes × 8 jeux d'exclusions × 12 mois, contre la base:

| | Avant | Après |
|---|---|---|
| Combinaisons qui ne terminent pas | au moins 1 | **0** |
| Pire cas | infini | **6,2 s** (végétarien sans gluten ni lactose, février) |
| Listes dégradées (moins de 6 lignes) | — | **0** |

L'échéance est à 400 ms par résolution. Elle ne coupe jamais un calcul légitime — une résolution
tient en quelques dizaines de millisecondes — et la relaxation rejouant le solveur jusqu'à une fois
par nutriment, le pire cas reste de l'ordre de quelques secondes.

**Deux pièges rencontrés à l'implémentation**, notés pour qui y reviendra:

- `Atomics.wait` ne bloque que si la valeur observée **est celle qu'on lui passe**. Le worker guettait
  le zéro, alors qu'après sa propre réponse l'état vaut deux: il repartait donc aussitôt sur une
  demande déjà traitée, qu'il resolvait en boucle en écrasant la zone d'échange.
- Sous Next.js, `import.meta.url` ne désigne plus le voisinage du fichier source: le worker était
  introuvable et la page de liste restait vide, sans erreur visible. Le chemin est désormais cherché
  aux deux endroits — et son absence ne lève plus d'erreur, elle bascule sur une résolution en direct (R17).

**Leçon de méthode**: le défaut ne s'est PAS manifesté comme un test rouge mais comme un *worker* de
Vitest qui meurt, message obscur et sans nom de fichier. C'est en jouant les fichiers de test un par
un qu'il s'est laissé localiser.

## R17 — Le worker manquait à la sortie de build, et la couverture affichait 0 % (ajouté le 2026-09-18)

**Constat**: premier déploiement de la feature. Quel que soit le régime, **tous** les nutriments
ressortaient sous leur seuil, et à zéro. Pas un écart nommé: un écran entier de zéros, présenté avec
le même aplomb qu'un résultat juste.

**Cause**: le worker est chargé par CHEMIN, jamais par `import`. Le traçage de fichiers de Next ne
peut donc pas le déduire, et `solver-worker.mjs` était absent de `.next`. Chaque résolution attendait
alors une réponse qui ne viendrait jamais, expirait au bout de son échéance, et la relaxation faisait
son travail: retirer un à un les nutriments hors d'atteinte — c'est-à-dire tous.

Le mécanisme conçu pour NOMMER les écarts les a donc tous fabriqués. C'est la faute la plus grave de
la feature au regard du principe II: le chiffre était faux, et rien ne le signalait.

**Pourquoi les tests ne l'ont pas vu**: la suite e2e tourne contre `next dev`, où le chemin des sources
existe; les tests unitaires et de contrat tournent sous Vitest, où `import.meta.url` désigne bien le
voisin du module. Aucun de ces trois environnements ne ressemble à la production. La leçon vaut
au-delà du worker: **ce qui n'est vérifié qu'en développement n'est pas vérifié.**

### Trois corrections, et elles sont distinctes

**1. Un repli en direct, qui rend la panne inoffensive.** Si le worker ne démarre pas — fichier
absent, dépendance non résoluble, plateforme sans `SharedArrayBuffer` — le solveur tourne dans le fil
principal. On y retrouve le risque de blocage de R16, rare; mais on rend un résultat **juste**. Entre
un risque de lenteur et un chiffre faux, le principe II tranche. Un avertissement nomme la cause dans
les journaux.

Le démarrage du worker est vérifié par une **poignée de main** sur un modèle trivial: un worker qui
meurt à l'ouverture émet son erreur sur la boucle d'événements, que l'appelant bloque aussitôt sur
`Atomics.wait` — sans cette poignée de main, sa mort resterait invisible.

**2. Embarquer le worker ET sa dépendance.** `outputFileTracingIncludes` (next.config.ts) ajoute
`solver-worker.mjs` aux routes `/api/plan` et `/api/results`. Il faut y joindre
`javascript-lp-solver`: Turbopack l'**inline** dans le chunk de la route, si bien qu'il disparaît de
`node_modules` à la trace — le worker, lui, l'importe pour de vrai et mourrait sur un module
introuvable. Vérifié dans `route.js.nft.json`: worker présent, 66 fichiers du paquet tracés.

**3. Soustraire le `new Worker` à l'analyse statique de Turbopack.** Ajouter le worker au traçage a
d'abord **cassé la compilation**: 47 erreurs « Unknown module type ». Turbopack analyse
`new Worker(...)` pour empaqueter le worker; sur un chemin CALCULÉ il ne sait rien résoudre et se
rabat sur « tous les fichiers du projet ». Il tirait ainsi `vitest.config.ts`, donc Vite, donc
`lightningcss`, un binaire natif qui ne se place pas dans un chunk ESM.

| Tentative | Résultat |
|---|---|
| `new Worker(/* turbopackIgnore: true */ chemin)` | **échoue** — la compilation reste rouge, alors que Next emploie cette échappatoire pour ses propres workers (`next/dist/build/swc/loaderWorkerPool.js`) |
| `path.join(/* turbopackIgnore: true */ process.cwd(), ...)` | sans effet ici |
| **`process.getBuiltinModule('node:worker_threads')`** | **retenu** — il ne reste aucun import analysable, seulement un type effacé à la compilation |

La même échappatoire sert pour `node:fs`: le test d'existence des chemins candidats est rétabli, ce
qui évite de payer une poignée de main expirée à chaque démarrage à froid.

### Vérification

Contre le serveur de **production** (`next build` puis `next start`), et non contre `next dev`:

| Régime | Résultat |
|---|---|
| omnivore | 11 lignes, 0 écart, 0 nutriment sous le seuil, 0 à zéro |
| végane sans gluten | 18 lignes, 1 écart nommé, énergie 110 %, protéines 318 % |

Aucun avertissement de repli dans les journaux: le worker démarre. Et en retirant le fichier à la
main, le repli rend les mêmes listes — ce qui devait être vérifié, puisque c'est le filet.
