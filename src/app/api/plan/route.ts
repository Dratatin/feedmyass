import { NextResponse } from 'next/server';
import { planRequestSchema } from '@/lib/validation';
import { ApiError, validationError } from '@/lib/errors';
import { computeNeeds } from '@/domain/needs';
import { buildIngredientPlan } from '@/domain/plan';
import { energyReference } from '@/data/reference/energy';
import {
  fetchFoods,
  fetchNutrients,
  fetchReferenceIntakes,
  fetchSeasonalFoodCodes,
  fetchSeasonalMonthsByFood,
} from '@/data/repositories/reference';
import type { Profile } from '@/domain/types';
import { DISCLAIMER } from '@/app/api/needs/route';

/**
 * POST /api/plan — liste d'ingrédients couvrant les besoins (contracts/api.md).
 *
 * Le profil et le régime sont deux champs SÉPARÉS de la requête: le profil sert
 * au calcul des besoins, le régime uniquement à la sélection des aliments. La
 * séparation du principe III reste donc visible dans le contrat, même quand les
 * deux voyagent dans la même requête.
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError('validation_error', 'Corps de requête illisible.');
    }

    const parsed = planRequestSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const profile: Profile = {
      weightKg: parsed.data.profile.weight_kg,
      heightCm: parsed.data.profile.height_cm,
      age: parsed.data.profile.age,
      referenceSex: parsed.data.profile.reference_sex,
      activityLevel: parsed.data.profile.activity_level,
    };

    // La date de génération fixe le mois retenu pour la saisonnalité (FR-014).
    const generatedAt = parsed.data.generated_at ? new Date(parsed.data.generated_at) : new Date();
    const month = generatedAt.getMonth() + 1;

    const [nutrients, intakes, allFoods, seasonalCodes, seasonMonthsByFood] = await Promise.all([
      fetchNutrients(),
      fetchReferenceIntakes(profile.referenceSex, profile.age),
      fetchFoods(),
      fetchSeasonalFoodCodes(month),
      fetchSeasonalMonthsByFood(),
    ]);

    if (nutrients.length === 0 || intakes.length === 0 || allFoods.length === 0) {
      throw new ApiError(
        'reference_data_unavailable',
        'Les données de référence ne sont pas disponibles. Réessayez dans quelques instants.',
      );
    }

    const needs = computeNeeds(profile, { nutrients, intakes, energy: energyReference });
    const period = parsed.data.period;

    const plan = buildIngredientPlan({
      needs: period === 'week' ? needs.weekly : needs.daily,
      nutrients,
      allFoods,
      seasonalCodes,
      seasonMonthsByFood,
      diet: parsed.data.diet,
      period,
      generatedAt,
      referenceVersions: needs.referenceVersions,
      disclaimer: DISCLAIMER,
    });

    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toBody(), { status: error.status });
    }
    if (error instanceof Error && error.message.includes('Aucune équation de référence')) {
      const apiError = new ApiError('profile_out_of_scope', error.message);
      return NextResponse.json(apiError.toBody(), { status: apiError.status });
    }
    throw error;
  }
}
