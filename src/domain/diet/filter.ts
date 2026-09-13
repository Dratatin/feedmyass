import type { Diet, Food } from '@/domain/types';

/**
 * Sélection des aliments compatibles avec un régime déclaré (FR-013).
 *
 * Deux conditions, et deux seulement: l'aliment doit être marqué compatible avec
 * le régime de base, et ne doit déclencher aucune des exclusions du profil.
 * C'est le SEUL endroit où le régime intervient dans le produit — il ne touche
 * jamais au calcul des besoins (principe III).
 */

export function isCompatibleWithDiet(food: Food, diet: Diet): boolean {
  if (!food.dietTags.includes(diet.base)) return false;
  return !diet.exclusions.some((exclusion) => food.excludedBy.includes(exclusion));
}

export function filterByDiet(foods: Food[], diet: Diet): Food[] {
  return foods.filter((food) => isCompatibleWithDiet(food, diet));
}
