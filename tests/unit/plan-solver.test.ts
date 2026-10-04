import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildConsumptionModel, buildIngredientPlan, minimumLineG, thresholdFor } from '@/domain/plan';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import { filterByDiet } from '@/domain/diet/filter';
import type { Diet, Food, IngredientPlan, Period, Profile } from '@/domain/types';
import {
  consumptionModelFixture,
  foodsFixture,
  intakesFixture,
  nutrientsFixture,
  seasonalCodesByMonth,
  upperLimitsFixture,
} from './fixtures/reference';

/**
 * Liste d'ingrédients selon le modèle de consommation de l'ANSES (feature 004).
 *
 * Jouée sur le catalogue et les paramètres réels: critère de l'ANSES, garde-fous
 * (plafond énergétique, intervalles de référence, limites de sécurité), écarts
 * au taux de la liste livrée, régimes qui excluent des sous-groupes, liste
 * achetable telle quelle.
 */
const male: Profile = { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active' };
const female: Profile = { weightKg: 60, heightCm: 165, age: 35, referenceSex: 'female', activityLevel: 'low_active' };
const generatedAt = new Date('2026-09-13T10:00:00Z');
const foodByCode = new Map(foodsFixture.map((f) => [f.code, f]));
const subgroupByCode = new Map(consumptionModelFixture.map((g) => [g.code, g]));

const needsFor = (profile: Profile) => {
  const intakes = intakesFixture.filter(
    (i) => i.referenceSex === profile.referenceSex && i.ageMin <= profile.age && i.ageMax >= profile.age);
  return computeNeeds(profile, { nutrients: nutrientsFixture, intakes, energy: energyReference });
};

const plan = (diet: Diet, profile = male, month = 9, period: Period = 'day', allFoods: Food[] = foodsFixture) => {
  const needs = needsFor(profile);
  return buildIngredientPlan({
    needs: period === 'day' ? needs.daily : needs.weekly,
    nutrients: nutrientsFixture,
    allFoods,
    seasonalCodes: seasonalCodesByMonth.get(month)!,
    diet,
    period,
    referenceSex: profile.referenceSex,
    subgroups: consumptionModelFixture,
    upperLimits: upperLimitsFixture,
    generatedAt,
    referenceVersions: needs.referenceVersions,
  });
};

const gramsBySubgroup = (result: IngredientPlan) => {
  const grams = new Map<string, number>();
  for (const item of result.items) {
    const code = foodByCode.get(item.foodCode)!.ansesSubgroup!;
    grams.set(code, (grams.get(code) ?? 0) + item.quantityG);
  }
  return grams;
};

/**
 * Bornes d'un sous-groupe pour un profil: celles de l'ANSES, proportionnées au
 * besoin énergétique du profil (calibrées sur 2 600 / 2 100 kcal), sauf les
 * plafonds épidémiologiques des sous-groupes à défavoriser.
 */
const boundsFor = (code: string, profile: Profile, periodFactor = 1) => {
  const g = subgroupByCode.get(code)!;
  const p = g.bySex[profile.referenceSex];
  const energy = needsFor(profile).daily.find((n) => n.nutrient === 'energy')!.value;
  const scale = energy / g.referenceEnergyKcal[profile.referenceSex];
  const upperScale = g.direction === 'minimize' ? 1 : scale;
  return {
    lower: p.lower * scale * periodFactor,
    upper: p.upper === null ? null : p.upper * upperScale * periodFactor,
  };
};

const omnivore: Diet = { base: 'omnivore', exclusions: [] };
const omnivoreMale = plan(omnivore);

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

describe('une liste qui ressemble à ce qu\'on mange (US1)', () => {
  it('ne propose ni algue ni aliment sans sous-groupe (FR-309, SC-001)', () => {
    expect(omnivoreMale.items.length).toBeGreaterThan(0);
    for (const item of omnivoreMale.items) {
      expect(foodByCode.get(item.foodCode)!.ansesSubgroup, item.label).not.toBeNull();
      expect(item.label).not.toMatch(/algue|spirulin|kombu|nori|dulse/i);
    }
  });

  it('garde chaque sous-groupe dans les bornes de l\'ANSES du sexe du profil (FR-304, SC-002)', () => {
    for (const [result, profile] of [[omnivoreMale, male], [plan(omnivore, female), female]] as const) {
      for (const [code, grams] of gramsBySubgroup(result)) {
        const b = boundsFor(code, profile);
        expect(grams, `${profile.referenceSex} ${code}`).toBeGreaterThanOrEqual(b.lower - 1);
        if (b.upper !== null) expect(grams, `${profile.referenceSex} ${code}`).toBeLessThanOrEqual(b.upper + 1);
      }
    }
  });

  it('plafonne la viande hors volaille à 71 g et la charcuterie à 25 g (FR-305)', () => {
    const grams = gramsBySubgroup(omnivoreMale);
    expect(grams.get('viande_hors_volaille') ?? 0).toBeLessThanOrEqual(71 + 1);
    expect(grams.get('charcuterie') ?? 0).toBeLessThanOrEqual(25 + 1);
  });

  it('fournit au moins 400 g de fruits et légumes sans plancher imposé (SC-003)', () => {
    const grams = gramsBySubgroup(omnivoreMale);
    expect((grams.get('fruits_frais') ?? 0) + (grams.get('legumes') ?? 0)).toBeGreaterThanOrEqual(400);
  });

  it('représente au moins huit sous-groupes (SC-004)', () => {
    expect(gramsBySubgroup(omnivoreMale).size).toBeGreaterThanOrEqual(8);
  });

  it('ne propose que des fruits et légumes de saison (FR-014)', () => {
    for (const item of omnivoreMale.items) {
      if (item.isSeasonalProduce !== undefined) expect(item.isSeasonalProduce, item.label).toBe(true);
    }
  });

  it('couvre chaque nutriment du référentiel dans le détail de couverture (FR-015)', () => {
    expect(omnivoreMale.coverage).toHaveLength(nutrientsFixture.length);
  });

  it('ne garde dans le calcul aucun seuil en grammes propre au projet (SC-006)', () => {
    const solver = readFileSync('src/domain/plan/solver.ts', 'utf8');
    expect(solver).not.toMatch(/CATEGORY_DAILY_CAP_G|PRODUCE_FLOOR_G_PER_DAY/);
  });
});

describe('garde-fous (US4)', () => {
  const lists: [string, IngredientPlan][] = [
    ['omnivore', omnivoreMale],
    ['végane', plan({ base: 'vegan', exclusions: [] })],
    ['végétarien sans gluten, lactose ni fruits à coque, février', plan({ base: 'vegetarian', exclusions: ['gluten', 'lactose', 'nuts'] }, male, 2)],
    // Le cas où le simplexe rendait −589 g d'un légume: la liste affichée
    // dépassait alors le plafond énergétique et la borne des légumes.
    ['végane, 45 kg très actif, juillet', plan({ base: 'vegan', exclusions: [] },
      { weightKg: 45, heightCm: 170, age: 30, referenceSex: 'male', activityLevel: 'very_active' }, 7)],
  ];

  it('garde l\'énergie entre 100 % et 110 % du besoin, ou la signale en écart', () => {
    for (const [label, result] of lists) {
      const energy = result.coverage.find((c) => c.nutrient === 'energy')!;
      expect(energy.ratio, label).toBeLessThanOrEqual(1.1 + 1e-6);
      if (energy.ratio < 1 - 1e-3) expect(result.gaps.some((g) => g.nutrient === 'energy'), label).toBe(true);
    }
  });

  it('ne dépasse jamais la borne haute d\'une référence en intervalle (FR-317)', () => {
    const needs = needsFor(male).daily;
    for (const [label, result] of lists) {
      for (const need of needs.filter((n) => n.valueMax !== undefined)) {
        const provided = result.coverage.find((c) => c.nutrient === need.nutrient)!.provided;
        expect(provided, `${label} ${need.nutrient}`).toBeLessThanOrEqual(need.valueMax! * 1.001);
      }
    }
  });

  it('ne dépasse aucune limite de sécurité, iode compris (FR-316)', () => {
    for (const [label, result] of lists) {
      for (const limit of upperLimitsFixture) {
        const provided = result.items.reduce(
          (sum, i) => sum + ((foodByCode.get(i.foodCode)!.composition[limit.nutrientCode] ?? 0) / 100) * i.quantityG, 0);
        expect(provided, `${label} ${limit.nutrientCode}`).toBeLessThanOrEqual(limit.value * 1.01);
      }
    }
  });

  it('donne à chaque écart le taux de la couverture affichée (FR-320, SC-010)', () => {
    for (const [label, result] of lists) {
      for (const gap of result.gaps) {
        const entry = result.coverage.find((c) => c.nutrient === gap.nutrient)!;
        expect(gap.ratio, `${label} ${gap.nutrient}`).toBe(entry.ratio);
        expect(entry.meetsThreshold, `${label} ${gap.nutrient}`).toBe(false);
      }
    }
  });

  it('rend une liste, plafond énergétique tenu, même quand un nutriment est hors d\'atteinte', () => {
    // Catalogue réduit aux fruits, légumes et féculents: ni B12 ni vitamine D.
    const restricted = foodsFixture.filter((f) =>
      ['fruits_frais', 'legumes', 'autres_feculents_raffines', 'pain_raffine'].includes(f.ansesSubgroup ?? ''));
    const result = plan(omnivore, male, 9, 'day', restricted);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.gaps.map((g) => g.nutrient)).toContain('vitamin_b12');
    const energy = result.coverage.find((c) => c.nutrient === 'energy')!;
    expect(energy.ratio).toBeLessThanOrEqual(1.1 + 1e-6);
  });
});

describe('mise à l\'échelle énergétique', () => {
  it('proportionne les bornes au besoin énergétique, sauf les plafonds épidémiologiques', () => {
    const proposable = foodsFixture.filter((f) => f.ansesSubgroup !== null);
    const model = (energyNeedKcal: number) => buildConsumptionModel({
      subgroups: consumptionModelFixture, referenceSex: 'male', periodFactor: 1, energyNeedKcal,
      candidates: proposable, dietCompatible: proposable, allFoods: proposable,
    });
    const at = (m: ReturnType<typeof model>, code: string) => m.subgroups.find((g) => g.code === code)!;
    const reference = model(2600);
    const doubled = model(5200);
    expect(at(reference, 'legumes').upper).toBe(285);
    expect(at(doubled, 'legumes').upper).toBeCloseTo(570);
    expect(at(doubled, 'legumes').mean).toBeCloseTo(246);
    expect(at(doubled, 'viande_hors_volaille').upper).toBe(71);
  });

  it('permet à un profil très actif d\'atteindre son besoin énergétique', () => {
    const big: Profile = { weightKg: 110, heightCm: 185, age: 30, referenceSex: 'male', activityLevel: 'very_active' };
    const energy = plan(omnivore, big).coverage.find((c) => c.nutrient === 'energy')!;
    expect(energy.meetsThreshold).toBe(true);
  });
});

describe('régimes qui excluent des sous-groupes (US2)', () => {
  const modelFor = (diet: Diet) => {
    const proposable = foodsFixture.filter((f) => f.ansesSubgroup !== null);
    const compatible = filterByDiet(proposable, diet);
    return buildConsumptionModel({
      subgroups: consumptionModelFixture, referenceSex: 'male', periodFactor: 1, energyNeedKcal: 2600,
      candidates: compatible, dietCompatible: compatible, allFoods: proposable,
    });
  };

  it('retire viande, volaille et poissons d\'un régime végétarien, et lève la borne des légumineuses', () => {
    const model = modelFor({ base: 'vegetarian', exclusions: [] });
    const active = new Map(model.subgroups.map((g) => [g.code, g]));
    for (const code of ['viande_hors_volaille', 'volaille', 'poissons_gras', 'autres_poissons']) {
      expect(model.excluded, code).toContain(code);
      expect(active.has(code), code).toBe(false);
    }
    expect(active.get('legumineuses')!.upper).toBeNull();
  });

  it('garde le lait pour un régime végane, alimenté par les boissons végétales, sans borne haute', () => {
    const model = modelFor({ base: 'vegan', exclusions: [] });
    const lait = model.subgroups.find((g) => g.code === 'lait')!;
    expect(lait.upper).toBeNull();
    for (const code of lait.foods) expect(foodByCode.get(code)!.isSubstitute, code).toBe(true);
  });

  it('laisse les bornes de l\'ANSES intactes pour un omnivore', () => {
    const model = modelFor(omnivore);
    expect(model.excluded).toEqual([]);
    expect(model.subgroups.find((g) => g.code === 'legumineuses')!.upper).toBe(64);
  });

  it('signale la vitamine B12 d\'un régime végane comme écart dû au régime', () => {
    const vegan = plan({ base: 'vegan', exclusions: [] });
    const b12 = vegan.gaps.find((g) => g.nutrient === 'vitamin_b12');
    expect(b12?.reason).toBe('diet_restriction');
    expect(vegan.items.length).toBeGreaterThan(5);
  });

  it('ne crédite aucune algue d\'une teneur en vitamine B12', () => {
    // Verrou sur la donnée: la table 2025 a retiré la pseudo-B12 des algues, que
    // l'organisme n'assimile pas. Les algues ne sont de toute façon plus
    // proposables, mais un millésime qui la réintroduirait doit se voir.
    const algues = foodsFixture.filter((f) =>
      /algue|dulse|nori|kombu|wakam|laitue de mer|ascophylle|spiruline/i.test(f.label));
    expect(algues.length).toBeGreaterThan(0);
    for (const a of algues) expect(a.composition.vitamin_b12 ?? 0, a.label).toBe(0);
  });
});

describe('liste achetable telle quelle (US5)', () => {
  const lists = [omnivoreMale, plan({ base: 'vegan', exclusions: [] }), plan(omnivore, female, 1)];

  it('ne garde qu\'une variante par famille (FR-322)', () => {
    for (const result of lists) {
      const families = result.items.map((i) => foodByCode.get(i.foodCode)!.family);
      expect(new Set(families).size).toBe(families.length);
    }
  });

  it('ne porte aucune ligne sous la demi-unité d\'achat (FR-323)', () => {
    for (const result of lists) {
      for (const item of result.items) {
        expect(item.quantityG, item.label).toBeGreaterThanOrEqual(Math.floor(minimumLineG(foodByCode.get(item.foodCode)!)));
      }
    }
  });
});

describe('période hebdomadaire', () => {
  const week = plan(omnivore, male, 9, 'week');

  it('multiplie les bornes par aliment par sept', () => {
    expect(week.period).toBe('week');
    for (const item of week.items) {
      expect(item.quantityG).toBeLessThanOrEqual(foodByCode.get(item.foodCode)!.maxQtyG * 7 + 1);
    }
  });

  it('multiplie les bornes des sous-groupes par sept', () => {
    for (const [code, grams] of gramsBySubgroup(week)) {
      const b = boundsFor(code, male, 7);
      if (b.upper !== null) expect(grams, code).toBeLessThanOrEqual(b.upper + 1);
    }
  });
});
