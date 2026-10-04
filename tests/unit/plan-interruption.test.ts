import { describe, expect, it, vi } from 'vitest';

/**
 * Une résolution interrompue n'est jamais un écart (feature 004, FR-319).
 *
 * La version précédente lisait chaque interruption comme « ce nutriment est
 * inatteignable » et fabriquait des écarts. Ici le solveur borné est remplacé par
 * un double qui s'interrompt toujours: le calcul doit échouer franchement.
 */
const solveBounded = vi.fn(() => ({ feasible: false, valeurs: {}, interrompu: true }));
vi.mock('@/domain/plan/bounded-solve', () => ({ solveBounded }));

describe('résolution interrompue', () => {
  it('lève PlanComputationError après le second essai, sans produire de liste', async () => {
    const { buildIngredientPlan, PlanComputationError } = await import('@/domain/plan');
    const { computeNeeds } = await import('@/domain/needs');
    const { energyReference } = await import('@/data/reference/energy');
    const fixtures = await import('./fixtures/reference');
    const profile = { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male' as const, activityLevel: 'active' as const };
    const needs = computeNeeds(profile, {
      nutrients: fixtures.nutrientsFixture, intakes: fixtures.intakesFixture, energy: energyReference,
    });

    const run = () => buildIngredientPlan({
      needs: needs.daily,
      nutrients: fixtures.nutrientsFixture,
      allFoods: fixtures.foodsFixture,
      seasonalCodes: fixtures.seasonalCodesByMonth.get(9)!,
      diet: { base: 'omnivore', exclusions: [] },
      period: 'day',
      referenceSex: 'male',
      subgroups: fixtures.consumptionModelFixture,
      upperLimits: fixtures.upperLimitsFixture,
      generatedAt: new Date('2026-10-04T10:00:00Z'),
      referenceVersions: {},
    });

    expect(run).toThrow(PlanComputationError);
    // Deux essais, le second à une autre précision et avec des coûts perturbés.
    expect(solveBounded).toHaveBeenCalledTimes(2);
  });
});
