import type { Food, NeedValue, Nutrient, PlanGap } from '@/domain/types';
import { solvePlan, thresholdFor, type SolverOutput } from './solver';

/**
 * Relaxation des contraintes infaisables et production des écarts (FR-017, FR-018).
 *
 * Quand aucune combinaison d'aliments ne peut atteindre les seuils, il ne suffit
 * pas de rendre une liste approximative: il faut NOMMER les nutriments en cause
 * et dire pourquoi. C'est la raison d'être du solveur linéaire (R6).
 *
 * La cause est déterminée en comparant ce qui serait atteignable avec des jeux
 * d'aliments de plus en plus larges: si un nutriment devient atteignable en
 * retirant le filtre de régime, c'est le régime qui contraint; en retirant le
 * filtre de saison, c'est la saison; s'il reste inatteignable avec tout le
 * catalogue, aucune source disponible ne permet de le couvrir.
 */

export type RelaxationInput = {
  needs: NeedValue[];
  nutrients: Nutrient[];
  /** Aliments réellement candidats: régime ET saison appliqués. */
  candidates: Food[];
  /** Aliments compatibles avec le régime, saison non appliquée. */
  dietOnly: Food[];
  /** Catalogue complet, aucun filtre. */
  allFoods: Food[];
  periodFactor: number;
};

export type RelaxationOutput = SolverOutput & { gaps: PlanGap[] };

/**
 * Quantité maximale d'un nutriment atteignable avec un jeu d'aliments, chacun
 * poussé à sa borne haute. Borne supérieure théorique, calculée sans solveur.
 */
export function maxAchievable(foods: Food[], nutrientCode: string, periodFactor: number): number {
  return foods.reduce(
    (total, food) => total + ((food.composition[nutrientCode] ?? 0) / 100) * food.maxQtyG * periodFactor,
    0,
  );
}

function reasonFor(
  nutrientCode: string,
  needed: number,
  input: RelaxationInput,
): PlanGap['reason'] {
  const { dietOnly, allFoods, periodFactor } = input;
  if (maxAchievable(allFoods, nutrientCode, periodFactor) < needed) return 'no_source_available';
  if (maxAchievable(dietOnly, nutrientCode, periodFactor) < needed) return 'diet_restriction';
  return 'seasonality_restriction';
}

export function solveWithRelaxation(input: RelaxationInput): RelaxationOutput {
  const { needs, nutrients, candidates, periodFactor } = input;
  const nutrientByCode = new Map(nutrients.map((n) => [n.code, n]));

  const relaxed = new Set<string>();
  const gaps: PlanGap[] = [];

  // Premier passage sans solveur: les nutriments dont même la borne théorique
  // reste sous le seuil sont structurellement hors d'atteinte.
  for (const need of needs) {
    const nutrient = nutrientByCode.get(need.nutrient);
    if (!nutrient) continue;
    const target = need.value * thresholdFor(nutrient);
    const reachable = maxAchievable(candidates, need.nutrient, periodFactor);
    if (reachable < target) {
      relaxed.add(need.nutrient);
      gaps.push({
        nutrient: need.nutrient,
        ratio: need.value === 0 ? 0 : reachable / need.value,
        reason: reasonFor(need.nutrient, target, input),
      });
    }
  }

  let solution = solvePlan({ needs, nutrients, candidates, periodFactor, relaxed });

  // Second passage: les contraintes restantes peuvent rester incompatibles entre
  // elles (le plafond énergétique borne les quantités). On relâche alors les
  // nutriments les moins prioritaires en premier, un à un.
  if (!solution.feasible) {
    const relaxOrder = [...needs]
      .filter((need) => !relaxed.has(need.nutrient))
      .sort((a, b) => {
        const priority = (need: NeedValue) => {
          const nutrient = nutrientByCode.get(need.nutrient);
          if (!nutrient) return 0;
          return thresholdFor(nutrient) === 1 ? 1 : 0;
        };
        return priority(a) - priority(b);
      });

    for (const need of relaxOrder) {
      relaxed.add(need.nutrient);
      solution = solvePlan({ needs, nutrients, candidates, periodFactor, relaxed });
      if (solution.feasible) {
        gaps.push({
          nutrient: need.nutrient,
          ratio: maxAchievable(candidates, need.nutrient, periodFactor) / (need.value || 1),
          reason: reasonFor(need.nutrient, need.value, input),
        });
        break;
      }
      gaps.push({
        nutrient: need.nutrient,
        ratio: maxAchievable(candidates, need.nutrient, periodFactor) / (need.value || 1),
        reason: reasonFor(need.nutrient, need.value, input),
      });
    }
  }

  return { ...solution, gaps };
}
