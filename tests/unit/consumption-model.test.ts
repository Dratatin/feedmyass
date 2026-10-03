import { describe, expect, it } from 'vitest';
import modelJson from '@/data/reference/consumption-model.json';

/**
 * Paramètres du modèle de consommation de l'ANSES (feature 004, research R1).
 *
 * Ces chiffres pèsent sur chaque liste produite: une valeur mal recopiée
 * fausserait toutes les listes en restant « sourcée ». Les tests portent sur le
 * fichier réel et croisent plusieurs valeurs avec l'avis lui-même.
 */

type Params = {
  lower: number;
  mean: number;
  sd?: number;
  upper: number | null;
  provenance: Record<'lower' | 'mean' | 'upper', { table: string; page: number }> & {
    sd?: { table: string; page: number };
  };
};
type Subgroup = {
  code: string;
  label: string;
  direction: 'mean' | 'maximize' | 'minimize';
  by_sex: { male: Params; female: Params };
  coupled_with: string | null;
  coupled_upper: { male: number; female: number; provenance: { table: string; page: number } } | null;
  substitutes_for: string[];
};

const subgroups = modelJson.subgroups as Subgroup[];
const byCode = new Map(subgroups.map((g) => [g.code, g]));
const sexes = ['male', 'female'] as const;

/** Sous-groupes dont la borne haute est un plafond épidémiologique, qui peut passer sous la moyenne. */
const PLAFONDS_EPIDEMIOLOGIQUES = new Set(['viande_hors_volaille', 'charcuterie']);

describe('traçabilité (principe II)', () => {
  it('porte la source, la version et la date de récupération', () => {
    expect(modelJson._meta.source).toMatch(/2012-SA-0103/);
    expect(modelJson._meta.version).toBe('2016-12');
    expect(modelJson._meta.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rattache chaque valeur à un tableau et une page de l\'avis', () => {
    for (const g of subgroups) {
      for (const sex of sexes) {
        const p = g.by_sex[sex];
        for (const key of ['lower', 'mean', 'upper'] as const) {
          expect(p.provenance[key].table, `${g.code} ${sex} ${key}`).toBe('Tableau 9');
          expect([73, 74]).toContain(p.provenance[key].page);
        }
        if (p.sd !== undefined) {
          expect(p.provenance.sd?.table, `${g.code} ${sex} sd`).toBe('Annexe 6');
          expect([80, 81]).toContain(p.provenance.sd?.page);
        }
      }
      if (g.coupled_upper) expect(g.coupled_upper.provenance.table).toBe('Tableau 9');
    }
  });

  it('nomme dans les notes chaque décision qui n\'est pas de l\'ANSES', () => {
    const notes = modelJson._meta.notes.join(' ');
    expect(notes).toMatch(/substitutes_for/);
    expect(notes).toMatch(/70 ans/);
    expect(notes).toMatch(/contaminants/);
  });
});

describe('cohérence interne', () => {
  it('donne un écart-type strictement positif à tout sous-groupe rapproché de sa moyenne', () => {
    for (const g of subgroups.filter((s) => s.direction === 'mean')) {
      for (const sex of sexes) expect(g.by_sex[sex].sd, `${g.code} ${sex}`).toBeGreaterThan(0);
    }
  });

  it('ordonne borne basse, moyenne et borne haute', () => {
    for (const g of subgroups) {
      for (const sex of sexes) {
        const { lower, mean, upper } = g.by_sex[sex];
        expect(lower, `${g.code} ${sex}`).toBeLessThanOrEqual(mean);
        if (upper !== null && !PLAFONDS_EPIDEMIOLOGIQUES.has(g.code)) {
          expect(mean, `${g.code} ${sex}`).toBeLessThanOrEqual(upper);
        }
        if (upper !== null) expect(lower).toBeLessThanOrEqual(upper);
      }
    }
  });

  it('déclare les couplages dans les deux sens', () => {
    for (const g of subgroups.filter((s) => s.coupled_with)) {
      const other = byCode.get(g.coupled_with!);
      expect(other, g.code).toBeDefined();
      expect(other!.coupled_with).toBe(g.code);
      expect(other!.coupled_upper).toEqual(g.coupled_upper);
    }
  });

  it('ne désigne comme substitué qu\'un sous-groupe existant', () => {
    for (const g of subgroups) for (const code of g.substitutes_for) expect(byCode.has(code), code).toBe(true);
  });

  it('suit le tableau 5 pour le sens d\'optimisation', () => {
    const dir = (code: string) => byCode.get(code)!.direction;
    for (const code of ['fruits_frais', 'legumes', 'pain_complet', 'autres_feculents_complets']) expect(dir(code)).toBe('maximize');
    for (const code of ['viande_hors_volaille', 'charcuterie', 'boissons_sucrees', 'jus_de_fruits']) expect(dir(code)).toBe('minimize');
  });
});

describe('valeurs relues sur l\'avis', () => {
  // Valeurs contrôlées sur la mise en page des pages 73-74 et 80-81: si l'une
  // change, c'est une erreur de saisie, pas une mise à jour.
  it('légumes, hommes: 16 / 123 / 285 g/j, écart-type 92,6', () => {
    expect(byCode.get('legumes')!.by_sex.male).toMatchObject({ lower: 16, mean: 123, upper: 285, sd: 92.6 });
  });

  it('légumineuses, hommes: 0 / 14 / 64 g/j, écart-type 25,8', () => {
    expect(byCode.get('legumineuses')!.by_sex.male).toMatchObject({ lower: 0, mean: 14, upper: 64, sd: 25.8 });
  });

  it('plafonds épidémiologiques: viande hors volaille 71 g/j, charcuterie 25 g/j, pour les deux sexes', () => {
    for (const sex of sexes) {
      expect(byCode.get('viande_hors_volaille')!.by_sex[sex].upper).toBe(71);
      expect(byCode.get('charcuterie')!.by_sex[sex].upper).toBe(25);
    }
  });

  it('limite couplante des huiles: 21 g/j hommes, 16 g/j femmes', () => {
    expect(byCode.get('huiles_riches_ala')!.coupled_upper).toMatchObject({ male: 21, female: 16 });
  });
});
