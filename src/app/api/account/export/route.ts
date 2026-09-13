import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/errors';
import { requireUserId } from '@/lib/auth';
import { fetchResult, listResults } from '@/data/repositories/results';
import { fetchProfile } from '@/data/repositories/profiles';

/**
 * GET /api/account/export — export des données personnelles (FR-029).
 *
 * Tout ce que l'application détient sur l'utilisateur, dans un fichier lisible.
 * L'identité elle-même (adresse e-mail, mot de passe, sessions) appartient au
 * fournisseur d'identité et n'est pas ici: c'est précisément l'effet recherché
 * par le principe V.
 */
export async function GET() {
  try {
    await requireUserId();

    const [profile, summaries] = await Promise.all([fetchProfile(), listResults()]);
    const results = await Promise.all(summaries.map((summary) => fetchResult(summary.id)));

    const payload = {
      exported_at: new Date().toISOString(),
      note:
        "Ce fichier contient toutes les données détenues par l'application. L'identité " +
        "(adresse e-mail, authentification, sessions) est gérée par le fournisseur d'identité " +
        "et n'y figure pas.",
      profile,
      results: results.filter(Boolean),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="feedmyass-donnees-personnelles.json"',
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json(error.toBody(), { status: error.status });
    throw error;
  }
}
