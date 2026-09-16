import { describe, expect, it } from 'vitest';
import { POST, DISCLAIMER } from '@/app/api/needs/route';

/**
 * Contrat de POST /api/needs (contracts/api.md).
 *
 * Ces cas s'arrêtent à la validation, avant toute lecture de base: ils vérifient
 * le contrat d'entrée sans infrastructure. Le chemin nominal est couvert par le
 * parcours de bout en bout.
 */
const post = (body: unknown) =>
  POST(new Request('http://localhost/api/needs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));

const valid = { weight_kg: 75, height_cm: 178, age: 35, reference_sex: 'male', activity_level: 'active' };

describe('POST /api/needs', () => {
  it('refuse une requête portant un champ de régime (principe III, FR-008)', async () => {
    for (const extra of [{ diet_base: 'vegan' }, { diet: { base: 'vegan', exclusions: [] } }]) {
      const response = await post({ ...valid, ...extra });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('validation_error');
    }
  });

  it('refuse un profil hors bornes et nomme le champ fautif (FR-002)', async () => {
    const response = await post({ ...valid, weight_kg: 400 });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('validation_error');
    expect(body.error.fields.some((f: { field: string }) => f.field === 'weight_kg')).toBe(true);
    expect(body.error.fields[0].expected).toContain('30');
  });

  it('refuse un corps illisible', async () => {
    const response = await POST(new Request('http://localhost/api/needs', { method: 'POST', body: 'pas du json' }));
    expect(response.status).toBe(400);
  });

  it('refuse un champ manquant', async () => {
    const incomplete = { weight_kg: valid.weight_kg, height_cm: valid.height_cm, reference_sex: valid.reference_sex, activity_level: valid.activity_level };
    const response = await post(incomplete);
    expect(response.status).toBe(400);
  });

  it('porte une mention non médicale explicite (FR-010)', () => {
    expect(DISCLAIMER).toContain('ni diagnostic');
    expect(DISCLAIMER).toContain('professionnel de santé');
  });
});
