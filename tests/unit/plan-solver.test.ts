import { describe, expect, it } from 'vitest';
import { buildIngredientPlan, maxAchievable, thresholdFor } from '@/domain/plan';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import { filterByDiet } from '@/domain/diet/filter';
import { filterBySeason } from '@/domain/seasonality/filter';
import type { Diet, Period, Profile } from '@/domain/types';
import { foodsFixture, intakesFixture, nutrientsFixture, seasonalCodesByMonth } from './fixtures/reference';

/**
 * Solveur de liste d'ingrédients (FR-012 à FR-018).
 *
 * Joué sur le catalogue réel: seuils de FR-016, bornes de quantité, plancher de
 * fruits et légumes, et production d'écarts nommés quand aucune solution
 * n'existe.
 */
const profile: Profile = { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active' };
const generatedAt = new Date('2026-09-13T10:00:00Z');
const needs = computeNeeds(profile, { nutrients: nutrientsFixture, intakes: intakesFixture, energy: energyReference });

const plan = (diet: Diet, month = 9, period: Period = 'day') =>
  buildIngredientPlan({
    needs: period === 'day' ? needs.daily : needs.weekly,
    nutrients: nutrientsFixture,
    allFoods: foodsFixture,
    seasonalCodes: seasonalCodesByMonth.get(month)!,
    diet,
    period,
    generatedAt,
    referenceVersions: needs.referenceVersions,
  });

describe('seuils de couverture', () => {
  it('applique 100 % à l\'énergie, aux protéines et aux micronutriments prioritaires', () => {
    const byCode = new Map(nutrientsFixture.map((n) => [n.code, n]));
    expect(thresholdFor(byCode.get('energy')!)).toBe(1);
    expect(thresholdFor(byCode.get('protein')!)).toBe(1);
    for (const code of ['iron', 'calcium', 'magnesium', 'vitamin_b12', 'vitamin_d', 'vitamin_c']) {
      expect(thresholdFor(byCode.get(code)!), code).toBe(1);
    }
  });

  it('applique 80 % aux autres micronutriments', () => {
    const byCode = new Map(nutrientsFixture.map((n) => [n.code, n]));
    for (const code of ['iodine', 'selenium', 'vitamin_k', 'potassium']) {
      expect(thresholdFor(byCode.get(code)!), code).toBe(0.8);
    }
  });
});

describe('liste produite pour un régime omnivore', () => {
  const result = plan({ base: 'omnivore', exclusions: [] });

  it('propose une liste non vide', () => {
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.schemaVersion).toBe('1.1.0');
  });

  it('atteint tous les seuils et ne signale aucun écart', () => {
    const below = result.coverage.filter((c) => !c.meetsThreshold);
    expect(below.map((c) => c.nutrient)).toEqual([]);
    expect(result.gaps).toEqual([]);
  });

  it('respecte la borne haute de chaque aliment', () => {
    const byCode = new Map(foodsFixture.map((f) => [f.code, f]));
    for (const item of result.items) {
      expect(item.quantityG, item.label).toBeLessThanOrEqual(byCode.get(item.foodCode)!.maxQtyG + 1);
    }
  });

  it('atteint le plancher de fruits et légumes', () => {
    const produce = result.items.filter((i) => i.isSeasonalProduce !== undefined);
    const grams = produce.reduce((total, i) => total + i.quantityG, 0);
    expect(grams).toBeGreaterThanOrEqual(395);
  });

  it('ne propose que des fruits et légumes de saison (FR-014)', () => {
    for (const item of result.items) {
      if (item.isSeasonalProduce !== undefined) expect(item.isSeasonalProduce).toBe(true);
    }
  });

  it('couvre chaque nutriment du référentiel dans le détail de couverture (FR-015)', () => {
    expect(result.coverage).toHaveLength(nutrientsFixture.length);
    for (const entry of result.coverage) {
      expect(entry.ratio).toBeGreaterThanOrEqual(0);
      expect([0.8, 1]).toContain(entry.threshold);
    }
  });
});

/**
 * L'écart de B12 d'un régime végane, et pourquoi il avait failli disparaître.
 *
 * Construit sur la table Ciqual 2020, le catalogue refermait cet écart: les
 * algues y portaient des teneurs élevées en B12 — 38,8 µg/100 g pour le nori,
 * 9,8 pour la dulse — et le solveur s'en servait pour atteindre le besoin.
 *
 * La table 2025 a RETIRÉ ces valeurs, désormais « non déterminées ». C'est la
 * question de la pseudo-B12: les corrinoïdes des algues sont des analogues que
 * l'organisme humain n'assimile pas. Créditer un plan végane de cette B12-là
 * était une erreur nutritionnelle, à laquelle le millésime 2025 met fin.
 *
 * L'écart est donc de nouveau réel, et c'est la bonne réponse: le catalogue ne
 * peut pas couvrir la B12 d'un régime végane, et il doit le dire.
 */
describe('écarts quand aucune solution n\'existe', () => {
  const vegan = plan({ base: 'vegan', exclusions: [] });

  it('signale la vitamine B12 en écart pour un régime végane', () => {
    const b12 = vegan.gaps.find((g) => g.nutrient === 'vitamin_b12');
    expect(b12).toBeDefined();
    expect(b12!.reason).toBe('diet_restriction');
    // Le ratio d'un écart mesure le maximum atteignable par le régime, pas ce
    // que la liste fournit: sous 1, le besoin reste hors de portée même en
    // saturant toutes les bornes.
    expect(b12!.ratio).toBeLessThan(1);
  });

  it('ne crédite aucune algue d\'une teneur en vitamine B12', () => {
    // Verrou sur la donnée elle-même: si un millésime ultérieur réintroduisait
    // des teneurs en B12 sur les algues, ce test le ferait voir plutôt que de
    // laisser le solveur s'en servir en silence.
    const algues = foodsFixture.filter((f) =>
      /algue|dulse|nori|kombu|wakam|laitue de mer|ascophylle|spiruline/i.test(f.label));
    expect(algues.length).toBeGreaterThan(0);
    for (const a of algues) {
      expect(a.composition.vitamin_b12 ?? 0, a.label).toBe(0);
    }
  });

  it('rattache chaque écart à une cause du contrat', () => {
    for (const gap of vegan.gaps) {
      expect(['diet_restriction', 'seasonality_restriction', 'no_source_available'])
        .toContain(gap.reason);
    }
  });

  it('propose malgré tout une liste exploitable', () => {
    expect(vegan.items.length).toBeGreaterThan(5);
  });

  it('ne signale que des nutriments réellement sous leur seuil', () => {
    for (const gap of vegan.gaps) {
      const coverage = vegan.coverage.find((c) => c.nutrient === gap.nutrient);
      expect(coverage?.meetsThreshold, gap.nutrient).toBe(false);
    }
  });
});


describe('bornes théoriques', () => {
  it('mesure ce qu\'un jeu d\'aliments peut au mieux fournir', () => {
    const vegan = filterBySeason(filterByDiet(foodsFixture, { base: 'vegan', exclusions: [] }), seasonalCodesByMonth.get(9)!);
    const b12Vegan = maxAchievable(vegan, 'vitamin_b12', 1);
    const b12All = maxAchievable(foodsFixture, 'vitamin_b12', 1);
    expect(b12Vegan).toBeLessThan(b12All);
  });
});

describe('période hebdomadaire', () => {
  it('multiplie les bornes par sept', () => {
    const week = plan({ base: 'omnivore', exclusions: [] }, 9, 'week');
    const byCode = new Map(foodsFixture.map((f) => [f.code, f]));
    expect(week.period).toBe('week');
    for (const item of week.items) {
      expect(item.quantityG).toBeLessThanOrEqual(byCode.get(item.foodCode)!.maxQtyG * 7 + 1);
    }
  });
});
