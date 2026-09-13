import { NextResponse } from 'next/server';
import { profileSchema } from '@/lib/validation';
import { ApiError, validationError } from '@/lib/errors';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import { fetchNutrients, fetchReferenceIntakes } from '@/data/repositories/reference';
import type { Profile } from '@/domain/types';

/**
 * POST /api/needs — calcul des besoins nutritionnels (contracts/api.md).
 *
 * Accessible sans compte (FR-024). Le schéma d'entrée est `.strict()`: une
 * requête portant un champ de régime est refusée, ce qui inscrit le principe III
 * dans le contrat HTTP et pas seulement dans les types.
 */

export const DISCLAIMER =
  'Estimation informative établie à partir de références nutritionnelles officielles. ' +
  "Ce service ne fournit ni diagnostic, ni conseil médical personnalisé. Les situations " +
  'particulières (grossesse, allaitement, pathologie, personnes mineures) ne sont pas couvertes: ' +
  'parlez-en à un professionnel de santé.';

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError('validation_error', 'Corps de requête illisible.');
    }

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues);
    }

    const profile: Profile = {
      weightKg: parsed.data.weight_kg,
      heightCm: parsed.data.height_cm,
      age: parsed.data.age,
      referenceSex: parsed.data.reference_sex,
      activityLevel: parsed.data.activity_level,
    };

    const [nutrients, intakes] = await Promise.all([
      fetchNutrients(),
      fetchReferenceIntakes(profile.referenceSex, profile.age),
    ]);

    if (nutrients.length === 0 || intakes.length === 0) {
      throw new ApiError(
        'reference_data_unavailable',
        'Les données de référence ne sont pas disponibles. Réessayez dans quelques instants.',
      );
    }

    const needs = computeNeeds(profile, { nutrients, intakes, energy: energyReference });

    return NextResponse.json({
      daily: needs.daily,
      weekly: needs.weekly,
      missing_references: needs.missingReferences,
      reference_versions: needs.referenceVersions,
      disclaimer: DISCLAIMER,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toBody(), { status: error.status });
    }
    // Un profil hors des tranches d'âge publiées arrive ici (principe II).
    if (error instanceof Error && error.message.includes('Aucune équation de référence')) {
      const apiError = new ApiError('profile_out_of_scope', error.message);
      return NextResponse.json(apiError.toBody(), { status: apiError.status });
    }
    throw error;
  }
}
