/**
 * Mesure du catalogue et de ce qu'il permet de couvrir, par régime.
 *
 * Sert de référence de comparaison avant / après un changement de sélection
 * (feature 003, FR-216 et SC-007). Cette mesure DOIT être prise avant toute
 * modification de la sélection: une fois le catalogue changé, l'état antérieur
 * n'est plus reconstituable et la comparaison est perdue pour de bon.
 *
 * Usage:
 *   npm run measure:catalogue -- --out <fichier.json>
 *   npm run measure:catalogue -- --compare <avant.json> <apres.json>
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { buildIngredientPlan } from '../src/domain/plan';
import { computeNeeds } from '../src/domain/needs';
import { energyReference } from '../src/data/reference/energy';
import type { Diet, DietBase, Exclusion, Food, Profile } from '../src/domain/types';
import {
  foodsFixture,
  intakesFixture,
  nutrientsFixture,
  seasonalCodesByMonth,
} from '../tests/unit/fixtures/reference';

const CATALOGUE_PATH = 'src/data/reference/foods.json';

/**
 * Profil de mesure. Volontairement figé: la référence ne vaut que si les deux
 * mesures comparées portent sur le même profil et le même mois.
 */
const PROFILE: Profile = {
  weightKg: 75,
  heightCm: 178,
  age: 35,
  referenceSex: 'male',
  activityLevel: 'active',
};
const MONTH = 9;

/** Marge au-delà de laquelle une couverture cesse d'être « sur le fil ». */
const MARGE_MINIMALE = 1.05;

const DIETS: Diet[] = [];
for (const base of ['omnivore', 'pescetarian', 'vegetarian', 'vegan'] as DietBase[]) {
  for (const exclusions of [[], ['gluten'], ['lactose'], ['nuts'], ['gluten', 'nuts']] as Exclusion[][]) {
    DIETS.push({ base, exclusions });
  }
}

const dietLabel = (d: Diet) => d.base + (d.exclusions.length ? '/' + d.exclusions.join('+') : '');

type CoverageEntry = { ratio: number; meetsThreshold: boolean; surLeFil: boolean };
type DietMeasure = {
  couverture: Record<string, CoverageEntry>;
  ecarts: { nutriment: string; cause: string; ratio: number }[];
  ingredients: number;
};
type Measure = {
  mesure_le: string;
  catalogue: {
    fichier: string;
    empreinte_sha256: string;
    aliments: number;
    completude_moyenne: number;
    par_categorie: Record<string, number>;
  };
  profil: { profile: Profile; mois: number };
  regimes: Record<string, DietMeasure>;
};

function measure(): Measure {
  const raw = fs.readFileSync(CATALOGUE_PATH);
  const foods: Food[] = foodsFixture;
  const needs = computeNeeds(PROFILE, {
    nutrients: nutrientsFixture,
    intakes: intakesFixture,
    energy: energyReference,
  });

  const parCategorie: Record<string, number> = {};
  let completude = 0;
  for (const f of foods) {
    parCategorie[f.category] = (parCategorie[f.category] ?? 0) + 1;
    completude += Object.keys(f.composition).length;
  }

  const regimes: Record<string, DietMeasure> = {};
  for (const diet of DIETS) {
    const plan = buildIngredientPlan({
      needs: needs.daily,
      nutrients: nutrientsFixture,
      allFoods: foods,
      seasonalCodes: seasonalCodesByMonth.get(MONTH)!,
      diet,
      period: 'day',
      generatedAt: new Date('2026-09-13T10:00:00Z'),
      referenceVersions: needs.referenceVersions,
    });
    const couverture: Record<string, CoverageEntry> = {};
    for (const c of plan.coverage) {
      couverture[c.nutrient] = {
        ratio: Number(c.ratio.toFixed(4)),
        meetsThreshold: c.meetsThreshold,
        // Une couverture atteinte de justesse n'est pas un acquis: elle bascule
        // au premier changement de borne. La distinguer évite de présenter une
        // coïncidence comme une amélioration.
        //
        // La marge se mesure par rapport au SEUIL du nutriment, pas par rapport
        // à 1: les micronutriments non prioritaires ont un seuil de 0,8, et une
        // couverture de 0,80 y est atteinte, pas fragile.
        surLeFil: c.meetsThreshold && c.ratio < c.threshold * MARGE_MINIMALE,
      };
    }
    regimes[dietLabel(diet)] = {
      couverture,
      ecarts: plan.gaps.map((g) => ({
        nutriment: g.nutrient,
        cause: g.reason,
        ratio: Number(g.ratio.toFixed(4)),
      })),
      ingredients: plan.items.length,
    };
  }

  return {
    mesure_le: new Date().toISOString().slice(0, 10),
    catalogue: {
      fichier: CATALOGUE_PATH,
      empreinte_sha256: crypto.createHash('sha256').update(raw).digest('hex'),
      aliments: foods.length,
      completude_moyenne: Number((completude / foods.length).toFixed(2)),
      par_categorie: parCategorie,
    },
    profil: { profile: PROFILE, mois: MONTH },
    regimes,
  };
}

function compare(avantPath: string, apresPath: string): number {
  const avant: Measure = JSON.parse(fs.readFileSync(avantPath, 'utf8'));
  const apres: Measure = JSON.parse(fs.readFileSync(apresPath, 'utf8'));

  console.log('Catalogue : ' + avant.catalogue.aliments + ' -> ' + apres.catalogue.aliments + ' aliments');
  console.log('Complétude: ' + avant.catalogue.completude_moyenne + ' -> ' + apres.catalogue.completude_moyenne + ' nutriments sur 26');
  console.log('');

  let regressions = 0;
  for (const [regime, apresM] of Object.entries(apres.regimes)) {
    const avantM = avant.regimes[regime];
    if (!avantM) continue;
    const lignes: string[] = [];

    for (const [nutriment, a] of Object.entries(avantM.couverture)) {
      const b = apresM.couverture[nutriment];
      if (!b) continue;
      if (a.meetsThreshold && !b.meetsThreshold) {
        lignes.push('  RÉGRESSION ' + nutriment + ' : seuil atteint -> non atteint (' + a.ratio + ' -> ' + b.ratio + ')');
        regressions += 1;
      } else if (!a.meetsThreshold && b.meetsThreshold) {
        lignes.push('  écart refermé ' + nutriment + ' : ' + a.ratio + ' -> ' + b.ratio +
          (b.surLeFil ? '  ⚠ SUR LE FIL, aucune marge' : ''));
      } else if (b.meetsThreshold && !a.surLeFil && b.surLeFil) {
        lignes.push('  ⚠ ' + nutriment + ' passe de couvert avec marge à couvert sur le fil (' + a.ratio + ' -> ' + b.ratio + ')');
      }
    }
    if (lignes.length) {
      console.log(regime);
      lignes.forEach((l) => console.log(l));
      console.log('');
    }
  }

  if (regressions > 0) {
    console.error(regressions + ' régression(s) de couverture — FR-216 non tenue.');
    return 1;
  }
  console.log('Aucune régression de couverture.');
  return 0;
}

const argv = process.argv.slice(2);
const compareIdx = argv.indexOf('--compare');
if (compareIdx >= 0) {
  const [avant, apres] = argv.slice(compareIdx + 1);
  if (!avant || !apres) {
    console.error('Usage: --compare <avant.json> <apres.json>');
    process.exit(1);
  }
  process.exit(compare(avant, apres));
}

const outIdx = argv.indexOf('--out');
const outPath = outIdx >= 0 ? argv[outIdx + 1] : undefined;
const result = measure();
const json = JSON.stringify(result, null, 2) + '\n';
if (outPath) {
  fs.mkdirSync(outPath.replace(/[^/\\]+$/, '') || '.', { recursive: true });
  fs.writeFileSync(outPath, json);
  console.log('Mesure écrite dans ' + outPath);
} else {
  process.stdout.write(json);
}
console.log('Aliments : ' + result.catalogue.aliments + ' | complétude moyenne : ' + result.catalogue.completude_moyenne);
for (const [regime, m] of Object.entries(result.regimes)) {
  if (m.ecarts.length) console.log('  écarts ' + regime + ' : ' + m.ecarts.map((e) => e.nutriment).join(', '));
}
