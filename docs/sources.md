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

**Glucides — intervalle à confirmer.** 40–55 % de l'apport énergétique retenu ; des sources
secondaires citent 45–60 %. À vérifier sur le rapport ANSES de décembre 2016.

## Composition des aliments

**Table Ciqual 2020 de l'ANSES** (`XML_2020_07_07`), <https://ciqual.anses.fr>, publiée en open data
sous **Licence Ouverte / Open Licence (Etalab)** — licence confirmée sur data.gouv.fr.

Catalogue de 281 aliments extrait par `scripts/build-foods-from-ciqual.mjs`, reproductible.

**Ce qui vient de CIQUAL** : libellés, classification en sous-groupes, teneurs.
**Ce qui n'en vient pas** et relève de décisions du projet, à relire comme telles : compatibilités
de régime, exclusions, bornes de quantité, unités d'achat.

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
  aliment par aliment avant mise en production.

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
