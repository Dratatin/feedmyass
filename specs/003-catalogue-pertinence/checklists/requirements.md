# Specification Quality Checklist: Catalogue d'aliments sélectionné par pertinence

**Purpose**: Valider la complétude et la qualité de la spécification avant le passage au plan
**Created**: 2026-09-17
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

Trois corrections appliquées au fil de la validation, chacune née d'une mesure sur la donnée réelle
plutôt que d'une hypothèse :

1. **Aucun marqueur de clarification n'a été nécessaire.** Les deux inconnues qui en auraient
   justifié un — la source de pertinence et la profondeur de classification disponible — ont été
   tranchées par mesure avant rédaction : INCA 3 écarté sur un taux de rapprochement de 27 %, et la
   classification de quatrième niveau vérifiée présente dans les deux millésimes.

2. **Le premier jet rattachait l'arrivée des alternatives végétales au millésime 2025.** C'était
   faux : le sous-sous-groupe des substituts de charcuteries existe en 2020 avec les mêmes cinq
   aliments, saucisses végétales comprises. Le récit P3 a été ramené à ce qu'il apporte réellement —
   fraîcheur et volume — et le récit P1 est devenu indépendant du changement de source, ce qui
   satisfait l'exigence de récits livrables séparément.

3. **Un cas limite dimensionnant a été ajouté après mesure** : 22 % des candidats ne portent aucune
   classe de quatrième niveau, dont toutes les pommes de terre et tout le tofu. Sans FR-204, la
   spécification aurait laissé passer une règle qui en écarte un cinquième.

Points à surveiller au passage au plan, sans bloquer la spécification :

- **FR-206 et SC-008 ne sont pas chiffrés.** « Permettant la relecture humaine » et « en une session
  de travail » restent qualitatifs. Les chiffrer maintenant reviendrait à réintroduire un nombre
  arbitraire, précisément ce que la feature corrige. Le plan devra en déduire une borne, en la
  motivant.
- **FR-216 et SC-007 supposent une mesure avant/après.** Le catalogue actuel sert de référence : il
  doit être mesuré avant que la sélection ne change, sans quoi la comparaison est perdue.
