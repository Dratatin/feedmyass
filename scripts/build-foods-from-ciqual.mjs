/**
 * Construit src/data/reference/foods.json à partir de la table CIQUAL de l'ANSES.
 *
 * Source : table Ciqual de l'ANSES, récupérée par l'API de Recherche Data Gouv
 *          (entrepôt Dataverse gouvernemental), DOI 10.57745/RDMHWY, publiée
 *          sous Licence Ouverte / Open Licence (Etalab 2.0).
 *
 * Usage :
 *   npm run build:foods                      construit depuis l'API
 *   npm run build:foods -- --from <dir>      depuis des XML déjà décompressés
 *   npm run build:foods -- --version <v>     fige une version du jeu de données
 *   npm run build:foods -- --quota <n>       force le même quota pour toute classe
 *   npm run build:foods -- --dry-run         rapport seul, sans écrire
 *
 * La version, la date de publication et la licence viennent de la SOURCE, jamais
 * d'une constante d'ici: une valeur saisie à la main est invérifiable, et le
 * principe II exige qu'elle le soit.
 *
 * Ce que ce script prend dans CIQUAL: les libellés, la classification à quatre
 * niveaux et les teneurs. Ce qu'il ajoute et qui N'EST PAS de la donnée CIQUAL:
 * les règles de sélection par classe, les compatibilités de régime, les bornes
 * de quantité et les unités d'achat. Cette frontière est reprise dans le _meta
 * du fichier produit (principe II).
 *
 * Après toute construction, REJOUER `npm run build:seasonality`: les codes
 * d'aliments changent, et une table de saison périmée écarte du solveur tous les
 * fruits et légumes du catalogue.
 */
import fs from 'node:fs';
import { NEVER_IN_SEASON, calendarKeyOf, monthsBySpecies, speciesOf } from './lib/produce-calendar.mjs';
import { fetchCiqual, readLocalCiqual } from './lib/ciqual-source.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? (argv[i + 1] ?? '') : undefined;
};

const DRY_RUN = argv.includes('--dry-run');
const QUOTA_OVERRIDE = flag('quota') ? Number(flag('quota')) : undefined;

// Un chemin positionnel reste accepté: c'est ainsi que le script s'appelait.
// Mais il ne doit PAS ramasser la valeur d'un autre drapeau, sans quoi
// `--quota 8` part chercher un répertoire nommé « 8 ».
const VALUED_FLAGS = ['--from', '--version', '--quota'];
const positional = argv.filter(
  (a, i) => !a.startsWith('--') && !VALUED_FLAGS.includes(argv[i - 1])
);
const localDir = flag('from') ?? positional[0];

const source = localDir
  ? readLocalCiqual(localDir)
  : await fetchCiqual({ version: flag('version') });

const decode = (file) => source.read(file);

/**
 * Entités XML rencontrées dans les libellés CIQUAL.
 *
 * Ne pas les décoder ne se voit pas tout de suite: le catalogue reste lisible et
 * les tests passent. Mais « Huile d&apos;amande » s'affiche tel quel dans la
 * liste de courses, et surtout l'apostrophe encodée fait échouer en silence
 * toutes les heuristiques qui cherchent une apostrophe — la garde végane sur
 * « à l'oeuf » et le dédoublonnage des états « cuit à l'eau ».
 */
const XML_ENTITIES = {
  '&apos;': "'", '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
};

const decodeEntities = (s) =>
  s.replace(/&(?:apos|quot|amp|lt|gt|nbsp);/g, (m) => XML_ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

function field(block, tag) {
  const open = '<' + tag + '>', close = '</' + tag + '>';
  const i = block.indexOf(open);
  if (i < 0) return '';
  const j = block.indexOf(close, i);
  if (j < 0) return '';
  return decodeEntities(block.slice(i + open.length, j).trim());
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
  // Le millésime 2025 a basculé la vitamine E du code historique vers
  // l'alpha-tocophérol, que CIQUAL libelle lui-même « Alpha-tocophérol
  // (vitamine E) »: 595 aliments renseignent encore 53100, 1734 renseignent
  // 71010. Sans ce repli, la vitamine E manquait sur 219 aliments du catalogue.
  vitamin_e: ['53100', '71010'],
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

const ALL_DIETS = ['omnivore', 'pescetarian', 'vegetarian', 'vegan'];

/**
 * Périmètre balayé, en sous-groupes CIQUAL (troisième niveau).
 *
 * Il ne décide de rien: il dit seulement où le script va chercher. Ce qui est
 * retenu ou écarté est décidé classe par classe dans CLASS_RULES, et TOUTE
 * classe trouvée dans ce périmètre doit y avoir une règle, sans quoi la
 * construction échoue. C'est ce qui rend un changement de millésime relisible:
 * une classe nouvelle se décide, elle ne se glisse pas au catalogue.
 */
const SCOPE_SUBGROUPS = new Set(['0201', '0202', '0203', '0204', '0205', '0301', '0302', '0402',
  // 0403 et 0602 ne sont balayés que pour leurs classes d'alternatives
  // végétales: les charcuteries, les sodas et les jus y sont écartés nommément.
  // C'est ce que la sélection par classe rend possible et que les plafonds par
  // sous-groupe interdisaient — on ne pouvait pas prendre la saucisse végétale
  // sans prendre toute la charcuterie.
  '0403', '0406', '0408', '0410', '0411', '0501', '0502', '0503', '0602', '0902', '1007', '1009']);

/**
 * Quotas d'aliments par classe.
 *
 * Ils ne portent AUCUN jugement de pertinence: ils bornent la taille du
 * catalogue pour que l'étiquetage de régime de chaque aliment reste relisible à
 * la main (principe II, porte de revue). Les dix-huit plafonds par sous-groupe
 * qu'ils remplacent, eux, encodaient des jugements que personne ne savait plus
 * justifier — c'est ainsi que le plafond des substituts de produits carnés
 * coupait le seul aliment végane de sa classe.
 *
 * Deux nombres subsistent donc là où il y en avait dix-huit, et ils se
 * distinguent par une propriété de la donnée, pas par un avis (voir
 * quotaPourNiveau). Les fruits et légumes échappent aux deux: leur pertinence
 * est décidée par le calendrier de saison de l'ADEME.
 *
 * Ces valeurs se révisent en mesurant la couverture nutritionnelle
 * (scripts/measure-catalogue.ts), jamais en jugeant qu'une famille mériterait
 * plus de place. Mesuré à 4 et 12: 257 aliments, complétude moyenne de 25,54
 * nutriments sur 26, et aucune régression de couverture pour aucun régime.
 */
const QUOTA_CLASSE_FINE = 4;
const QUOTA_CLASSE_LARGE = 12;

/**
 * Le quota dépend du niveau de la classe, parce que les deux niveaux ne sont pas
 * comparables. Une classe de quatrième niveau est une subdivision fine décidée
 * par l'ANSES — « bœuf et veau », « fromages à pâte persillée » — et quatre
 * représentants y suffisent. Une classe de repli est un sous-groupe que l'ANSES
 * n'a PAS subdivisé: « poissons crus » en compte 105 à elle seule. Leur appliquer
 * le même quota reviendrait à traiter également des choses inégales, et le
 * catalogue tomberait à huit poissons pour toutes les mers.
 */
const quotaPourNiveau = (niveau) =>
  QUOTA_OVERRIDE ?? (niveau === 4 ? QUOTA_CLASSE_FINE : QUOTA_CLASSE_LARGE);

/**
 * Règles de sélection, par CODE de classe CIQUAL.
 *
 * Une classe est le quatrième niveau de la classification (`alim_ssssgrp_code`),
 * avec repli sur le troisième (`ss:<code>`) quand le quatrième vaut `000000` —
 * 22 % des aliments sont dans ce cas, dont toutes les pommes de terre et tout le
 * tofu, si bien qu'ignorer le repli amputerait le catalogue d'un cinquième.
 *
 * Les règles sont indexées par CODE et jamais par libellé: neuf libellés ont
 * changé entre les millésimes 2020 et 2025 sans qu'aucun code ne bouge.
 *
 * Ces règles ne sont PAS de la donnée CIQUAL. `category`, `diets` et `excluded`
 * sont des décisions du projet, à relire comme telles. Une classe écartée porte
 * un `motif` obligatoire: c'est lui qui distingue une exclusion d'un oubli, et
 * c'est précisément ce qui manquait aux plafonds numériques précédents.
 */
const CLASS_RULES = {
  // --- Légumes
  '020101': { category: 'legume', produce: true, diets: ALL_DIETS, excluded: [] },
  '020102': { category: 'legume', produce: true, diets: ALL_DIETS, excluded: [] },
  '020103': { category: 'legume', produce: true, diets: ALL_DIETS, excluded: [] },
  '020104': { skip: 'Produits des Antilles: aucun n\'a de saison en France métropolitaine, ils ne seraient donc jamais proposables (FR-014).' },
  '020105': { skip: 'Produits de La Réunion: même raison que les produits des Antilles.' },
  'ss:0202': { category: 'legume', produce: true, diets: ALL_DIETS, excluded: [] },

  // --- Légumineuses
  '020301': { category: 'legumineuse', produce: false, diets: ALL_DIETS, excluded: [] },
  '020302': { category: 'legumineuse', produce: false, diets: ALL_DIETS, excluded: [] },
  '020303': { category: 'legumineuse', produce: false, diets: ALL_DIETS, excluded: [] },

  // --- Fruits
  '020401': { category: 'fruit', produce: true, diets: ALL_DIETS, excluded: [] },
  '020402': { skip: 'Compotes: produits transformés et sucrés, hors ingrédients bruts.' },
  '020403': { skip: 'Fruits appertisés au sirop ou au jus: conserves sucrées.' },
  '020404': { category: 'fruit', produce: false, diets: ALL_DIETS, excluded: [] },
  '020405': { skip: 'Produits des Antilles: aucune saison en France métropolitaine.' },
  '020406': { skip: 'Produits de La Réunion: aucune saison en France métropolitaine.' },
  'ss:0205': { category: 'fruit_a_coque', produce: false, diets: ALL_DIETS, excluded: ['nuts'] },

  // --- Céréales
  '030101': { category: 'cereale', produce: false, diets: ALL_DIETS, excluded: [] },
  '030102': { category: 'cereale', produce: false, diets: ALL_DIETS, excluded: [] },
  '030201': { category: 'cereale', produce: false, diets: ALL_DIETS, excluded: [] },
  '030202': { category: 'cereale', produce: false, diets: ALL_DIETS, excluded: [] },

  // --- Viandes crues, une classe par espèce
  '040201': { category: 'viande', produce: false, diets: ['omnivore'], excluded: [] },
  '040202': { category: 'viande', produce: false, diets: ['omnivore'], excluded: [] },
  '040203': { category: 'viande', produce: false, diets: ['omnivore'], excluded: [] },
  '040204': { category: 'viande', produce: false, diets: ['omnivore'], excluded: [] },
  '040205': { category: 'viande', produce: false, diets: ['omnivore'], excluded: [] },
  '040206': { skip: 'Gibier: approvisionnement saisonnier et marginal, ce n\'est pas un achat courant.' },
  '040207': { category: 'viande', produce: false, diets: ['omnivore'], excluded: [] },
  '040208': { skip: 'Abats: consommation marginale, et teneurs en vitamine A si élevées que le solveur les retiendrait pour elles seules.' },

  // --- Œufs
  '041001': { category: 'oeuf', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: [] },
  '041002': { category: 'oeuf', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: [] },
  '041003': { skip: 'Omelettes et ovoproduits: préparations cuisinées, pas des ingrédients à acheter.' },

  // --- Poissons et fruits de mer
  'ss:0406': { category: 'poisson', produce: false, diets: ['omnivore', 'pescetarian'], excluded: [] },
  'ss:0408': { category: 'poisson', produce: false, diets: ['omnivore', 'pescetarian'], excluded: [] },

  // --- Produits laitiers
  '050101': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050102': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050103': { skip: 'Laits concentrés ou en poudre: formes de conservation, pas des ingrédients achetés tels quels pour un repas.' },
  '050201': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050202': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050203': { skip: 'Desserts lactés: produits sucrés, hors ingrédients bruts.' },
  '050204': { skip: 'Autres desserts: produits sucrés, hors ingrédients bruts.' },
  '050205': { category: 'specialite_vegetale', produce: false, diets: ALL_DIETS, excluded: [] },
  '050301': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050302': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050303': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050304': { skip: 'Fromages fondus: produits transformés à forte teneur en sels de fonte.' },
  '050305': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },
  '050306': { category: 'specialite_vegetale', produce: false, diets: ALL_DIETS, excluded: [] },
  'ss:0503': { category: 'produit_laitier', produce: false, diets: ['omnivore', 'pescetarian', 'vegetarian'], excluded: ['lactose'] },

  // --- Charcuteries: le sous-groupe n'est ouvert que pour ses alternatives
  //     végétales. Chaque classe de charcuterie est écartée nommément.
  '040301': { skip: 'Jambons cuits: charcuterie, produit transformé et salé, hors ingrédients bruts.' },
  '040302': { skip: 'Jambons secs et crus: charcuterie, produit transformé et salé.' },
  '040303': { skip: 'Saucissons secs: charcuterie, produit transformé et salé.' },
  '040304': { skip: 'Saucisses: charcuterie, produit transformé et salé.' },
  '040305': { skip: 'Pâtés et terrines: charcuterie, produit transformé et gras.' },
  '040306': { skip: 'Rillettes: charcuterie, produit transformé et gras.' },
  '040307': { skip: 'Quenelles: préparation cuisinée, pas un ingrédient à acheter.' },
  '040308': { skip: 'Autres spécialités charcutières: charcuterie, produits transformés.' },
  // Les alternatives végétales aux charcuteries sont presque toujours liées au
  // blé, et CIQUAL ne publie pas leurs ingrédients: « Fines tranches végétales »
  // et « Spécialité végétale type pâté » ne nomment pas leur base. Pour un
  // ALLERGÈNE, les deux erreurs ne se valent pas — un faux positif coûte une
  // option à qui évite le gluten, un faux négatif lui sert du gluten. La classe
  // porte donc l'exclusion par précaution, et c'est une décision à relire
  // aliment par aliment avant mise en production (docs/sources.md).
  '040309': { category: 'proteine_vegetale', produce: false, diets: ALL_DIETS, excluded: ['gluten'] },
  'ss:0403': { skip: 'Charcuteries non subdivisées par la classification: le sous-groupe n\'est ouvert que pour ses alternatives végétales.' },

  // --- Boissons: le sous-groupe n'est ouvert que pour les boissons végétales.
  '060201': { skip: 'Jus de fruits: boissons sucrées, même sans sucres ajoutés, hors ingrédients bruts.' },
  '060202': { skip: 'Nectars: boissons sucrées.' },
  '060203': { skip: 'Boissons rafraîchissantes sans alcool: sodas et assimilés.' },
  '060204': { skip: 'Boissons rafraîchissantes lactées: boissons sucrées.' },
  '060205': { category: 'boisson_vegetale', produce: false, diets: ALL_DIETS, excluded: [] },
  '060206': { skip: 'Cafés, thés et cacaos prêts à consommer: boissons de confort, sans apport nutritionnel visé.' },
  '060207': { skip: 'Boissons à reconstituer: poudres et sirops, pas des aliments achetés pour un repas.' },

  // --- Substituts, matières grasses, ingrédients
  'ss:0411': { category: 'proteine_vegetale', produce: false, diets: ALL_DIETS, excluded: [] },
  'ss:0902': { category: 'matiere_grasse', produce: false, diets: ALL_DIETS, excluded: [] },
  // Les algues se consomment toutes en condiment, et c'est la CLASSE qui le dit,
  // pas le libellé. Le mot-à-mot laissait passer « Criste marine », « Haricot de
  // mer » et « Lichen de mer », plafonnés à 150 g comme un légume — cent
  // cinquante grammes d'algue séchée par jour.
  'ss:1007': { category: 'autre', produce: false, diets: ALL_DIETS, excluded: [], condiment: true },
  'ss:1009': { category: 'autre', produce: false, diets: ALL_DIETS, excluded: [] },
};

/** Céréales contenant du gluten, détectées sur le libellé. */
const GLUTEN_WORDS = ['blé', 'ble ', 'froment', 'seigle', 'orge', 'épeautre', 'epeautre', 'kamut',
  'semoule', 'boulgour', 'couscous', 'pain', 'seitan', 'avoine', 'malt', 'biscotte', 'pâtes', 'pates',
  'blini', 'crêpe', 'crepe', 'galette de blé'];
const GLUTEN_FREE_WORDS = ['sans gluten', 'riz', 'maïs', 'mais ', 'sarrasin', 'quinoa', 'millet', 'châtaigne'];

/** Libellés à écarter: produits transformés, cuisinés ou sucrés. */
const REJECT_WORDS = ['frit', 'panée', 'pané', 'sauce', 'apéritif', 'aperitif', 'chips', 'confit',
  'sirop', 'sucré', 'sucre', 'nectar', 'plat ', 'préparation', 'dessert', 'crème dessert', 'beignet',
  'cheesecake', 'gâteau', 'gateau', 'pâte d', 'tarte', 'quiche', 'aromatisé', 'allégé',
  'barre', 'biscuit', 'bonbon', 'glace', 'pizza',
  'aliment moyen', 'non précisé', 'mousse',
  // Préparations et fractions d'aliment: on n'achète pas 250 g de concentré de
  // tomate ni un jaune d'œuf séparé pour composer un repas.
  'concentré', "jaune d'oeuf", "blanc d'oeuf", "jaune d'œuf", "blanc d'œuf",
  'tapioca', 'perles du japon', 'pomme de terre noisette'];

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
  // Alternatives végétales. Les bornes reprennent celles de l'aliment d'origine:
  // une protéine végétale se borne comme une viande, une spécialité comme un
  // produit laitier. Une boisson se compte en verres, d'où l'unité de 200 ml.
  proteine_vegetale: { min: 0, max: 200, unitLabel: 'portion de 100 g', unitGrams: 100 },
  boisson_vegetale: { min: 0, max: 500, unitLabel: 'verre de 200 ml', unitGrams: 200 },
  specialite_vegetale: { min: 0, max: 400, unitLabel: 'portion de 100 g', unitGrams: 100 },
  autre: { min: 0, max: 150, unitLabel: 'portion de 100 g', unitGrams: 100 },
};

/**
 * Aliments qui se consomment en petite quantité: algues, levures, sons, germes
 * et graines. Sans plafond spécifique, le solveur les choisit massivement parce
 * qu'ils sont très denses en micronutriments, et produit des listes absurdes
 * (150 g d'algue séchée par jour). Le plafond les ramène à un usage de
 * condiment, ce qui est leur usage réel.
 */
const CONDIMENT_WORDS = ['algue', 'ascophylle', 'dulse', 'wakamé', 'wakame', 'kombu', 'nori',
  'laitue de mer', 'levure', 'son', 'germe de', 'graine', 'lin', 'chia',
  'sésame', 'sesame', 'luzerne', 'spiruline'];
const CONDIMENT_MAX_G = 15;

/** Formes non achetables telles quelles en magasin. */
const NOT_PURCHASABLE = ['en poudre', 'poudre,', 'lyophilis', 'reconstitu', 'isolat'];

/**
 * Ingrédients d'origine animale nommés dans un libellé, qui retirent le régime
 * végane quelle que soit la règle de sa classe. L'œuf, le lait et le miel
 * restent compatibles avec le régime végétarien: seul `vegan` tombe.
 */
const ANIMAL_WORDS = ['aux oeufs', 'aux œufs', "à l'oeuf", "à l'œuf", 'gélatine', 'gelatine',
  'gelée royale', 'gelee royale', 'au miel', 'et au miel'];

/**
 * Protéines végétales reconnues au libellé.
 *
 * Elles changent de classe d'un millésime à l'autre: en 2020 elles occupaient le
 * sous-groupe « substituts de produits carnés », qui a disparu en 2025 au profit
 * de « ingrédients divers » — la même classe de repli que les sons, les levures
 * et les algues. Le tofu s'y retrouvait rangé en « autre » et plafonné à 150 g
 * comme un condiment, ce qui est précisément le défaut que la sélection par
 * classe corrige par ailleurs.
 *
 * La classification ne descend pas jusqu'à elles: c'est donc le libellé qui
 * tranche, comme pour le gluten et les fruits à coque. Décision du projet,
 * courte et relisible, à confronter à chaque changement de millésime.
 */
const PLANT_PROTEIN_WORDS = ['tofu', 'tempeh', 'seitan', 'protéine de soja', 'proteine de soja'];

const norm = (s) => s.toLowerCase();

function hasGluten(nom) {
  const n = norm(nom);
  if (GLUTEN_FREE_WORDS.some((w) => n.includes(w))) return false;
  return GLUTEN_WORDS.some((w) => n.includes(w));
}

function isRejected(nom) {
  const n = norm(nom);
  return REJECT_WORDS.some((w) => n.includes(w)) || NOT_PURCHASABLE.some((w) => n.includes(w));
}

/**
 * Les mots de condiment sont cherchés sur des MOTS ENTIERS, pas en sous-chaîne.
 *
 * Le test en sous-chaîne plafonnait à 15 g, et vendait à la cuillère à soupe,
 * tout ce dont le nom contenait par hasard un mot de la liste: « cre**sson** de
 * fontaine » via « son », « co**lin** » via « lin ».
 */
const CONDIMENT_RE = CONDIMENT_WORDS.map(
  (w) => new RegExp('(^|[^a-zà-öø-ÿ])' + w + '($|[^a-zà-öø-ÿ])')
);

function isCondiment(nom) {
  const n = norm(nom);
  return CONDIMENT_RE.some((re) => re.test(n));
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
  // Une classe peut être ouverte à tous les régimes alors qu'un de ses aliments
  // nomme un ingrédient d'origine animale: « Pâtes sèches, aux oeufs » était
  // ainsi proposée aux véganes, et la gélatine comme la gelée royale le sont
  // dès qu'on élargit le catalogue. Le libellé prime sur la règle de classe, et
  // ne peut que restreindre.
  if (ANIMAL_WORDS.some((w) => n.includes(w))) {
    out = out.filter((d) => d !== 'vegan');
  }
  return out;
}

// --- Chargement ---------------------------------------------------------

/** Libellés de classe, à titre informatif: aucune règle ne s'écrit dessus. */
const CLASS_NAMES = {};
for (const b of blocks(decode('alim_grp_2020_07_07.xml'), 'ALIM_GRP')) {
  CLASS_NAMES[field(b, 'alim_ssssgrp_code')] = field(b, 'alim_ssssgrp_nom_fr');
  CLASS_NAMES['ss:' + field(b, 'alim_ssgrp_code')] = field(b, 'alim_ssgrp_nom_fr');
}

const allFoods = blocks(decode('alim_2020_07_07.xml'), 'ALIM').map((b) => ({
  code: field(b, 'alim_code'),
  nom: field(b, 'alim_nom_fr'),
  ssgrp: field(b, 'alim_ssgrp_code'),
  ssssgrp: field(b, 'alim_ssssgrp_code'),
}));

/**
 * Clé de classe d'un aliment: le quatrième niveau de classification, avec repli
 * sur le troisième quand il vaut `000000`.
 *
 * Le repli n'est pas un cas marginal: 22 % des aliments du périmètre n'ont pas
 * de quatrième niveau, dont toutes les pommes de terre et tout le tofu. Le
 * niveau employé est reporté sur chaque aliment (`selected_by.niveau`) pour que
 * le repli reste visible plutôt que subi.
 */
function classKeyOf(f) {
  return f.ssssgrp && f.ssssgrp !== '000000' ? f.ssssgrp : 'ss:' + f.ssgrp;
}
const classLevelOf = (key) => (key.startsWith('ss:') ? 3 : 4);

// Toute classe trouvée dans le périmètre doit porter une règle: une classe
// nouvelle se décide, elle ne se glisse pas au catalogue (FR-215).
const classesTrouvees = new Map();
for (const f of allFoods) {
  if (!SCOPE_SUBGROUPS.has(f.ssgrp)) continue;
  const key = classKeyOf(f);
  classesTrouvees.set(key, (classesTrouvees.get(key) ?? 0) + 1);
}
const sansRegle = [...classesTrouvees.keys()].filter((k) => !CLASS_RULES[k]);
if (sansRegle.length) {
  console.error('Classes sans règle de sélection — à décider dans CLASS_RULES:');
  for (const k of sansRegle) {
    console.error('  ' + k + '  ' + (CLASS_NAMES[k] ?? '?') + '  (' + classesTrouvees.get(k) + ' aliments)');
  }
  process.exit(1);
}

// Une classe écartée sans motif serait indistinguable d'un oubli.
const sansMotif = Object.entries(CLASS_RULES).filter(([, r]) => 'skip' in r && !r.skip);
if (sansMotif.length) {
  console.error('Classes écartées sans motif: ' + sansMotif.map(([k]) => k).join(', '));
  process.exit(1);
}

const candidates = allFoods.filter(
  (f) => SCOPE_SUBGROUPS.has(f.ssgrp) && !CLASS_RULES[classKeyOf(f)].skip && !isRejected(f.nom)
);
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

/**
 * Catégories où l'ESPÈCE est l'unité qui compte, parce que la classification
 * CIQUAL ne descend pas jusqu'à elle. Sert deux fois: au grain de sélection
 * ci-dessous, et au dédoublonnage plus bas.
 */
const COOKING_STATES = ['cru', 'crue', 'crus', 'crues', 'cuit', 'cuite', 'cuits', 'cuites',
  "bouilli/cuit à l'eau", "bouillie/cuite à l'eau", 'bouilli', 'bouillie', "cuit à l'eau",
  'grillé', 'grillée', 'grillé à sec', 'grillée à sec', 'poêlé', 'poêlée', 'au four',
  'à la vapeur', 'cuit à la vapeur', 'cuite à la vapeur', 'appertisé', 'appertisée',
  'égoutté', 'égouttée', 'surgelé', 'surgelée', 'sans précision', 'non salé', 'non salée',
  'salé', 'salée', 'préemballé', 'préemballée', 'à sec'];

const dedupeKey = (label) =>
  label
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !COOKING_STATES.includes(part))
    .join(', ');

const SPECIES_LEVEL = ['legume', 'fruit', 'legumineuse', 'fruit_a_coque', 'cereale'];

/**
 * Catégories dont la pertinence est décidée par le calendrier de saison, et non
 * par la classification CIQUAL — qui ne les subdivise pas: « légumes crus » est
 * une classe unique de 121 aliments.
 */
const PRODUCE_CATEGORIES = ['legume', 'fruit'];
const especesDeSaison = new Set(monthsBySpecies().keys());

/** Nom d'espèce: premier segment, parenthèses retirées. */
const speciesKey = (label) => {
  const first = label.split(',')[0];
  const open = first.indexOf('(');
  const base = open >= 0 ? first.slice(0, open) : first;
  return base.trim().toLowerCase();
};

const selected = [];
const rapportClasses = [];

for (const [key, rule] of Object.entries(CLASS_RULES)) {
  if (rule.skip) {
    rapportClasses.push({ key, decision: 'écartée', candidats: 0, retenus: 0, motif: rule.skip });
    continue;
  }
  const dansLaClasse = scored.filter((f) => classKeyOf(f) === key);

  // Le quota s'applique au grain le plus fin que la donnée distingue.
  //
  // Pour les viandes, poissons et fromages, c'est la classe: elle sépare déjà le
  // bœuf du porc, la pâte molle de la pâte pressée. Pour les fruits et légumes,
  // elle ne sépare rien — « légumes crus » est une classe unique de 121 aliments
  // — et un quota par classe y retiendrait quatre légumes pour toute la France
  // (mesuré: 13 légumes au catalogue). L'espèce prend alors le relais.
  //
  // Mais l'espèce seule ne borne rien non plus: sans borne, 127 légumes entrent
  // et la complétude moyenne tombe sous le plancher. Ce qui borne les fruits et
  // légumes, c'est le CALENDRIER DE SAISON de l'ADEME — une espèce qui n'y
  // figure pas n'a aucun mois de disponibilité, donc ne sera JAMAIS proposée
  // (FR-014), et l'inscrire au catalogue reviendrait à y ajouter un aliment
  // mort. Critère officiel, maintenu hors du projet, et déjà la source de la
  // table de saisonnalité: aucun nombre du projet n'intervient ici.
  //
  // Le grain de l'espèce ne vaut donc que pour elles. L'employer sur les
  // céréales, que le calendrier ne borne pas, ferait entrer 79 formes de pain et
  // de riz.
  const parEspece = PRODUCE_CATEGORIES.includes(rule.category);
  const groupes = new Map();
  for (const f of dansLaClasse) {
    // Deux raisons très différentes de ne pas figurer au calendrier, et une
    // seule justifie d'écarter l'aliment.
    //
    // Sans saison EN FRANCE mais bien connu — banane, mangue, litchi: l'absence
    // est une information, pas un trou. Ces aliments restent au catalogue, sans
    // aucun mois de disponibilité, et l'écran de saison les présente comme tels.
    // Le solveur, lui, ne les proposera jamais (FR-014), ce qui est voulu.
    //
    // Espèce inconnue du calendrier: là c'est un trou de données, et l'aliment
    // n'a rien à faire au catalogue tant que personne ne l'a apparié.
    if (parEspece
      && !especesDeSaison.has(calendarKeyOf(f.nom))
      && !NEVER_IN_SEASON.includes(speciesOf(f.nom))) continue;
    const g = parEspece ? speciesKey(f.nom) : '';
    if (!groupes.has(g)) groupes.set(g, []);
    groupes.get(g).push(f);
  }

  const list = [];
  for (const membres of groupes.values()) {
    // Le quota doit compter des ALIMENTS DISTINCTS, pas des lignes de CIQUAL.
    //
    // Sans ce repli préalable, quatre lignes retenues pouvaient se réduire à une
    // seule au dédoublonnage plus bas — et la classe « pâtes, riz et céréales
    // crus » ne laissait qu'une semoule, faisant disparaître du catalogue le
    // riz, l'avoine, l'orge et le quinoa pendant que la classe des biscottes
    // gardait ses quatre places. Le quota se prend donc APRÈS fusion des formes
    // d'un même aliment, sur le meilleur représentant de chacune.
    const parAliment = new Map();
    for (const f of membres) {
      const cle = SPECIES_LEVEL.includes(rule.category) ? speciesKey(f.nom) : dedupeKey(f.nom);
      if (!parAliment.has(cle)) parAliment.set(cle, []);
      parAliment.get(cle).push(f);
    }
    const distincts = [...parAliment.values()].map((formes) =>
      formes.sort((a, b) =>
        b.completeness + b.bonus * 2 - (a.completeness + a.bonus * 2) ||
        Number(a.code) - Number(b.code))[0]);

    list.push(...distincts
      // Le classement ne décide plus de l'admission — la classe s'en charge —
      // il ne départage plus que des aliments d'un même groupe déjà retenu.
      // À égalité, le code CIQUAL tranche: l'ordre du tableau départageait
      // jusqu'ici, et c'est ainsi qu'un substitut végane avait été coupé au
      // profit de son jumeau explicitement non végane.
      .sort((a, b) =>
        b.completeness + b.bonus * 2 - (a.completeness + a.bonus * 2) ||
        Number(a.code) - Number(b.code))
      .slice(0, quotaPourNiveau(classLevelOf(key))));
  }

  for (const f of list) {
    // La classe des fruits à coque mélange vraies noix et graines oléagineuses:
    // seules les premières portent l'exclusion « sans fruits à coque ».
    let category = rule.category;
    let excluded = [...rule.excluded];
    if (key === 'ss:0205' && !isTrueNut(f.nom)) {
      category = 'autre';
      excluded = excluded.filter((e) => e !== 'nuts');
    }
    // Une protéine végétale rangée en « autre » y hériterait du plafond du
    // condiment. Sa classe ne la distingue pas, son libellé si.
    if (category === 'autre' && PLANT_PROTEIN_WORDS.some((w) => norm(f.nom).includes(w))) {
      category = 'proteine_vegetale';
    }
    // Les alternatives végétales sont souvent construites sur un fruit à coque —
    // fromage de cajou, boisson d'amande — et leur classe, elle, ne le dit pas.
    // L'exclusion se lit alors sur le libellé, comme le gluten.
    if (category.endsWith('_vegetale') && isTrueNut(f.nom) && !excluded.includes('nuts')) {
      excluded.push('nuts');
    }
    const cat = CATEGORY_RULES[category];
    // Le plafond de condiment vient soit de la classe, soit du libellé.
    const condiment = rule.condiment === true || isCondiment(f.nom);
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
      max_qty_g: condiment ? Math.min(cat.max, CONDIMENT_MAX_G) : cat.max,
      unit_label: condiment ? 'cuillère à soupe de 10 g' : cat.unitLabel,
      unit_grams: condiment ? 10 : cat.unitGrams,
      selected_by: { classe: key, niveau: classLevelOf(key) },
    });
  }
  rapportClasses.push({
    key, decision: 'retenue', candidats: dansLaClasse.length, retenus: list.length, motif: null,
  });
}

/**
 * Un même ingrédient apparaît sous plusieurs états de cuisson. On n'en garde
 * qu'un, le mieux classé. La clé retire les seuls qualificatifs d'ÉTAT: deux
 * morceaux différents (gigot / côtelette) ou deux formes différentes (frais /
 * sec) restent des aliments distincts.
 *
 * Ce mécanisme N'EST PAS remplacé par la sélection par classe, et les deux
 * traitent des problèmes différents. La classification de quatrième niveau
 * subdivise les viandes par espèce et les fromages par pâte, mais elle ne
 * subdivise PAS les fruits et légumes: « légumes crus » est une classe unique de
 * 122 aliments. Sans le dédoublonnage par espèce, un quota par classe y
 * retiendrait quatre variétés de chou et aucune carotte.
 */
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

/**
 * Second dédoublonnage, sur la COMPOSITION et non sur le libellé.
 *
 * Deux aliments dont toutes les teneurs et toutes les bornes coïncident sont
 * interchangeables: le second n'apporte rien à l'utilisateur et fabrique une
 * colonne dupliquée dans le programme linéaire.
 *
 * Ce n'est pas une précaution théorique. Cinq huiles — coton, maïs, noisette,
 * noix, cacao — sortaient de CIQUAL avec des colonnes rigoureusement identiques,
 * de la graisse pure et rien d'autre. Le simplexe de javascript-lp-solver s'y
 * mettait à CYCLER: le calcul d'une liste végane ne rendait jamais la main, là
 * où le même modèle privé de ses matières grasses se résolvait en 12 ms. Aucune
 * option de la bibliothèque n'y changeait rien — sa borne de temps ne s'applique
 * qu'aux problèmes en nombres entiers, et sa détection de cycle, déjà active par
 * défaut, ne voyait pas celui-là.
 *
 * Le premier de chaque groupe est conservé, c'est-à-dire le mieux classé.
 */
const parComposition = new Map();
for (const f of selected) {
  const signature = f.category + '|' + f.max_qty_g + '|' +
    Object.keys(f.composition).sort().map((k) => k + ':' + f.composition[k]).join(',');
  if (!parComposition.has(signature)) parComposition.set(signature, []);
  parComposition.get(signature).push(f);
}
const interchangeables = [...parComposition.values()].filter((g) => g.length > 1);
const distincts = [...parComposition.values()].map((g) => g[0]);
selected.length = 0;
selected.push(...distincts);

selected.sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));

const out = {
  _meta: {
    description: "Catalogue d'aliments courants extrait de la table CIQUAL de l'ANSES.",
    // Version, date et licence viennent de la source elle-même, jamais d'une
    // constante du script: une valeur saisie à la main est invérifiable, et le
    // principe II exige qu'elle le soit.
    source: 'ANSES — Table Ciqual, ' + source.dataset.doi +
      ', Recherche Data Gouv, Licence Ouverte / Open Licence (' + source.dataset.license + ')',
    version: String(source.dataset.version),
    retrieved_at: source.retrieved_at,
    generated_by: 'scripts/build-foods-from-ciqual.mjs',
    dataset: source.dataset,
    selection: {
      quota_classe_fine: QUOTA_CLASSE_FINE,
      quota_classe_large: QUOTA_CLASSE_LARGE,
      classes_retenues: rapportClasses.filter((c) => c.decision === 'retenue').length,
      classes_ecartees: rapportClasses
        .filter((c) => c.decision === 'écartée')
        .map((c) => ({ classe: c.key, libelle: CLASS_NAMES[c.key] ?? '?', motif: c.motif })),
    },
    notes: [
      "Viennent de CIQUAL: le libellé, la classification en sous-groupe et toutes les teneurs.",
      "NE VIENNENT PAS de CIQUAL, ce sont des décisions du projet à relire comme telles: les régimes compatibles (diet_tags), les exclusions (excluded_by), les bornes de quantité (min_qty_g, max_qty_g) et les unités d'achat (unit_label, unit_grams).",
      "vitamin_a est recomposée en équivalents rétinol: rétinol + bêta-carotène / 6.",
      "vitamin_k ne retient que la K1, forme sur laquelle porte la référence ANSES.",
      "Le gluten est détecté sur le libellé (blé, seigle, orge, épeautre, semoule, pain, pâtes, seitan...), ce qui est une heuristique et non une donnée: à revoir aliment par aliment avant mise en production.",
      "Les aliments qui se consomment en condiment (algues, levures, sons, germes, graines) sont plafonnés à " + CONDIMENT_MAX_G + " g par jour: sans ce plafond le solveur les retient massivement pour leur densité en micronutriments et produit des listes irréalistes.",
      "Sélection: par CLASSE CIQUAL (quatrième niveau de classification, avec repli sur le troisième quand il vaut 000000), avec un quota uniforme par classe. Le quota borne la taille du catalogue pour qu'il reste relisible à la main; il ne porte aucun jugement de pertinence, celui-ci étant porté par la classification de l'ANSES.",
      "La complétude de la fiche ne décide PAS de l'admission d'un aliment: elle ne départage que des aliments d'une même classe déjà retenue, à égalité tranchée par code CIQUAL croissant. Les aliments sans énergie ni protéines restent écartés, car inexploitables par le solveur.",
      "Les classes écartées portent chacune leur motif dans _meta.selection.classes_ecartees: une exclusion sans motif serait indistinguable d'un oubli.",
      "Énergie reconstituée par les coefficients d'Atwater (4/9/4, et 2 pour les fibres) quand CIQUAL ne la renseigne pas: " + selected.filter((f) => derivedEnergy.has(f.code.replace('ciqual-', ''))).length +
        " aliments concernés sur " + selected.length + ".",
    ],
  },
  foods: selected,
};

// --- Rapport de construction -------------------------------------------
//
// Ce n'est pas un journal de mise au point: c'est l'artefact que relit la porte
// de revue. Il doit nommer les décisions, pas les détailler.

const CATALOGUE_PATH = 'src/data/reference/foods.json';
const previous = fs.existsSync(CATALOGUE_PATH)
  ? JSON.parse(fs.readFileSync(CATALOGUE_PATH, 'utf8')).foods
  : [];

if (DRY_RUN) {
  console.log('[--dry-run] catalogue NON écrit, rapport seul.');
} else {
  fs.writeFileSync(CATALOGUE_PATH, JSON.stringify(out, null, 2) + '\n');
}

const completude = selected.reduce((s, f) => s + Object.keys(f.composition).length, 0) / selected.length;
console.log('');
console.log('Catalogue : ' + selected.length + ' aliments, complétude moyenne ' +
  completude.toFixed(2) + ' nutriments sur 26');
const byCat = {};
for (const f of selected) byCat[f.category] = (byCat[f.category] || 0) + 1;
console.log('Catégories: ' + Object.entries(byCat).sort().map(([k, v]) => k + ' ' + v).join(', '));
for (const groupe of interchangeables) {
  console.log('Compositions identiques, un seul retenu: ' +
    groupe.map((f) => f.label.split(',')[0]).join(' = '));
}
console.log('Marqués gluten: ' + selected.filter((f) => f.excluded_by.includes('gluten')).length +
  ' | enrichis: ' + selected.filter((f) => f.is_fortified).length +
  ' | repli au 3e niveau: ' + selected.filter((f) => f.selected_by.niveau === 3).length);

console.log('');
console.log('Classes (' + rapportClasses.filter((c) => c.decision === 'retenue').length + ' retenues, ' +
  rapportClasses.filter((c) => c.decision === 'écartée').length + ' écartées):');
for (const c of rapportClasses) {
  const nom = (CLASS_NAMES[c.key] ?? '?').slice(0, 40);
  if (c.decision === 'écartée') {
    console.log('  ' + c.key.padEnd(8) + ' n' + classLevelOf(c.key) + '  ÉCARTÉE  ' + nom.padEnd(41) + c.motif);
  } else {
    console.log('  ' + c.key.padEnd(8) + ' n' + classLevelOf(c.key) + '  retenue  ' + nom.padEnd(41) +
      String(c.retenus) + '/' + c.candidats + ' candidats');
  }
}

// Une classe qui se vide d'un millésime à l'autre est une information, pas une
// erreur: le sous-groupe des substituts de produits carnés compte six aliments
// en 2020 et aucun en 2025, son contenu ayant été reclassé ailleurs. Mais elle
// doit se voir, sans quoi le catalogue perd une famille en silence.
const videes = rapportClasses.filter((c) => c.decision === 'retenue' && c.candidats === 0);
if (videes.length) {
  console.log('');
  console.log('Classes retenues mais VIDES dans ce millésime — à vérifier:');
  for (const c of videes) console.log('  ' + c.key + '  ' + (CLASS_NAMES[c.key] ?? '?'));
}

// Les entrées et sorties sont ce qui rend un changement de millésime ou de règle
// relisible: sans cette liste, un aliment disparaît sans que personne le voie.
const avant = new Map(previous.map((f) => [f.code, f.label]));
const apres = new Map(selected.map((f) => [f.code, f.label]));
const entres = [...apres].filter(([c]) => !avant.has(c));
const sortis = [...avant].filter(([c]) => !apres.has(c));
console.log('');
console.log('Entrés (' + entres.length + '):');
for (const [, label] of entres) console.log('  + ' + label);
console.log('Sortis (' + sortis.length + '):');
for (const [, label] of sortis) console.log('  - ' + label);
