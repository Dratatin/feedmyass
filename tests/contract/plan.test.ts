import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/plan/route';
import { buildIngredientPlan } from '@/domain/plan';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import schema from '../../specs/001-nutrition-ingredient-planner/contracts/ingredient-plan.schema.json';
import { foodsFixture, intakesFixture, nutrientsFixture, seasonalCodesByMonth } from '../unit/fixtures/reference';
import type { Profile } from '@/domain/types';

/**
 * Contrat de POST /api/plan et conformité de la sortie au schéma publié
 * (contracts/ingredient-plan.schema.json), qui est le format que consommera le
 * futur service de génération de recettes (FR-037).
 */
const validProfile = { weight_kg: 75, height_cm: 178, age: 35, reference_sex: 'male', activity_level: 'active' };
const validBody = { profile: validProfile, diet: { base: 'omnivore', exclusions: [] }, period: 'day' };

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));

describe('POST /api/plan', () => {
  it('refuse un profil contenant le régime (le régime est un champ séparé)', async () => {
    const response = await post({ ...validBody, profile: { ...validProfile, diet_base: 'vegan' } });
    expect(response.status).toBe(400);
  });

  it('refuse une période inconnue', async () => {
    const response = await post({ ...validBody, period: 'mois' });
    expect(response.status).toBe(400);
  });

  it('refuse un régime de base inconnu', async () => {
    const response = await post({ ...validBody, diet: { base: 'carnivore', exclusions: [] } });
    expect(response.status).toBe(400);
  });

  it('refuse une exclusion inconnue', async () => {
    const response = await post({ ...validBody, diet: { base: 'omnivore', exclusions: ['lait'] } });
    expect(response.status).toBe(400);
  });

  it('refuse un champ inconnu à la racine', async () => {
    const response = await post({ ...validBody, inconnu: true });
    expect(response.status).toBe(400);
  });
});

describe('conformité au schéma IngredientPlan', () => {
  const profile: Profile = { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active' };
  const needs = computeNeeds(profile, { nutrients: nutrientsFixture, intakes: intakesFixture, energy: energyReference });
  const plan = buildIngredientPlan({
    needs: needs.daily,
    nutrients: nutrientsFixture,
    allFoods: foodsFixture,
    seasonalCodes: seasonalCodesByMonth.get(9)!,
    diet: { base: 'omnivore', exclusions: [] },
    period: 'day',
    generatedAt: new Date('2026-09-13T10:00:00Z'),
    referenceVersions: needs.referenceVersions,
    disclaimer: 'Estimation informative.',
  });

  const serialised = JSON.parse(JSON.stringify({
    schema_version: plan.schemaVersion,
    period: plan.period,
    generated_at: plan.generatedAt,
    diet: plan.diet,
    items: plan.items.map((i) => ({
      food_code: i.foodCode, label: i.label, category: i.category,
      quantity_g: i.quantityG, display_quantity: i.displayQuantity,
      ...(i.isSeasonalProduce !== undefined ? { is_seasonal_produce: i.isSeasonalProduce } : {}),
      ...(i.isFortified !== undefined ? { is_fortified: i.isFortified } : {}),
    })),
    coverage: plan.coverage.map((c) => ({
      nutrient: c.nutrient, label: c.label, unit: c.unit, needed: c.needed,
      provided: c.provided, ratio: c.ratio, threshold: c.threshold, meets_threshold: c.meetsThreshold,
    })),
    gaps: plan.gaps,
    reference_versions: plan.referenceVersions,
    disclaimer: plan.disclaimer,
  }));

  it('porte tous les champs obligatoires du schéma', () => {
    for (const field of schema.required) {
      expect(serialised, field).toHaveProperty(field);
    }
  });

  it('respecte les valeurs autorisées du schéma', () => {
    expect(schema.properties.schema_version.const).toBe(serialised.schema_version);
    expect(schema.properties.period.enum).toContain(serialised.period);
    expect(schema.properties.diet.properties.base.enum).toContain(serialised.diet.base);
    for (const entry of serialised.coverage) {
      expect(schema.properties.coverage.items.required.every((f: string) => f in entry)).toBe(true);
      expect(schema.properties.coverage.items.properties.threshold.enum).toContain(entry.threshold);
    }
    for (const item of serialised.items) {
      expect(schema.properties.items.items.required.every((f: string) => f in item)).toBe(true);
      expect(item.quantity_g).toBeGreaterThan(0);
    }
    for (const gap of serialised.gaps) {
      expect(schema.properties.gaps.items.properties.reason.enum).toContain(gap.reason);
    }
  });
});
