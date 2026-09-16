/** Vérification du plan complet sur données réelles, tous régimes. */
import { computeNeeds } from '../src/domain/needs';
import { energyReference } from '../src/data/reference/energy';
import { buildIngredientPlan } from '../src/domain/plan';
import { fetchFoods, fetchNutrients, fetchReferenceIntakes, fetchSeasonalFoodCodes } from '../src/data/repositories/reference';
import type { Diet, Profile } from '../src/domain/types';

const profile: Profile = { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active' };
const generatedAt = new Date('2026-09-13T10:00:00Z');

const main = async () => {
  const [nutrients, intakes, allFoods, seasonalCodes] = await Promise.all([
    fetchNutrients(), fetchReferenceIntakes('male', 35), fetchFoods(), fetchSeasonalFoodCodes(9),
  ]);
  const needs = computeNeeds(profile, { nutrients, intakes, energy: energyReference });

  for (const diet of [
    { base: 'omnivore', exclusions: [] },
    { base: 'vegetarian', exclusions: [] },
    { base: 'vegan', exclusions: [] },
    { base: 'vegan', exclusions: ['gluten'] },
  ] as Diet[]) {
    const started = Date.now();
    const plan = buildIngredientPlan({
      needs: needs.daily, nutrients, allFoods, seasonalCodes, diet, period: 'day',
      generatedAt, referenceVersions: needs.referenceVersions,
    });
    const label = diet.base + (diet.exclusions.length ? '/' + diet.exclusions.join('+') : '');
    const covered = plan.coverage.filter((c) => c.meetsThreshold).length;
    console.log(
      '\n=== ' + label + ' === ' + (Date.now() - started) + ' ms',
      '\n  aliments: ' + plan.items.length,
      '| couverts: ' + covered + '/' + plan.coverage.length,
      '| écarts: ' + plan.gaps.length,
    );
    for (const gap of plan.gaps) {
      console.log('   écart ' + gap.nutrient.padEnd(14) + Math.round(gap.ratio * 100) + '% — ' + gap.reason);
    }
    console.log('   exemples: ' + plan.items.slice(0, 4).map((i) => i.displayQuantity.value + ' x ' + i.displayQuantity.unit + ' ' + i.label.split(',')[0]).join(' | '));
    const produce = plan.items.filter((i) => i.isSeasonalProduce !== undefined);
    const produceGrams = produce.reduce((t, i) => t + i.quantityG, 0);
    console.log('   fruits/légumes: ' + produce.length + ' aliments, ' + produceGrams + ' g au total, tous de saison: ' + produce.every((i) => i.isSeasonalProduce));
    console.log('   masse totale de la liste: ' + plan.items.reduce((t, i) => t + i.quantityG, 0) + ' g');
  }
};

main().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
