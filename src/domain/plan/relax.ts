import type { Food, NeedValue, Nutrient, PlanGap } from '@/domain/types';
import { ENERGY_UPPER_TOLERANCE, solvePlan, thresholdFor, type SolverOutput } from './solver';

/**
 * Relaxation des contraintes infaisables et production des écarts (FR-017, FR-018).
 *
 * Quand aucune combinaison d'aliments ne peut atteindre les seuils, il ne suffit
 * pas de rendre une liste approximative: il faut NOMMER les nutriments en cause
 * et dire pourquoi. C'est la raison d'être du solveur linéaire (R6).
 *
 * La cause est déterminée en comparant ce qui serait atteignable avec des jeux
 * d'aliments de plus en plus larges: si un nutriment devient atteignable en
 * retirant le filtre de régime, c'est le régime qui contraint; en retirant le
 * filtre de saison, c'est la saison; s'il reste inatteignable avec tout le
 * catalogue, aucune source disponible ne permet de le couvrir.
 */

export type RelaxationInput = {
  needs: NeedValue[];
  nutrients: Nutrient[];
  /** Aliments réellement candidats: régime ET saison appliqués. */
  candidates: Food[];
  /** Aliments compatibles avec le régime, saison non appliquée. */
  dietOnly: Food[];
  /** Catalogue complet, aucun filtre. */
  allFoods: Food[];
  periodFactor: number;
};

export type RelaxationOutput = SolverOutput & { gaps: PlanGap[] };

/**
 * Quantité maximale d'un nutriment atteignable avec un jeu d'aliments, chacun
 * poussé à sa borne haute. Borne supérieure théorique, calculée sans solveur.
 */
export function maxAchievable(foods: Food[], nutrientCode: string, periodFactor: number): number {
  return foods.reduce(
    (total, food) => total + ((food.composition[nutrientCode] ?? 0) / 100) * food.maxQtyG * periodFactor,
    0,
  );
}

/**
 * Même borne, mais SOUS LE PLAFOND ÉNERGÉTIQUE — et c'est lui qui décide.
 *
 * `maxAchievable` suppose qu'on mange tous les aliments à leur maximum en même
 * temps. Personne ne le fait: le plafond d'énergie l'interdit bien avant. La
 * borne obtenue est donc si généreuse qu'elle ne déclare presque jamais un
 * nutriment hors d'atteinte, et le solveur se retrouve à chercher longuement une
 * solution qui n'existe pas — c'est là qu'il lui arrive de tourner en rond.
 *
 * Ici on répond à la vraie question: « avec ce budget calorique, jusqu'où ce
 * nutriment peut-il monter ? ». C'est un sac à dos fractionnaire, dont l'optimum
 * s'obtient sans solveur: servir d'abord les aliments les plus riches en ce
 * nutriment PAR CALORIE, jusqu'à épuisement du budget. Les aliments sans énergie
 * sont pris en entier, ils ne coûtent rien.
 *
 * Le résultat reste une borne supérieure — les autres contraintes ne sont pas
 * prises en compte — mais beaucoup plus serrée. Quand elle passe sous le seuil,
 * c'est une certitude: aucune assiette ne couvre ce besoin, et le dire vaut
 * mieux que le chercher.
 */
export function maxAchievableWithinEnergy(
  foods: Food[],
  nutrientCode: string,
  energyBudget: number,
  periodFactor: number,
): number {
  type Part = { nutrient: number; energy: number };
  const parts: Part[] = [];
  let total = 0;
  let budget = energyBudget;

  for (const food of foods) {
    const qty = food.maxQtyG * periodFactor;
    const nutrient = ((food.composition[nutrientCode] ?? 0) / 100) * qty;
    if (nutrient <= 0) continue;
    const energy = ((food.composition.energy ?? 0) / 100) * qty;
    if (energy <= 0) total += nutrient; // gratuit en calories: pris en entier
    else parts.push({ nutrient, energy });
  }

  // Les plus rentables d'abord: le plus de nutriment par calorie dépensée.
  parts.sort((a, b) => b.nutrient / b.energy - a.nutrient / a.energy);
  for (const part of parts) {
    if (budget <= 0) break;
    const pris = Math.min(1, budget / part.energy);
    total += part.nutrient * pris;
    budget -= part.energy * pris;
  }
  return total;
}

function reasonFor(
  nutrientCode: string,
  needed: number,
  input: RelaxationInput,
): PlanGap['reason'] {
  const { dietOnly, allFoods, periodFactor } = input;
  if (maxAchievable(allFoods, nutrientCode, periodFactor) < needed) return 'no_source_available';
  if (maxAchievable(dietOnly, nutrientCode, periodFactor) < needed) return 'diet_restriction';
  return 'seasonality_restriction';
}

export function solveWithRelaxation(input: RelaxationInput): RelaxationOutput {
  const { needs, nutrients, candidates, periodFactor } = input;
  const nutrientByCode = new Map(nutrients.map((n) => [n.code, n]));

  const relaxed = new Set<string>();
  const gaps: PlanGap[] = [];

  // Premier passage SANS SOLVEUR: les nutriments qu'aucune assiette ne peut
  // atteindre sous le plafond calorique sont structurellement hors de portée.
  //
  // La borne est calculée sous ce plafond, et non en empilant tous les aliments
  // à leur maximum: c'est la seule façon de répondre à la vraie question. Un
  // régime très restreint peut être physiquement incapable de couvrir un
  // nutriment, et il vaut mieux le DIRE que laisser le solveur chercher
  // longuement une solution qui n'existe pas.
  const energyNeed = needs.find((n) => n.nutrient === 'energy');
  const energyBudget = energyNeed
    ? energyNeed.value * ENERGY_UPPER_TOLERANCE * periodFactor
    : Number.POSITIVE_INFINITY;

  for (const need of needs) {
    const nutrient = nutrientByCode.get(need.nutrient);
    if (!nutrient) continue;
    const target = need.value * thresholdFor(nutrient);
    const reachable = need.nutrient === 'energy'
      ? maxAchievable(candidates, need.nutrient, periodFactor)
      : maxAchievableWithinEnergy(candidates, need.nutrient, energyBudget, periodFactor);
    if (reachable < target) {
      relaxed.add(need.nutrient);
      gaps.push({
        nutrient: need.nutrient,
        ratio: need.value === 0 ? 0 : reachable / need.value,
        reason: reasonFor(need.nutrient, target, input),
      });
    }
  }

  let solution = solvePlan({ needs, nutrients, candidates, periodFactor, relaxed });

  // Second passage: les contraintes restantes peuvent rester incompatibles entre
  // elles (le plafond énergétique borne les quantités). On relâche alors les
  // nutriments les moins prioritaires en premier, un à un.
  if (!solution.feasible) {
    const relaxOrder = [...needs]
      .filter((need) => !relaxed.has(need.nutrient))
      .sort((a, b) => {
        const priority = (need: NeedValue) => {
          const nutrient = nutrientByCode.get(need.nutrient);
          if (!nutrient) return 0;
          return thresholdFor(nutrient) === 1 ? 1 : 0;
        };
        return priority(a) - priority(b);
      });

    for (const need of relaxOrder) {
      relaxed.add(need.nutrient);
      solution = solvePlan({ needs, nutrients, candidates, periodFactor, relaxed });
      if (solution.feasible) {
        gaps.push({
          nutrient: need.nutrient,
          ratio: maxAchievable(candidates, need.nutrient, periodFactor) / (need.value || 1),
          reason: reasonFor(need.nutrient, need.value, input),
        });
        break;
      }
      gaps.push({
        nutrient: need.nutrient,
        ratio: maxAchievable(candidates, need.nutrient, periodFactor) / (need.value || 1),
        reason: reasonFor(need.nutrient, need.value, input),
      });
    }
  }

  return { ...solution, gaps };
}
