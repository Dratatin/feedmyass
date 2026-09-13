import { describe, expect, it } from 'vitest';
import { profileSchema } from '@/lib/validation';

/**
 * Bornes de validation du profil (FR-002, data-model.md).
 *
 * Le schéma est `.strict()`: il refuse toute clé inconnue, donc tout champ de
 * régime glissé dans une requête de calcul de besoins. C'est la traduction du
 * principe III au niveau du contrat HTTP.
 */
const valid = {
  weight_kg: 70,
  height_cm: 175,
  age: 35,
  reference_sex: 'male',
  activity_level: 'active',
};

describe('validation du profil', () => {
  it('accepte un profil valide', () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['weight_kg', 29.9],
    ['weight_kg', 250.1],
    ['height_cm', 119],
    ['height_cm', 231],
    ['age', 17],
    ['age', 71],
  ])('refuse %s = %s et nomme le champ fautif', (field, value) => {
    const result = profileSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });

  it.each([30, 250])('accepte les bornes incluses du poids (%s kg)', (weight) => {
    expect(profileSchema.safeParse({ ...valid, weight_kg: weight }).success).toBe(true);
  });

  it.each([18, 70])('accepte les bornes incluses de l\'âge (%s ans)', (age) => {
    expect(profileSchema.safeParse({ ...valid, age }).success).toBe(true);
  });

  it('refuse un âge non entier', () => {
    expect(profileSchema.safeParse({ ...valid, age: 35.5 }).success).toBe(false);
  });

  it.each(['reference_sex', 'activity_level'])('refuse une valeur hors énumération pour %s', (field) => {
    expect(profileSchema.safeParse({ ...valid, [field]: 'autre' }).success).toBe(false);
  });

  it('refuse tout champ de régime (principe III, FR-008)', () => {
    for (const extra of [{ diet_base: 'vegan' }, { diet: { base: 'vegan' } }, { exclusions: ['gluten'] }]) {
      const result = profileSchema.safeParse({ ...valid, ...extra });
      expect(result.success).toBe(false);
    }
  });

  it('refuse un champ manquant', () => {
    const { age: _omitted, ...incomplete } = valid;
    expect(profileSchema.safeParse(incomplete).success).toBe(false);
  });
});
