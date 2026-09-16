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

const MONTHS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

/**
 * Variétés et synonymes du catalogue CIQUAL rattachés à l'entrée générique du
 * calendrier. Table explicite et relisible: chaque ligne est une décision.
 */
const ALIASES = {
  'clementine ou mandarine': 'clementine',
  'melon cantaloup': 'melon',
  'melon miel ou melon honeydew': 'melon',
  'pomme canada': 'pomme',
  'prune reine claude': 'prune',
  'raisin blanc': 'raisin',
  'raisin noir': 'raisin',
  'mure noire': 'mure',
  'groseille a maquereau': 'groseille',
  'bette ou blette': 'bette',
  'betterave rouge': 'betterave',
  'champignon de paris ou champignon de couche': 'champignon de paris',
  champignon: 'champignons cultives',
  'chou chinois ou pak choi ou pe tsai': 'chou',
  'chou vert': 'chou',
  'chou rave': 'chou',
  'cresson de fontaine': 'cresson',
  'laitue iceberg': 'laitue',
  'laitue romaine': 'laitue',
  'petits pois': 'petit pois',
  'poivron jaune': 'poivron',
  'poivron rouge': 'poivron',
  'poivron vert': 'poivron',
  'radis rouge': 'radis',
  'salade ou chicoree frisee': 'chicoree',
  'tomate cerise': 'tomate',
  'mais doux': 'mais',
};

/**
 * Fruits sans saison en France métropolitaine: ils ne sont jamais proposés, et
 * c'est le comportement attendu d'une application qui ne suggère que de saison.
 * Listés ici pour que l'absence soit un choix visible, pas un oubli.
 */
const NEVER_IN_SEASON = [
  'banane', 'canneberge ou cranberry', 'citron vert ou lime', 'fruit de la passion ou maracudja',
  'litchi', 'mangue', 'pissenlit', 'haricot mungo germe ou pousse de "soja"',
];

const calendar = JSON.parse(fs.readFileSync('docs/sources/calendrier_fruits_legumes_saison.json', 'utf8'));
const foodsFile = JSON.parse(fs.readFileSync('src/data/reference/foods.json', 'utf8'));

const normalize = (s) =>
  s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const speciesOf = (label) => {
  const first = label.split(',')[0];
  const open = first.indexOf('(');
  return normalize(open >= 0 ? first.slice(0, open) : first);
};

// Nom de saison -> mois. Les deux listes du calendrier (legumes et fruits) sont
// fusionnées: la catégorie de l'aliment vient déjà du catalogue.
const monthsByName = new Map();
for (const [monthName, groups] of Object.entries(calendar.calendrier)) {
  const month = MONTHS[monthName];
  for (const key of ['legumes', 'fruits']) {
    for (const raw of groups[key] ?? []) {
      const name = normalize(raw);
      if (!monthsByName.has(name)) monthsByName.set(name, new Set());
      monthsByName.get(name).add(month);
    }
  }
}

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
