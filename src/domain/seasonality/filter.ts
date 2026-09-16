import type { Food } from '@/domain/types';

/**
 * Sélection des aliments disponibles à la date de consultation (FR-014).
 *
 * La règle ne s'applique qu'aux fruits et légumes: un aliment qui n'en est pas
 * un n'a pas de saison et reste toujours candidat. Pour un fruit ou un légume,
 * l'absence de ligne de saisonnalité pour le mois vaut « hors saison », ce qui
 * rend la règle sûre par défaut.
 */

export function isInSeason(food: Food, seasonalCodes: Set<string>): boolean {
  if (!food.isFruitVegetable) return true;
  return seasonalCodes.has(food.code);
}

export function filterBySeason(foods: Food[], seasonalCodes: Set<string>): Food[] {
  return foods.filter((food) => isInSeason(food, seasonalCodes));
}
