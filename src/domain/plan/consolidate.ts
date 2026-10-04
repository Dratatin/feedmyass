import type { Food } from '@/domain/types';
import { PlanComputationError } from './solver';

/**
 * Une liste qu'on peut acheter telle quelle (feature 004, FR-322, FR-323).
 *
 * Deux règles qu'un programme linéaire ne sait pas garantir seul, parce qu'elles
 * sont combinatoires:
 * - une seule variante par famille: un lait, une huile par usage, une sorte de
 *   tofu — et non 400 g de lait à 1,2 % plus 400 g de demi-écrémé;
 * - au moins une demi-unité d'achat par ligne: jamais 4 g de boisson au soja.
 *   Ce seuil est une décision du projet (2026-10-04), faute de référence.
 *
 * Mesuré sur 1 408 listes avant la feature: 1 131 contenaient deux variantes
 * d'un même ingrédient, 2 551 lignes étaient sous la demi-unité.
 *
 * La méthode est une consolidation itérative (research R7): résoudre, corriger ce
 * qui enfreint les règles, résoudre à nouveau. Une ligne trop petite n'est pas
 * toujours retirée: c'est un choix « zéro ou au moins une demi-unité », et la
 * consolidation l'arrondit comme on arrondit un tel choix —
 * - au-delà du quart d'unité, la ligne est RELEVÉE à la demi-unité;
 * - en deçà, elle est retirée.
 * Retirer systématiquement faisait disparaître des listes journalières tout ce
 * que l'on mange moins d'une fois par jour: l'ANSES place le poisson à 23 g/j en
 * moyenne, soit deux portions par semaine, sous la demi-portion de 50 g. La liste
 * perdait alors poissons, œufs et fromages, et l'omnivore manquait de B12.
 *
 * Chaque tour retire un aliment ou en relève un nouveau, et un aliment relevé ne
 * redescend plus: la boucle termine. Le modèle étant flexible, un nutriment que
 * la consolidation rend inatteignable ressort comme écart (FR-324); la règle
 * n'est jamais levée pour l'éviter.
 */

export type SolveFn = (candidates: Food[], minimums: Map<string, number>) => Map<string, number>;

/** Plus petite quantité qu'une ligne peut porter: une demi-unité d'achat. */
export function minimumLineG(food: Food): number {
  return food.unitGrams / 2;
}

/** Tolérance d'arrondi du solveur sur une quantité imposée, en grammes. */
const TOLERANCE_G = 0.05;

export function consolidate(candidates: Food[], solve: SolveFn): Map<string, number> {
  let pool = candidates;
  const minimums = new Map<string, number>();
  let lastRaised: string[] = [];

  for (let round = 0; round <= 2 * candidates.length; round += 1) {
    let quantities: Map<string, number>;
    try {
      quantities = solve(pool, minimums);
    } catch (error) {
      // Relever une ligne peut contredire une contrainte dure — le plafond
      // énergétique, une limite de sécurité. Les lignes relevées au tour
      // précédent sont alors retirées: l'autre branche du choix.
      if (!(error instanceof PlanComputationError) || error.reason !== 'infeasible' || lastRaised.length === 0) throw error;
      for (const code of lastRaised) minimums.delete(code);
      const dropped = new Set(lastRaised);
      pool = pool.filter((f) => !dropped.has(f.code));
      lastRaised = [];
      continue;
    }

    const foodByCode = new Map(pool.map((f) => [f.code, f]));
    const removed = new Set<string>();
    const raised: string[] = [];

    // 1. Les lignes trop petites d'abord: relevées ou retirées. Une variante trop
    //    petite ne doit pas évincer une sœur qui pourrait, elle, être retenue.
    for (const [code, grams] of quantities) {
      const minimum = minimumLineG(foodByCode.get(code)!);
      if (grams >= minimum - TOLERANCE_G) continue;
      if (grams >= minimum / 2) raised.push(code);
      else removed.add(code);
    }

    // 2. Dans chaque famille encore représentée, la variante la plus abondante
    //    reste; ses sœurs sortent du jeu, qu'elles aient été retenues ou non —
    //    sans quoi elles reviendraient au tour suivant.
    const chosen = new Map<string, { code: string; grams: number }>();
    for (const [code, grams] of quantities) {
      if (removed.has(code)) continue;
      const family = foodByCode.get(code)!.family;
      const current = chosen.get(family);
      if (!current || grams > current.grams || (grams === current.grams && code < current.code)) {
        chosen.set(family, { code, grams });
      }
    }
    for (const food of pool) {
      const kept = chosen.get(food.family);
      if (kept && kept.code !== food.code) removed.add(food.code);
    }

    const newlyRaised = raised.filter((code) => !removed.has(code));
    const removedAListedFood = [...quantities.keys()].some((code) => removed.has(code));
    if (!removedAListedFood && newlyRaised.length === 0) return quantities;

    pool = pool.filter((f) => !removed.has(f.code));
    for (const code of removed) minimums.delete(code);
    for (const code of newlyRaised) minimums.set(code, minimumLineG(foodByCode.get(code)!));
    lastRaised = newlyRaised;
  }
  return solve(pool, minimums);
}

/**
 * Aliments dont une ligne ne peut JAMAIS atteindre la demi-unité: leur
 * sous-groupe, ou la limite couplante qui le borne, plafonne plus bas.
 *
 * L'ANSES borne les oléagineux à 9 g/j chez l'homme et 5 g/j chez la femme; une
 * demi-poignée en pèse 15. Sur une liste journalière, aucun fruit à coque ne peut
 * donc figurer — sur une liste hebdomadaire, si. Les laisser candidats ne servait
 * qu'à faire tourner la consolidation: le solveur en ajoutait quelques grammes,
 * la consolidation les retirait, un autre prenait leur place, et chaque tour
 * coûtait une résolution.
 */
export function withoutImpossibleLines(
  pool: Food[],
  model: { subgroups: { code: string; upper: number | null; foods: string[] }[]; couplings: { codes: [string, string]; upper: number }[] },
  periodFactor: number,
): Food[] {
  const room = new Map<string, number>();
  for (const g of model.subgroups) room.set(g.code, g.upper ?? Number.POSITIVE_INFINITY);
  for (const c of model.couplings) {
    for (const code of c.codes) if (room.has(code)) room.set(code, Math.min(room.get(code)!, c.upper));
  }
  return pool.filter((food) => {
    const groupRoom = food.ansesSubgroup === null ? 0 : room.get(food.ansesSubgroup) ?? 0;
    return minimumLineG(food) <= Math.min(groupRoom, food.maxQtyG * periodFactor);
  });
}
