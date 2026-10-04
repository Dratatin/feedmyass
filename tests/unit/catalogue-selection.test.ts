import { describe, expect, it } from 'vitest';
import foodsJson from '@/data/reference/foods.json';

/**
 * Sélection du catalogue par classe CIQUAL (feature 003).
 *
 * Ces tests portent sur le catalogue RÉEL du dépôt, pas sur un jeu inventé: une
 * règle de sélection qui déraperait doit faire échouer la suite, pas passer
 * inaperçue jusqu'à la revue.
 */

const foods = foodsJson.foods as {
  code: string;
  label: string;
  category: string;
  diet_tags: string[];
  excluded_by: string[];
  selected_by?: { classe: string; niveau: number };
}[];

const meta = foodsJson._meta as unknown as {
  selection: {
    quota_classe_fine: number;
    quota_classe_large: number;
    classes_retenues: number;
    classes_ecartees: { classe: string; libelle: string; motif: string }[];
  };
};

describe('traçabilité de la sélection (FR-205)', () => {
  it('rattache chaque aliment à la classe qui justifie sa présence', () => {
    for (const food of foods) {
      expect(food.selected_by, food.label).toBeDefined();
      expect(food.selected_by!.classe, food.label).toBeTruthy();
      expect([3, 4], food.label).toContain(food.selected_by!.niveau);
    }
  });

  it('marque le repli au troisième niveau par un code préfixé', () => {
    // Le repli concerne 22 % des aliments de CIQUAL, dont toutes les pommes de
    // terre et tout le tofu: il doit rester visible dans la donnée produite.
    for (const food of foods) {
      const parRepli = food.selected_by!.classe.startsWith('ss:');
      expect(parRepli, food.label).toBe(food.selected_by!.niveau === 3);
    }
    expect(foods.some((f) => f.selected_by!.niveau === 3)).toBe(true);
  });
});

describe('quotas par classe (FR-203, FR-206)', () => {
  it('ne dépasse jamais le quota de son niveau, hors fruits et légumes', () => {
    // Les fruits et légumes sont sélectionnés à l'espèce, bornés par le
    // calendrier de saison, et échappent donc au quota par classe.
    const parClasse = new Map<string, number>();
    for (const food of foods) {
      if (food.category === 'legume' || food.category === 'fruit') continue;
      const classe = food.selected_by!.classe;
      parClasse.set(classe, (parClasse.get(classe) ?? 0) + 1);
    }
    for (const [classe, n] of parClasse) {
      const quota = classe.startsWith('ss:')
        ? meta.selection.quota_classe_large
        : meta.selection.quota_classe_fine;
      expect(n, classe).toBeLessThanOrEqual(quota);
    }
  });

  it('n\'a retenu aucun aliment d\'une classe écartée', () => {
    const ecartees = new Set(meta.selection.classes_ecartees.map((c) => c.classe));
    for (const food of foods) {
      expect(ecartees.has(food.selected_by!.classe), food.label).toBe(false);
    }
  });
});

describe('motifs d\'exclusion', () => {
  it('donne un motif à chaque classe écartée', () => {
    // Une exclusion sans motif est indistinguable d'un oubli. C'est ce qui
    // manquait aux dix-huit plafonds numériques que cette feature remplace.
    expect(meta.selection.classes_ecartees.length).toBeGreaterThan(0);
    for (const c of meta.selection.classes_ecartees) {
      expect(c.motif, c.classe).toBeTruthy();
      expect(c.motif.length, c.classe).toBeGreaterThan(20);
    }
  });
});

describe('qualité du catalogue produit (SC-003)', () => {
  it('conserve une complétude moyenne d\'au moins 23 nutriments sur 26', () => {
    // SC-003 visait 25, le niveau du catalogue construit sur la table 2020. Le
    // changement de RÈGLES ne coûte presque rien (25,56 -> 25,52 à millésime
    // égal); c'est le changement de MILLÉSIME qui fait tomber la mesure à 23,3,
    // la table 2025 renseignant moins complètement les folates, le sélénium et
    // l'iode des aliments que les règles retiennent.
    //
    // Le seuil a donc été abaissé, et le millésime conservé: la 2025 a retiré
    // les teneurs en B12 des algues, que la 2020 publiait et dont le catalogue
    // se servait pour déclarer couverte la B12 d'un régime végane. Un catalogue
    // moins complet qui dit vrai vaut mieux qu'un catalogue complet qui ment.
    const total = foods.reduce(
      // Le rétinol (feature 004) sert la limite de sécurité, il n'est pas l'un des 26 nutriments suivis.
      (sum, f) => sum + Object.keys((f as unknown as { composition: object }).composition)
        .filter((k) => k !== 'retinol').length,
      0
    );
    expect(total / foods.length).toBeGreaterThanOrEqual(23);
  });

  it('représente chaque espèce de viande que la classification distingue', () => {
    // C'est le gain concret de la sélection par classe: le catalogue précédent
    // était dominé par le bœuf, faute de distinguer les espèces.
    const classesViande = new Set(
      foods.filter((f) => f.category === 'viande').map((f) => f.selected_by!.classe)
    );
    expect(classesViande.size).toBeGreaterThanOrEqual(5);
  });
});

describe('données propres au projet (exclusions, unités)', () => {
  it('exclut des régimes sans fruits à coque les huiles qui en sont tirées', () => {
    // Constaté par simulation: les huiles de noix, de noisette et d'arachide
    // passaient le filtre « sans fruits à coque », leur classe d'huiles ne
    // portant aucune exclusion.
    const huiles = foods.filter((f) =>
      /^huile d'arachide|^huile de (noix|noisette|cajou|pistache|macadamia|amande)/i.test(f.label));
    expect(huiles.length).toBeGreaterThan(0);
    for (const huile of huiles) expect(huile.excluded_by, huile.label).toContain('nuts');
  });

  it('n\'exprime aucun fruit en pièces d\'un poids unique', () => {
    // « Fruit de 120 g » valait pour une pomme et affichait « 0,5 fruit » pour
    // 33 g de cassis.
    const fruits = foods.filter((f) => f.category === 'fruit') as unknown as { label: string; unit_label: string }[];
    for (const fruit of fruits) expect(fruit.unit_label, fruit.label).not.toMatch(/^fruit de/);
  });
});

describe('rattachement au modèle de consommation de l\'ANSES (feature 004, FR-308 à FR-310, FR-321)', () => {
  type Rattache = {
    label: string;
    anses_subgroup: string | null;
    family: string;
    attached_by: { classe: string; regle: string; substitut: boolean };
  };
  const rattaches = foods as unknown as Rattache[];
  const table = (foodsJson._meta as unknown as {
    rattachement: { regle: string; affinages: { regle: string }[] }[];
  }).rattachement;
  const regles = new Set(table.flatMap((r) => [r.regle, ...r.affinages.map((a) => a.regle)]));
  const sousGroupe = (debut: string) =>
    rattaches.filter((f) => f.label.startsWith(debut)).map((f) => f.anses_subgroup);

  it('rattache chaque aliment par une règle consultable dans le catalogue', () => {
    for (const f of rattaches) expect(regles.has(f.attached_by.regle), f.label).toBe(true);
  });

  it('ne laisse sans sous-groupe que les algues et l\'eau de coco', () => {
    const sans = rattaches.filter((f) => f.anses_subgroup === null);
    expect(sans.length).toBeGreaterThan(0);
    for (const f of sans) expect(f.label, f.label).toMatch(/algue|ulva|ascophyll|dulse|kombu|nori|chondrus|himanthalia|spirulin|criste marine|^eau de coco/i);
  });

  it('range en poissons gras exactement le hareng, le maquereau et le saumon', () => {
    const gras = rattaches.filter((f) => f.anses_subgroup === 'poissons_gras').map((f) => f.label.split(',')[0]);
    expect(gras.sort()).toEqual(['Hareng', 'Maquereau', 'Saumon']);
  });

  it('range la pomme de terre dans les féculents, comme l\'ANSES', () => {
    expect(sousGroupe('Pomme de terre')).toEqual(['autres_feculents_raffines']);
  });

  it('rattache les protéines végétales aux légumineuses, par usage', () => {
    for (const f of rattaches.filter((x) => /^(Tofu|Tempeh|Seitan|Protéine de soja)/.test(x.label))) {
      expect(f.anses_subgroup, f.label).toBe('legumineuses');
      expect(f.attached_by.substitut, f.label).toBe(true);
    }
  });

  it('donne à chaque aliment une famille, qui ne mêle jamais deux sous-groupes', () => {
    const sousGroupesParFamille = new Map<string, Set<string | null>>();
    for (const f of rattaches) {
      expect(f.family, f.label).not.toBe('');
      if (!sousGroupesParFamille.has(f.family)) sousGroupesParFamille.set(f.family, new Set());
      sousGroupesParFamille.get(f.family)!.add(f.anses_subgroup);
    }
    for (const [famille, groupes] of sousGroupesParFamille) expect(groupes.size, famille).toBe(1);
  });

  it('réunit dans une même famille les laits, les tofus et les œufs', () => {
    const familles = (debut: RegExp) => new Set(rattaches.filter((f) => debut.test(f.label)).map((f) => f.family));
    expect(familles(/^Lait (à|de|demi|entier)/).size).toBe(1);
    expect(familles(/^Tofu/).size).toBe(1);
    expect(familles(/^Oeuf/).size).toBe(1);
  });
});
