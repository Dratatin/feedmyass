import nutrientsJson from '@/data/reference/nutrients.json';
import intakesJson from '@/data/reference/reference-intakes.json';
import type { Nutrient } from '@/domain/types';
import type { ReferenceIntake } from '@/data/repositories/reference';

/**
 * Les tests unitaires travaillent sur les VRAIES données de référence du dépôt,
 * pas sur des valeurs inventées: une erreur de saisie dans un fichier de
 * référence doit faire échouer les tests, pas passer inaperçue (principe II).
 */

export const nutrientsFixture: Nutrient[] = nutrientsJson.nutrients.map((n) => ({
  code: n.code,
  label: n.label,
  unit: n.unit as Nutrient['unit'],
  category: n.category as Nutrient['category'],
  isPriority: n.is_priority,
  displayOrder: n.display_order,
}));

export const intakesFixture: ReferenceIntake[] = intakesJson.reference_intakes.map((i) => ({
  nutrientCode: i.nutrient_code,
  referenceSex: i.reference_sex as ReferenceIntake['referenceSex'],
  ageMin: i.age_min,
  ageMax: i.age_max,
  kind: i.kind as ReferenceIntake['kind'],
  basis: i.basis as ReferenceIntake['basis'],
  value: i.value,
  valueMax: 'value_max' in i ? (i.value_max as number) : null,
  source: 'source' in i ? (i.source as string) : intakesJson._meta.source,
  version: 'version' in i ? (i.version as string) : intakesJson._meta.version,
}));

import foodsJson from '@/data/reference/foods.json';
import seasonalityJson from '@/data/reference/seasonality.json';
import type { DietBase, Exclusion, Food } from '@/domain/types';

export const foodsFixture: Food[] = foodsJson.foods.map((f) => ({
  code: f.code,
  label: f.label,
  category: f.category,
  isFruitVegetable: f.is_fruit_vegetable,
  isFortified: f.is_fortified,
  dietTags: f.diet_tags as DietBase[],
  excludedBy: f.excluded_by as Exclusion[],
  composition: f.composition as Record<string, number>,
  minQtyG: f.min_qty_g,
  maxQtyG: f.max_qty_g,
  unitLabel: f.unit_label,
  unitGrams: f.unit_grams,
}));

/** Codes d'aliments de saison, par mois (1 à 12). */
export const seasonalCodesByMonth: Map<number, Set<string>> = (() => {
  const map = new Map<number, Set<string>>();
  for (let month = 1; month <= 12; month += 1) map.set(month, new Set<string>());
  for (const row of seasonalityJson.seasonality) {
    map.get(row.month)?.add(row.food_code);
  }
  return map;
})();

/** Mois de disponibilité par aliment, pour les rubans de saison (FR-107). */
export const seasonMonthsByFood: Map<string, number[]> = (() => {
  const map = new Map<string, number[]>();
  for (const row of seasonalityJson.seasonality) {
    const months = map.get(row.food_code);
    if (months) months.push(row.month);
    else map.set(row.food_code, [row.month]);
  }
  for (const months of map.values()) months.sort((a, b) => a - b);
  return map;
})();
