import { describe, expect, it } from 'vitest';
import { filterByDiet, isCompatibleWithDiet } from '@/domain/diet/filter';
import type { Diet, DietBase, Exclusion } from '@/domain/types';
import { foodsFixture } from './fixtures/reference';

/**
 * Compatibilité régime (FR-013, SC-002).
 *
 * Vérifié sur le catalogue réel, pour tous les régimes de base et toutes les
 * combinaisons d'exclusions: aucun aliment incompatible ne doit pouvoir être
 * candidat.
 */
const BASES: DietBase[] = ['omnivore', 'pescetarian', 'vegetarian', 'vegan'];
const EXCLUSIONS: Exclusion[] = ['gluten', 'lactose', 'nuts'];

const allCombinations = (): Diet[] => {
  const diets: Diet[] = [];
  for (const base of BASES) {
    for (let mask = 0; mask < 1 << EXCLUSIONS.length; mask += 1) {
      diets.push({
        base,
        exclusions: EXCLUSIONS.filter((_, i) => (mask & (1 << i)) !== 0),
      });
    }
  }
  return diets;
};

describe('filtrage par régime', () => {
  it('couvre les 32 combinaisons de régime et exclusions', () => {
    expect(allCombinations()).toHaveLength(32);
  });

  for (const diet of allCombinations()) {
    const name = diet.base + (diet.exclusions.length ? ' sans ' + diet.exclusions.join(' ni ') : '');

    it('ne retient aucun aliment incompatible — ' + name, () => {
      const retained = filterByDiet(foodsFixture, diet);
      expect(retained.length).toBeGreaterThan(0);

      for (const food of retained) {
        expect(food.dietTags).toContain(diet.base);
        for (const exclusion of diet.exclusions) {
          expect(food.excludedBy).not.toContain(exclusion);
        }
      }
    });
  }

  it('écarte la viande pour un régime végane', () => {
    const vegan = filterByDiet(foodsFixture, { base: 'vegan', exclusions: [] });
    expect(vegan.some((f) => f.category === 'viande')).toBe(false);
    expect(vegan.some((f) => f.category === 'poisson')).toBe(false);
    expect(vegan.some((f) => f.category === 'produit_laitier')).toBe(false);
  });

  it('conserve le poisson pour un régime pescétarien mais pas la viande', () => {
    const pesce = filterByDiet(foodsFixture, { base: 'pescetarian', exclusions: [] });
    expect(pesce.some((f) => f.category === 'poisson')).toBe(true);
    expect(pesce.some((f) => f.category === 'viande')).toBe(false);
  });

  it('écarte les aliments marqués gluten quand l\'exclusion est déclarée', () => {
    const withGluten = foodsFixture.filter((f) => f.excludedBy.includes('gluten'));
    expect(withGluten.length).toBeGreaterThan(0);
    const filtered = filterByDiet(foodsFixture, { base: 'omnivore', exclusions: ['gluten'] });
    expect(filtered.some((f) => f.excludedBy.includes('gluten'))).toBe(false);
  });

  it('juge chaque aliment individuellement de la même façon que le filtre', () => {
    const diet: Diet = { base: 'vegetarian', exclusions: ['lactose'] };
    const filtered = new Set(filterByDiet(foodsFixture, diet).map((f) => f.code));
    for (const food of foodsFixture) {
      expect(isCompatibleWithDiet(food, diet)).toBe(filtered.has(food.code));
    }
  });
});
