# Feature Specification: Refonte visuelle « Encre & Saison »

**Feature Branch**: `002-refonte-visuelle`

**Created**: 2026-09-17

**Status**: Validée (maquette approuvée le 2026-09-17, amendée par la revue du 2026-09-18)

**Input**: User description: "Le design actuel, composé à partir du design system Figma « BDD de composants de base », ne convient pas. Produire une nouvelle direction visuelle à partir du contenu existant du site et des spécifications, la valider sur maquette, puis l'implémenter. La direction doit être chaleureuse et joviale. Retirer les spécifications de design Figma et les remplacer par celles de la nouvelle direction."

## Contexte

La version 001 a livré un parcours complet (besoins, liste d'ingrédients, compte) habillé des tokens et
composants extraits du Figma « BDD de composants de base ». Le résultat est une interface générique —
violet et gris neutres, tout en cartes arrondies — qui ne dit rien du produit et que le commanditaire
rejette.

Cette feature ne change AUCUN calcul, AUCUNE donnée et AUCUN parcours. Elle change ce que l'utilisateur
voit, et la règle qui gouverne ce qu'il verra ensuite. Elle emporte l'abandon du design system Figma,
acté par l'amendement 2.0.0 de la constitution.

**Direction retenue**: « Encre & Saison » — papier kraft, encre brou de noix, couleurs empruntées au
potager. Maquette de référence validée le 2026-09-17, reproduite dans `docs/design-system.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lire ses besoins dans un registre (Priority: P1)

Une personne arrive sur ses besoins nutritionnels: 26 lignes de chiffres. Elle doit pouvoir repérer
l'essentiel en un coup d'œil (énergie, protéines, métabolisme de base), puis descendre dans le détail
nutriment par nutriment sans se perdre, et savoir pour chaque valeur d'où elle vient.

**Why this priority**: c'est l'écran qui justifie le produit. Si les chiffres ne se lisent pas, rien
d'autre ne compte.

**Independent Test**: afficher `/besoins` avec un profil quelconque; les trois chiffres clés sont
visibles sans défilement sur un écran de 1280 px, et chaque ligne du registre porte sa valeur, son
unité, la nature de la référence et sa source.

**Acceptance Scenarios**:

1. **Given** un profil calculé, **When** l'écran des besoins s'affiche, **Then** l'énergie, les
   protéines et le métabolisme de base apparaissent en chiffres clés au-dessus du registre.
2. **Given** le registre affiché, **When** l'utilisateur parcourt les lignes, **Then** la ligne
   d'énergie se distingue visuellement des autres, toutes les valeurs sont alignées sur la virgule et
   la nature de la référence (RNP, AS, BEM) est lisible sans survol.
3. **Given** un écran de 320 px, **When** le registre déborde, **Then** il défile dans son propre
   conteneur, atteignable au clavier, sans faire défiler la page.

---

### User Story 2 - Voir ce qui est de saison (Priority: P1)

L'utilisateur doit comprendre, sans l'avoir lu nulle part, que la liste d'ingrédients dépend du mois
où il consulte. Le mois en cours et la période de disponibilité de chaque fruit ou légume doivent être
visibles.

**Why this priority**: la saisonnalité est la promesse distinctive du produit (FR-014 de la 001). Elle
était jusqu'ici invisible: rien à l'écran ne disait que la liste changerait en novembre.

**Independent Test**: afficher `/liste` en septembre; le ruban des douze mois marque septembre, et
chaque fruit ou légume de la liste affiche ses propres mois de disponibilité.

**Acceptance Scenarios**:

1. **Given** n'importe quel écran du parcours, **When** il s'affiche, **Then** le ruban des douze mois
   est présent et le mois en cours y est mis en évidence.
2. **Given** une liste générée, **When** l'utilisateur lit une ligne de fruit ou de légume, **Then** il
   voit les mois où cet aliment est disponible, mois en cours compris.
3. **Given** un aliment non soumis à saisonnalité (céréale, légumineuse, œuf), **When** il apparaît dans
   la liste, **Then** il porte la mention « toute l'année » et non un ruban vide.
4. **Given** un utilisateur de lecteur d'écran, **When** il atteint un ruban, **Then** il entend les mois
   nommés en toutes lettres, pas une suite d'initiales.

---

### User Story 3 - Savoir où l'on en est dans le parcours (Priority: P2)

Le parcours compte trois étapes (profil, besoins, ingrédients). L'utilisateur doit voir en permanence
laquelle il occupe, lesquelles sont franchies, et pouvoir revenir en arrière.

**Why this priority**: la 001 n'avait aucune navigation — chaque écran était une impasse dont on ne
sortait que par les boutons du bas.

**Independent Test**: sur chacun des trois écrans, l'étape en cours est distinguée des deux autres et
les étapes franchies sont marquées comme telles.

**Acceptance Scenarios**:

1. **Given** l'écran des besoins, **When** il s'affiche, **Then** l'étape « Besoins » est marquée en
   cours et l'étape « Profil » marquée franchie.
2. **Given** le rail de parcours, **When** l'utilisateur navigue au clavier, **Then** les trois étapes
   sont atteignables dans l'ordre et l'étape en cours est annoncée comme telle.

---

### User Story 4 - Distinguer ce qui est couvert de ce qui ne l'est pas (Priority: P2)

Sur la liste d'ingrédients, l'utilisateur doit voir d'un coup d'œil quels nutriments atteignent leur
seuil et lesquels restent en dessous, sans lire 26 pourcentages.

**Why this priority**: FR-016 et FR-017 de la 001 imposent d'afficher la couverture et de nommer les
écarts; encore faut-il que l'écart se voie.

**Independent Test**: générer une liste végane; les nutriments sous leur seuil sont identifiables sans
lire les chiffres.

**Acceptance Scenarios**:

1. **Given** une couverture affichée, **When** un nutriment est sous son seuil, **Then** sa jauge, son
   étiquette d'état et sa couleur le signalent — la couleur n'étant jamais le seul indice.
2. **Given** une jauge de couverture, **When** elle s'affiche, **Then** le seuil applicable (80 % ou
   100 %) est matérialisé sur l'échelle, à sa position réelle.

---

### Edge Cases

- Une liste ne contenant aucun fruit ni légume de saison (régime très contraint en février) n'affiche
  aucun ruban par ligne: le bandeau du rail reste la seule indication du mois.
- Un aliment disponible les douze mois affiche un ruban entièrement teinté plutôt qu'un ruban vide.
- Les polices de la direction sont servies depuis le domaine de l'application; si elles ne se chargent
  pas, la pile de repli garde l'interface lisible et la mise en page stable.
- Aucun écran ne dépend d'une couleur pour transmettre une information: chaque état porte aussi un mot.

## Requirements *(mandatory)*

### Exigences de direction visuelle

- **FR-101**: Chaque écran DOIT être composé à partir des tokens et des composants de la direction
  « Encre & Saison » documentée dans `docs/design-system.md`. Aucune valeur visuelle (couleur, taille,
  rayon, graisse) NE DOIT apparaître dans un composant sans passer par un token.
- **FR-102**: La création d'un composant nouveau DOIT être justifiée par écrit dans le fichier du
  composant, en nommant ce qu'il apporte que les composants existants ne couvrent pas.
- **FR-103**: Tout couple texte/fond de l'interface DOIT atteindre au moins 4,5:1 (WCAG 2.1 AA, texte
  courant). Le ratio mesuré DOIT être consigné à côté de la définition du token.
- **FR-104**: La couleur NE DOIT jamais être le seul véhicule d'une information: tout état signalé par
  une couleur DOIT l'être aussi par un mot, une forme ou une position.
- **FR-105**: Les familles typographiques DOIVENT être servies depuis le domaine de
  l'application, sans requête vers un tiers au chargement de la page.

### Exigences d'écran

- **FR-106**: Le ruban des douze mois DOIT figurer sur tout écran du parcours et mettre en évidence le
  mois de consultation.
- **FR-107**: Chaque fruit ou légume de la liste d'ingrédients DOIT afficher ses mois de disponibilité;
  les aliments non soumis à saisonnalité DOIVENT porter une mention explicite à la place.
- **FR-108**: L'écran des besoins DOIT présenter l'énergie, les protéines et le métabolisme de base en
  chiffres clés avant le registre détaillé.
- **FR-109**: Le parcours en trois étapes DOIT être visible sur chacun de ses écrans, avec l'étape en
  cours et les étapes franchies distinguées.
- **FR-110**: Chaque nutriment de la couverture DOIT afficher une jauge où le seuil applicable est
  matérialisé à sa position réelle sur l'échelle.
- **FR-111**: Chaque ingrédient DOIT porter l'indication visuelle de sa famille (légume, fruit,
  céréale, légumineuse, œufs et laitiers, fruits à coque, matières grasses), accompagnée de son nom.

### Exigences de données

- **FR-112**: Le plan d'ingrédients DOIT exposer, pour chaque aliment soumis à saisonnalité, la liste
  de ses mois de disponibilité. L'ajout DOIT être rétrocompatible avec les consommateurs du schéma
  existant.

### Exigences de traçabilité documentaire

- **FR-113**: Les spécifications, le plan et les tâches de la feature 001 NE DOIVENT plus prescrire le
  design system Figma; les références correspondantes DOIVENT renvoyer à la présente direction.
- **FR-114**: L'Annexe A de la spécification 001 (33 nœuds Figma) DOIT être conservée comme trace
  historique, explicitement marquée comme abandonnée et sans valeur prescriptive.

### Retours de revue du 2026-09-18

Trois retours sur la direction, et trois constats tirés du parcours refait à la main.

- **FR-117**: Aucune famille typographique manuscrite. La direction s'en tient à deux familles
  (titres et interface, cette dernière servant aussi aux données par son axe monospace).
- **FR-118**: Un fond coloré NE DOIT jamais être borné par la largeur de page: il occupe toute la
  largeur de la fenêtre et centre son contenu à l'intérieur.
- **FR-119**: La largeur de contenu utile DOIT être d'au moins 1500 px sur grand écran.
- **FR-120**: Aucune action mise en avant NE DOIT mener à un écran qui refuse de répondre à ce
  qu'elle promet. En particulier, « voir ce qui est de saison » mène à des produits de saison, pas à
  une demande de profil.
- **FR-121**: Un écran de résultat vide DOIT conserver la navigation du parcours: c'est au moment où
  l'utilisateur ne sait pas où il en est qu'elle lui sert le plus.
- **FR-122**: Revenir au formulaire de profil DOIT restituer la dernière saisie de la visite. Corriger
  un poids ne DOIT pas obliger à ressaisir les cinq champs.
- **FR-123**: Lorsque les commandes de régime ou de période ne correspondent plus à la liste affichée,
  l'écart DOIT être signalé explicitement.

### Invariants préservés (non négociables)

- **FR-115**: Cette feature NE DOIT modifier aucune valeur nutritionnelle, aucune formule, aucun libellé
  de champ ni aucun parcours fonctionnel de la 001. Les tests unitaires, de contrat et de bout en bout
  existants DOIVENT passer sans modification de leurs assertions fonctionnelles.
- **FR-116**: La mention non médicale (FR-010 de la 001) DOIT rester visible sur tout écran de résultat.

### Key Entities

- **Token de direction**: une valeur visuelle nommée (couleur, taille de texte, interligne, rayon),
  définie une seule fois, accompagnée de son ratio de contraste quand elle porte du texte.
- **Saison**: hiver, printemps, été, automne. Teinte les mois du ruban; c'est la seule structure
  colorée du calendrier.
- **Famille d'aliment**: les sept catégories affichées dans la liste, chacune associée à une teinte et
  à un libellé.
- **Mois de disponibilité**: pour un aliment soumis à saisonnalité, l'ensemble des mois où il est
  proposé.

## Success Criteria *(mandatory)*

- **SC-101**: Aucune violation WCAG 2.1 AA relevée par axe-core sur les cinq écrans couverts par les
  tests d'accessibilité.
- **SC-102**: Aucun défilement horizontal de la page de 320 px à 1920 px, tableaux exceptés dans leur
  conteneur.
- **SC-103**: Les tests unitaires, de contrat, d'accessibilité, de responsive et de performance de la
  001 passent sans qu'aucune assertion fonctionnelle ait été modifiée.
- **SC-104**: Aucune occurrence de valeur visuelle codée en dur hors `src/styles/tokens.css` — vérifiable
  par recherche des motifs `#`, `rgb(` et `px` dans `src/components` et `src/app`, hors valeurs
  géométriques justifiées.
- **SC-105**: Le budget de 3 secondes d'affichage des résultats (SC-010 de la 001) reste tenu, polices
  comprises.
- **SC-106**: Plus aucune prescription Figma dans `.specify/memory/constitution.md` ni dans
  `specs/001-nutrition-ingredient-planner/`.

## Assumptions

- La refonte porte sur l'habillage et la composition; aucune fonctionnalité n'est ajoutée ni retirée.
- Le thème sombre n'est pas au périmètre: l'application reste en thème clair, les tokens étant
  structurés pour qu'un thème sombre puisse être ajouté sans les redéfinir.
- Les libellés de champs, titres et textes de boutons de la 001 sont conservés à l'identique: ils sont
  les points d'ancrage des tests de bout en bout.
- Les familles typographiques (Fraunces, Recursive) sont disponibles sous licence libre
  et embarquées au build.
- L'extension du schéma du plan d'ingrédients est additive: un consommateur du schéma 1.0.0 continue de
  fonctionner sans modification.

## Hors périmètre

- Thème sombre.
- Illustrations pour les 281 aliments du catalogue: seules les familles et une poignée de produits de
  saison sont illustrées.
- Refonte des contenus rédactionnels au-delà des ajustements rendus nécessaires par la mise en page.
- Animation et micro-interactions au-delà des états de survol et de focus.
