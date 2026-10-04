# Sources, versions et licences des données

Ce fichier recense l'origine de chaque donnée nutritionnelle utilisée par l'application.
Le principe II de la [constitution](../.specify/memory/constitution.md) l'exige : aucune valeur
affichée à l'utilisateur ne doit être sans source citable.

Les fichiers de référence eux-mêmes portent ces métadonnées dans leur bloc `_meta`, et le script de
chargement **refuse** tout fichier qui en manque.

## Besoins énergétiques

**Équations de Henry (2005)**, dites équations d'Oxford — *Basal metabolic rate studies in humans:
measurement and development of new equations*, Public Health Nutrition 8(7A):1133-1152.

Retenues par l'ANSES et l'EFSA pour estimer le besoin énergétique moyen d'une population saine.
Table conservée dans [`table_henry_2005.xlsx`](./sources/table_henry_2005.xlsx), saisie dans
`src/data/reference/energy-equations.json`.

- **Variante utilisée : poids seul.** Henry publie aussi une variante poids + taille. La taille
  n'entre donc pas dans le calcul énergétique — FR-005 a été amendée en conséquence.
- **Coefficients de niveau d'activité (NAP)** : table officielle transmise le 2026-09-14,
  conservée dans [`coefficients_NAP_ANSES.csv`](./sources/coefficients_NAP_ANSES.csv). La valeur
  retenue pour chaque niveau est **le milieu de son intervalle officiel** ; l'intervalle est conservé
  dans le fichier de référence.

  | Niveau | Intervalle officiel | Retenu |
  |---|---|---|
  | Sédentaire / inactif | 1,40 – 1,59 | 1,50 |
  | Légèrement actif | 1,60 – 1,69 | 1,65 |
  | Modérément actif | 1,70 – 1,89 | 1,80 |
  | Actif / vigoureux | 1,90 – 2,19 | 2,05 |

  La table compte une **cinquième** catégorie (2,20 et plus : travail physique très lourd, athlète à
  l'entraînement quotidien) qui n'est pas proposée, les sportifs de haut niveau étant hors périmètre
  de la spécification. Les descriptions officielles de chaque catégorie sont reprises telles quelles
  dans le formulaire : le choix du niveau pèse directement sur le besoin calculé, l'utilisateur doit
  pouvoir se situer sans ambiguïté.

## Apports de référence en nutriments

**ANSES** — références nutritionnelles en vitamines et minéraux (publication du 21/02/2025), et
actualisation des repères du PNNS pour protéines, lipides, glucides et fibres (avis et rapport de
décembre 2016). Saisis dans `src/data/reference/reference-intakes.json`.

Toutes les références ne sont pas des valeurs absolues par jour, et le modèle le dit explicitement
via la colonne `basis` :

| Forme | Exemple | Conversion |
|---|---|---|
| `absolute` | calcium 950 mg/j | aucune |
| `per_kg` | protéines 0,83 g/kg | × poids corporel |
| `per_mj` | vitamines B1 et B3 | × apport énergétique en MJ |
| `percent_energy` | lipides 35–40 % | via les coefficients d'Atwater |

### Deux écarts assumés, à connaître

**Zinc — ne suit pas l'ANSES.** L'ANSES fait dépendre la RNP du zinc du niveau de phytates de
l'alimentation, et recommande le palier 900 mg/j pour les alimentations végétales. Suivre cette
recommandation ferait dépendre un besoin du régime déclaré, ce que le principe III interdit
formellement. Les valeurs par palier n'étant par ailleurs pas extractibles du rapport source (PDF
image), la référence retenue est le **RDA des DRI** (Institute of Medicine, 2001) : 11 mg/j hommes,
8 mg/j femmes, indépendant du régime. Décision du commanditaire du 2026-09-13.

**Glucides — 40 à 55 % de l'apport énergétique**, retenu par décision du commanditaire le
2026-09-14. Des sources secondaires citent 45–60 % ; la valeur n'a pas pu être recoupée sur le
rapport ANSES de décembre 2016, et **cette provenance secondaire est assumée**. C'est le seul
chiffre de l'application qui ne soit pas adossé à une source primaire vérifiée : si le rapport est
consulté un jour, c'est `src/data/reference/reference-intakes.json` qu'il faut corriger.

## Composition des aliments

**Table Ciqual de l'ANSES**, récupérée par l'**API de Recherche Data Gouv** (entrepôt Dataverse
gouvernemental) sous le DOI `10.57745/RDMHWY`, publiée sous **Licence Ouverte / Open Licence
(Etalab 2.0)**.

`npm run build:foods` construit le catalogue en une commande, sans téléchargement ni décompression
manuels. **La version, la date de publication et la licence viennent de la réponse de l'API**, pas
d'une constante du script : une valeur saisie à la main est invérifiable, et le principe II exige
qu'elle le soit. Elles sont reportées dans `_meta.dataset` du fichier produit. Le script échoue —
sans écrire ni écraser le catalogue — si la source est injoignable, si la licence change, si la
version manque, ou si un fichier téléchargé ne fait pas la taille annoncée.

`--from <répertoire>` rejoue une construction hors ligne depuis des fichiers déjà décompressés ; la
version est alors lue dans le nom des fichiers, et son absence fait échouer la commande. Le mode
hors ligne n'exonère pas de la traçabilité.

**Ce qui vient de CIQUAL** : libellés, classification à quatre niveaux, teneurs.
**Ce qui n'en vient pas** et relève de décisions du projet, à relire comme telles : compatibilités
de régime, exclusions, bornes de quantité, unités d'achat, et les règles de sélection ci-dessous.

### La sélection se fait par classe, pas par quota de sous-groupe

Jusqu'à la feature 003, le catalogue retenait, pour chacun des 18 sous-groupes CIQUAL, les N aliments
**les mieux documentés** — N étant un nombre écrit à la main, sans justification nulle part. Ces
nombres produisaient des résultats faux : le plafond de 5 sur les substituts de produits carnés
coupait le seul aliment convenant aux véganes, à égalité de score avec deux aliments gardés, tout en
retenant son jumeau explicitement non végane. Et le critère lui-même mesurait la qualité de la
donnée, pas la pertinence alimentaire.

La sélection s'appuie désormais sur la **classification de quatrième niveau** (`alim_ssssgrp_code`),
que l'ANSES publie avec la table et maintient. Là où le script ne voyait que « viandes crues », elle
distingue bœuf et veau, porc, poulet, dinde, agneau, gibier et abats ; là où il ne voyait que
« fromages », elle distingue pâte molle, pâte pressée, pâte persillée, fondus et alternatives
végétales.

| Mécanisme | Ce qu'il décide |
|---|---|
| Règle par classe | Retenir ou écarter, avec **motif obligatoire** si écarté |
| Repli au 3ᵉ niveau | 22 % des aliments n'ont pas de 4ᵉ niveau — dont toutes les pommes de terre et tout le tofu |
| Quota par classe | 4 pour une classe fine, 12 pour une classe de repli (« poissons crus » en compte 105 à elle seule) |
| Calendrier ADEME | **La pertinence des fruits et légumes**, que la classification ne subdivise pas |
| Dédoublonnage par espèce | Fusionne les états de cuisson d'un même aliment |

Deux nombres subsistent donc là où il y en avait dix-huit, et ils se distinguent par une propriété de
la donnée — la finesse de la classification — et non par un avis. Ils ne décident plus *quels*
aliments méritent d'être proposés : ils bornent seulement combien de représentants d'une même classe
le catalogue peut porter, pour qu'il reste relisible à la main.

**Les fruits et légumes échappent aux deux.** Leur pertinence est décidée par le calendrier de saison
de l'ADEME : une espèce absente du calendrier n'a aucun mois de disponibilité, donc ne sera jamais
proposée (FR-014) — l'inscrire au catalogue reviendrait à y ajouter un aliment mort. Le catalogue
précédent en comptait huit. La table d'alias est partagée entre le script de construction et celui de
saisonnalité (`scripts/lib/produce-calendar.mjs`) : deux copies divergentes produiraient exactement
l'aliment mort qu'on cherche à éviter.

**Toute classe présente dans le périmètre doit porter une règle**, sans quoi la construction échoue.
C'est ce qui rend un changement de millésime relisible : une classe nouvelle se décide, elle ne se
glisse pas au catalogue. Les règles sont écrites sur des **codes de classe et jamais sur des
libellés** — neuf libellés ont changé entre les millésimes 2020 et 2025 sans qu'aucun code ne bouge.

Les sous-groupes des charcuteries et des boissons ne sont ouverts que pour leurs classes
d'alternatives végétales, chaque classe de charcuterie, de soda et de jus étant écartée nommément.
C'est ce que la sélection par classe rend possible et que les plafonds interdisaient : on ne pouvait
pas prendre la saucisse végétale sans prendre toute la charcuterie.

Particularités de la donnée, traitées par le script :

- deux codes coexistent pour l'énergie et pour les protéines, tous les aliments ne renseignent pas
  le même ;
- `-` signifie « non déterminé » et `traces` vaut zéro ;
- l'énergie manque sur des aliments pourtant bien documentés (l'amande a ses quatre codes énergie à
  `-`) : elle est alors **reconstituée par les coefficients d'Atwater**, comme le fait CIQUAL
  lui-même. 82 aliments sur 281 sont concernés, le compte figure dans le fichier produit ;
- la vitamine A est recomposée en équivalents rétinol (rétinol + β-carotène / 6) ;
- la vitamine K ne retient que la K1, forme sur laquelle porte la référence ANSES ;
- le gluten est détecté **sur le libellé**, ce qui est une heuristique et non une donnée : à revoir
  aliment par aliment avant mise en production ;
- la vitamine E se lit sur le code `53100`, avec repli sur `71010` (alpha-tocophérol) : le millésime
  2025 a basculé vers le second, et sans ce repli la vitamine E manquerait sur 219 aliments ;
- **la vitamine B9 est un écart connu et assumé** : la référence ANSES retenue est de 330 µg en
  *équivalents folates alimentaires*, alors que le catalogue lit le code des *folates totaux*
  (`56700`). Le code des EFA (`56702`) existe mais couvre moins d'aliments, et mélanger les deux dans
  une même colonne serait pire qu'une valeur absente. Question ouverte, antérieure à la feature 003.

### Ce que le millésime 2025 a changé, et qui compte

**Les teneurs en vitamine B12 des algues ont été retirées.** La table 2020 créditait le nori de
38,8 µg/100 g et la dulse de 9,81 ; en 2025 ces valeurs sont « non déterminées ». C'est la question
de la **pseudo-B12** : les corrinoïdes des algues sont des analogues que l'organisme humain
n'assimile pas.

La conséquence est directe. Construit sur la table 2020, le catalogue déclarait **couverte** la
vitamine B12 d'un régime végane, en atteignant le besoin avec de la dulse séchée. C'était faux. Sur
la table 2025, l'écart réapparaît et est signalé à l'utilisateur, ce qui est la bonne réponse. Un
test verrouille la donnée : si un millésime ultérieur réintroduisait ces teneurs, la suite le ferait
voir plutôt que de laisser le solveur s'en servir.

C'est aussi ce qui justifie d'avoir abaissé le seuil de complétude moyenne de 25 à 23 nutriments sur
26 plutôt que de rester sur la 2020 : entre un catalogue plus complet qui se trompe et un catalogue
moins complet qui dit vrai, le principe II ne laisse pas le choix.

**Tofu, tempeh et seitan ont changé de classe** — du sous-groupe des substituts de produits carnés
vers « ingrédients divers », sans quatrième niveau. Ils retombaient donc en « autre », plafonnés à
150 g comme un condiment. Une règle de libellé courte les rattache aux protéines végétales ; elle est
à reconfronter à chaque changement de millésime.

## Saisonnalité

**ADEME / Manger Bouger** — calendrier de saison, France métropolitaine, millésime 2026. Fichier
source conservé dans [`calendrier_fruits_legumes_saison.json`](./sources/calendrier_fruits_legumes_saison.json),
rapproché du catalogue par `scripts/build-seasonality.mjs`.

85 des 93 fruits et légumes du catalogue sont appariés, par nom d'espèce normalisé en correspondance
exacte, complétée par une table d'alias explicite. Aucun rapprochement approximatif : un mois de
saison attribué à tort serait pire qu'un aliment non proposé.

Les 8 restants — banane, mangue, litchi, fruit de la passion, canneberge, citron vert, pissenlit,
pousses de soja — **n'ont aucune saison en France métropolitaine et ne sont donc jamais proposés**.
C'est le comportement attendu de FR-014, pas un oubli.

## Modèle de consommation (feature 004)

**Anses, *Actualisation des repères du PNNS : révision des repères de consommations alimentaires***,
avis et rapport, saisine 2012-SA-0103, décembre 2016 —
<https://www.anses.fr/fr/system/files/NUT2012SA0103Ra-1.pdf>. Saisi dans
`src/data/reference/consumption-model.json`.

Pour actualiser les repères du PNNS, l'ANSES a construit un programme linéaire qui cherche
l'alimentation couvrant les références nutritionnelles **en restant au plus près de ce que les
Français mangent réellement** (enquête INCA 2). La liste d'ingrédients reprend ce modèle : elle
minimisait jusqu'ici sa masse totale, ce qui récompensait les aliments les plus denses par gramme —
quatre ou cinq algues séchées ouvraient toutes les listes, omnivore comprise.

| Paramètre | Origine | Page de l'avis |
|---|---|---|
| Bornes (P5, P95) et moyennes, par sous-groupe et par sexe | Tableau 9 | 73-74 |
| Plafonds épidémiologiques : viande hors volaille 71 g/j, charcuterie 25 g/j | Tableaux 5 et 9 | 31, 73 |
| Limites couplantes (pains, autres féculents, huiles, boissons sucrées) | Tableau 9 | 73-74 |
| Écarts-types | Annexe 6, colonnes du sous-groupe | 80-81 |
| Sens d'optimisation (favoriser, défavoriser, rapprocher de la moyenne) | Tableau 5, § 3.2.2.1 | 31-32 |

Les pages sont celles du pied de page « Page n/82 ». Les valeurs ont été relues sur la mise en page
du PDF, par extraction positionnée des cellules, et plusieurs d'entre elles sont verrouillées par
test. Les eaux de boisson et le sel ne sont pas repris : l'annexe 6 ne leur donne pas d'écart-type,
et le catalogue n'en propose pas.

Chaque aliment du catalogue est rattaché à un sous-groupe par une table nommée
(`_meta.rattachement` de `foods.json`), à partir de sa classe CIQUAL. Deux rattachements suivent
l'ANSES et surprennent : la **pomme de terre** est un féculent, pas un légume ; les **poissons gras**
sont exactement ceux que l'avis nomme (hareng, maquereau, saumon). Les algues n'appartiennent à aucun
sous-groupe consommé en France : elles ne sont plus proposées.

### Écarts assumés au modèle de l'ANSES

- **Régimes végétariens et végans** (FR-310, FR-310a). Le modèle est établi sur une population
  omnivore. Les substituts végétaux sont rattachés au sous-groupe dont ils remplacent l'usage —
  boissons végétales au lait, tofu, tempeh et seitan aux légumineuses ; le seitan, protéine de blé,
  n'est pas une légumineuse. Quand le régime exclut un sous-groupe, ceux qui le remplacent peuvent
  dépasser leur P95 : sans cela, 64 g de légumineuses par jour ne nourrissent pas un végane. Décision
  du commanditaire du 2026-10-04.
- **Âge.** L'ANSES a travaillé sur les hommes de 18 à 64 ans et les femmes de 18 à 54 ans ; les
  paramètres s'appliquent à tous les adultes acceptés par l'application, jusqu'à 70 ans.
- **Contaminants.** Les contraintes de contaminants du modèle reposent sur des données d'exposition
  (EAT 2) que l'application n'a pas : elles sont hors périmètre.
- **Coût d'un manque.** L'ANSES tient les seuils nutritionnels pour durs et n'a rendu flexible que la
  vitamine D (avis, pages 41-42), au poids des autres termes du critère. L'application fait de même :
  la vitamine D reçoit le coût de l'ANSES ; tout autre manque coûte 1 000 fois un écart-type
  d'habitude, ce qui équivaut à un seuil dur sans jamais rendre le modèle infaisable. Le facteur
  1 000 est une décision du projet. Étendre la flexibilité à tout nutriment hors d'atteinte a été
  essayé et mesuré : un nutriment couvrable à 79 % chutait à 25 %.
- **Énergie.** L'ANSES a calibré ses bornes sur un besoin de 2 600 kcal/j pour les hommes et
  2 100 kcal/j pour les femmes (avis, page 13). Les bornes, moyennes, écarts-types et limites
  couplantes sont proportionnés au besoin énergétique du profil : sans cela, 21 listes simulées
  restaient sous leur besoin, les bornes d'un besoin de 2 600 kcal ne permettant pas d'en fournir
  4 400. Les plafonds épidémiologiques (viande hors volaille, charcuterie) restent absolus : ce sont
  des seuils de risque, pas des habitudes.
- **Demi-portion.** Une ligne porte au moins une demi-unité d'achat, ou n'apparaît pas : décision du
  commanditaire du 2026-10-04, faute de référence. Une ligne entre le quart et la demi-unité est
  relevée, une ligne plus petite est retirée.

### Ce que cela change, et qu'il faut savoir lire

**La vitamine D devient un écart pour la plupart des profils**, couverte entre 11 et 38 % selon les profils (médiane 21 %). C'est le
constat de l'ANSES elle-même : la référence « a été construite en ne considérant pas la synthèse
endogène » et « est très difficile à atteindre compte tenu de l'offre et des habitudes de
consommation » ; son propre modèle s'arrête à 5,4 µg/j sur 15. La couverture que la liste affichait
auparavant reposait sur des algues et des quantités que les bornes de l'ANSES interdisent.

**Le repère « cinq fruits et légumes par jour »** n'est plus un plancher imposé : il découle du
critère de l'ANSES, qui favorise fruits et légumes jusqu'à leur P95. Il reste contrôlé par la
simulation (`npm run simulate:plans`).

## Limites de sécurité (feature 004)

**EFSA, *Overview on Tolerable Upper Intake Levels***, version 11 (août 2025) —
<https://www.efsa.europa.eu/sites/default/files/2024-05/ul-summary-report.pdf>. Saisi dans
`src/data/reference/upper-limits.json`, chaque ligne citant l'avis primaire dont la valeur est
issue.

| Nutriment | Limite, adulte | Avis primaire |
|---|---|---|
| Iode | 600 µg/j | SCF (2003) |
| Sélénium | 255 µg/j | EFSA (2023) |
| Zinc | 25 mg/j | SCF (2002) |
| Cuivre | 5 mg/j | SCF (2003) ; DJA de 0,07 mg/kg établie en 2023 |
| Calcium | 2 500 mg/j | EFSA (2012) |
| Vitamine D | 100 µg/j | EFSA (2023) |
| Vitamine B6 | 12 mg/j | EFSA (2023) |
| Vitamine E | 300 mg/j | SCF (2003), révision en cours |
| Rétinol (vitamine A préformée) | 3 000 µg/j | EFSA (2024) |

Ce sont des contraintes dures : la liste ne les dépasse jamais. Avant elles, 15 g de kombu portaient
l'iode à 77 mg/j, 128 fois la limite.

- **Vitamine A** : la limite porte sur le rétinol préformé, pas sur les équivalents rétinol totaux qui
  comptent le bêta-carotène. Le rétinol est donc extrait séparément de CIQUAL (constituant 51200) ;
  sans cela, la limite plafonnerait à tort les carottes.
- **Écartés** : le magnésium, les vitamines B3 et B9, dont la limite ne vise que les compléments ou
  les formes ajoutées ; le fer et le manganèse, pour lesquels l'EFSA ne fixe qu'un niveau d'apport
  sûr, qui « ne peut servir à caractériser un risque ».

Les limites ne sont pas des besoins : elles vivent hors des apports de référence, et le calcul des
besoins ne les lit pas (principe III).

## Ce que l'application ne détient pas

Identité, mots de passe et sessions appartiennent au fournisseur d'identité (Supabase Auth). Aucun
secret d'authentification n'est stocké dans les tables de l'application — principe V, vérifié par
les tests RLS.
