# Specification Quality Checklist: Besoins nutritionnels personnalisés et liste d'ingrédients de saison

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-13
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`

### Itération 1 (2026-09-13)

13 items validés sur 16. Trois items non cochés, tous liés aux mêmes marqueurs
`[NEEDS CLARIFICATION]` portés par FR-016, FR-018 et FR-024.

### Itération 2 (2026-09-13) - clarifications résolues

Les trois questions ont été tranchées par le commanditaire; les marqueurs ont été supprimés et les
exigences réécrites. Il ne reste aucun marqueur dans la spécification.

| Question | Décision | Exigences mises à jour |
|----------|----------|------------------------|
| Q1 - accès sans compte | Mode invité: calcul et liste accessibles sans compte; sauvegarde, préférences et historique réservés aux comptes; rattachement du résultat proposé à la connexion | FR-024, US1 (Independent Test), US3 scénario 6, cas limite invité vers compte, Assumptions (Mode invité) |
| Q2 - objectif de couverture | 100 % pour énergie, protéines et micronutriments prioritaires (fer, calcium, magnésium, B12, D, C); 80 % pour les autres micronutriments; tout écart signalé | FR-016, FR-017, SC-006, Assumptions (Micronutriments prioritaires) |
| Q3 - nutriment non couvrable | Signalement de l'écart + proposition d'aliments enrichis compatibles identifiés comme tels; aucune recommandation de complément ni de posologie | FR-018, US2 scénario 4, Assumptions (Aliments enrichis) |

### Notes sur les items validés

- **No implementation details**: les noms de services (Clerk, Supabase Auth, Auth.js, USDA
  FoodData Central, Open Food Facts, CIQUAL, Figma) n'apparaissent que dans les sections
  Assumptions et Dependencies, en tant que contraintes fournies par le commanditaire et candidats à
  arbitrer en phase de plan. Aucune exigence fonctionnelle ne dépend d'un produit nommé.
- **Success criteria technology-agnostic**: SC-011 formule la contrainte d'authentification déléguée
  comme un résultat vérifiable (aucun secret d'authentification détenu) et non comme un choix
  technique.
- **Conformité constitution**: FR-008 porte le principe III (séparation besoins/régime), FR-010,
  FR-011 et FR-018 le principe IV (information, jamais conseil médical), FR-022 et FR-029 le
  principe V (identité déléguée, minimisation), FR-031 à FR-033 le principe VI (design system,
  responsive, accessibilité).
