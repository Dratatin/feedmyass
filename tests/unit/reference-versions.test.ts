import { describe, expect, it } from 'vitest';
import { computeNeeds } from '@/domain/needs';
import { buildIngredientPlan } from '@/domain/plan';
import { energyReference } from '@/data/reference/energy';
import nutrientsJson from '@/data/reference/nutrients.json';
import intakesJson from '@/data/reference/reference-intakes.json';
import foodsJson from '@/data/reference/foods.json';
import seasonalityJson from '@/data/reference/seasonality.json';
import energyJson from '@/data/reference/energy-equations.json';
import type { Profile } from '@/domain/types';
import { foodsFixture, intakesFixture, nutrientsFixture, seasonalCodesByMonth } from './fixtures/reference';

/**
 * Traçabilité (FR-038, principe II).
 *
 * Deux garanties: tout fichier de référence porte sa source et sa version, et
 * tout résultat produit fige les versions utilisées. Sans cela, un résultat
 * enregistré aujourd'hui deviendrait inexplicable après une mise à jour des
 * données.
 */
const profile: Profile = { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active' };

describe('métadonnées des fichiers de référence', () => {
  const files = [
    ['nutrients.json', nutrientsJson._meta],
    ['reference-intakes.json', intakesJson._meta],
    ['foods.json', foodsJson._meta],
    ['seasonality.json', seasonalityJson._meta],
    ['energy-equations.json', energyJson._meta],
  ] as const;

  for (const [name, meta] of files) {
    it(name + ' porte source, version et date de récupération', () => {
      expect(meta.source, 'source').toBeTruthy();
      expect(meta.version, 'version').toBeTruthy();
      expect(meta.retrieved_at, 'retrieved_at').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  }

  it('cite une source officielle identifiable pour les valeurs nutritionnelles', () => {
    expect(intakesJson._meta.source).toContain('ANSES');
    expect(foodsJson._meta.source).toContain('Ciqual');
    expect(energyJson._meta.source).toContain('Henry');
  });

  it('documente la licence de la table de composition', () => {
    expect(foodsJson._meta.source).toContain('Licence Ouverte');
  });
});

describe('versions figées dans les résultats', () => {
  const needs = computeNeeds(profile, { nutrients: nutrientsFixture, intakes: intakesFixture, energy: energyReference });

  it('les besoins portent les versions utilisées', () => {
    expect(Object.keys(needs.referenceVersions).length).toBeGreaterThan(0);
    expect(needs.referenceVersions.energy_equations).toBe(energyJson._meta.version);
    expect(needs.referenceVersions.reference_intakes).toBeTruthy();
  });

  it('la liste d\'ingrédients porte les mêmes versions', () => {
    const plan = buildIngredientPlan({
      needs: needs.daily,
      nutrients: nutrientsFixture,
      allFoods: foodsFixture,
      seasonalCodes: seasonalCodesByMonth.get(9)!,
      diet: { base: 'omnivore', exclusions: [] },
      period: 'day',
      generatedAt: new Date('2026-09-13T10:00:00Z'),
      referenceVersions: needs.referenceVersions,
    });
    expect(plan.referenceVersions).toEqual(needs.referenceVersions);
  });

  it('chaque besoin cite la référence dont il provient (FR-009)', () => {
    for (const need of needs.daily) {
      expect(need.reference.source, need.nutrient).toBeTruthy();
      expect(need.reference.version, need.nutrient).toBeTruthy();
    }
  });

  it('le zinc cite sa source propre, distincte du reste du fichier', () => {
    const zinc = needs.daily.find((n) => n.nutrient === 'zinc');
    expect(zinc?.reference.source).toContain('DRI');
    const iron = needs.daily.find((n) => n.nutrient === 'iron');
    expect(iron?.reference.source).toContain('ANSES');
  });
});
