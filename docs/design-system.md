# Direction visuelle « Encre & Saison »

Référence unique du design de FeedMyAss, au sens du principe VI de la constitution. Elle remplace le
design system Figma « BDD de composants de base », abandonné le 2026-09-17 (amendement 2.0.0).

- **Maquette de référence**: <https://claude.ai/artifact/55D5aGm3VAFjb872ALg5Lp> (v2, validée le
  2026-09-17, amendée par la revue du 2026-09-18). Six écrans: accueil, profil, besoins, liste
  d'ingrédients, connexion, espace personnel.
- **Implémentation des tokens**: `src/styles/tokens.css`. Ce fichier est la seule source de valeurs
  visuelles du code; ce document est la seule source du fichier.

## L'idée

Le produit n'est pas une application de recettes, c'est un registre: des références officielles d'un
côté, un calendrier de saison de l'autre. La direction assume les deux — la rigueur d'une table de
composition, la chaleur d'un étal de marché.

*Revue du 2026-09-19*: la direction est passée au **fond sombre**. La maquette lue en thème sombre
était jugée plus lisible et plus harmonieuse que sa version claire; les rôles des jetons n'ont pas
bougé, leurs valeurs si. Le thème clair n'est plus maintenu.

Trois décisions en découlent:

1. **Le fond est brun sombre, l'encre est claire.** Aucun gris neutre dans l'interface: les fonds
   tirent vers le brou de noix, les textes vers le papier kraft.
2. **La couleur dit quelque chose ou n'est pas là.** Le vert dit « de saison » ou « seuil atteint », le
   miel « sous le seuil », la framboise « refusé », la myrtille « action ». Les teintes de saison et de
   famille d'aliment encodent des catégories réelles du domaine.
3. **Les chiffres sont des chiffres.** Registres sans cartouche, filets fins, chasses tabulaires, unités
   en retrait. Un tableau de 26 nutriments doit se lire, pas se décorer.

## Couleurs

Chaque ligne indique le ratio de contraste mesuré. Les valeurs portant du texte atteignent au moins
4,5:1 (WCAG 2.1 AA, texte courant). **Modifier une couleur sans recalculer son ratio casse les tests
axe-core.**

### Encre et fonds

| Token | Valeur | Emploi | Contraste |
| --- | --- | --- | --- |
| `ink` | `#F5E8D5` | Titres, texte courant | 14,8:1 sur `paper` |
| `ink-soft` | `#D3BDA2` | Texte secondaire, descriptions | 9,9:1 sur `paper` |
| `ink-muted` | `#B39C81` | Légendes, unités, étiquettes | 6,8:1 sur `paper`, 5,3:1 sur `line-soft` |
| `paper` | `#1D1610` | Fond de page | — |
| `paper-deep` | `#17110C` | Bandes: rail, étal | — |
| `surface` | `#271E16` | Blocs encadrés, champs | — |
| `band` | `#140F0A` | En-tête, ardoise du marché | — |
| `line` | `#46372A` | Filets d'encadrement | décoratif |
| `line-soft` | `#362A20` | Filets entre lignes de tableau | décoratif |
| `line-strong` | `#85705A` | Bordure des champs de saisie | 3,5:1 (WCAG 1.4.11) |

### Couleurs de sens

| Token | Valeur | Signification | Contraste |
| --- | --- | --- | --- |
| `brand` (myrtille) | `#9FB0EF` | Action, lien, focus, ligne d'énergie | 8,5:1 sur `paper`, 6,6:1 sur `brand-wash` |
| `brand-hover` | `#C2CDF7` | Survol d'une action — sur fond sombre, l'emphase va vers le clair | — |
| `brand-wash` | `#232A4A` | Fond d'une action ou d'une ligne mise en avant | — |
| `saison` (basilic) | `#8CC97C` | De saison, seuil atteint | 9,2:1 sur `paper`, 7,2:1 sur `saison-wash` |
| `saison-wash` | `#1E3018` | Fond des états « de saison » | — |
| `miel` | `#E0AA53` | Sous le seuil, précaution, mention non médicale | 8,6:1 sur `paper`, 7,0:1 sur `miel-wash` |
| `miel-wash` | `#362614` | Fond des avertissements | — |
| `framboise` | `#F0899F` | Refus de saisie, erreur, suppression | 7,5:1 sur `paper`, 6,7:1 sur `framboise-wash` |
| `framboise-wash` | `#3A1620` | Fond des erreurs | — |

### Les quatre saisons

Le ruban des douze mois prend la teinte de la saison du mois. Ce n'est pas un ornement: décembre n'a pas
la couleur de juillet parce qu'on n'y mange pas la même chose.

| Saison | Mois | Teinte | Fond |
| --- | --- | --- | --- |
| Hiver | 12, 1, 2 | `#93AEC6` | `#1C2831` |
| Printemps | 3, 4, 5 | `#8CC97C` | `#1E3018` |
| Été | 6, 7, 8 | `#EFA171` | `#372015` |
| Automne | 9, 10, 11 | `#E0AA53` | `#362614` |

### Familles d'aliments

Une pastille ou un pictogramme précède chaque ingrédient, **toujours accompagné du nom de la famille
en toutes lettres** — la couleur ne porte jamais seule l'information (principe VI).

Les pictogrammes viennent de **Lucide** (<https://lucide.dev>, licence ISC), un par famille: carotte,
pomme, épi, haricot, œuf, noix, gouttes. *Revue du 2026-09-19*: huit vignettes dessinées à la main
couvraient auparavant une poignée de produits sur 281, ce qui donnait un catalogue illustré au
hasard. Une banque officielle et une icône par famille valent mieux qu'un demi-bestiaire.

| Famille | Teinte | Contraste sur `surface` |
| --- | --- | --- |
| Légumes | `#8CC97C` | 8,4:1 |
| Fruits | `#F0899F` | 6,8:1 |
| Céréales | `#DCAE52` | 8,0:1 |
| Légumineuses | `#D09A68` | 6,6:1 |
| Œufs et laitiers | `#C79AD6` | 7,0:1 |
| Fruits à coque | `#D29777` | 6,6:1 |
| Matières grasses | `#B3C063` | 8,3:1 |

## Typographie

Deux familles, trois rôles. Servies depuis le domaine de l'application par `next/font` — aucune
requête vers un tiers au chargement (FR-105).

*Revue du 2026-09-18*: une troisième famille manuscrite (Caveat) portait les annotations de
l'ardoise du marché. Elle est retirée — le procédé vieillissait la page. Le caractère de l'ardoise
vient désormais de la display et de sa légère inclinaison.

| Rôle | Famille | Réglage | Emploi |
| --- | --- | --- | --- |
| Titres | **Fraunces** | `SOFT 60`, `WONK 1`, graisse 800 | `h1`, `h2`, chiffres clés, titres de blocs. Nulle part ailleurs. Le titre de l'accueil monte à `display-xl` (72 px): c'est la seule phrase de l'application qui doit porter à travers la pièce. |
| Interface | **Recursive** | `CASL 0.55`, `MONO 0` | Tout le texte courant, boutons, champs, libellés |
| Données | **Recursive** | `MONO 1`, `CASL 0.3` | Chiffres, unités, codes RNP/AS/BEM, mois, en-têtes de tableau |

Les axes `SOFT` et `WONK` de Fraunces sont ce qui lui donne ses formes un peu bancales: sans eux, c'est
une autre police. L'axe `CASL` de Recursive fait toute la différence entre un ton administratif et un
ton amical.

**Échelle** — `display-lg` 3rem · `display-md` 2,25rem · `display-sm` 1,75rem · `display-xs` 1,375rem ·
`xl` 1,25rem · `lg` 1,125rem · `md` 1rem · `sm` 0,875rem · `xs` 0,75rem. Les tailles display portent un
crénage négatif (-0,015 à -0,025em) et un interligne serré; les tailles de contenu respirent (1,55 à
1,7). Les étiquettes en capitales portent `tracking-label` (0,14em): la graisse ne suffit pas à les
poser.

## Géométrie

- **Rayons**: 10 px sur les blocs et les champs larges, 6 px sur les champs et les petites cases,
  999 px sur les boutons et les étiquettes. Les boutons en gélule sont un marqueur de la direction.
- **Filets**: 1,5 px. Un filet d'encre (2 px) sous l'en-tête d'un registre, un filet clair entre les
  lignes.
- **Mouvement**: une seule durée (220 ms) et une seule courbe
  (`cubic-bezier(0.2, 0, 0, 1)`, départ net et arrivée en douceur), déclarées en jetons et
  appliquées d'office à tout ce qui réagit au pointeur. Les propriétés animées sont fermées à une
  liste — couleur, fond, bordure, opacité, transformation: animer `all` ferait glisser des hauteurs
  et des largeurs sans qu'on l'ait demandé. Le contour de focus en est exclu: il apparaît au moment
  exact où le clavier arrive. Sous `prefers-reduced-motion`, les durées tombent à zéro et les états
  restent.
- **Aucune ombre portée dans l'interface.** La hiérarchie vient des fonds et des filets. Seule la
  maquette de présentation en emploie, pour détacher les écrans de la page qui les montre.
- **Grille**: rail de 17rem + colonne principale, jusqu'à 760 px de large où le rail passe au-dessus.
- **Largeur de page**: 1520 px de contenu utile (`--container-page`). Les registres font quatre
  colonnes dont une porte un ruban de douze cases: en dessous, ils se serrent sans raison.
- **Hauteur**: le contenu occupe au minimum la hauteur de la fenêtre. `body` est une colonne flex,
  les gabarits d'écran prennent `flex-1`, et la colonne de paille du rail descend jusqu'en bas.
- **Les fonds ne sont jamais bornés par la largeur de page.** Une bande colorée — en-tête, rail,
  étal — occupe toute la largeur de la fenêtre et centre son contenu à l'intérieur. Un fond qui
  s'arrête au bord du conteneur centré se lit comme un bloc coupé.

## Composants

### Structure

| Composant | Rôle |
| --- | --- |
| `PageShell` | Rail + colonne principale, bascule en une colonne sous 760 px |
| `StepRail` | Parcours en trois étapes: en cours cerclée d'encre, franchies marquées d'un ✓ |
| `SiteHeader` | Bandeau sombre: marque, mois en cours dans la couleur de sa saison, navigation et état de connexion |

### Affichage

| Composant | Rôle |
| --- | --- |
| `Register` | Tableau sans cartouche, en-têtes en capitales, conteneur défilant focusable |
| `KeyFigures` | Chiffres clés en Fraunces, l'énergie sur fond myrtille |
| `MonthRibbon` | Ruban des douze mois teinté par saison, mois en cours plein |
| `CoverageMeter` | Jauge avec le seuil applicable matérialisé à sa position réelle sur l'échelle |
| `Pill` | Étiquette d'état: de saison, sous le seuil, neutre |
| `FamilyDot` | Pastille de famille d'aliment, toujours suivie du nom de la famille |
| `FoodIcon` | Pictogramme de famille (Lucide), dans la couleur de la famille |
| `Notice` | Message encadré: information, précaution, saison |
| `Panel` | Bloc encadré. Réservé aux formulaires et aux blocs d'action |

### Saisie

| Composant | Rôle |
| --- | --- |
| `Button` | `primary` (une par écran), `secondary`, `danger` |
| `InputField` | Champ de saisie avec libellé, aide et état de refus |
| `SelectField` | Sélecteur, mêmes métriques que `InputField` |
| `CheckboxField` | Case à cocher avec libellé associé |
| `PeriodToggle` | Bascule jour / semaine, en gélule |

## Gestes au survol

Chacun dit quelque chose; aucun n'est là pour faire joli.

| Élément | Geste | Pourquoi |
| --- | --- | --- |
| Boutons et liens-boutons | Fond et filet éclaircis, élévation de 2 px, enfoncement de 1 px au clic | Suggérer le relief dans une direction qui s'interdit l'ombre portée |
| Liens de navigation, étapes du rail | Fond qui se teinte, texte qui s'éclaircit | Distinguer la cible sous le pointeur des cibles voisines |
| Cases du ruban des mois | La case prend la couleur pleine de sa saison et grandit de 12 % | Un aperçu de ce à quoi ressemblera le mois une fois choisi |
| Champs de saisie | Bordure éclaircie | Dire qu'on peut écrire là, avant même le focus |
| Lignes de registre | Fond teinté, curseur inchangé | Aide à la lecture sur quatre colonnes; la ligne n'est pas cliquable et ne doit pas le laisser croire |
| Liens porteurs d'une flèche | La flèche avance de 5 px | « Ça continue par là », mieux que la couleur seule. Seul déplacement de toute l'interface, et il porte sur un glyphe isolé, pas sur un bloc de texte |

**Aucune transformation géométrique PERMANENTE sur un élément porteur de texte.** Le navigateur
rastérise les glyphes puis étire ou fait pivoter le résultat: une transformation qui ne se termine
jamais laisse son texte flou pour toujours, et les blocs voisins promus avec elle perdent leur
lissage sous-pixel. L'ardoise du marché était inclinée de 0,7° en permanence; c'était la source du
flou signalé à la revue du 2026-09-20, et elle a été redressée.

**Au survol, en revanche, la transformation est admise**: le geste dure 220 ms et se termine sur un
nombre entier de pixels ou à l'échelle 1. C'est le seul endroit de la direction où la géométrie
bouge, et cela reste mesuré — 2 px d'élévation, 12 % d'agrandissement, pas davantage.

**Piège**, pour le jour où une transformation reviendrait: la liste des propriétés en transition
doit alors contenir `translate`, `scale` et `rotate` en plus de `transform`. Tailwind v4 n'écrit
plus les déplacements dans `transform` mais dans ces propriétés individuelles; les omettre laisse
les couleurs fondre pendant que les mouvements sautent. Le défaut est invisible à qui compare l'état
de départ et l'état d'arrivée — il faut échantillonner la valeur PENDANT le survol et vérifier
qu'elle passe par des valeurs intermédiaires.

**Ce qui ne bouge pas**: les cartes de produits du calendrier et de l'étal. Elles ne sont pas
cliquables — leur donner un état de survol promettrait une action qui n'existe pas.

## Règles de composition

1. **Une action primaire par écran.** Tout le reste est secondaire.
2. **Tout n'est pas un bloc encadré.** Un encadrement signifie « objet séparé sur lequel on agit ».
   Les tableaux et les listes de résultats se posent directement sur le papier.
3. **Les chiffres s'alignent.** Chasses tabulaires partout où des nombres se superposent en colonne,
   unité en retrait et en `ink-muted`.
4. **Le ruban des mois est présent sur tout écran du parcours.** C'est le fil qui rappelle que la
   réponse dépend de la date.
5. **Un fond déborde toujours de la largeur de page.** Une bande colorée va d'un bord à l'autre de la
   fenêtre et centre son contenu; seule la lecture est bornée, jamais la couleur.
6. **Aucun état signalé par la seule couleur.** Une jauge sous son seuil porte aussi le mot « sous le
   seuil »; une pastille de famille porte aussi son nom.
7. **Un ruban ou une jauge est une image porteuse de sens**: exposée aux lecteurs d'écran avec un texte
   de remplacement qui nomme les mois ou le pourcentage, jamais une suite d'initiales.

## Ce que la direction ne fait pas

- Pas de thème clair. La direction est sombre depuis le 2026-09-19; `color-scheme: dark` est déclaré
  pour que les contrôles natifs suivent.
- Pas d'illustration par aliment: sept pictogrammes de familles, et rien de plus.
- Pas d'animation au-delà des états de survol et de focus.
