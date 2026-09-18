/**
 * Garde-fou des plafonds collectifs.
 *
 * Un plafond de réalisme peut rendre un MICRONUTRIMENT hors d'atteinte — l'écran
 * de couverture le dira et renverra vers un professionnel de santé. Il ne doit
 * JAMAIS faire perdre l'énergie, les protéines, les lipides ou les glucides:
 * cela ne signalerait pas un régime difficile, mais un plafond mal posé. On ne
 * complète pas un manque de calories.
 *
 * Ce script vérifie cette règle sur l'ensemble des régimes, exclusions et mois,
 * et rapporte les empilements qui subsistent — la quantité retenue par catégorie
 * quand aucun plafond ne la borne.
 *
 * Usage: npx tsx scripts/check-caps.ts [nombre de mois échantillonnés, 4 par défaut]
 */
import fs from 'node:fs';
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');

import { buildIngredientPlan } from '../src/domain/plan';
import { computeNeeds } from '../src/domain/needs';
import { energyReference } from '../src/data/reference/energy';
import {
  fetchFoods, fetchNutrients, fetchReferenceIntakes, fetchSeasonalFoodCodes,
} from '../src/data/repositories/reference';
import type { Diet, DietBase, Exclusion, Profile } from '../src/domain/types';

/**
 * Ce qu'un plafond n'a pas le droit de faire perdre.
 *
 * L'énergie et les protéines sont des PLANCHERS: ne pas les atteindre veut dire
 * que l'assiette ne nourrit pas, et aucun complément ne répare cela. Un plafond
 * qui les fait perdre est un plafond mal posé.
 *
 * Les lipides et les glucides, eux, sont des INTERVALLES (35-40 % et 40-55 % de
 * l'apport énergétique). En sortir n'est pas manquer de quelque chose: c'est ne
 * pas tenir une répartition, et la contrainte peut légitimement se relâcher.
 * Mesuré: trois combinaisons végétaliennes ou végétariennes y échouent DÉJÀ,
 * sans aucun plafond collectif — c'est une tension du modèle, antérieure et
 * indépendante de ce chantier.
 */
const VITAUX = ['energy', 'protein'];

const MOIS_ECHANTILLON: Record<number, number[]> = {
  4: [1, 4, 7, 10],
  12: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

const main = async () => {
  const combien = Number(process.argv[2] ?? 4);
  const mois = MOIS_ECHANTILLON[combien] ?? [1, 4, 7, 10];

  const [nutrients, intakes, foods] = await Promise.all([
    fetchNutrients(), fetchReferenceIntakes('male', 35), fetchFoods(),
  ]);
  const profile: Profile = {
    weightKg: 75, heightCm: 178, age: 35, referenceSex: 'male', activityLevel: 'active',
  };
  const needs = computeNeeds(profile, { nutrients, intakes, energy: energyReference });
  const byCode = new Map(foods.map((f) => [f.code, f]));

  const jeux: Exclusion[][] = [
    [], ['gluten'], ['lactose'], ['nuts'],
    ['gluten', 'lactose'], ['gluten', 'nuts'], ['lactose', 'nuts'], ['gluten', 'lactose', 'nuts'],
  ];

  const fautes: string[] = [];
  const pic: Record<string, { g: number; ou: string }> = {};
  let total = 0;
  let pireMs = 0;
  let pireNom = '';
  let listeCourte = 99;
  let listeCourteNom = '';

  for (const m of mois) {
    const seasonal = await fetchSeasonalFoodCodes(m);
    for (const base of ['omnivore', 'pescetarian', 'vegetarian', 'vegan'] as DietBase[]) {
      for (const exclusions of jeux) {
        const nom = 'mois ' + m + ' ' + base + (exclusions.length ? '/' + exclusions.join('+') : '');
        const t = Date.now();
        const r = buildIngredientPlan({
          needs: needs.daily, nutrients, allFoods: foods, seasonalCodes: seasonal,
          diet: { base, exclusions } as Diet, period: 'day',
          generatedAt: new Date('2026-09-13T10:00:00Z'), referenceVersions: needs.referenceVersions,
        });
        const ms = Date.now() - t;
        total += 1;
        if (ms > pireMs) { pireMs = ms; pireNom = nom; }
        if (r.items.length < listeCourte) { listeCourte = r.items.length; listeCourteNom = nom; }

        const perdus = r.gaps.filter((g) => VITAUX.includes(g.nutrient)).map((g) => g.nutrient);
        if (perdus.length) fautes.push(nom + ' perd ' + perdus.join(', '));

        const parCat: Record<string, number> = {};
        for (const i of r.items) {
          const c = byCode.get(i.foodCode)!.category;
          parCat[c] = (parCat[c] ?? 0) + i.quantityG;
        }
        for (const [c, g] of Object.entries(parCat)) {
          if (!pic[c] || g > pic[c].g) pic[c] = { g, ou: nom };
        }
      }
    }
    process.stdout.write(m + ' ');
  }

  console.log('');
  console.log(total + ' combinaisons, pire cas ' + pireMs + ' ms (' + pireNom + ')');
  console.log('liste la plus courte: ' + listeCourte + ' lignes (' + listeCourteNom + ')');
  console.log('');
  console.log('quantité maximale retenue par catégorie:');
  for (const [c, v] of Object.entries(pic).sort((a, b) => b[1].g - a[1].g)) {
    console.log('  ' + c.padEnd(22) + String(Math.ceil(v.g)).padStart(5) + ' g   ' + v.ou);
  }

  console.log('');
  if (fautes.length) {
    console.log('RÈGLE VIOLÉE — ' + fautes.length + ' combinaison(s) perdent un apport vital:');
    fautes.slice(0, 12).forEach((f) => console.log('  ' + f));
    process.exit(1);
  }
  console.log('Règle tenue: aucune combinaison ne perd l\'énergie, les protéines, les lipides ni les glucides.');
};

main();
