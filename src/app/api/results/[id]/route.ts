import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/errors';
import { requireUserId } from '@/lib/auth';
import { deleteResult, fetchResult } from '@/data/repositories/results';

/**
 * GET et DELETE /api/results/{id} (contracts/api.md).
 *
 * Une entrée appartenant à un autre utilisateur renvoie 404 et non 403: RLS la
 * rend invisible, et on n'apprend pas à un tiers qu'elle existe (FR-028).
 * Aucune méthode PUT ni PATCH n'est exposée: l'historique est immuable (FR-027).
 */

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireUserId();
    const { id } = await context.params;
    const result = await fetchResult(id);
    if (!result) throw new ApiError('not_found', "Cette entrée d'historique n'existe pas.");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json(error.toBody(), { status: error.status });
    throw error;
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireUserId();
    const { id } = await context.params;
    const deleted = await deleteResult(id);
    if (!deleted) throw new ApiError('not_found', "Cette entrée d'historique n'existe pas.");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json(error.toBody(), { status: error.status });
    throw error;
  }
}
