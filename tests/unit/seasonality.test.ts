import { describe, expect, it } from 'vitest';
import { filterBySeason, isInSeason } from '@/domain/seasonality/filter';
import { foodsFixture, seasonalCodesByMonth } from './fixtures/reference';

/**
 * Saisonnalité (FR-014, SC-003).
 *
 * Vérifié sur les douze mois: aucun fruit ni légume hors saison ne doit pouvoir
 * être candidat, et les aliments qui ne sont pas des fruits ou légumes ne sont
 * jamais soumis à cette règle.
 */
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('filtrage par saison', () => {
  for (const month of MONTHS) {
    const seasonal = seasonalCodesByMonth.get(month)!;

    it('ne propose aucun fruit ou légume hors saison — mois ' + month, () => {
      const retained = filterBySeason(foodsFixture, seasonal);
      expect(retained.length).toBeGreaterThan(0);

      for (const food of retained) {
        if (food.isFruitVegetable) {
          expect(seasonal.has(food.code)).toBe(true);
        }
      }
    });

    it('conserve tous les aliments hors fruits et légumes — mois ' + month, () => {
      const retained = filterBySeason(foodsFixture, seasonal);
      const nonProduce = foodsFixture.filter((f) => !f.isFruitVegetable);
      expect(retained.filter((f) => !f.isFruitVegetable)).toHaveLength(nonProduce.length);
    });
  }

  it('écarte la tomate en janvier et la conserve en août', () => {
    const tomato = foodsFixture.find((f) => f.label.startsWith('Tomate'))!;
    expect(tomato).toBeDefined();
    expect(isInSeason(tomato, seasonalCodesByMonth.get(1)!)).toBe(false);
    expect(isInSeason(tomato, seasonalCodesByMonth.get(8)!)).toBe(true);
  });

  it('laisse passer un aliment qui n\'est ni fruit ni légume quel que soit le mois', () => {
    const lentil = foodsFixture.find((f) => f.category === 'legumineuse')!;
    expect(lentil.isFruitVegetable).toBe(false);
    for (const month of MONTHS) {
      expect(isInSeason(lentil, seasonalCodesByMonth.get(month)!)).toBe(true);
    }
  });

  it('chaque mois propose au moins dix fruits ou légumes', () => {
    for (const month of MONTHS) {
      const retained = filterBySeason(foodsFixture, seasonalCodesByMonth.get(month)!);
      const produce = retained.filter((f) => f.isFruitVegetable);
      expect(produce.length, 'mois ' + month).toBeGreaterThanOrEqual(10);
    }
  });
});
