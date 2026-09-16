# Revue de conformité à la constitution

**Feature**: 001-nutrition-ingredient-planner | **Revue du**: 2026-09-14
**Référence**: [.specify/memory/constitution.md](../../../.specify/memory/constitution.md) v1.0.0

Revue exigée par la tâche T074 et par la section « Revue avant fusion » de la constitution.
Chaque principe est confronté à une **preuve exécutable** quand il en existe une : une affirmation
sans test n'est pas une preuve.

## I. Spécification d'abord (SDD)

- [x] Le cycle `specify → plan → tasks → implement` a été suivi dans l'ordre, avec revue à chaque porte.
- [x] Les divergences constatées en cours de route ont été résolues **en amendant la spécification**,
      jamais en laissant le code et la spec se contredire. Quatre amendements datés :
      FR-005 (la taille n'entre pas dans le calcul), `contracts/api.md` pour `POST /api/plan`
      (profil et régime séparés au lieu d'un `needs_token`), `contracts/api.md` pour
      `POST /api/results` (disparition de `/api/results/claim`), et R8 (abandon du stockage serveur
      des résultats invités).
- [x] Chaque amendement porte sa raison, pas seulement son contenu.

## II. Exactitude nutritionnelle traçable (NON NÉGOCIABLE)

- [x] Toute valeur affichée provient d'une source officielle identifiée : ANSES, DRI (zinc), Henry
      2005 (énergie), CIQUAL (composition), ADEME (saisonnalité). Recensées dans
      [docs/sources.md](../../../docs/sources.md).
- [x] Les cinq fichiers de référence portent `source`, `version` et `retrieved_at` — **vérifié par
      test** (`tests/unit/reference-versions.test.ts`).
- [x] Le script de chargement **refuse** tout fichier qui en manque, et valide tous les fichiers
      avant la moindre écriture.
- [x] Chaque résultat fige les versions utilisées (FR-038) — vérifié par test.
- [x] Les équations sont couvertes par **dix profils de contrôle calculés à la main** depuis la table
      publiée, écrits en dur : une erreur de saisie dans le fichier de référence fait échouer le test.
- [x] Aucune valeur n'a été inventée pour combler un trou. Les deux manques réels sont documentés :
      l'énergie absente de CIQUAL sur 82 aliments est **reconstituée par les coefficients d'Atwater**
      (calcul, pas invention), et le zinc suit les DRI faute de valeurs ANSES extractibles.

*Mises à jour du 2026-09-14* :

- **Coefficients NAP : réserve levée.** La table officielle a été fournie ; les valeurs retenues
  sont le milieu de chaque intervalle publié, et les dix profils de contrôle ont été recalculés à
  la main en conséquence.
- **Glucides : réserve close par décision.** L'intervalle 40–55 % est retenu sur décision du
  commanditaire. Sa provenance reste secondaire et non recoupée sur le rapport ANSES : c'est le
  seul chiffre de l'application dans ce cas, et il est tracé comme tel dans le fichier de
  référence et dans `docs/sources.md`. Le principe II demande une source identifiée et une valeur
  traçable — les deux conditions sont remplies, la traçabilité incluant ici l'aveu de la limite.

## III. Séparation stricte besoins / régime (NON NÉGOCIABLE)

Le principe est verrouillé à **quatre niveaux**, chacun vérifié :

- [x] **Types** : `Profile` ne porte aucun champ de régime. `computeNeeds(profile, references)` ne
      reçoit rien d'autre.
- [x] **Contrat HTTP** : `profileSchema` est `.strict()`, donc `POST /api/needs` rejette toute
      requête portant `diet` ou `diet_base` — vérifié par test de contrat sur les quatre régimes.
- [x] **Comportement** : test d'invariant (`tests/unit/needs-diet-invariant.test.ts`) qui glisse un
      champ de régime dans le profil et exige des besoins identiques.
- [x] **Interface** : l'écran de profil ne demande pas le régime ; il est demandé sur l'écran de
      liste. Le test e2e relève les valeurs affichées avant et après un passage en végane et exige
      qu'elles soient identiques (SC-004).
- [x] Un écart avec l'ANSES a été assumé plutôt que de violer ce principe : le zinc (voir II).

## IV. Information, jamais conseil médical

- [x] Aucun diagnostic, aucune prescription, aucun objectif de poids : le modèle de données ne
      permet pas de les exprimer.
- [x] Mention visible sur **tout** écran de résultat, centralisée dans `DisclaimerBanner` pour
      qu'aucun écran ne puisse l'oublier ou la reformuler.
- [x] Les situations particulières (grossesse, allaitement, pathologie, minorité) sont nommées et
      renvoyées vers un professionnel de santé.
- [x] FR-018 se limite aux **aliments enrichis** : aucune recommandation de complément ni de
      posologie, conformément à l'arbitrage Q3.
- [x] Un profil hors des tranches d'âge publiées est **refusé** (`profile_out_of_scope`) plutôt
      qu'extrapolé.

## V. Identité déléguée et minimisation des données personnelles

- [x] Aucun mot de passe ni hash dans les tables de l'application : Supabase Auth gère identité,
      sessions et cookies.
- [x] Cloisonnement par RLS, **vérifié contre la vraie base** (`tests/contract/rls.test.ts`, 8 tests) :
      lecture, suppression et insertion au nom d'autrui sont toutes refusées.
- [x] Historique immuable, doublement verrouillé : absence de politique `update` **et** trigger de
      refus qui fait barrage même avec la clé service role — vérifié.
- [x] Export et suppression de compte fonctionnels, suppression vérifiée en base par le test e2e.
- [x] La clé service role n'est utilisée qu'à un seul endroit, la suppression de compte, qui exige
      un privilège d'administration.
- [x] Le stockage serveur des résultats invités a été **abandonné** précisément parce qu'il aurait
      exposé des données de santé à l'énumération (R8 révisée).

## VI. Direction visuelle maison d'abord, responsive et accessible

*Réévalué le 2026-09-17 (feature `002-refonte-visuelle`): le design system Figma « BDD de composants
de base » est abandonné. Les deux premiers points portaient sur les relevés Figma; ils sont
remplacés par ceux de la direction « Encre & Saison ».*

- [x] Tous les composants de `src/components/ds` sont composés à partir des tokens de
      `src/styles/tokens.css`, eux-mêmes dérivés de `docs/design-system.md`. Aucune couleur, taille
      ni rayon codé en dur dans un composant — vérifié par recherche des motifs `#`, `rgb(` et des
      classes de couleur non tokenisées.
- [x] Chaque composant sans équivalent (`CheckboxField`, `MonthRibbon`, `CoverageMeter`,
      `KeyFigures`, `Vignette`, `FamilyDot`, `PageShell`) porte la **justification écrite** exigée
      par ce principe.
- [x] Chaque couleur portant du texte a son **ratio de contraste mesuré et consigné** à côté de sa
      définition; le plus serré est à 4,5:1.
- [x] Aucun état n'est signalé par la seule couleur: sous le seuil, de saison et famille d'aliment
      portent chacun un mot.
- [x] Responsive de 320 px à 1920 px sans défilement horizontal de la page — vérifié sur tous les
      écrans, tableaux confinés à leur propre conteneur défilable.
- [x] **Zéro violation WCAG 2.1 AA** sur les cinq écrans, mesuré par axe-core aux deux largeurs.
- [x] Navigation au clavier vérifiée dans l'ordre visuel des champs.

## Portes qualité de la constitution

| Test rendu obligatoire | Fichier | État |
|---|---|---|
| Invariant besoins / régime | `tests/unit/needs-diet-invariant.test.ts` | ✅ |
| Conformité aux sources officielles | `tests/unit/needs-reference.test.ts` | ✅ 10 profils |
| Compatibilité régime de chaque ingrédient | `tests/unit/diet-compatibility.test.ts` | ✅ 32 combinaisons |
| Saisonnalité sur les douze mois | `tests/unit/seasonality.test.ts` | ✅ 12 mois |

## Résultat

**Conforme.** Aucune réserve bloquante. Le seul point d'attention résiduel est la provenance
secondaire de l'intervalle des glucides, assumée et tracée.

Vérifications à la date de la revue : `tsc`, `eslint`, `next build`, **163 tests unitaires et de
contrat**, **60 tests de bout en bout** aux deux largeurs.
