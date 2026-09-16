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

Trois décisions en découlent:

1. **Le papier est kraft, l'encre est brune.** Aucun gris neutre dans l'interface. Les fonds tirent
   vers la paille, les textes vers le brou de noix.
2. **La couleur dit quelque chose ou n'est pas là.** Le vert dit « de saison » ou « seuil atteint », le
   miel « sous le seuil », la framboise « refusé », la myrtille « action ». Les teintes de saison et de
   famille d'aliment encodent des catégories réelles du domaine.
3. **Les chiffres sont des chiffres.** Registres sans cartouche, filets fins, chasses tabulaires, unités
   en retrait. Un tableau de 26 nutriments doit se lire, pas se décorer.

## Couleurs

Chaque ligne indique le ratio de contraste mesuré. Les valeurs portant du texte atteignent au moins
4,5:1 (WCAG 2.1 AA, texte courant). **Modifier une couleur sans recalculer son ratio casse les tests
axe-core.**

### Encre et papier

| Token | Valeur | Emploi | Contraste |
| --- | --- | --- | --- |
| `ink` | `#2A1C12` | Titres, texte courant, barre de navigation | 16,0:1 sur `surface` |
| `ink-soft` | `#5C4633` | Texte secondaire, descriptions | 8,6:1 sur `surface` |
| `ink-muted` | `#715C49` | Légendes, unités, étiquettes | 6,1:1 sur `surface`, 5,1:1 sur `paper-deep` |
| `paper` | `#FBF2E2` | Fond de page | — |
| `paper-deep` | `#F3E6CC` | Fond du rail, de l'étal | — |
| `surface` | `#FFFBF3` | Fond des blocs encadrés, des champs | — |
| `line` | `#E0CFAE` | Filets d'encadrement | décoratif |
| `line-soft` | `#EFE3CC` | Filets entre lignes de tableau | décoratif |
| `line-strong` | `#A2885E` | Bordure des champs de saisie | 3:1 (WCAG 1.4.11) |

### Couleurs de sens

| Token | Valeur | Signification | Contraste |
| --- | --- | --- | --- |
| `brand` (myrtille) | `#3A4FA0` | Action, lien, focus, ligne d'énergie | 7,3:1 sur `surface`, 6,1:1 sur `brand-wash` |
| `brand-deep` | `#2A3A7C` | Survol d'une action | — |
| `brand-wash` | `#E5E8F6` | Fond d'une action ou d'une ligne mise en avant | — |
| `saison` (basilic) | `#34702A` | De saison, seuil atteint | 5,8:1 sur `surface`, 5,1:1 sur `saison-wash` |
| `saison-wash` | `#E8F0DC` | Fond des états « de saison » | — |
| `miel` | `#8E5C0A` | Sous le seuil, précaution, mention non médicale | 5,5:1 sur `surface`, 4,8:1 sur `miel-wash` |
| `miel-wash` | `#F7EBD2` | Fond des avertissements | — |
| `framboise` | `#B0244A` | Refus de saisie, erreur, suppression | 6,4:1 sur `surface`, 5,4:1 sur `framboise-wash` |
| `framboise-wash` | `#FAE3E7` | Fond des erreurs | — |

### Les quatre saisons

Le ruban des douze mois prend la teinte de la saison du mois. Ce n'est pas un ornement: décembre n'a pas
la couleur de juillet parce qu'on n'y mange pas la même chose.

| Saison | Mois | Teinte | Fond |
| --- | --- | --- | --- |
| Hiver | 12, 1, 2 | `#41586B` | `#DEE6EC` |
| Printemps | 3, 4, 5 | `#34702A` | `#E8F0DC` |
| Été | 6, 7, 8 | `#B4501A` | `#FBE4D2` |
| Automne | 9, 10, 11 | `#8E5C0A` | `#F7EBD2` |

### Familles d'aliments

Une pastille colorée précède chaque ingrédient, **toujours accompagnée du nom de la famille en toutes
lettres** — la couleur ne porte jamais seule l'information (principe VI).

| Famille | Teinte | Contraste sur `surface` |
| --- | --- | --- |
| Légumes | `#34702A` | 5,8:1 |
| Fruits | `#B0244A` | 6,4:1 |
| Céréales | `#8A6208` | 5,3:1 |
| Légumineuses | `#8A5B2A` | 5,6:1 |
| Œufs et laitiers | `#6B3F7A` | 7,8:1 |
| Fruits à coque | `#8A4B2A` | 6,5:1 |
| Matières grasses | `#5D6A1A` | 5,7:1 |

## Typographie

Deux familles, trois rôles. Servies depuis le domaine de l'application par `next/font` — aucune
requête vers un tiers au chargement (FR-105).

*Revue du 2026-09-18*: une troisième famille manuscrite (Caveat) portait les annotations de
l'ardoise du marché. Elle est retirée — le procédé vieillissait la page. Le caractère de l'ardoise
vient désormais de la display et de sa légère inclinaison.

| Rôle | Famille | Réglage | Emploi |
| --- | --- | --- | --- |
| Titres | **Fraunces** | `SOFT 60`, `WONK 1`, graisse 800 | `h1`, `h2`, chiffres clés, titres de blocs. Nulle part ailleurs. |
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
- **Aucune ombre portée dans l'interface.** La hiérarchie vient des fonds et des filets. Seule la
  maquette de présentation en emploie, pour détacher les écrans de la page qui les montre.
- **Grille**: rail de 17rem + colonne principale, jusqu'à 760 px de large où le rail passe au-dessus.
- **Largeur de page**: 1520 px de contenu utile (`--container-page`). Les registres font quatre
  colonnes dont une porte un ruban de douze cases: en dessous, ils se serrent sans raison.
- **Les fonds ne sont jamais bornés par la largeur de page.** Une bande colorée — en-tête, rail,
  étal — occupe toute la largeur de la fenêtre et centre son contenu à l'intérieur. Un fond qui
  s'arrête au bord du conteneur centré se lit comme un bloc coupé.

## Composants

### Structure

| Composant | Rôle |
| --- | --- |
| `PageShell` | Rail + colonne principale, bascule en une colonne sous 760 px |
| `StepRail` | Parcours en trois étapes: en cours cerclée d'encre, franchies marquées d'un ✓ |
| `SiteHeader` | Barre d'encre, marque avec vignette, état de connexion |

### Affichage

| Composant | Rôle |
| --- | --- |
| `Register` | Tableau sans cartouche, en-têtes en capitales, conteneur défilant focusable |
| `KeyFigures` | Chiffres clés en Fraunces, l'énergie sur fond myrtille |
| `MonthRibbon` | Ruban des douze mois teinté par saison, mois en cours plein |
| `CoverageMeter` | Jauge avec le seuil applicable matérialisé à sa position réelle sur l'échelle |
| `Pill` | Étiquette d'état: de saison, sous le seuil, neutre |
| `FamilyDot` | Pastille de famille d'aliment, toujours suivie du nom de la famille |
| `Vignette` | Huit dessins de produits, en SVG, dans les couleurs des familles |
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

- Pas de thème sombre en v1. Les tokens sont structurés pour qu'il puisse être ajouté sans les
  redéfinir, mais l'application reste en thème clair.
- Pas d'illustration pour les 281 aliments du catalogue: huit vignettes de produits de saison et sept
  pastilles de familles.
- Pas d'animation au-delà des états de survol et de focus.
