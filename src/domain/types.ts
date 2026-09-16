/**
 * Types du coeur métier. Ce module ne dépend ni de Next.js ni de Supabase:
 * c'est la frontière que le futur service de génération de recettes réutilisera
 * telle quelle (FR-037).
 */

export type ReferenceSex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'low_active' | 'active' | 'very_active';
export type DietBase = 'omnivore' | 'pescetarian' | 'vegetarian' | 'vegan';
export type Exclusion = 'gluten' | 'lactose' | 'nuts';
export type Period = 'day' | 'week';
export type NutrientCategory = 'energy' | 'macro' | 'vitamin' | 'mineral';
export type IntakeKind = 'RNP' | 'AS' | 'BEM';
export type NutrientCode = string;

/**
 * Profil physiologique.
 *
 * PRINCIPE III (non négociable): aucun champ de régime ici. Le calcul des
 * besoins reçoit ce type et rien d'autre, ce qui rend structurellement
 * impossible d'écrire un calcul influencé par le régime (FR-008).
 */
export type Profile = {
  weightKg: number;
  heightCm: number;
  age: number;
  referenceSex: ReferenceSex;
  activityLevel: ActivityLevel;
};

/** Régime déclaré. N'intervient que dans la sélection des ingrédients (FR-013). */
export type Diet = {
  base: DietBase;
  exclusions: Exclusion[];
};

export type Nutrient = {
  code: NutrientCode;
  label: string;
  unit: 'kcal' | 'g' | 'mg' | 'µg';
  category: NutrientCategory;
  isPriority: boolean;
  displayOrder: number;
};

export type NeedValue = {
  nutrient: NutrientCode;
  label: string;
  value: number;
  /** Borne haute, pour les références exprimées en intervalle (lipides, glucides). */
  valueMax?: number;
  unit: string;
  kind: IntakeKind;
  reference: { source: string; version: string };
};

export type Needs = {
  daily: NeedValue[];
  weekly: NeedValue[];
  /** Nutriments du référentiel sans apport de référence applicable. */
  missingReferences: string[];
  referenceVersions: Record<string, string>;
};

export type Food = {
  code: string;
  label: string;
  category: string;
  isFruitVegetable: boolean;
  isFortified: boolean;
  dietTags: DietBase[];
  excludedBy: Exclusion[];
  /** Apports pour 100 g, indexés par code nutriment. */
  composition: Record<NutrientCode, number>;
  minQtyG: number;
  maxQtyG: number;
  unitLabel: string;
  unitGrams: number;
};

export type CoverageEntry = {
  nutrient: NutrientCode;
  label: string;
  unit: string;
  needed: number;
  provided: number;
  ratio: number;
  /** 1 pour l'énergie, les protéines et les micronutriments prioritaires; 0,8 sinon (FR-016). */
  threshold: 1 | 0.8;
  meetsThreshold: boolean;
};

export type PlanGap = {
  nutrient: NutrientCode;
  ratio: number;
  reason: 'diet_restriction' | 'seasonality_restriction' | 'no_source_available';
};

export type IngredientPlanItem = {
  foodCode: string;
  label: string;
  category: string;
  quantityG: number;
  displayQuantity: { value: number; unit: string };
  isSeasonalProduce?: boolean;
  isFortified?: boolean;
};

/** Conforme à contracts/ingredient-plan.schema.json (version 1.0.0). */
export type IngredientPlan = {
  schemaVersion: '1.0.0';
  period: Period;
  generatedAt: string;
  diet: Diet;
  items: IngredientPlanItem[];
  coverage: CoverageEntry[];
  gaps: PlanGap[];
  referenceVersions: Record<string, string>;
  disclaimer?: string;
};
