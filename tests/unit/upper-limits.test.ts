import { describe, expect, it } from 'vitest';
import limitsJson from '@/data/reference/upper-limits.json';
import nutrientsJson from '@/data/reference/nutrients.json';
import intakesJson from '@/data/reference/reference-intakes.json';

/**
 * Limites supérieures de sécurité (feature 004, FR-316, research R6).
 */

const limits = limitsJson.upper_limits;
const units = new Map(nutrientsJson.nutrients.map((n) => [n.code, n.unit]));

describe('limites supérieures de sécurité', () => {
  it('cite une source primaire pour chaque limite', () => {
    for (const l of limits) expect(l.source, l.nutrient_code).toMatch(/^(SCF|EFSA)/);
  });

  it('exprime chaque limite dans l\'unité du nutriment', () => {
    for (const l of limits) {
      // Le rétinol n'est pas un nutriment affiché: il ne figure pas au référentiel.
      const expected = l.nutrient_code === 'retinol' ? 'µg' : units.get(l.nutrient_code);
      expect(l.unit, l.nutrient_code).toBe(expected);
    }
  });

  it('ne place aucune limite sous l\'apport de référence du même nutriment', () => {
    for (const l of limits) {
      const refs = intakesJson.reference_intakes.filter(
        (i) => i.nutrient_code === l.nutrient_code && i.basis === 'absolute');
      for (const r of refs) expect(l.value, l.nutrient_code).toBeGreaterThan(r.value);
    }
  });

  it('applique la limite de la vitamine A au seul rétinol', () => {
    const codes = limits.map((l) => l.nutrient_code);
    expect(codes).toContain('retinol');
    expect(codes).not.toContain('vitamin_a');
  });

  it('n\'inclut aucune limite réservée aux compléments', () => {
    const codes = limits.map((l) => l.nutrient_code);
    for (const code of ['magnesium', 'vitamin_b9', 'vitamin_b3']) expect(codes).not.toContain(code);
  });
});
