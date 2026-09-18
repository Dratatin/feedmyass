/**
 * Calendrier de saison des fruits et légumes, et rapprochement par espèce.
 *
 * Source: docs/sources/calendrier_fruits_legumes_saison.json
 *         (ADEME / Manger Bouger, France métropolitaine).
 *
 * Partagé par deux scripts qui doivent impérativement s'accorder:
 *   - build-foods-from-ciqual.mjs, qui s'en sert de critère de PERTINENCE
 *     (un fruit ou légume absent du calendrier n'a aucune saison, donc ne sera
 *     jamais proposé — FR-014 — et n'a rien à faire au catalogue);
 *   - build-seasonality.mjs, qui s'en sert de table de DISPONIBILITÉ mensuelle.
 *
 * Deux copies de la table d'alias auraient divergé au premier ajout: une variété
 * rapprochée ici et pas là produirait un aliment au catalogue sans aucun mois de
 * saison, c'est-à-dire un aliment mort.
 */
import fs from 'node:fs';

const CALENDAR_PATH = 'docs/sources/calendrier_fruits_legumes_saison.json';

export const MONTHS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

/**
 * Variétés et synonymes du catalogue CIQUAL rattachés à l'entrée générique du
 * calendrier. Table explicite et relisible: chaque ligne est une décision.
 */
export const ALIASES = {
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
 * Fruits et légumes sans saison en France métropolitaine: ils ne sont jamais
 * proposés, et c'est le comportement attendu d'une application qui ne suggère
 * que de saison. Listés pour que l'absence soit un choix visible, pas un oubli.
 */
export const NEVER_IN_SEASON = [
  'banane', 'canneberge ou cranberry', 'citron vert ou lime', 'fruit de la passion ou maracudja',
  'litchi', 'mangue', 'pissenlit', 'haricot mungo germe ou pousse de "soja"',
];

export const normalize = (s) =>
  s.normalize('NFD')
    // Marques diacritiques combinantes, écrites en séquences d'échappement: les
    // caractères eux-mêmes sont invisibles à la relecture et ne survivraient pas
    // à un ré-encodage du fichier.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Nom d'espèce d'un libellé CIQUAL: premier segment, parenthèses retirées. */
export const speciesOf = (label) => {
  const first = label.split(',')[0];
  const open = first.indexOf('(');
  return normalize(open >= 0 ? first.slice(0, open) : first);
};

/** Espèce ramenée à l'entrée générique du calendrier, via la table d'alias. */
export const calendarKeyOf = (label) => {
  const species = speciesOf(label);
  return ALIASES[species] ?? species;
};

export function loadCalendar() {
  return JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8'));
}

/** Nom d'espèce du calendrier -> ensemble des mois de disponibilité. */
export function monthsBySpecies(calendar = loadCalendar()) {
  const map = new Map();
  for (const [monthName, groups] of Object.entries(calendar.calendrier)) {
    const month = MONTHS[monthName];
    // Les deux listes du calendrier sont fusionnées: la catégorie de l'aliment
    // vient déjà du catalogue, pas du calendrier.
    for (const key of ['legumes', 'fruits']) {
      for (const raw of groups[key] ?? []) {
        const name = normalize(raw);
        if (!map.has(name)) map.set(name, new Set());
        map.get(name).add(month);
      }
    }
  }
  return map;
}
