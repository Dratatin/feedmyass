import { createSupabaseReferenceClient } from '@/lib/supabase';
import type { Food, Nutrient, IntakeKind, ReferenceSex } from '@/domain/types';

/**
 * Accès en lecture aux données de référence.
 *
 * Chaque lecture remonte aussi la source et la version des tables utilisées:
 * c'est ce qui permet de figer `reference_versions` dans chaque résultat et de
 * rendre un résultat reproductible (FR-038, principe II).
 */

export type ReferenceIntake = {
  nutrientCode: string;
  referenceSex: ReferenceSex;
  ageMin: number;
  ageMax: number;
  kind: IntakeKind;
  /** absolute: par jour. per_kg: par kg. per_mj: par MJ. percent_energy: borne basse en % de l'AE. */
  basis: 'absolute' | 'per_kg' | 'per_mj' | 'percent_energy';
  value: number;
  valueMax: number | null;
  source: string;
  version: string;
};

export async function fetchNutrients(): Promise<Nutrient[]> {
  const client = createSupabaseReferenceClient();
  const { data, error } = await client
    .from('nutrients')
    .select('code, label, unit, category, is_priority, display_order')
    .order('display_order');
  if (error) throw new Error('Lecture des nutriments impossible: ' + error.message);
  return (data ?? []).map((row) => ({
    code: row.code,
    label: row.label,
    unit: row.unit,
    category: row.category,
    isPriority: row.is_priority,
    displayOrder: row.display_order,
  }));
}

/** Apports de référence applicables à un sexe de référence et un âge donnés. */
export async function fetchReferenceIntakes(
  referenceSex: ReferenceSex,
  age: number,
): Promise<ReferenceIntake[]> {
  const client = createSupabaseReferenceClient();
  const { data, error } = await client
    .from('reference_intakes')
    .select('nutrient_code, reference_sex, age_min, age_max, kind, basis, value, value_max, source, version')
    .eq('reference_sex', referenceSex)
    .lte('age_min', age)
    .gte('age_max', age);
  if (error) throw new Error('Lecture des apports de référence impossible: ' + error.message);
  return (data ?? []).map((row) => ({
    nutrientCode: row.nutrient_code,
    referenceSex: row.reference_sex,
    ageMin: row.age_min,
    ageMax: row.age_max,
    kind: row.kind,
    basis: row.basis,
    value: Number(row.value),
    valueMax: row.value_max === null ? null : Number(row.value_max),
    source: row.source,
    version: row.version,
  }));
}

/** Aliments candidats, éventuellement restreints aux fruits et légumes du mois. */
export async function fetchFoods(seasonalMonth?: number): Promise<Food[]> {
  const client = createSupabaseReferenceClient();
  const { data, error } = await client
    .from('foods')
    .select('code, label, category, is_fruit_vegetable, is_fortified, diet_tags, excluded_by, composition, min_qty_g, max_qty_g, unit_label, unit_grams');
  if (error) throw new Error('Lecture des aliments impossible: ' + error.message);

  const foods: Food[] = (data ?? []).map((row) => ({
    code: row.code,
    label: row.label,
    category: row.category,
    isFruitVegetable: row.is_fruit_vegetable,
    isFortified: row.is_fortified,
    dietTags: row.diet_tags,
    excludedBy: row.excluded_by,
    composition: row.composition,
    minQtyG: Number(row.min_qty_g),
    maxQtyG: Number(row.max_qty_g),
    unitLabel: row.unit_label,
    unitGrams: Number(row.unit_grams),
  }));

  if (seasonalMonth === undefined) return foods;

  const inSeason = await fetchSeasonalFoodCodes(seasonalMonth);
  // Un fruit ou légume sans ligne de saisonnalité pour ce mois est hors saison
  // et ne doit pas être proposé (FR-014).
  return foods.filter((f) => !f.isFruitVegetable || inSeason.has(f.code));
}

export async function fetchSeasonalFoodCodes(month: number): Promise<Set<string>> {
  const client = createSupabaseReferenceClient();
  const { data, error } = await client.from('seasonality').select('food_code').eq('month', month);
  if (error) throw new Error('Lecture de la saisonnalité impossible: ' + error.message);
  return new Set((data ?? []).map((row) => row.food_code));
}

/** Versions des tables de référence, à figer dans chaque résultat (FR-038). */
export async function fetchReferenceVersions(): Promise<Record<string, string>> {
  const client = createSupabaseReferenceClient();
  const [intakes, foods, seasons] = await Promise.all([
    client.from('reference_intakes').select('source, version').limit(1),
    client.from('foods').select('source, version').limit(1),
    client.from('seasonality').select('source, version').limit(1),
  ]);
  return {
    reference_intakes: intakes.data?.[0]?.version ?? 'inconnue',
    foods: foods.data?.[0]?.version ?? 'inconnue',
    seasonality: seasons.data?.[0]?.version ?? 'inconnue',
  };
}
