import { describe, expect, it } from 'vitest';
import { saveResultSchema } from '@/lib/validation';

/**
 * Contrat d'entrée de POST /api/results (contracts/api.md).
 *
 * Les chemins authentifiés ne sont pas jouables ici: les route handlers lisent
 * les cookies de session, qui n'existent qu'en contexte de requête. Ils sont
 * couverts par le parcours de bout en bout us3-compte.spec.ts, qui se connecte
 * réellement. Ce fichier verrouille ce qui peut l'être sans infrastructure: la
 * forme acceptée en entrée.
 */
const validProfile = { weight_kg: 75, height_cm: 178, age: 35, reference_sex: 'male', activity_level: 'active' };

describe('contrat d\'enregistrement d\'un résultat', () => {
  it('accepte un profil et une période, sans régime', () => {
    const result = saveResultSchema.safeParse({ profile: validProfile, period: 'day' });
    expect(result.success).toBe(true);
  });

  it('accepte un régime optionnel', () => {
    const result = saveResultSchema.safeParse({
      profile: validProfile,
      period: 'week',
      diet: { base: 'vegan', exclusions: ['gluten'] },
    });
    expect(result.success).toBe(true);
  });

  it('n\'accepte PAS les besoins calculés: le serveur les recalcule', () => {
    const result = saveResultSchema.safeParse({
      profile: validProfile,
      period: 'day',
      needs: { daily: [{ nutrient: 'energy', value: 99999 }] },
    });
    expect(result.success).toBe(false);
  });

  it('refuse un profil contenant le régime', () => {
    const result = saveResultSchema.safeParse({
      profile: { ...validProfile, diet_base: 'vegan' },
      period: 'day',
    });
    expect(result.success).toBe(false);
  });

  it('refuse une période inconnue', () => {
    expect(saveResultSchema.safeParse({ profile: validProfile, period: 'mois' }).success).toBe(false);
  });

  it('refuse un profil hors bornes', () => {
    const result = saveResultSchema.safeParse({
      profile: { ...validProfile, age: 90 },
      period: 'day',
    });
    expect(result.success).toBe(false);
  });

  it('accepte une date de génération ISO et refuse le reste', () => {
    expect(saveResultSchema.safeParse({ profile: validProfile, period: 'day', generated_at: '2026-09-13T10:00:00Z' }).success).toBe(true);
    expect(saveResultSchema.safeParse({ profile: validProfile, period: 'day', generated_at: '13/09/2026' }).success).toBe(false);
  });
});
