import type {
  ConsumptionSubgroup,
  Diet,
  Food,
  IngredientPlan,
  NeedValue,
  Nutrient,
  Period,
  ReferenceSex,
  UpperLimit,
} from '@/domain/types';
import { filterByDiet } from '@/domain/diet/filter';
import { filterBySeason } from '@/domain/seasonality/filter';
import { computeCoverage, toPlanItems } from './coverage';
import { buildConsumptionModel } from './consumption-model';
import { consolidate, withoutImpossibleLines } from './consolidate';
import { deriveGaps } from './gaps';
import { solvePlan } from './solver';

export * from './solver';
export * from './coverage';
export * from './consumption-model';
export * from './consolidate';
export * from './gaps';

/**
 * Assemblage de la liste d'ingrédients (FR-012 à FR-018, FR-037; feature 004).
 *
 * La sortie respecte contracts/ingredient-plan.schema.json: c'est le format
 * stable que le futur service de génération de recettes consommera sans refonte.
 */

export type PlanInput = {
  needs: NeedValue[];
  nutrients: Nutrient[];
  allFoods: Food[];
  seasonalCodes: Set<string>;
  /** Mois de disponibilité par aliment, pour les rubans de saison (FR-112). */
  seasonMonthsByFood?: Map<string, number[]>;
  diet: Diet;
  period: Period;
  /**
   * Choisit les paramètres de consommation de l'ANSES, établis par sexe. Il ne
   * touche pas aux besoins, déjà calculés: le principe III porte sur le régime.
   */
  referenceSex: ReferenceSex;
  subgroups: ConsumptionSubgroup[];
  upperLimits: UpperLimit[];
  generatedAt: Date;
  referenceVersions: Record<string, string>;
  disclaimer?: string;
};

export function buildIngredientPlan(input: PlanInput): IngredientPlan {
  const { needs, nutrients, allFoods, seasonalCodes, diet, period, generatedAt } = input;
  const periodFactor = period === 'week' ? 7 : 1;

  // Un aliment rattaché à aucun sous-groupe consommé en France — une algue —
  // n'est jamais proposé (FR-309), quel que soit le jeu considéré.
  const proposable = allFoods.filter((f) => f.ansesSubgroup !== null);

  // Deux filtres, dans cet ordre: le régime décide ce qui est mangeable, la
  // saison décide ce qui est disponible. Les jeux intermédiaires servent à
  // expliquer les écarts.
  const dietOnly = filterByDiet(proposable, diet);
  const candidates = filterBySeason(dietOnly, seasonalCodes);

  const foodByCode = new Map(allFoods.map((f) => [f.code, f]));

  // Besoin énergétique journalier: les bornes de l'ANSES y sont proportionnées.
  const energyNeedKcal = (needs.find((n) => n.nutrient === 'energy')?.value ?? 0) / periodFactor;

  const modelFor = (current: Food[], dietCompatible: Food[]) => buildConsumptionModel({
    subgroups: input.subgroups,
    referenceSex: input.referenceSex,
    periodFactor,
    energyNeedKcal,
    candidates: current,
    dietCompatible,
    allFoods: proposable,
  });

  /**
   * Le calcul complet sur un jeu d'aliments: lignes impossibles écartées, puis
   * consolidation, qui résout autant de fois que nécessaire.
   */
  const computeFor = (fullPool: Food[], dietCompatible: Food[]) => {
    const pool = withoutImpossibleLines(fullPool, modelFor(fullPool, dietCompatible), periodFactor);
    return consolidate(pool, (current, minimums) => solvePlan({
      needs,
      nutrients,
      candidates: current,
      model: modelFor(current, dietCompatible),
      upperLimits: input.upperLimits,
      periodFactor,
      minimums,
    }).quantitiesByFood);
  };

  const quantitiesByFood = computeFor(candidates, dietOnly);

  const coverage = computeCoverage(needs, nutrients, quantitiesByFood, foodByCode);
  const items = toPlanItems(quantitiesByFood, foodByCode, seasonalCodes, input.seasonMonthsByFood);
  const gaps = deriveGaps({
    coverage,
    needs,
    nutrients,
    foodByCode,
    // Sans le filtre de saison: même régime, toutes saisons. Sans le filtre de
    // régime: tout le catalogue proposable, et aucun sous-groupe exclu.
    solveWithout: (filter) => filter === 'season'
      ? computeFor(dietOnly, dietOnly)
      : computeFor(proposable, proposable),
  });

  return {
    schemaVersion: '1.1.0',
    period,
    generatedAt: generatedAt.toISOString(),
    diet,
    items,
    coverage,
    gaps,
    referenceVersions: input.referenceVersions,
    ...(input.disclaimer ? { disclaimer: input.disclaimer } : {}),
  };
}
