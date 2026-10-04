import type { CoverageEntry, Food, NeedValue, Nutrient, PlanGap } from '@/domain/types';
import { computeCoverage } from './coverage';

/**
 * Écarts: les nutriments que la liste livrée ne couvre pas, et pourquoi
 * (FR-017, FR-018, FR-320 de la 004).
 *
 * Le taux d'un écart est celui de la couverture affichée, calculée sur la liste
 * livrée. La version précédente le calculait sur un maximum théorique — tous les
 * aliments à leur plafond en même temps — et affichait par exemple un écart de
 * lipides « à 1 375 % ».
 *
 * La cause s'établit en rejouant LE MÊME calcul — même modèle, mêmes
 * contraintes, plafond énergétique compris, même consolidation — sur des jeux
 * d'aliments de plus en plus larges: sans le filtre de saison, puis sans le
 * filtre de régime. Si le nutriment devient couvert, c'est que le filtre retiré
 * le contraignait. Ces rejeux n'ont lieu que s'il y a un écart.
 */

export type GapInput = {
  coverage: CoverageEntry[];
  needs: NeedValue[];
  nutrients: Nutrient[];
  foodByCode: Map<string, Food>;
  /** Le même calcul que la liste, sur un jeu d'aliments élargi. */
  solveWithout: (filter: 'season' | 'diet') => Map<string, number>;
};

export function deriveGaps(input: GapInput): PlanGap[] {
  const { coverage, needs, nutrients, foodByCode, solveWithout } = input;
  const below = coverage.filter((c) => !c.meetsThreshold);
  if (below.length === 0) return [];

  const coveredWith = (quantities: Map<string, number>) => {
    const entries = computeCoverage(needs, nutrients, quantities, foodByCode);
    return new Set(entries.filter((c) => c.meetsThreshold).map((c) => c.nutrient));
  };

  const withoutSeason = coveredWith(solveWithout('season'));
  const remaining = below.filter((c) => !withoutSeason.has(c.nutrient));
  const withoutDiet = remaining.length > 0 ? coveredWith(solveWithout('diet')) : new Set<string>();

  return below.map((c) => ({
    nutrient: c.nutrient,
    ratio: c.ratio,
    reason: withoutSeason.has(c.nutrient)
      ? 'seasonality_restriction'
      : withoutDiet.has(c.nutrient)
        ? 'diet_restriction'
        : 'no_source_available',
  }));
}
