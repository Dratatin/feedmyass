/**
 * Simulation large: profils x régimes x exclusions x mois x période (feature 004, FR-314).
 *
 * Génère 1 408 listes sur les données réelles du dépôt et contrôle chacune:
 * compatibilité de régime, saisonnalité, plafond par aliment, plafond
 * énergétique, intervalles de référence, cohérence écarts / couverture, temps de
 * calcul. Les incohérences sont agrégées par type, avec des exemples.
 *
 * C'est cette simulation qui a mis au jour, le 2026-10-04, les algues de toutes
 * les listes, l'iode à 128 fois sa limite de sécurité et la relaxation qui lève
 * le plafond énergétique. Elle sert de vérification aux critères de succès.
 *
 * Usage: npm run simulate:plans -- [fichier-de-sortie.json]
 */
import fs from 'node:fs';
import { buildIngredientPlan } from '@/domain/plan';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import { isCompatibleWithDiet } from '@/domain/diet/filter';
import type { ActivityLevel, Diet, DietBase, Exclusion, Profile, ReferenceSex } from '@/domain/types';
import {
  foodsFixture,
  intakesFixture,
  nutrientsFixture,
  seasonalCodesByMonth,
  seasonMonthsByFood,
} from '../tests/unit/fixtures/reference';

const foodByCode = new Map(foodsFixture.map((f) => [f.code, f]));
const OUT = process.argv[2] ?? 'simulation.json';

const bases: DietBase[] = ['omnivore', 'pescetarian', 'vegetarian', 'vegan'];
const exclusionSets: Exclusion[][] = [[], ['gluten'], ['lactose'], ['nuts'], ['gluten', 'lactose', 'nuts']];
const diets: Diet[] = bases.flatMap((base) => exclusionSets.map((exclusions) => ({ base, exclusions })));
const dietLabel = (d: Diet) => d.base + (d.exclusions.length ? '/' + d.exclusions.join('+') : '');

type Run = {
  profile: Profile; diet: Diet; month: number; period: 'day' | 'week';
};
const runs: Run[] = [];
const refProfiles: Profile[] = [
  { weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active' },
  { weightKg: 60, heightCm: 165, age: 35, referenceSex: 'female', activityLevel: 'low_active' },
];
// Grille 1: régimes x mois, profils de référence, jour
for (const profile of refProfiles) for (const diet of diets) for (let m = 1; m <= 12; m++) runs.push({ profile, diet, month: m, period: 'day' });
// Grille 2: balayage des profils, 4 régimes de base, janvier et juillet
const sexes: ReferenceSex[] = ['male', 'female'];
const levels: ActivityLevel[] = ['sedentary', 'low_active', 'active', 'very_active'];
for (const referenceSex of sexes) for (const age of [18, 30, 50, 70]) for (const weightKg of [45, 70, 110]) for (const activityLevel of levels)
  for (const base of bases) for (const month of [1, 7])
    runs.push({ profile: { weightKg, heightCm: 170, age, referenceSex, activityLevel }, diet: { base, exclusions: [] }, month, period: 'day' });
// Grille 3: semaine
for (const profile of refProfiles) for (const diet of diets) for (const month of [1, 4, 7, 10]) runs.push({ profile, diet, month, period: 'week' });

type Issue = { type: string; detail: string; run: string };
const issues: Issue[] = [];
const itemFreq = new Map<string, number>();
const categoryTotals: Record<string, number[]> = {};
const timings: number[] = [];
const results: unknown[] = [];

const runLabel = (r: Run) => `${r.profile.referenceSex}/${r.profile.age}a/${r.profile.weightKg}kg/${r.profile.activityLevel} ${dietLabel(r.diet)} m${r.month} ${r.period}`;

const needsCache = new Map<string, ReturnType<typeof computeNeeds>>();
for (const r of runs) {
  const key = JSON.stringify(r.profile);
  let needs = needsCache.get(key);
  if (!needs) {
    const intakes = intakesFixture.filter((i) => i.referenceSex === r.profile.referenceSex && i.ageMin <= r.profile.age && i.ageMax >= r.profile.age);
    needs = computeNeeds(r.profile, { nutrients: nutrientsFixture, intakes, energy: energyReference });
    needsCache.set(key, needs);
  }
  const seasonalCodes = seasonalCodesByMonth.get(r.month)!;
  const t0 = Date.now();
  let plan;
  try {
    plan = buildIngredientPlan({
      needs: r.period === 'week' ? needs.weekly : needs.daily,
      nutrients: nutrientsFixture, allFoods: foodsFixture, seasonalCodes, seasonMonthsByFood,
      diet: r.diet, period: r.period, generatedAt: new Date('2026-10-04T10:00:00Z'), referenceVersions: needs.referenceVersions,
    });
  } catch (e) {
    issues.push({ type: 'exception', detail: String(e), run: runLabel(r) });
    continue;
  }
  const ms = Date.now() - t0;
  timings.push(ms);
  const L = runLabel(r);
  const pf = r.period === 'week' ? 7 : 1;
  if (ms > 1000) issues.push({ type: 'lent', detail: `${ms} ms`, run: L });
  if (plan.items.length === 0) issues.push({ type: 'liste_vide', detail: '', run: L });

  const cat: Record<string, number> = {};
  for (const item of plan.items) {
    const food = foodByCode.get(item.foodCode)!;
    itemFreq.set(food.label, (itemFreq.get(food.label) ?? 0) + 1);
    cat[food.category] = (cat[food.category] ?? 0) + item.quantityG / pf;
    if (!isCompatibleWithDiet(food, r.diet)) issues.push({ type: 'regime_incompatible', detail: food.label, run: L });
    if (food.isFruitVegetable && !seasonalCodes.has(food.code)) issues.push({ type: 'hors_saison', detail: food.label, run: L });
    if (item.quantityG > food.maxQtyG * pf + 0.5) issues.push({ type: 'depasse_max', detail: `${food.label} ${item.quantityG} > ${food.maxQtyG * pf}`, run: L });
    const shown = item.displayQuantity.unit === 'g' ? item.displayQuantity.value : item.displayQuantity.value * food.unitGrams;
    if (Math.abs(shown - item.quantityG) / Math.max(item.quantityG, 1) > 0.35 && Math.abs(shown - item.quantityG) > 5)
      issues.push({ type: 'affichage_ecart', detail: `${food.label}: ${item.quantityG} g affiché ${item.displayQuantity.value} x ${item.displayQuantity.unit}`, run: L });
    // FR-323 de la 004: au moins une demi-unité d'achat sur la période.
    if (item.quantityG < (food.unitGrams * pf) / 2 - 0.5)
      issues.push({ type: 'sous_demi_portion', detail: `${food.label}: ${item.quantityG} g (unité ${food.unitGrams} g)`, run: L });
    if (/alg|spirul|kombu|nori|dulse|wakam|goémon|laitue de mer/i.test(food.label)) issues.push({ type: 'algue', detail: food.label, run: L });
  }
  for (const [c, g] of Object.entries(cat)) (categoryTotals[c] ??= []).push(g);

  const energy = plan.coverage.find((c) => c.nutrient === 'energy');
  if (energy && (energy.ratio < 0.999 || energy.ratio > 1.101)) issues.push({ type: 'energie_hors_cible', detail: energy.ratio.toFixed(3), run: L });
  for (const c of plan.coverage) {
    const need = (r.period === 'week' ? needs.weekly : needs.daily).find((n) => n.nutrient === c.nutrient);
    if (need?.valueMax !== undefined && c.provided > need.valueMax * 1.001) issues.push({ type: 'depasse_borne_haute', detail: `${c.nutrient} ${c.provided.toFixed(0)} > ${need.valueMax.toFixed(0)}`, run: L });
    const isGap = plan.gaps.some((g) => g.nutrient === c.nutrient);
    if (!c.meetsThreshold && !isGap) issues.push({ type: 'sous_seuil_non_signale', detail: `${c.nutrient} ${(c.ratio * 100).toFixed(0)}%`, run: L });
    if (c.meetsThreshold && isGap) issues.push({ type: 'ecart_signale_mais_couvert', detail: `${c.nutrient} ${(c.ratio * 100).toFixed(0)}%`, run: L });
    if (c.ratio > 3 && c.nutrient !== 'vitamin_k' ) issues.push({ type: 'surcouverture_x3', detail: `${c.nutrient} ${(c.ratio * 100).toFixed(0)}%`, run: L });
  }
  for (const g of plan.gaps) issues.push({ type: 'ecart:' + g.nutrient + ':' + g.reason, detail: (g.ratio * 100).toFixed(0) + '%', run: L });
  results.push({ run: L, ms, items: plan.items.map((i) => `${i.quantityG}g ${i.label}`), gaps: plan.gaps });
}

// Invariant principe III: besoins identiques quel que soit le régime -> par construction (computeNeeds ne reçoit pas le régime).

const summary: Record<string, { count: number; examples: string[] }> = {};
for (const i of issues) {
  const s = (summary[i.type] ??= { count: 0, examples: [] });
  s.count++;
  if (s.examples.length < 6) s.examples.push(`${i.detail} — ${i.run}`);
}
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)] ?? 0; };
const catStats = Object.fromEntries(Object.entries(categoryTotals).map(([c, a]) => [c, { n: a.length, p50: Math.round(pct(a, 0.5)), p95: Math.round(pct(a, 0.95)), max: Math.round(Math.max(...a)) }]));
const topItems = [...itemFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);

fs.writeFileSync(OUT, JSON.stringify({ runs: runs.length, summary, catStats, topItems, timing: { p50: pct(timings, 0.5), p95: pct(timings, 0.95), max: Math.max(...timings) }, results }, null, 1));
console.log('runs', runs.length, 'timing', pct(timings, 0.5), pct(timings, 0.95), Math.max(...timings));
for (const [t, s] of Object.entries(summary).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`\n[${s.count}] ${t}`);
  for (const e of s.examples.slice(0, 4)) console.log('   ' + e);
}
console.log('\nCATEGORIES g/j (p50/p95/max, n listes):');
for (const [c, s] of Object.entries(catStats)) console.log(`  ${c.padEnd(20)} ${s.p50}/${s.p95}/${s.max}  n=${s.n}`);
console.log('\nTOP ALIMENTS:');
console.log(topItems.map(([l, n]) => `${n} ${l}`).join('\n'));
