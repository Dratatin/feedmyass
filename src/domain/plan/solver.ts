import solver from 'javascript-lp-solver';
import type { Food, NeedValue, Nutrient } from '@/domain/types';

/**
 * Sélection des quantités par programmation linéaire (décision R6).
 *
 * Le problème est une couverture sous contraintes: trouver des quantités qui
 * atteignent les seuils de FR-016 sans dépasser des quantités réalistes. Une
 * heuristique gloutonne saurait produire une liste, mais pas prouver qu'aucune
 * solution n'existe — or c'est exactement ce dont FR-017 et FR-018 ont besoin
 * pour nommer les écarts.
 *
 * La VARIÉTÉ ne vient pas de la fonction objectif mais des bornes par aliment:
 * plafonner chaque aliment à une quantité réaliste force mécaniquement la
 * solution à se répartir. C'est aussi ce qui écarte la solution mathématiquement
 * optimale mais absurde, du type trois kilos de foie pour la vitamine A.
 */

export type SolverInput = {
  needs: NeedValue[];
  nutrients: Nutrient[];
  candidates: Food[];
  /** 1 pour la journée, 7 pour la semaine: les bornes par aliment suivent la période. */
  periodFactor: number;
  /** Nutriments dont la contrainte est relâchée (écarts déjà constatés). */
  relaxed?: Set<string>;
};

export type SolverOutput = {
  feasible: boolean;
  quantitiesByFood: Map<string, number>;
};

/**
 * Seuil applicable à un nutriment (FR-016): 100 % pour l'énergie, les protéines
 * et les micronutriments prioritaires, 80 % pour les autres.
 */
export function thresholdFor(nutrient: Nutrient): 1 | 0.8 {
  if (nutrient.code === 'energy' || nutrient.code === 'protein') return 1;
  return nutrient.isPriority ? 1 : 0.8;
}

/**
 * Tolérance haute sur l'énergie. FR-016 ne fixe qu'un plancher, mais une liste
 * qui fournirait le double des calories nécessaires serait inexploitable: le
 * plafond est une décision du projet, pas une référence officielle.
 */
const ENERGY_UPPER_TOLERANCE = 1.1;

/**
 * Plancher de fruits et légumes, en grammes par jour.
 *
 * Sans lui, minimiser la masse totale écarte presque tous les fruits et légumes:
 * ils sont peu denses en nutriments par gramme, donc « coûteux » pour le
 * solveur. Une liste qui n'en contiendrait qu'un seul trahirait la promesse du
 * produit.
 *
 * La valeur reprend le repère officiel français « au moins cinq fruits et
 * légumes par jour » du PNNS, soit environ 400 g. C'est une recommandation de
 * santé publique, pas une valeur inventée.
 */
const PRODUCE_FLOOR_G_PER_DAY = 400;
const PRODUCE_KEY = 'produce_mass';

const CAP_PREFIX = 'cap_';

export function solvePlan(input: SolverInput): SolverOutput {
  const { needs, nutrients, candidates, periodFactor, relaxed } = input;
  const nutrientByCode = new Map(nutrients.map((n) => [n.code, n]));

  const constraints: Record<string, { min?: number; max?: number }> = {};
  for (const need of needs) {
    if (relaxed?.has(need.nutrient)) continue;
    const nutrient = nutrientByCode.get(need.nutrient);
    if (!nutrient) continue;

    const constraint: { min?: number; max?: number } = {
      min: need.value * thresholdFor(nutrient),
    };
    if (need.nutrient === 'energy') {
      constraint.max = need.value * ENERGY_UPPER_TOLERANCE;
    } else if (need.valueMax !== undefined) {
      // Référence exprimée en intervalle (lipides, glucides): la borne haute
      // fait partie de la référence, la dépasser serait s'en écarter.
      constraint.max = need.valueMax;
    }
    constraints[need.nutrient] = constraint;
  }

  // Le plancher n'a de sens que si le jeu de candidats peut l'atteindre: en
  // hiver, ou sous un régime très restrictif, il pourrait rendre le modèle
  // infaisable pour une raison qui n'a rien de nutritionnel.
  const produceCapacity = candidates
    .filter((f) => f.isFruitVegetable)
    .reduce((total, f) => total + f.maxQtyG * periodFactor, 0);
  const produceFloor = Math.min(PRODUCE_FLOOR_G_PER_DAY * periodFactor, produceCapacity);
  if (produceFloor > 0) constraints[PRODUCE_KEY] = { min: produceFloor };

  const variables: Record<string, Record<string, number>> = {};
  for (const food of candidates) {
    const variable: Record<string, number> = { mass: 1, [CAP_PREFIX + food.code]: 1 };
    if (food.isFruitVegetable) variable[PRODUCE_KEY] = 1;
    for (const [code, per100g] of Object.entries(food.composition)) {
      if (constraints[code]) variable[code] = per100g / 100;
    }
    variables[food.code] = variable;
    constraints[CAP_PREFIX + food.code] = { max: food.maxQtyG * periodFactor };
  }

  const solution = solver.Solve({ optimize: 'mass', opType: 'min', constraints, variables });

  const quantitiesByFood = new Map<string, number>();
  if (solution.feasible) {
    for (const food of candidates) {
      const quantity = solution[food.code];
      if (typeof quantity === 'number' && quantity > 0.5) {
        quantitiesByFood.set(food.code, quantity);
      }
    }
  }

  return { feasible: Boolean(solution.feasible), quantitiesByFood };
}
