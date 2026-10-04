import type { ConsumptionSubgroup, Food, ReferenceSex } from '@/domain/types';

/**
 * Le modèle de consommation de l'ANSES, appliqué à une liste (feature 004).
 *
 * L'avis Anses 2012-SA-0103 (décembre 2016) a actualisé les repères du PNNS par
 * un programme linéaire: trouver l'alimentation qui couvre les références
 * nutritionnelles en restant AU PLUS PRÈS de la consommation moyenne française,
 * sous-groupe d'aliments par sous-groupe. Ce module traduit ses paramètres
 * (consumption-model.json) en ce que le solveur consomme pour un profil, un
 * régime et une période donnés: quels sous-groupes jouent, entre quelles bornes,
 * avec quel coût.
 *
 * Il ne remplace aucun seuil par un autre: les bornes viennent toutes du tableau
 * 9 de l'avis. Les seules décisions du projet sont nommées: l'extension aux
 * régimes qui excluent des sous-groupes (FR-310a), la levée de la borne basse
 * d'un sous-groupe sans candidat, et la mise à l'échelle énergétique.
 *
 * MISE À L'ÉCHELLE. L'ANSES a calibré ses bornes sur un besoin de 2 600 kcal/j
 * pour les hommes et 2 100 kcal/j pour les femmes (avis, page 13). Un adulte de
 * 110 kg très actif a besoin de 4 400 kcal: les bornes d'un besoin de 2 600 kcal
 * ne lui permettent pas de les atteindre — mesuré, 21 listes restaient sous leur
 * besoin énergétique. Bornes, moyennes, écarts-types et limites couplantes sont
 * donc proportionnés au besoin du profil, à composition d'assiette constante.
 * Les plafonds épidémiologiques (sous-groupes à défavoriser) ne le sont pas: un
 * seuil de risque pour la viande rouge ne grandit pas avec l'appétit.
 */

export type ActiveSubgroup = {
  code: string;
  direction: ConsumptionSubgroup['direction'];
  /** Bornes sur la période, en grammes. `upper` nul: pas de limite supérieure. */
  lower: number;
  upper: number | null;
  /** Sous-groupes `mean`: consommation moyenne et écart-type sur la période. */
  mean: number;
  sd: number | null;
  /**
   * Coût d'un gramme pour les sous-groupes `maximize` (négatif) et `minimize`
   * (positif): la consommation est rapportée à la borne haute, comme dans le
   * rapport de l'ANSES. Nul pour les sous-groupes `mean`.
   */
  costPerGram: number;
  foods: string[];
};

export type Coupling = { codes: [string, string]; upper: number };

export type ConsumptionModel = {
  subgroups: ActiveSubgroup[];
  couplings: Coupling[];
  /** Sous-groupes retirés parce que le régime en exclut tous les aliments (FR-311). */
  excluded: string[];
};

export type ConsumptionModelInput = {
  subgroups: ConsumptionSubgroup[];
  referenceSex: ReferenceSex;
  periodFactor: number;
  /** Besoin énergétique journalier du profil, en kcal: fixe la mise à l'échelle. */
  energyNeedKcal: number;
  /** Aliments réellement candidats: régime, saison, et rattachés à un sous-groupe. */
  candidates: Food[];
  /** Aliments compatibles avec le régime, toutes saisons. Sert à reconnaître un sous-groupe exclu. */
  dietCompatible: Food[];
  /** Catalogue entier: définit ce qu'un sous-groupe contient hors de tout régime. */
  allFoods: Food[];
};

export function buildConsumptionModel(input: ConsumptionModelInput): ConsumptionModel {
  const { subgroups, referenceSex, periodFactor, candidates, dietCompatible, allFoods, energyNeedKcal } = input;
  const scaleOf = (g: ConsumptionSubgroup) => energyNeedKcal / g.referenceEnergyKcal[referenceSex];
  /** Une borne haute de sous-groupe à défavoriser est un plafond épidémiologique: absolue. */
  const isRiskCap = (g: ConsumptionSubgroup) => g.direction === 'minimize';
  const compatible = new Set(dietCompatible.map((f) => f.code));

  // Un sous-groupe est EXCLU par le régime quand tous ses aliments propres —
  // hors substituts — sont incompatibles: la viande pour un végétarien, le lait
  // de vache pour un végane. Lu sur les données, pas sur une liste de régimes
  // codée en dur: un régime ajouté plus tard en hérite sans changement.
  const excluded = new Set<string>();
  for (const g of subgroups) {
    const own = allFoods.filter((f) => f.ansesSubgroup === g.code && !f.isSubstitute);
    if (own.length > 0 && own.every((f) => !compatible.has(f.code))) excluded.add(g.code);
  }

  const active: ActiveSubgroup[] = [];
  for (const g of subgroups) {
    const members = candidates.filter((f) => f.ansesSubgroup === g.code);
    const foods = members.map((f) => f.code);
    // Sans candidat — exclu par le régime sans substitut, ou vidé par la saison —
    // le sous-groupe ne joue pas: sa borne basse rendrait le modèle infaisable
    // pour une raison qui n'a rien de nutritionnel.
    if (foods.length === 0) continue;

    const p = g.bySex[referenceSex];
    const scale = scaleOf(g);
    const upperScale = isRiskCap(g) ? 1 : scale;
    // FR-310a: le modèle de l'ANSES est établi sur une population omnivore. Quand
    // le régime exclut un sous-groupe, ceux qui le remplacent doivent pouvoir
    // dépasser leur P95 — sans quoi 64 g de légumineuses ne nourrissent pas un
    // végane. Le plafond par aliment reste la limite.
    const lifted = g.substitutesFor.some((code) => excluded.has(code));
    const upper = lifted || p.upper === null ? null : p.upper * upperScale * periodFactor;

    const normalizer = p.upper ?? g.coupledUpper?.[referenceSex] ?? null;
    let costPerGram = 0;
    if (g.direction !== 'mean' && normalizer) {
      const unit = 1 / (normalizer * upperScale * periodFactor);
      costPerGram = g.direction === 'maximize' ? -unit : unit;
    }

    active.push({
      code: g.code,
      direction: g.direction,
      // La borne basse ne peut excéder ce que les candidats restants fournissent
      // à leur plafond: constaté, un seul féculent restait, plafonné à 15 g, pour
      // une borne de 16 g — et le modèle devenait infaisable pour une raison qui
      // n'a rien de nutritionnel. C'est la règle du sous-groupe sans candidat,
      // étendue au sous-groupe qui n'en a plus assez.
      lower: Math.min(p.lower * scale * periodFactor, members.reduce((sum, f) => sum + f.maxQtyG * periodFactor, 0)),
      upper,
      mean: p.mean * scale * periodFactor,
      sd: p.sd === undefined ? null : p.sd * scale * periodFactor,
      costPerGram,
      foods,
    });
  }

  // Une limite couplante borne la somme de deux sous-groupes. Elle vaut dès que
  // l'un des deux joue — sauf si la borne haute de ce dernier a été levée pour
  // un régime: lever l'une et garder l'autre se contredirait.
  const activeCodes = new Map(active.map((g) => [g.code, g]));
  const couplings: Coupling[] = [];
  for (const g of subgroups) {
    if (!g.coupledWith || !g.coupledUpper || g.code > g.coupledWith) continue;
    const pair = [activeCodes.get(g.code), activeCodes.get(g.coupledWith)].filter(Boolean) as ActiveSubgroup[];
    if (pair.length === 0) continue;
    const anyLifted = pair.some((a) => {
      const source = subgroups.find((s) => s.code === a.code)!;
      return a.upper === null && source.bySex[referenceSex].upper !== null;
    });
    if (anyLifted) continue;
    const coupledScale = isRiskCap(g) ? 1 : scaleOf(g);
    couplings.push({ codes: [g.code, g.coupledWith], upper: g.coupledUpper[referenceSex] * coupledScale * periodFactor });
  }

  return { subgroups: active, couplings, excluded: [...excluded] };
}
