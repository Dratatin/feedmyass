import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { IngredientPlan, Needs, Period } from '@/domain/types';

/**
 * Historique des résultats (FR-026, FR-027, FR-028).
 *
 * IMMUABILITÉ: ce module n'expose délibérément AUCUNE mise à jour. Une entrée
 * d'historique se crée, se lit et se supprime, jamais ne se modifie. La règle
 * est doublée en base par l'absence de politique RLS `update` et par un trigger
 * de refus, pour qu'elle tienne même si ce module venait à être contourné.
 */

export type ResultSummary = {
  id: string;
  generatedAt: string;
  period: Period;
  profileSnapshot: Record<string, unknown>;
};

export type ResultDetail = ResultSummary & {
  needs: Needs;
  plan: IngredientPlan | null;
  referenceVersions: Record<string, string>;
};

export async function insertResult(input: {
  userId: string;
  period: Period;
  generatedAt: Date;
  profileSnapshot: Record<string, unknown>;
  needs: Needs;
  plan: IngredientPlan | null;
  referenceVersions: Record<string, string>;
}): Promise<string> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from('results')
    .insert({
      user_id: input.userId,
      period: input.period,
      generated_at: input.generatedAt.toISOString(),
      profile_snapshot: input.profileSnapshot,
      needs: input.needs,
      plan: input.plan ?? {},
      reference_versions: input.referenceVersions,
    })
    .select('id')
    .single();

  if (error) throw new Error("Enregistrement du résultat impossible: " + error.message);
  return data.id;
}

export async function listResults(): Promise<ResultSummary[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from('results')
    .select('id, generated_at, period, profile_snapshot')
    .order('generated_at', { ascending: false });

  if (error) throw new Error("Lecture de l'historique impossible: " + error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    generatedAt: row.generated_at,
    period: row.period,
    profileSnapshot: row.profile_snapshot,
  }));
}

/**
 * Détail d'une entrée. Renvoie null si l'entrée appartient à quelqu'un d'autre:
 * RLS la rend simplement invisible, ce qui donne un 404 et non un 403 — on
 * n'apprend pas à un tiers qu'une entrée existe (FR-028).
 */
export async function fetchResult(id: string): Promise<ResultDetail | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from('results')
    .select('id, generated_at, period, profile_snapshot, needs, plan, reference_versions')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error('Lecture du résultat impossible: ' + error.message);
  if (!data) return null;

  return {
    id: data.id,
    generatedAt: data.generated_at,
    period: data.period,
    profileSnapshot: data.profile_snapshot,
    needs: data.needs,
    plan: data.plan,
    referenceVersions: data.reference_versions,
  };
}

export async function deleteResult(id: string): Promise<boolean> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from('results').delete().eq('id', id).select('id');
  if (error) throw new Error('Suppression du résultat impossible: ' + error.message);
  return (data ?? []).length > 0;
}

export async function deleteAllResults(): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from('results').delete().gte('generated_at', '1970-01-01');
  if (error) throw new Error("Suppression de l'historique impossible: " + error.message);
}
