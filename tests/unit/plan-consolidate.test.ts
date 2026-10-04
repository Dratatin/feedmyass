import { describe, expect, it, vi } from 'vitest';
import { consolidate, PlanComputationError, withoutImpossibleLines } from '@/domain/plan';
import type { Food } from '@/domain/types';

/**
 * Consolidation de la liste (feature 004, FR-322 à FR-324, research R7).
 *
 * Jouée sur un solveur simulé: ce qui est testé ici, c'est la règle — une
 * variante par famille, zéro ou au moins une demi-unité — et sa terminaison, pas
 * le programme linéaire.
 */

const food = (code: string, family: string, unitGrams = 100): Food => ({
  code, label: code, category: 'x', isFruitVegetable: false, isFortified: false,
  dietTags: ['omnivore'], excludedBy: [], composition: {}, minQtyG: 0, maxQtyG: 400,
  unitLabel: 'portion', unitGrams, ansesSubgroup: 'g', family, isSubstitute: false,
});

describe('consolidation', () => {
  it('ne garde que la variante la plus abondante d\'une famille', () => {
    const laitA = food('lait-a', 'lait');
    const laitB = food('lait-b', 'lait');
    const solve = vi.fn((pool: Food[]) => {
      const codes = new Set(pool.map((f) => f.code));
      return new Map(codes.has('lait-b') ? [['lait-a', 400], ['lait-b', 300]] : [['lait-a', 400]]);
    });
    const result = consolidate([laitA, laitB], solve);
    expect([...result.keys()]).toEqual(['lait-a']);
  });

  it('relève à la demi-unité une ligne au-delà du quart d\'unité', () => {
    const poisson = food('poisson', 'poisson');
    const solve = vi.fn((_pool: Food[], minimums: Map<string, number>) =>
      new Map([['poisson', minimums.get('poisson') ?? 30]]));
    const result = consolidate([poisson], solve);
    expect(result.get('poisson')).toBe(50);
  });

  it('retire une ligne en deçà du quart d\'unité', () => {
    const sesame = food('sesame', 'sesame');
    const pain = food('pain', 'pain');
    const solve = vi.fn((pool: Food[]) =>
      new Map(pool.some((f) => f.code === 'sesame') ? [['sesame', 5], ['pain', 200]] : [['pain', 200]]));
    const result = consolidate([sesame, pain], solve);
    expect(result.has('sesame')).toBe(false);
    expect(result.get('pain')).toBe(200);
  });

  it('retire les lignes relevées quand le relèvement contredit une contrainte dure', () => {
    const a = food('a', 'a');
    const solve = vi.fn((pool: Food[], minimums: Map<string, number>) => {
      if (minimums.has('a')) throw new PlanComputationError('infeasible');
      return new Map(pool.length ? [['a', 30]] : []);
    });
    const result = consolidate([a], solve);
    expect(result.size).toBe(0);
  });

  it('termine en un nombre de tours borné par la taille du jeu', () => {
    // Un solveur qui propose toujours un aliment de trop, à dose infime.
    const pool = Array.from({ length: 20 }, (_, i) => food('f' + i, 'f' + i));
    const solve = vi.fn((current: Food[]) => new Map(current.slice(0, 1).map((f) => [f.code, 3])));
    consolidate(pool, solve);
    expect(solve.mock.calls.length).toBeLessThanOrEqual(2 * pool.length + 2);
  });
});

describe('lignes impossibles', () => {
  it('écarte un aliment dont la demi-unité dépasse la borne haute de son sous-groupe', () => {
    const noix = { ...food('noix', 'noix', 30), ansesSubgroup: 'oleagineux' };
    const pomme = { ...food('pomme', 'pomme'), ansesSubgroup: 'fruits_frais' };
    const model = {
      subgroups: [
        { code: 'oleagineux', upper: 9, foods: ['noix'] },
        { code: 'fruits_frais', upper: 376, foods: ['pomme'] },
      ],
      couplings: [],
    };
    expect(withoutImpossibleLines([noix, pomme], model, 1).map((f) => f.code)).toEqual(['pomme']);
    // Sur une semaine, la borne est multipliée par sept: la demi-poignée y tient.
    const weekly = { ...model, subgroups: model.subgroups.map((g) => ({ ...g, upper: g.upper * 7 })) };
    expect(withoutImpossibleLines([noix, pomme], weekly, 7).map((f) => f.code)).toEqual(['noix', 'pomme']);
  });
});
