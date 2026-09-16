/** Mesure du solveur sur des données réelles avant d'écrire la relaxation. */
import { computeNeeds } from '../src/domain/needs';
import { energyReference } from '../src/data/reference/energy';
import { solvePlan, thresholdFor } from '../src/domain/plan/solver';
import { filterByDiet } from '../src/domain/diet/filter';
import { filterBySeason } from '../src/domain/seasonality/filter';
import { fetchFoods, fetchNutrients, fetchReferenceIntakes, fetchSeasonalFoodCodes } from '../src/data/repositories/reference';
import type { Diet, Profile } from '../src/domain/types';

const profile: Profile = { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active' };

const main = async () => {
  const [nutrients, intakes, foods, seasonal] = await Promise.all([
    fetchNutrients(),
    fetchReferenceIntakes('male', 35),
    fetchFoods(),
    fetchSeasonalFoodCodes(9),
  ]);
  const needs = computeNeeds(profile, { nutrients, intakes, energy: energyReference });

  for (const diet of [
    { base: 'omnivore', exclusions: [] },
    { base: 'vegan', exclusions: [] },
    { base: 'vegan', exclusions: ['gluten'] },
  ] as Diet[]) {
    const candidates = filterBySeason(filterByDiet(foods, diet), seasonal);
    const started = Date.now();
    const out = solvePlan({ needs: needs.daily, nutrients, candidates, periodFactor: 1 });
    const label = diet.base + (diet.exclusions.length ? '/' + diet.exclusions.join('+') : '');
    console.log(
      label.padEnd(16),
      'candidats=' + String(candidates.length).padStart(3),
      '| faisable=' + (out.feasible ? 'oui' : 'NON'),
      '| aliments retenus=' + out.quantitiesByFood.size,
      '| ' + (Date.now() - started) + ' ms',
    );
    if (out.feasible) {
      const top = [...out.quantitiesByFood.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [code, qty] of top) {
        console.log('     ', Math.round(qty) + ' g', foods.find((f) => f.code === code)?.label.slice(0, 50));
      }
      const total = [...out.quantitiesByFood.values()].reduce((s, v) => s + v, 0);
      console.log('      masse totale:', Math.round(total), 'g');
    }
  }
  console.log('seuils: énergie', thresholdFor(nutrients.find((n) => n.code === 'energy')!), '| iode', thresholdFor(nutrients.find((n) => n.code === 'iodine')!));
};

main().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
