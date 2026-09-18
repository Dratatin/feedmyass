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

## Repère de santé publique

**Au moins cinq fruits et légumes par jour** (PNNS), soit environ 400 g. Utilisé comme plancher par
le solveur : sans lui, minimiser la masse totale écarte presque tous les fruits et légumes, peu
denses en nutriments par gramme. Une liste qui n'en contiendrait qu'un seul trahirait la promesse du
produit.

## Ce que l'application ne détient pas

Identité, mots de passe et sessions appartiennent au fournisseur d'identité (Supabase Auth). Aucun
secret d'authentification n'est stocké dans les tables de l'application — principe V, vérifié par
les tests RLS.
