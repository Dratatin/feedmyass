import { solveBounded } from './bounded-solve';
import type { ConsumptionModel } from './consumption-model';
import type { Food, NeedValue, Nutrient, UpperLimit } from '@/domain/types';

/**
 * Sélection des quantités par programmation linéaire (feature 004).
 *
 * Le critère est celui de l'ANSES pour l'actualisation des repères du PNNS
 * (avis 2012-SA-0103, décembre 2016): parmi les listes qui couvrent les besoins,
 * retenir celle qui reste LA PLUS PROCHE de la consommation moyenne française,
 * sous-groupe d'aliments par sous-groupe, en favorisant fruits, légumes et
 * féculents complets et en défavorisant viande rouge et charcuterie.
 *
 * Il remplace la masse minimale, qui récompensait les aliments les plus denses
 * par gramme: quatre ou cinq algues séchées ouvraient toutes les listes,
 * omnivore comprise, et l'iode montait à 128 fois sa limite de sécurité. Les
 * plafonds par catégorie et le plancher de fruits et légumes qui tentaient d'en
 * limiter les effets, sans source, disparaissent avec lui.
 *
 * Trois sortes de contraintes, et la distinction est le cœur du modèle:
 * - DURES, jamais levées: plafond énergétique, bornes hautes des références en
 *   intervalle (lipides, glucides), limites de sécurité, bornes des
 *   sous-groupes, plafond par aliment;
 * - les SEUILS BAS des nutriments, toujours flexibles: un manque est un coût,
 *   jamais une impossibilité — le modèle est donc toujours réalisable;
 * - le CRITÈRE, qui départage les listes qui couvrent les besoins.
 *
 * Le coût d'un manque suit l'ANSES (avis, pages 41 et 42). L'ANSES tient les
 * seuils nutritionnels pour DURS, et n'a rendu FLEXIBLE que la vitamine D, dont
 * la référence « a été construite en ne considérant pas la synthèse endogène » et
 * « est très difficile à atteindre compte tenu de l'offre et des habitudes de
 * consommation ». Son manque, rapporté à la référence, pèse comme un terme
 * d'habitude: l'ANSES accepte ainsi 5,4 µg/j sur 15, plutôt que de déformer tout
 * le régime pour grappiller les derniers pourcents.
 *
 * Ici, un seuil « dur » est un manque au coût SHORTFALL_COST, si élevé qu'aucune
 * habitude ne l'emporte tant que le nutriment peut être couvert: un seuil dur qui
 * ne rend jamais le modèle infaisable. Un nutriment vraiment hors d'atteinte — la
 * B12 d'un végane — ressort comme écart au taux que la liste atteint.
 *
 * Une version intermédiaire étendait la flexibilité de l'ANSES à tout nutriment
 * repéré hors d'atteinte. Mesuré: un nutriment à peine hors d'atteinte, couvrable
 * à 79 %, recevait le poids d'une habitude et chutait à 25 % — les folates d'un
 * omnivore sans gluten, la B12 d'un pescétarien. La lettre de l'avis est la bonne
 * règle: la vitamine D, et elle seule.
 */

export type SolverInput = {
  needs: NeedValue[];
  nutrients: Nutrient[];
  candidates: Food[];
  model: ConsumptionModel;
  upperLimits: UpperLimit[];
  /** 1 pour la journée, 7 pour la semaine: bornes et limites suivent la période. */
  periodFactor: number;
  /**
   * Quantité minimale imposée à certains aliments, en grammes sur la période:
   * la demi-unité d'achat d'un aliment que la consolidation a choisi de relever
   * plutôt que de retirer (FR-323).
   */
  minimums?: Map<string, number>;
};

export type SolverOutput = {
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
 * plafond est une décision du projet, pas une référence officielle. C'est une
 * contrainte DURE: la relaxation de la version précédente la levait avec le
 * seuil bas, et laissait passer des listes à 132 % du besoin.
 */
export const ENERGY_UPPER_TOLERANCE = 1.1;

/**
 * Coût d'un manque de 100 % sur un nutriment, et son multiplicateur pour
 * l'énergie, les protéines et les micronutriments prioritaires.
 *
 * Décision du projet (research R3). L'ANSES minimise la violation des
 * contraintes flexibles sans en publier la pondération. Le poids doit seulement
 * être grand devant le critère de consommation, dont les termes valent quelques
 * unités — un écart-type de plus sur un sous-groupe coûte 1: avec 1 000, un
 * manque d'un pour cent sur un nutriment pèse autant que dix écarts-types, et
 * aucune habitude alimentaire ne l'emporte sur un besoin tant qu'une liste peut
 * le couvrir. Vérifié sur la simulation complète (SC-005).
 */
export const SHORTFALL_COST = 1000;
export const PRIORITY_SHORTFALL_FACTOR = 10;

/**
 * Coût d'un manque de 100 % sur un nutriment flexible: celui de l'ANSES, qui rapporte la « variable de goal » à la référence et la
 * somme sans pondération aux autres termes du critère (rapport, description de
 * la fonction objectif).
 */
export const ANSES_FLEXIBILITY_COST = 1;

/** Nutriments que l'ANSES a rendus flexibles: la vitamine D seule (avis, pages 41 et 42). */
export const ANSES_FLEXIBLE_NUTRIENTS: ReadonlySet<string> = new Set(['vitamin_d']);

/**
 * Seuil de bruit numérique: le simplexe rend des valeurs de l'ordre de 1e-12 sur
 * des variables qu'il n'a en réalité pas retenues.
 */
const NUMERICAL_NOISE_G = 0.01;

/**
 * Précisions successives du solveur, en grammes.
 *
 * Au défaut de la bibliothèque (1e-9), son simplexe peut CYCLER sans rendre la
 * main (research R16 de la 003). Un milligramme est très en deçà de ce qu'une
 * liste de courses exprime. Si la résolution est interrompue par l'échéance,
 * elle est rejouée une fois à une précision voisine, qui déplace l'instance
 * dégénérée (research R8 de la 004). Trop desserrée, la précision coûte en
 * justesse: à 0,1 g, sept nutriments passaient sous leur seuil.
 */
const SOLVER_PRECISIONS = [1e-3, 1e-4];

/**
 * Perturbation des coûts au second essai.
 *
 * Changer de précision ne suffit pas toujours à sortir d'un cyclage. La parade
 * classique d'un simplexe dégénéré est de rendre les coûts deux à deux distincts:
 * un coût infime et propre à chaque aliment — un millionième par gramme, très
 * en deçà du moindre terme du critère — départage les sommets équivalents sans
 * changer la liste retenue.
 */
const PERTURBATION_PER_GRAM = 1e-6;

/**
 * Échéance d'une résolution, en millisecondes. Une résolution légitime tient en
 * quelques dizaines de millisecondes: l'échéance ne coupe qu'un cyclage.
 */
const SOLVER_DEADLINE_MS = 400;

/**
 * Le calcul de la liste n'a pas abouti.
 *
 * Levée quand la résolution a été interrompue à chaque essai, ou quand les
 * contraintes dures se contredisent. Elle n'est JAMAIS convertie en écart
 * nutritionnel (FR-319): la version précédente faisait d'une interruption un
 * « nutriment inatteignable », et fabriquait des écarts présentés avec le même
 * aplomb qu'un résultat juste.
 */
export class PlanComputationError extends Error {
  readonly reason: 'interrupted' | 'infeasible';

  constructor(reason: 'interrupted' | 'infeasible') {
    super(reason === 'interrupted'
      ? 'La résolution de la liste a été interrompue à chaque essai.'
      : 'Les contraintes de la liste se contredisent.');
    this.name = 'PlanComputationError';
    this.reason = reason;
  }
}

type Constraint = { min?: number; max?: number; equal?: number };

function hasNegativeQuantity(values: Record<string, number>): boolean {
  return Object.values(values).some((q) => q < -NUMERICAL_NOISE_G);
}

const FOOD_PREFIX = 'f_';
const CAP_PREFIX = 'cap_';
const GROUP_PREFIX = 'grp_';
const BALANCE_PREFIX = 'bal_';
const COUPLING_PREFIX = 'cpl_';
const FLOOR_PREFIX = 'min_';
const CEILING_PREFIX = 'max_';
const SAFETY_PREFIX = 'lss_';

export function solvePlan(input: SolverInput): SolverOutput {
  const { needs, nutrients, candidates, model, upperLimits, periodFactor } = input;
  const nutrientByCode = new Map(nutrients.map((n) => [n.code, n]));

  const constraints: Record<string, Constraint> = {};
  const variables: Record<string, Record<string, number>> = {};

  // --- Sous-groupes: bornes et critère ------------------------------------
  const groupOf = new Map<string, string>();
  for (const g of model.subgroups) {
    for (const code of g.foods) groupOf.set(code, g.code);
    const bounds: Constraint = { min: g.lower };
    if (g.upper !== null) bounds.max = g.upper;
    constraints[GROUP_PREFIX + g.code] = bounds;

    if (g.direction === 'mean' && g.sd) {
      // |Σ quantités − moyenne| linéarisé par deux écarts positifs, chacun
      // rapporté à l'écart-type du sous-groupe (rapport de l'ANSES).
      constraints[BALANCE_PREFIX + g.code] = { equal: g.mean };
      variables['ecart_plus_' + g.code] = { cost: 1 / g.sd, [BALANCE_PREFIX + g.code]: -1 };
      variables['ecart_moins_' + g.code] = { cost: 1 / g.sd, [BALANCE_PREFIX + g.code]: 1 };
    }
  }
  const costByGroup = new Map(model.subgroups.map((g) => [g.code, g.costPerGram]));
  const couplingsOf = new Map<string, string[]>();
  model.couplings.forEach((c, i) => {
    constraints[COUPLING_PREFIX + i] = { max: c.upper };
    for (const code of c.codes) couplingsOf.set(code, [...(couplingsOf.get(code) ?? []), COUPLING_PREFIX + i]);
  });

  // --- Nutriments: seuils bas flexibles, plafonds durs ----------------------
  for (const need of needs) {
    const nutrient = nutrientByCode.get(need.nutrient);
    if (!nutrient || need.value <= 0) continue;
    const target = need.value * thresholdFor(nutrient);
    constraints[FLOOR_PREFIX + need.nutrient] = { min: target };
    const weight = thresholdFor(nutrient) === 1 ? PRIORITY_SHORTFALL_FACTOR : 1;
    const cost = ANSES_FLEXIBLE_NUTRIENTS.has(need.nutrient) ? ANSES_FLEXIBILITY_COST : SHORTFALL_COST * weight;
    variables['manque_' + need.nutrient] = { cost: cost / target, [FLOOR_PREFIX + need.nutrient]: 1 };
    if (need.nutrient === 'energy') {
      constraints[CEILING_PREFIX + need.nutrient] = { max: need.value * ENERGY_UPPER_TOLERANCE };
    } else if (need.valueMax !== undefined) {
      // Référence exprimée en intervalle (lipides, glucides): la borne haute fait
      // partie de la référence, la dépasser serait s'en écarter.
      constraints[CEILING_PREFIX + need.nutrient] = { max: need.valueMax };
    }
  }
  for (const limit of upperLimits) {
    constraints[SAFETY_PREFIX + limit.nutrientCode] = { max: limit.value * periodFactor };
  }

  // --- Aliments ------------------------------------------------------------
  for (const food of candidates) {
    const group = groupOf.get(food.code);
    // Un aliment sans sous-groupe actif n'est pas proposable (FR-309).
    if (!group) continue;
    const variable: Record<string, number> = {
      cost: costByGroup.get(group) ?? 0,
      [CAP_PREFIX + food.code]: 1,
      [GROUP_PREFIX + group]: 1,
    };
    if (constraints[BALANCE_PREFIX + group]) variable[BALANCE_PREFIX + group] = 1;
    for (const key of couplingsOf.get(group) ?? []) variable[key] = 1;
    for (const [code, per100g] of Object.entries(food.composition)) {
      const perGram = per100g / 100;
      if (constraints[FLOOR_PREFIX + code]) variable[FLOOR_PREFIX + code] = perGram;
      if (constraints[CEILING_PREFIX + code]) variable[CEILING_PREFIX + code] = perGram;
      if (constraints[SAFETY_PREFIX + code]) variable[SAFETY_PREFIX + code] = perGram;
    }
    variables[FOOD_PREFIX + food.code] = variable;
    // La borne basse à zéro est EXPLICITE. La bibliothèque suppose ses variables
    // positives, mais ne le garantit pas sur une instance dégénérée: constaté,
    // −589 g d'un légume dans une solution déclarée réalisable. Ce légume
    // « retranché » compensait les autres — 866 g de légumes pour une borne de
    // 277, 123 % de l'énergie, des limites de sécurité dépassées —, et la liste
    // l'écartait ensuite comme du bruit, en affichant la violation.
    const cap: Constraint = { min: 0, max: food.maxQtyG * periodFactor };
    const minimum = input.minimums?.get(food.code);
    if (minimum !== undefined) cap.min = Math.min(minimum, cap.max!);
    constraints[CAP_PREFIX + food.code] = cap;
  }

  const foodVariables = Object.keys(variables).filter((k) => k.startsWith(FOOD_PREFIX));
  const lpModel = { optimize: 'cost', opType: 'min', constraints, variables };

  let solution = null;
  for (const [attempt, precision] of SOLVER_PRECISIONS.entries()) {
    if (attempt > 0) {
      foodVariables.forEach((key, i) => {
        variables[key]!.cost! += (PERTURBATION_PER_GRAM * (i + 1)) / foodVariables.length;
      });
    }
    solution = solveBounded(lpModel, foodVariables, precision, SOLVER_DEADLINE_MS);
    // Un modèle déclaré infaisable a droit au même second essai qu'un modèle
    // interrompu: sur une instance dégénérée, le simplexe peut conclure à tort à
    // l'infaisabilité — constaté sur une liste végane, après le seul retrait
    // d'aliments, ce qui ne peut pas rendre infaisable un modèle aux seuils
    // flexibles.
    if (!solution.interrompu && solution.feasible && !hasNegativeQuantity(solution.valeurs)) break;
  }
  if (!solution || solution.interrompu) throw new PlanComputationError('interrupted');
  // Les seuils bas étant flexibles, seules les contraintes dures — et les
  // minimums de la consolidation — peuvent se contredire. L'appelant décide.
  if (!solution.feasible) throw new PlanComputationError('infeasible');
  // Une quantité négative qui survit au second essai est un échec du solveur:
  // la liste qu'elle produirait violerait ses propres contraintes.
  if (hasNegativeQuantity(solution.valeurs)) throw new PlanComputationError('interrupted');

  const quantitiesByFood = new Map<string, number>();
  for (const key of foodVariables) {
    const quantity = solution.valeurs[key];
    if (typeof quantity !== 'number' || quantity <= NUMERICAL_NOISE_G) continue;
    quantitiesByFood.set(key.slice(FOOD_PREFIX.length), quantity);
  }
  return { quantitiesByFood };
}
