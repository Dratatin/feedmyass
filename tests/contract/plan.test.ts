import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/plan/route';
import { buildIngredientPlan } from '@/domain/plan';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import schema from '../../specs/001-nutrition-ingredient-planner/contracts/ingredient-plan.schema.json';
import { foodsFixture, intakesFixture, nutrientsFixture, seasonalCodesByMonth, seasonMonthsByFood } from '../unit/fixtures/reference';
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
    seasonMonthsByFood,
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
      ...(i.seasonMonths !== undefined ? { season_months: i.seasonMonths } : {}),
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

  /**
   * Ajout du schéma 1.1.0 (FR-107, FR-112 de la 002): le ruban de saison par
   * ingrédient n'est affichable que si le plan transporte les mois. Le champ
   * n'a de sens que pour les aliments soumis à saisonnalité — un ruban sur une
   * lentille sèche serait un mensonge.
   */
  it('porte les mois de disponibilité des seuls fruits et légumes', () => {
    const produce = serialised.items.filter(
      (item: { is_seasonal_produce?: boolean }) => item.is_seasonal_produce !== undefined,
    );
    expect(produce.length).toBeGreaterThan(0);

    for (const item of produce) {
      expect(item, item.label).toHaveProperty('season_months');
      expect(item.season_months.length).toBeGreaterThan(0);
      for (const month of item.season_months) {
        expect(Number.isInteger(month)).toBe(true);
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
      }
      // Le plan est généré en septembre: un fruit ou légume retenu y est de saison.
      expect(item.season_months).toContain(9);
    }

    for (const item of serialised.items) {
      if (item.is_seasonal_produce === undefined) {
        expect(item, item.label).not.toHaveProperty('season_months');
      }
    }
  });
});
