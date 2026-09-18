/**
 * Calendrier et libellés du catalogue.
 *
 * Le ruban des douze mois et les pastilles de familles sont les deux motifs
 * porteurs de sens de la direction « Encre & Saison » (docs/design-system.md).
 * Leurs libellés vivent ici, pas dans les composants: un mois doit s'écrire de
 * la même façon dans un ruban, dans une étiquette d'historique et dans le texte
 * de remplacement lu par un lecteur d'écran.
 */

export type Season = 'hiver' | 'printemps' | 'ete' | 'automne';

/** Initiale affichée dans le ruban. Muette pour un lecteur d'écran: le ruban
 *  porte pour cela un texte de remplacement qui nomme les mois en entier. */
export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

export const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
] as const;

/** Saison de chaque mois, de janvier à décembre. */
const SEASON_BY_MONTH: Season[] = [
  'hiver', 'hiver',
  'printemps', 'printemps', 'printemps',
  'ete', 'ete', 'ete',
  'automne', 'automne', 'automne',
  'hiver',
];

/**
 * Indice de tableau pour un mois, ramené de force entre 1 et 12.
 *
 * Les mois viennent soit de `Date.getMonth()`, soit de la table de
 * saisonnalité: ils sont toujours valides. Le calage rend l'accès sûr sans
 * laisser passer un `undefined` dans une chaîne affichée, ce qui produirait un
 * « de saison en undefined » à l'écran.
 */
function monthIndex(month: number): number {
  return Math.min(Math.max(Math.trunc(month), 1), 12) - 1;
}

export function seasonOfMonth(month: number): Season {
  return SEASON_BY_MONTH[monthIndex(month)] ?? 'hiver';
}

export function monthName(month: number): string {
  return MONTH_NAMES[monthIndex(month)] ?? 'janvier';
}

/**
 * Texte de remplacement d'un ruban.
 *
 * Sans mois de disponibilité, le ruban ne dit que la date de consultation.
 * Avec, il dit la période de l'aliment — et c'est cette phrase, pas la suite
 * d'initiales, que doit entendre un lecteur d'écran (FR-104).
 */
export function ribbonLabel(currentMonth: number, seasonMonths?: number[]): string {
  if (!seasonMonths || seasonMonths.length === 0) {
    return 'Calendrier des douze mois, ' + monthName(currentMonth) + ' en cours.';
  }
  const named = [...seasonMonths].sort((a, b) => a - b).map(monthName);
  return (
    'De saison en ' +
    named.join(', ') +
    '. Mois en cours : ' +
    monthName(currentMonth) +
    '.'
  );
}

/**
 * Familles d'aliments affichées dans la liste d'ingrédients.
 *
 * Les codes de catégorie viennent du catalogue (src/data/reference/foods.json).
 * Plusieurs catégories partagent une famille d'affichage: viandes, poissons,
 * œufs et produits laitiers forment une seule pastille.
 *
 * Les alternatives végétales ont la leur, une huitième. Les rattacher à la
 * pastille des protéines animales aurait donné un libellé énumérant cinq choses
 * — une pastille qui ne nomme plus rien n'accélère plus aucune lecture — et
 * aurait rangé le tofu d'un végane sous « viandes et poissons ». Le coût est une
 * teinte de plus à distinguer sur un point de 9 px; elle a été prise dans la
 * seule plage que la palette laissait libre (voir src/styles/tokens.css).
 */
export type FoodFamily =
  | 'legume'
  | 'fruit'
  | 'cereale'
  | 'legumineuse'
  | 'proteine'
  | 'vegetal'
  | 'coque'
  | 'grasse'
  | 'autre';

const FAMILY_BY_CATEGORY: Record<string, FoodFamily> = {
  legume: 'legume',
  fruit: 'fruit',
  cereale: 'cereale',
  legumineuse: 'legumineuse',
  viande: 'proteine',
  poisson: 'proteine',
  oeuf: 'proteine',
  produit_laitier: 'proteine',
  proteine_vegetale: 'vegetal',
  boisson_vegetale: 'vegetal',
  specialite_vegetale: 'vegetal',
  fruit_a_coque: 'coque',
  matiere_grasse: 'grasse',
  autre: 'autre',
};

export function familyOfCategory(category: string): FoodFamily {
  return FAMILY_BY_CATEGORY[category] ?? 'autre';
}

/** Libellé affiché à côté de chaque pastille: la couleur ne suffit jamais. */
export const FAMILY_LABELS: Record<FoodFamily, string> = {
  legume: 'Légumes',
  fruit: 'Fruits',
  cereale: 'Céréales',
  legumineuse: 'Légumineuses',
  proteine: 'Œufs, laitiers, viandes et poissons',
  vegetal: 'Alternatives végétales',
  coque: 'Fruits à coque',
  grasse: 'Matières grasses',
  autre: 'Autres',
};

/** Libellé au singulier, pour la sous-ligne d'un ingrédient. */
export const CATEGORY_LABELS: Record<string, string> = {
  legume: 'Légume',
  fruit: 'Fruit',
  legumineuse: 'Légumineuse',
  cereale: 'Céréale',
  viande: 'Viande',
  poisson: 'Poisson',
  oeuf: 'Œuf',
  produit_laitier: 'Produit laitier',
  proteine_vegetale: 'Protéine végétale',
  boisson_vegetale: 'Boisson végétale',
  specialite_vegetale: 'Spécialité végétale',
  matiere_grasse: 'Matière grasse',
  fruit_a_coque: 'Fruit à coque',
  autre: 'Autre',
};

/**
 * Libellé de catégorie au pluriel, tel qu'affiché en colonne de la liste
 * d'ingrédients.
 *
 * Volontairement plus fin que les sept familles: c'est cette colonne qui permet
 * de vérifier qu'aucun aliment incompatible avec le régime n'est proposé
 * (FR-013), et « Œufs, laitiers, viandes et poissons » ne le permettrait pas.
 */
export const CATEGORY_GROUP_LABELS: Record<string, string> = {
  legume: 'Légumes',
  fruit: 'Fruits',
  legumineuse: 'Légumineuses',
  cereale: 'Céréales',
  viande: 'Viandes',
  poisson: 'Poissons',
  oeuf: 'Œufs',
  produit_laitier: 'Produits laitiers',
  proteine_vegetale: 'Protéines végétales',
  boisson_vegetale: 'Boissons végétales',
  specialite_vegetale: 'Spécialités végétales',
  matiere_grasse: 'Matières grasses',
  fruit_a_coque: 'Fruits à coque',
  autre: 'Autres',
};

/**
 * Période de disponibilité en une ligne: « Juil → Sep », « Sep → Jan ».
 *
 * La saisonnalité se lit d'un coup d'œil sur le ruban, mais une carte d'étal
 * n'a pas la place d'en porter un: il lui faut la même information en trois
 * mots. Les mois qui enjambent le changement d'année sont recollés — un chou
 * frisé disponible en septembre, octobre, décembre et janvier est de saison
 * « Sep → Jan », pas « Jan, Sep, Oct, Déc ».
 */
const MONTH_ABBR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
] as const;

export function seasonRangeLabel(months: number[]): string {
  const set = new Set(months);
  if (set.size === 0) return '';
  if (set.size === 12) return "Toute l'année";

  // Le premier mois d'une plage est celui dont le précédent est absent. En
  // partant de là, on avance tant que le suivant est présent.
  const start = [...set].sort((a, b) => a - b).find((m) => !set.has(m === 1 ? 12 : m - 1));
  if (start === undefined) return '';

  let end = start;
  while (set.has(end === 12 ? 1 : end + 1) && (end === 12 ? 1 : end + 1) !== start) {
    end = end === 12 ? 1 : end + 1;
  }

  // Un produit disponible en septembre et en novembre n'est pas « de saison en
  // septembre » tout court: le « + » dit qu'il revient plus tard dans l'année.
  const runLength = end >= start ? end - start + 1 : 12 - start + end + 1;
  const from = MONTH_ABBR[start - 1] ?? '';
  const to = MONTH_ABBR[end - 1] ?? '';
  const range = start === end ? from : from + ' → ' + to;
  return runLength < set.size ? range + ' +' : range;
}

/**
 * Nom d'usage d'un aliment, à partir de son libellé CIQUAL.
 *
 * Le catalogue écrit « Melon cantaloup (par ex.: Charentais, de Cavaillon)
 * pulpe, cru »: couper à la première virgule laissait une parenthèse ouverte à
 * l'écran. On coupe donc à la première virgule OU parenthèse, et le libellé
 * complet reste dans les données pour qui veut le vérifier.
 */
export function shortFoodLabel(label: string): string {
  const cut = label.search(/[,(]/);
  return (cut === -1 ? label : label.slice(0, cut)).trim();
}
