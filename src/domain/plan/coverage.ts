import type { CoverageEntry, Food, IngredientPlanItem, NeedValue, Nutrient } from '@/domain/types';
import { thresholdFor } from './solver';

/**
 * Couverture atteinte et mise en forme des quantités (FR-015, FR-016).
 */

/** Apport réellement fourni par la liste, pour un nutriment donné. */
export function providedFor(
  nutrientCode: string,
  quantitiesByFood: Map<string, number>,
  foodByCode: Map<string, Food>,
): number {
  let total = 0;
  for (const [code, grams] of quantitiesByFood) {
    const food = foodByCode.get(code);
    if (!food) continue;
    total += ((food.composition[nutrientCode] ?? 0) / 100) * grams;
  }
  return total;
}

export function computeCoverage(
  needs: NeedValue[],
  nutrients: Nutrient[],
  quantitiesByFood: Map<string, number>,
  foodByCode: Map<string, Food>,
): CoverageEntry[] {
  const nutrientByCode = new Map(nutrients.map((n) => [n.code, n]));

  return needs.map((need) => {
    const nutrient = nutrientByCode.get(need.nutrient);
    const threshold = nutrient ? thresholdFor(nutrient) : 0.8;
    const provided = providedFor(need.nutrient, quantitiesByFood, foodByCode);
    const ratio = need.value === 0 ? 1 : provided / need.value;

    return {
      nutrient: need.nutrient,
      label: need.label,
      unit: need.unit,
      needed: need.value,
      provided,
      ratio,
      threshold,
      // Une tolérance d'un millième absorbe les arrondis du solveur, pas un écart réel.
      meetsThreshold: ratio >= threshold - 0.001,
    };
  });
}

/**
 * Quantité exprimée dans l'unité d'achat de l'aliment (FR-016).
 *
 * Les grammes restent la valeur de référence; l'unité d'achat est un confort de
 * lecture, arrondi au demi-portion près pour rester crédible en magasin.
 */
export function toDisplayQuantity(food: Food, grams: number): { value: number; unit: string } {
  const units = grams / food.unitGrams;
  const rounded = Math.max(0.5, Math.round(units * 2) / 2);
  return { value: rounded, unit: food.unitLabel };
}

export function toPlanItems(
  quantitiesByFood: Map<string, number>,
  foodByCode: Map<string, Food>,
  seasonalCodes: Set<string>,
  /**
   * Mois de disponibilité par aliment. Facultatif: un appelant qui ne les
   * fournit pas obtient un plan valide, simplement sans les rubans par ligne
   * (FR-112 de la 002).
   */
  seasonMonthsByFood?: Map<string, number[]>,
): IngredientPlanItem[] {
  const items: IngredientPlanItem[] = [];

  for (const [code, grams] of quantitiesByFood) {
    const food = foodByCode.get(code);
    if (!food) continue;
    const months = food.isFruitVegetable ? seasonMonthsByFood?.get(food.code) : undefined;
    items.push({
      foodCode: food.code,
      label: food.label,
      category: food.category,
      quantityG: Math.round(grams),
      displayQuantity: toDisplayQuantity(food, grams),
      ...(food.isFruitVegetable ? { isSeasonalProduce: seasonalCodes.has(food.code) } : {}),
      ...(months && months.length > 0 ? { seasonMonths: [...months].sort((a, b) => a - b) } : {}),
      ...(food.isFortified ? { isFortified: true } : {}),
    });
  }

  return items.sort((a, b) => a.category.localeCompare(b.category) || b.quantityG - a.quantityG);
}
