import { NextResponse } from 'next/server';
import { saveResultSchema } from '@/lib/validation';
import { ApiError, validationError } from '@/lib/errors';
import { requireUserId } from '@/lib/auth';
import { computeNeeds } from '@/domain/needs';
import { buildIngredientPlan } from '@/domain/plan';
import { energyReference } from '@/data/reference/energy';
import {
  fetchFoods,
  fetchNutrients,
  fetchReferenceIntakes,
  fetchSeasonalFoodCodes,
} from '@/data/repositories/reference';
import { insertResult, listResults } from '@/data/repositories/results';
import { saveProfile } from '@/data/repositories/profiles';
import type { Profile } from '@/domain/types';

/**
 * POST /api/results — enregistre un résultat dans l'historique (FR-026).
 *
 * Sert aussi de rattachement d'un résultat obtenu en mode invité (FR-024): le
 * navigateur renvoie le profil qu'il a conservé, le serveur recalcule et
 * enregistre. Rien n'est repris tel quel du client, donc rien ne peut être
 * falsifié en chemin.
 *
 * GET /api/results — liste l'historique de l'utilisateur connecté.
 */

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError('validation_error', 'Corps de requête illisible.');
    }

    const parsed = saveResultSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const profile: Profile = {
      weightKg: parsed.data.profile.weight_kg,
      heightCm: parsed.data.profile.height_cm,
      age: parsed.data.profile.age,
      referenceSex: parsed.data.profile.reference_sex,
      activityLevel: parsed.data.profile.activity_level,
    };
    const generatedAt = parsed.data.generated_at ? new Date(parsed.data.generated_at) : new Date();
    const period = parsed.data.period;

    const [nutrients, intakes] = await Promise.all([
      fetchNutrients(),
      fetchReferenceIntakes(profile.referenceSex, profile.age),
    ]);
    if (nutrients.length === 0 || intakes.length === 0) {
      throw new ApiError('reference_data_unavailable', 'Données de référence indisponibles.');
    }

    const needs = computeNeeds(profile, { nutrients, intakes, energy: energyReference });

    let plan = null;
    if (parsed.data.diet) {
      const [allFoods, seasonalCodes] = await Promise.all([
        fetchFoods(),
        fetchSeasonalFoodCodes(generatedAt.getMonth() + 1),
      ]);
      plan = buildIngredientPlan({
        needs: period === 'week' ? needs.weekly : needs.daily,
        nutrients,
        allFoods,
        seasonalCodes,
        diet: parsed.data.diet,
        period,
        generatedAt,
        referenceVersions: needs.referenceVersions,
      });

      // Le régime déclaré devient la préférence enregistrée du profil.
      await saveProfile(userId, {
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        age: profile.age,
        referenceSex: profile.referenceSex,
        activityLevel: profile.activityLevel,
        dietBase: parsed.data.diet.base,
        exclusions: parsed.data.diet.exclusions,
      });
    }

    // Instantané du profil: l'historique conserve l'état utilisé au moment du
    // calcul, et ne bouge plus si le profil change ensuite (FR-027).
    const id = await insertResult({
      userId,
      period,
      generatedAt,
      profileSnapshot: { ...parsed.data.profile, ...(parsed.data.diet ? { diet: parsed.data.diet } : {}) },
      needs,
      plan,
      referenceVersions: needs.referenceVersions,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json(error.toBody(), { status: error.status });
    throw error;
  }
}

export async function GET() {
  try {
    await requireUserId();
    const items = await listResults();
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json(error.toBody(), { status: error.status });
    throw error;
  }
}
