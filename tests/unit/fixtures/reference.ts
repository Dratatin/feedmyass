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
