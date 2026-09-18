/**
 * Construit src/data/reference/seasonality.json en rapprochant le calendrier de
 * saisonnalité des aliments du catalogue CIQUAL.
 *
 * Source du calendrier : docs/sources/calendrier_fruits_legumes_saison.json
 *                        (ADEME / Manger Bouger, France métropolitaine).
 * Usage : node scripts/build-seasonality.mjs
 *
 * Rapprochement sur le NOM D'ESPÈCE normalisé, en correspondance exacte, plus
 * une table d'alias explicite. Aucun rapprochement approximatif: mieux vaut un
 * aliment non apparié, visible dans le rapport, qu'un mois de saison attribué à
 * tort. Un aliment non apparié ne sera jamais proposé (FR-014).
 */
import fs from 'node:fs';
import {
  ALIASES,
  NEVER_IN_SEASON,
  loadCalendar,
  monthsBySpecies,
  speciesOf,
} from './lib/produce-calendar.mjs';

const calendar = loadCalendar();
const foodsFile = JSON.parse(fs.readFileSync('src/data/reference/foods.json', 'utf8'));

// Nom de saison -> mois. La table vient du module partagé avec le script de
// construction du catalogue: celui-ci s'en sert de critère de pertinence, et
// deux copies divergentes produiraient un aliment au catalogue sans aucun mois
// de saison, c'est-à-dire un aliment jamais proposable.
const monthsByName = monthsBySpecies(calendar);

const produce = foodsFile.foods.filter((f) => f.is_fruit_vegetable);
const rows = [];
const matchedNames = new Set();
const neverInSeason = [];
const unmatched = [];

for (const food of produce) {
  const species = speciesOf(food.label);
  const key = ALIASES[species] ?? species;

  if (NEVER_IN_SEASON.includes(species)) {
    neverInSeason.push(food.label);
    continue;
  }

  const months = monthsByName.get(key);
  if (!months) {
    unmatched.push(food.label + '  [espèce: ' + species + ']');
    continue;
  }
  matchedNames.add(key);
  for (const month of [...months].sort((a, b) => a - b)) {
    rows.push({ food_code: food.code, month });
  }
}

const unusedCalendarEntries = [...monthsByName.keys()].filter((n) => !matchedNames.has(n));

const out = {
  _meta: {
    description: 'Disponibilité mensuelle des fruits et légumes du catalogue, France métropolitaine.',
    source: calendar.source_officielle + ' — calendrier de saison, ' + calendar.fuseau_geographique,
    version: String(calendar.derniere_mise_a_jour),
    retrieved_at: '2026-09-13',
    generated_by: 'scripts/build-seasonality.mjs',
    notes: [
      "Absence de ligne pour un couple (aliment, mois) = hors saison ce mois-là (FR-014).",
      "Rapprochement par nom d'espèce normalisé, en correspondance exacte, complété par une table d'alias explicite pour les variétés (raisin blanc -> raisin, poivron rouge -> poivron, etc.).",
      'Sans saison en France métropolitaine, donc jamais proposés, et c\'est voulu: ' +
        (neverInSeason.length === 0 ? 'aucun' : neverInSeason.join(' ; ')),
      'Fruits ou légumes du catalogue sans correspondance, donc jamais proposables — à apparier ou à dépointer de is_fruit_vegetable: ' +
        (unmatched.length === 0 ? 'aucun' : unmatched.join(' ; ')),
      "Entrées du calendrier sans aliment correspondant au catalogue (information, sans effet sur l'application): " +
        (unusedCalendarEntries.length === 0 ? 'aucune' : unusedCalendarEntries.join(' ; ')),
    ],
  },
  seasonality: rows,
};

fs.writeFileSync('src/data/reference/seasonality.json', JSON.stringify(out, null, 2) + '\n');

console.log('fruits et légumes du catalogue :', produce.length);
console.log('  appariés                     :', produce.length - neverInSeason.length - unmatched.length);
console.log('  hors saison par nature       :', neverInSeason.length);
console.log('  sans correspondance          :', unmatched.length);
console.log('lignes de saisonnalité         :', rows.length);
if (unmatched.length) {
  console.log('\n--- sans correspondance ---');
  console.log(unmatched.join('\n'));
}
