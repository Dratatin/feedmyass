/**
 * Construit src/data/reference/foods.json à partir de la table CIQUAL de l'ANSES.
 *
 * Source   : https://ciqual.anses.fr — Table Ciqual 2020, Licence Ouverte (Etalab),
 *            jeu de données publié sur data.gouv.fr.
 * Archive  : XML_2020_07_07.zip, à décompresser dans un répertoire passé en argument.
 * Usage    : node scripts/build-foods-from-ciqual.mjs <repertoire-ciqual>
 *
 * Ce que ce script prend dans CIQUAL: les libellés, la classification et les
 * teneurs. Ce qu'il ajoute et qui N'EST PAS de la donnée CIQUAL: les
 * compatibilités de régime, les bornes de quantité et les unités d'achat. Cette
 * frontière est reprise dans le _meta du fichier produit (principe II).
 */
import fs from 'node:fs';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node scripts/build-foods-from-ciqual.mjs <repertoire-ciqual>');
  process.exit(1);
}

const decode = (file) => new TextDecoder('windows-1252').decode(fs.readFileSync(dir + '/' + file));

function field(block, tag) {
  const open = '<' + tag + '>', close = '</' + tag + '>';
  const i = block.indexOf(open);
  if (i < 0) return '';
  const j = block.indexOf(close, i);
  if (j < 0) return '';
  return block.slice(i + open.length, j).trim();
}

function blocks(xml, tag) {
  const open = '<' + tag + '>', close = '</' + tag + '>';
  const out = [];
  let i = 0;
  for (;;) {
    const a = xml.indexOf(open, i);
    if (a < 0) break;
    const b = xml.indexOf(close, a);
    if (b < 0) break;
    out.push(xml.slice(a + open.length, b));
    i = b + close.length;
  }
  return out;
}

/** Code nutriment du projet -> code constituant CIQUAL. */
const DIRECT = {
  // CIQUAL publie deux variantes pour l'énergie et pour les protéines, et tous
  // les aliments ne renseignent pas la même. On prend la première disponible,
  // dans cet ordre de préférence.
  energy: ['328', '333'],   // Règlement UE 1169/2011, sinon N x facteur de Jones
  protein: ['25000', '25003'], // N x facteur de Jones, sinon N x 6,25
  lipids: ['40000'],
  carbohydrates: ['31000'],
  fiber: ['34100'],
  vitamin_b1: ['56100'],
  vitamin_b2: ['56200'],
  vitamin_b3: ['56310'],
  vitamin_b5: ['56400'],
  vitamin_b6: ['56500'],
  vitamin_b9: ['56700'],
  vitamin_b12: ['56600'],
  vitamin_c: ['55100'],
  vitamin_d: ['52100'],
  vitamin_e: ['53100'],
  vitamin_k: ['54101'],       // K1 seule: c'est la forme de la référence ANSES
  calcium: ['10200'],
  iron: ['10260'],
  magnesium: ['10120'],
  potassium: ['10190'],
  zinc: ['10300'],
  iodine: ['10530'],
  selenium: ['10340'],
  copper: ['10290'],
  phosphorus: ['10150'],
};

/** La vitamine A se reconstitue en équivalents rétinol: rétinol + bêta-carotène / 6. */
const ENERGY_KJ = ['327', '332'];
const KJ_PER_KCAL = 4.184;

const RETINOL = '51200';
const BETA_CAROTENE = '51330';

/**
 * Règles par sous-groupe CIQUAL. `diets` liste les régimes de base compatibles,
 * `excluded` les exclusions systématiques du sous-groupe.
 *
 * Ces règles ne sont PAS de la donnée CIQUAL: ce sont des décisions du projet,
 * dérivées de la classification CIQUAL. Elles doivent être relues comme telles.
 */
const ALL_DIETS = ['omnivore', 'pescetarian', 'vegetarian', 'vegan'];

const SUBGROUPS = {
  '0201': { category: 'legume', produce: true, diets: ALL_DIETS, excluded: [], take: 55 },
  '0202': { category: 'legume', produce: true, diets: ALL_DIETS, excluded: [], take: 8 },
  '0203': { category: 'legumineuse', produce: false, diets: ALL_DIETS, excluded: [], take: 36 },
  '0204': { category: 'fruit', produce: true, diets: ALL_DIETS, excluded: [], take: 42 },
  '0205': { category: 'fruit_a_coque', produce: false, diets: ALL_DIETS, excluded: ['nuts'], take: 45 },
  '0301': { category: 'cereale', produce: false, diets: ALL_DIETS, excluded: [], take: 18 },
  '0302': { category: 'cereale', produce: false, diets: ALL_DIETS, excluded: [], take: 10 },
  '0402': { category: 'viande', produce: false, diets: ['omnivore'], excluded: [], take: 34 },
  '0406': { category: 'poisson', produce: false, diets: ['omnivore', 'pescetarian'], excluded: [], take: 20 },
  '0408': { category: 'poisson', produce: false, diets: ['omnivore', 'pescetarian'], excluded: [], take: 6 },
  '0410': { category: 'oeuf', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: [], take: 8 },
  '0411': { category: 'autre', produce: false, diets: ALL_DIETS, excluded: [], take: 5 },
  '0501': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'], take: 6 },
  '0502': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'], take: 10 },
  '0503': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'], take: 16 },
  '0902': { category: 'matiere_grasse', produce: false, diets: ALL_DIETS, excluded: [], take: 8 },
  '1007': { category: 'autre', produce: false, diets: ALL_DIETS, excluded: [], take: 4 },
  '1009': { category: 'autre', produce: false, diets: ALL_DIETS, excluded: [], take: 6 },
};

/** Céréales contenant du gluten, détectées sur le libellé. */
const GLUTEN_WORDS = ['blé', 'ble ', 'froment', 'seigle', 'orge', 'épeautre', 'epeautre', 'kamut',
  'semoule', 'boulgour', 'couscous', 'pain', 'seitan', 'avoine', 'malt', 'biscotte', 'pâtes', 'pates'];
const GLUTEN_FREE_WORDS = ['sans gluten', 'riz', 'maïs', 'mais ', 'sarrasin', 'quinoa', 'millet', 'châtaigne'];

/** Libellés à écarter: produits transformés, cuisinés ou sucrés. */
const REJECT_WORDS = ['frit', 'panée', 'pané', 'sauce', 'apéritif', 'aperitif', 'chips', 'confit',
  'sirop', 'sucré', 'sucre', 'nectar', 'plat ', 'préparation', 'dessert', 'crème dessert', 'beignet',
  'cheesecake', 'gâteau', 'gateau', 'pâte d', 'tarte', 'quiche', 'aromatisé', 'allégé',
  'barre', 'biscuit', 'bonbon', 'glace', 'pizza',
  'aliment moyen', 'non précisé'];

/**
 * Le sous-groupe CIQUAL 0205 mélange fruits à coque et graines oléagineuses.
 * Le soja, le tournesol ou le sésame ne sont pas des fruits à coque: les classer
 * comme tels leur collerait à tort l'exclusion « sans fruits à coque ».
 */
const TRUE_NUTS = ['amande', 'noisette', 'noix', 'cajou', 'pistache', 'pécan', 'pecan',
  'macadamia', 'cacahuète', 'cacahuete', 'arachide', 'châtaigne', 'chataigne', 'pignon'];

/**
 * Bornes de quantité par jour et unités d'achat, par catégorie.
 *
 * Décisions du projet, PAS de la donnée CIQUAL. Elles servent au solveur à
 * écarter les solutions mathématiquement optimales mais absurdes (R6).
 */
const CATEGORY_RULES = {
  legume: { min: 0, max: 400, unitLabel: 'portion de 100 g', unitGrams: 100 },
  fruit: { min: 0, max: 400, unitLabel: 'fruit de 120 g', unitGrams: 120 },
  legumineuse: { min: 0, max: 200, unitLabel: 'portion de 100 g', unitGrams: 100 },
  cereale: { min: 0, max: 350, unitLabel: 'portion de 100 g', unitGrams: 100 },
  viande: { min: 0, max: 200, unitLabel: 'portion de 100 g', unitGrams: 100 },
  poisson: { min: 0, max: 200, unitLabel: 'portion de 100 g', unitGrams: 100 },
  oeuf: { min: 0, max: 120, unitLabel: 'œuf de 55 g', unitGrams: 55 },
  produit_laitier: { min: 0, max: 400, unitLabel: 'portion de 100 g', unitGrams: 100 },
  matiere_grasse: { min: 0, max: 40, unitLabel: 'cuillère à soupe de 10 g', unitGrams: 10 },
  fruit_a_coque: { min: 0, max: 60, unitLabel: 'poignée de 30 g', unitGrams: 30 },
  autre: { min: 0, max: 150, unitLabel: 'portion de 100 g', unitGrams: 100 },
};

const norm = (s) => s.toLowerCase();

function hasGluten(nom) {
  const n = norm(nom);
  if (GLUTEN_FREE_WORDS.some((w) => n.includes(w))) return false;
  return GLUTEN_WORDS.some((w) => n.includes(w));
}

function isRejected(nom) {
  const n = norm(nom);
  return REJECT_WORDS.some((w) => n.includes(w));
}

function isTrueNut(nom) {
  const n = norm(nom);
  return TRUE_NUTS.some((w) => n.includes(w));
}

/**
 * Certains libellés CIQUAL disent explicitement que le produit ne convient pas
 * à un régime. C'est une information portée par la donnée: on la respecte plutôt
 * que d'appliquer aveuglément la règle du sous-groupe.
 */
function dietsFromLabel(nom, diets) {
  const n = norm(nom);
  let out = [...diets];
  if (n.includes('ne convient pas aux véganes') || n.includes('ne convient pas aux vegan')) {
    out = out.filter((d) => d !== 'vegan');
  }
  if (n.includes('ne convient pas aux végétariens')) {
    out = out.filter((d) => d !== 'vegetarian' && d !== 'vegan');
  }
  return out;
}

// --- Chargement ---------------------------------------------------------

const allFoods = blocks(decode('alim_2020_07_07.xml'), 'ALIM').map((b) => ({
  code: field(b, 'alim_code'),
  nom: field(b, 'alim_nom_fr'),
  ssgrp: field(b, 'alim_ssgrp_code'),
}));

const candidates = allFoods.filter((f) => SUBGROUPS[f.ssgrp] && !isRejected(f.nom));
const wantedFoods = new Set(candidates.map((f) => f.code));
const wantedConsts = new Set([...Object.values(DIRECT).flat(), ...ENERGY_KJ, RETINOL, BETA_CAROTENE]);

const compoXml = decode('compo_2020_07_07.xml');
const compoByFood = new Map();
for (const b of blocks(compoXml, 'COMPO')) {
  const alim = field(b, 'alim_code');
  if (!wantedFoods.has(alim)) continue;
  const cst = field(b, 'const_code');
  if (!wantedConsts.has(cst)) continue;
  // CIQUAL note « - » pour une donnée non déterminée et « traces » pour une
  // présence négligeable: la première est une absence, la seconde vaut zéro.
  const text = field(b, 'teneur').trim();
  if (text === '-' || text === '') continue;
  const raw = text.replace(',', '.').replace('<', '').replace(/[ 	]/g, '');
  const value = /^traces$/i.test(raw) ? 0 : Number(raw);
  if (!Number.isFinite(value)) continue;
  if (!compoByFood.has(alim)) compoByFood.set(alim, {});
  compoByFood.get(alim)[cst] = value;
}

// --- Composition dans les codes du projet -------------------------------

const derivedEnergy = new Set();
let currentFoodCode = null;

function buildComposition(raw) {
  const out = {};
  for (const [code, candidates] of Object.entries(DIRECT)) {
    const hit = candidates.find((cst) => raw[cst] !== undefined);
    if (hit) out[code] = raw[hit];
  }
  // Repli énergie: si les kcal manquent, convertir depuis les kJ.
  if (out.energy === undefined) {
    const kj = ENERGY_KJ.map((c) => raw[c]).find((v) => v !== undefined);
    if (kj !== undefined) out.energy = Number((kj / KJ_PER_KCAL).toFixed(1));
  }

  // Dernier recours: reconstituer l'énergie depuis les macronutriments par les
  // coefficients d'Atwater. CIQUAL laisse « - » sur l'énergie de plusieurs
  // aliments pourtant bien documentés côté macronutriments (l'amande, par
  // exemple). La valeur est calculée, pas inventée, et le compte des aliments
  // concernés est reporté dans le _meta du fichier produit.
  if (out.energy === undefined && out.protein !== undefined && out.lipids !== undefined && out.carbohydrates !== undefined) {
    out.energy = Number((4 * out.protein + 9 * out.lipids + 4 * out.carbohydrates + 2 * (out.fiber ?? 0)).toFixed(1));
    derivedEnergy.add(currentFoodCode);
  }

  const retinol = raw[RETINOL];
  const carotene = raw[BETA_CAROTENE];
  if (retinol !== undefined || carotene !== undefined) {
    out.vitamin_a = Number(((retinol ?? 0) + (carotene ?? 0) / 6).toFixed(2));
  }
  return out;
}

// --- Sélection: les aliments les mieux documentés de chaque sous-groupe ---

const scored = [];
for (const f of candidates) {
  const raw = compoByFood.get(f.code);
  if (!raw) continue;
  currentFoodCode = f.code;
  const composition = buildComposition(raw);
  const completeness = Object.keys(composition).length;
  // Sans énergie ni protéines, l'aliment est inexploitable par le solveur.
  if (composition.energy === undefined || composition.protein === undefined) continue;
  const rawFood = norm(f.nom).includes('cru');
  scored.push({ ...f, composition, completeness, bonus: rawFood ? 1 : 0 });
}

if (process.env.DEBUG_CIQUAL) {
  for (const sg of ['0205', '0203']) {
    console.error('[debug] ' + sg + ' candidats=' + candidates.filter((f) => f.ssgrp === sg).length +
      ' scores=' + scored.filter((f) => f.ssgrp === sg).length);
    console.error('[debug] ' + scored.filter((f) => f.ssgrp === sg).map((f) => f.nom).join(' | '));
  }
}

const selected = [];
for (const [ssgrp, rule] of Object.entries(SUBGROUPS)) {
  const list = scored
    .filter((f) => f.ssgrp === ssgrp)
    .sort((a, b) => b.completeness + b.bonus * 2 - (a.completeness + a.bonus * 2))
    .slice(0, rule.take);
  for (const f of list) {
    // 0205 mélange fruits à coque et graines: seules les vraies noix portent
    // l'exclusion « sans fruits à coque ».
    let category = rule.category;
    let excluded = [...rule.excluded];
    if (ssgrp === '0205' && !isTrueNut(f.nom)) {
      category = 'autre';
      excluded = excluded.filter((e) => e !== 'nuts');
    }
    const cat = CATEGORY_RULES[category];
    if (hasGluten(f.nom) && !excluded.includes('gluten')) excluded.push('gluten');
    selected.push({
      code: 'ciqual-' + f.code,
      label: f.nom,
      category,
      is_fruit_vegetable: rule.produce,
      is_fortified: norm(f.nom).includes('enrichi'),
      diet_tags: dietsFromLabel(f.nom, rule.diets),
      excluded_by: excluded,
      composition: f.composition,
      min_qty_g: cat.min,
      max_qty_g: cat.max,
      unit_label: cat.unitLabel,
      unit_grams: cat.unitGrams,
    });
  }
}

/**
 * Un même ingrédient apparaît sous plusieurs états de cuisson. On n'en garde
 * qu'un, le mieux classé. La clé retire les seuls qualificatifs d'ÉTAT: deux
 * morceaux différents (gigot / côtelette) ou deux formes différentes (frais /
 * sec) restent des aliments distincts.
 */
const COOKING_STATES = ['cru', 'crue', 'crus', 'crues', 'cuit', 'cuite', 'cuits', 'cuites',
  "bouilli/cuit à l'eau", "bouillie/cuite à l'eau", 'bouilli', 'bouillie', "cuit à l'eau",
  'grillé', 'grillée', 'grillé à sec', 'grillée à sec', 'poêlé', 'poêlée', 'au four',
  'à la vapeur', 'cuit à la vapeur', 'cuite à la vapeur', 'appertisé', 'appertisée',
  'égoutté', 'égouttée', 'surgelé', 'surgelée', 'sans précision', 'non salé', 'non salée',
  'salé', 'salée', 'préemballé', 'préemballée', 'à sec'];

const SPECIES_LEVEL = ['legume', 'fruit', 'legumineuse', 'fruit_a_coque', 'cereale'];

/** Nom d'espèce: premier segment, parenthèses retirées. */
const speciesKey = (label) => {
  const first = label.split(',')[0];
  const open = first.indexOf('(');
  const base = open >= 0 ? first.slice(0, open) : first;
  return base.trim().toLowerCase();
};

const dedupeKey = (label) =>
  label
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !COOKING_STATES.includes(part))
    .join(', ');

const deduped = [];
const seenBase = new Set();
for (const f of selected) {
  const base = SPECIES_LEVEL.includes(f.category)
    ? f.category + '|' + speciesKey(f.label)
    : f.category + '|' + dedupeKey(f.label);
  if (seenBase.has(base)) continue;
  seenBase.add(base);
  deduped.push(f);
}
selected.length = 0;
selected.push(...deduped);

selected.sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));

const out = {
  _meta: {
    description: "Catalogue d'aliments courants extrait de la table CIQUAL de l'ANSES.",
    source: 'ANSES — Table Ciqual 2020 (XML_2020_07_07), https://ciqual.anses.fr, Licence Ouverte / Open Licence (Etalab)',
    version: 'Ciqual 2020 (2020-07-07)',
    retrieved_at: '2026-09-13',
    generated_by: 'scripts/build-foods-from-ciqual.mjs',
    notes: [
      "Viennent de CIQUAL: le libellé, la classification en sous-groupe et toutes les teneurs.",
      "NE VIENNENT PAS de CIQUAL, ce sont des décisions du projet à relire comme telles: les régimes compatibles (diet_tags), les exclusions (excluded_by), les bornes de quantité (min_qty_g, max_qty_g) et les unités d'achat (unit_label, unit_grams).",
      "vitamin_a est recomposée en équivalents rétinol: rétinol + bêta-carotène / 6.",
      "vitamin_k ne retient que la K1, forme sur laquelle porte la référence ANSES.",
      "Le gluten est détecté sur le libellé (blé, seigle, orge, épeautre, semoule, pain, pâtes, seitan...), ce qui est une heuristique et non une donnée: à revoir aliment par aliment avant mise en production.",
      "Sélection: par sous-groupe, les aliments les mieux documentés (nombre de nutriments renseignés), avec une préférence pour les formes crues. Les aliments sans énergie ni protéines sont écartés car inexploitables par le solveur.",
      "Énergie reconstituée par les coefficients d'Atwater (4/9/4, et 2 pour les fibres) quand CIQUAL ne la renseigne pas: " + selected.filter((f) => derivedEnergy.has(f.code.replace('ciqual-', ''))).length +
        " aliments concernés sur " + selected.length + ".",
    ],
  },
  foods: selected,
};

fs.writeFileSync('src/data/reference/foods.json', JSON.stringify(out, null, 2) + '\n');
console.log('aliments retenus:', selected.length);
const byCat = {};
for (const f of selected) byCat[f.category] = (byCat[f.category] || 0) + 1;
console.log('par catégorie:', JSON.stringify(byCat));
const withGluten = selected.filter((f) => f.excluded_by.includes('gluten')).length;
console.log('marqués gluten:', withGluten, '| enrichis:', selected.filter((f) => f.is_fortified).length);
