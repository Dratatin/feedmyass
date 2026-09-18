import { solveBounded } from './bounded-solve';
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
export const ENERGY_UPPER_TOLERANCE = 1.1;

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
const GROUP_PREFIX = 'groupe_';

/**
 * Plafond COLLECTIF par catégorie d'achat, en grammes par jour.
 *
 * Le plafond par aliment ne suffit pas, et le constat était accablant: une liste
 * végétarienne proposait « œuf brouillé, œuf cru, œuf de caille, œuf poché et
 * jaune d'œuf cuit », 120 g chacun — six cents grammes d'œufs, parce que le
 * modèle voyait cinq aliments distincts là où il n'y a qu'un ingrédient. Même
 * mécanique pour cinq algues séchées à 15 g, soit 75 g d'algues par jour.
 *
 * Le plafond porte donc sur la CATÉGORIE: deux œufs par jour quelle que soit
 * leur préparation, deux cents grammes de viande quelles que soient les
 * découpes. Le plafond par aliment demeure, comme sous-limite.
 *
 * Les fruits et légumes en sont exemptés volontairement: c'est la seule famille
 * dont on veuille la variété ET le volume, et le plancher des 400 g les pousse
 * déjà vers le haut. Les borner collectivement reviendrait à se battre contre
 * son propre repère de santé publique.
 *
 * Ces valeurs sont des décisions du projet, pas des références officielles —
 * comme les bornes par aliment du catalogue. C'est ici qu'on ajuste si une liste
 * paraît déséquilibrée.
 */
const CATEGORY_DAILY_CAP_G: Record<string, number> = {
  oeuf: 120,   // deux œufs, quelle que soit la préparation
  autre: 60,   // condiments: algues, graines, levures, sons réunis
};

/*
 * Pourquoi ces deux-là seulement, et ce que la mesure a établi.
 *
 * Ils sont VÉRIFIÉS par `npm run check:caps`: ils corrigent une absurdité
 * constatée — sept œufs en cinq préparations, cinq algues séchées dans la même
 * journée — sans qu'aucune combinaison ne perde l'énergie ni les protéines.
 *
 * D'autres empilements subsistent, et ils sont tout aussi absurdes: 2 litres de
 * boissons végétales, 1 162 g de produits laitiers, 938 g de protéines végétales
 * en cinq formes. Les plafonner a été essayé et MESURÉ, et le résultat est
 * instructif: plafonner les seules boissons végétales à 500 g fait perdre
 * l'énergie ET les protéines à cinq combinaisons, toutes végétaliennes ou
 * végétariennes sans lactose.
 *
 * Autrement dit, le solveur ne s'appuie pas sur ces deux litres par gourmandise:
 * c'est le seul moyen qu'on lui laisse d'atteindre l'apport énergétique d'un
 * régime restreint. On ne peut pas plafonner ce dont le modèle dépend.
 *
 * La suite n'est donc PAS de resserrer les plafonds, mais de donner d'abord à
 * ces régimes des sources plus denses: le quota par classe limite les céréales,
 * les légumineuses et les oléagineux à quatre représentants chacun, ce qui est
 * confortable pour un omnivore et étroit pour un végane. Enrichir d'abord,
 * plafonner ensuite — et revérifier avec `npm run check:caps` à chaque pas.
 */

/**
 * Seuils de restitution d'une quantité.
 *
 * `NUMERICAL_NOISE_G` écarte le bruit du solveur linéaire, qui rend des valeurs
 * de l'ordre de 1e-12 sur des variables qu'il n'a en réalité pas retenues.
 * `MIN_DISPLAY_G` est la plus petite quantité qu'une liste de courses puisse
 * porter: une pincée.
 */
const NUMERICAL_NOISE_G = 0.01;
const MIN_DISPLAY_G = 1;

/**
 * Précision du solveur, en grammes.
 *
 * Le défaut de la bibliothèque est de l'ordre de 1e-9, et à cette finesse son
 * simplexe peut CYCLER sans jamais rendre la main. Constaté pour de bon: le
 * calcul d'une liste végane au mois de septembre ne terminait pas, là où le même
 * modèle privé de ses matières grasses se résolvait en 12 ms. Ni la borne de
 * temps de la bibliothèque — qui ne s'applique qu'aux problèmes en nombres
 * entiers — ni sa détection de cycle, pourtant active par défaut, n'y changeaient
 * quoi que ce soit. Desserrer la précision, si.
 *
 * Un milligramme est très en deçà de ce qu'une liste de courses peut exprimer:
 * les quantités sont arrondies au gramme, et le solveur écarte déjà tout ce qui
 * est sous NUMERICAL_NOISE_G, dix fois plus grossier. La précision perdue est
 * donc nulle en pratique.
 *
 * Ce réglage ne suffit PAS à lui seul: il déplace l'instance qui cycle sans
 * garantir la terminaison, et trop desserré il sacrifie la justesse
 * nutritionnelle. Mesuré: à 0,1 g, sept nutriments passent sous leur seuil pour
 * un omnivore. La terminaison est assurée par la borne d'exécution
 * (bounded-solve.ts), pas par ce nombre.
 */
const SOLVER_PRECISION = 1e-3;

/**
 * Échéance d'une résolution, en millisecondes.
 *
 * Large au regard du cas nominal — une résolution légitime tient en quelques
 * dizaines de
 * millisecondes — parce qu'elle ne sert qu'à couper un cyclage, jamais un calcul
 * légitime. Au-delà, le modèle est déclaré infaisable et la relaxation prend le
 * relais: elle nomme les nutriments hors d'atteinte plutôt que de laisser la
 * page attendre indéfiniment.
 *
 * La relaxation rejoue le solveur jusqu'à une fois par nutriment. L'échéance
 * valant par appel, le pire cas théorique se compte en dizaines de secondes —
 * mais chaque interruption retire un nutriment du modèle, donc la suite converge
 * vite.
 */
const SOLVER_DEADLINE_MS = 400;

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

    // Plafond collectif: toutes les formes d'un même ingrédient partagent une
    // enveloppe, au lieu d'en avoir chacune une. Sans cela, le solveur multiplie
    // les variantes pour contourner la borne individuelle.
    const cap = CATEGORY_DAILY_CAP_G[food.category];
    if (cap !== undefined) {
      const key = GROUP_PREFIX + food.category;
      variable[key] = 1;
      constraints[key] = { max: cap * periodFactor };
    }

    for (const [code, per100g] of Object.entries(food.composition)) {
      if (constraints[code]) variable[code] = per100g / 100;
    }
    variables[food.code] = variable;
    constraints[CAP_PREFIX + food.code] = { max: food.maxQtyG * periodFactor };
  }

  const solution = solveBounded(
    { optimize: 'mass', opType: 'min', constraints, variables },
    candidates.map((f) => f.code),
    SOLVER_PRECISION,
    SOLVER_DEADLINE_MS,
  );

  const quantitiesByFood = new Map<string, number>();
  if (solution.feasible) {
    for (const food of candidates) {
      const quantity = solution.valeurs[food.code];
      if (typeof quantity !== 'number' || quantity <= NUMERICAL_NOISE_G) continue;
      // Une quantité infime ne se pèse ni ne s'achète, mais la RETIRER faisait
      // mentir la couverture affichée: le solveur garantissait les seuils sur
      // une solution qui n'était plus celle présentée, et aucun écart n'était
      // signalé puisque le modèle, lui, restait faisable. Le défaut ne se voyait
      // que sur les aliments très denses employés à dose homéopathique — une
      // algue séchée à 0,4 g pouvait porter l'essentiel de la vitamine A.
      // On relève donc au gramme au lieu de jeter.
      quantitiesByFood.set(food.code, Math.max(quantity, MIN_DISPLAY_G));
    }
  }

  return { feasible: Boolean(solution.feasible), quantitiesByFood };
}
