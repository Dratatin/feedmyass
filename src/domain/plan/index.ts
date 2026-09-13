import type { Diet, Food, IngredientPlan, NeedValue, Nutrient, Period } from '@/domain/types';
import { filterByDiet } from '@/domain/diet/filter';
import { filterBySeason } from '@/domain/seasonality/filter';
import { computeCoverage, toPlanItems } from './coverage';
import { solveWithRelaxation } from './relax';

export * from './solver';
export * from './relax';
export * from './coverage';

/**
 * Assemblage de la liste d'ingrédients (FR-012 à FR-018, FR-037).
 *
 * La sortie respecte contracts/ingredient-plan.schema.json: c'est le format
 * stable que le futur service de génération de recettes consommera sans refonte.
 */

export type PlanInput = {
  needs: NeedValue[];
  nutrients: Nutrient[];
  allFoods: Food[];
  seasonalCodes: Set<string>;
  diet: Diet;
  period: Period;
  generatedAt: Date;
  referenceVersions: Record<string, string>;
  disclaimer?: string;
};

export function buildIngredientPlan(input: PlanInput): IngredientPlan {
  const { needs, nutrients, allFoods, seasonalCodes, diet, period, generatedAt } = input;

  // Deux filtres, dans cet ordre: le régime décide ce qui est mangeable, la
  // saison décide ce qui est disponible. Les deux jeux intermédiaires servent
  // ensuite à expliquer les écarts.
  const dietOnly = filterByDiet(allFoods, diet);
  const candidates = filterBySeason(dietOnly, seasonalCodes);

  const periodFactor = period === 'week' ? 7 : 1;
  const { quantitiesByFood, gaps } = solveWithRelaxation({
    needs,
    nutrients,
    candidates,
    dietOnly,
    allFoods,
    periodFactor,
  });

  const foodByCode = new Map(allFoods.map((f) => [f.code, f]));
  const coverage = computeCoverage(needs, nutrients, quantitiesByFood, foodByCode);
  const items = toPlanItems(quantitiesByFood, foodByCode, seasonalCodes);

  return {
    schemaVersion: '1.0.0',
    period,
    generatedAt: generatedAt.toISOString(),
    diet,
    items,
    coverage,
    // Un écart n'est retenu que s'il se vérifie sur la couverture réelle: un
    // nutriment relâché mais finalement couvert n'a pas à être signalé.
    gaps: gaps.filter((gap) => !coverage.find((c) => c.nutrient === gap.nutrient)?.meetsThreshold),
    referenceVersions: input.referenceVersions,
    ...(input.disclaimer ? { disclaimer: input.disclaimer } : {}),
  };
}
