import { describe, expect, it } from 'vitest';
import foodsJson from '@/data/reference/foods.json';

/**
 * Conformité du catalogue produit à son contrat
 * (specs/003-catalogue-pertinence/contracts/foods.schema.json).
 *
 * La vérification est structurelle et écrite à la main plutôt que déléguée à un
 * moteur JSON Schema: le dépôt n'embarque pas de validateur, et en ajouter un
 * pour un seul fichier de référence coûterait plus qu'il ne rapporte. Les règles
 * reprises ici sont celles que le contrat déclare obligatoires.
 */

type Food = {
  code: string;
  label: string;
  category: string;
  is_fruit_vegetable: boolean;
  is_fortified: boolean;
  diet_tags: string[];
  excluded_by: string[];
  composition: Record<string, number>;
  min_qty_g: number;
  max_qty_g: number;
  unit_label: string;
  unit_grams: number;
  selected_by: { classe: string; niveau: number };
};

const meta = foodsJson._meta as unknown as Record<string, unknown>;
const foods = foodsJson.foods as unknown as Food[];

const DIETS = ['omnivore', 'pescetarian', 'vegetarian', 'vegan'];
const EXCLUSIONS = ['gluten', 'lactose', 'nuts'];

describe('_meta du catalogue (principe II, FR-209, FR-210)', () => {
  it('porte les champs de traçabilité obligatoires', () => {
    for (const key of ['description', 'source', 'version', 'retrieved_at', 'generated_by', 'dataset', 'selection', 'notes']) {
      expect(meta[key], key).toBeDefined();
    }
  });

  it('identifie le jeu de données par son DOI, sa version, sa date et sa licence', () => {
    // Ces valeurs viennent de la source. Une saisie à la main serait
    // invérifiable, et c'est exactement ce que la feature 003 a supprimé.
    const dataset = meta.dataset as Record<string, unknown>;
    for (const key of ['doi', 'version', 'published_at', 'license']) {
      expect(dataset[key], key).toBeTruthy();
    }
    expect(String(dataset.license).toLowerCase()).toBe('etalab 2.0');
  });

  it('date la récupération au format ISO', () => {
    expect(String(meta.retrieved_at)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('forme de chaque aliment', () => {
  it('porte un code CIQUAL unique', () => {
    const codes = foods.map((f) => f.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^ciqual-\d+$/);
  });

  it('déclare au moins un régime compatible, parmi les quatre du contrat', () => {
    for (const f of foods) {
      expect(f.diet_tags.length, f.label).toBeGreaterThan(0);
      for (const d of f.diet_tags) expect(DIETS, f.label).toContain(d);
    }
  });

  it('n\'emploie que les exclusions du contrat', () => {
    for (const f of foods) {
      for (const e of f.excluded_by) expect(EXCLUSIONS, f.label).toContain(e);
    }
  });

  it('renseigne énergie et protéines, sans quoi le solveur ne peut rien en faire', () => {
    for (const f of foods) {
      expect(f.composition.energy, f.label).toBeTypeOf('number');
      expect(f.composition.protein, f.label).toBeTypeOf('number');
    }
  });

  it('ne porte aucune teneur négative', () => {
    for (const f of foods) {
      for (const [code, value] of Object.entries(f.composition)) {
        expect(value, f.label + ' / ' + code).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('borne les quantités de façon cohérente', () => {
    for (const f of foods) {
      expect(f.min_qty_g, f.label).toBeGreaterThanOrEqual(0);
      expect(f.max_qty_g, f.label).toBeGreaterThan(0);
      expect(f.max_qty_g, f.label).toBeGreaterThanOrEqual(f.min_qty_g);
      expect(f.unit_grams, f.label).toBeGreaterThan(0);
      expect(f.unit_label.length, f.label).toBeGreaterThan(0);
    }
  });

  it('rattache chaque aliment à la règle qui justifie sa présence (FR-205)', () => {
    for (const f of foods) {
      expect(f.selected_by?.classe, f.label).toBeTruthy();
      expect([3, 4], f.label).toContain(f.selected_by?.niveau);
    }
  });
});
