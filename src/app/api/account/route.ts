import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/errors';
import { requireUserId } from '@/lib/auth';
import { deleteAllResults } from '@/data/repositories/results';
import { deleteProfile } from '@/data/repositories/profiles';

/**
 * DELETE /api/account — efface le compte et toutes les données associées (FR-029).
 *
 * Seul endroit de l'application qui utilise la clé service role: supprimer
 * l'utilisateur dans Supabase Auth demande un privilège d'administration. La
 * suppression en cascade des tables applicatives suit les clés étrangères, mais
 * profil et historique sont aussi effacés explicitement pour que la suppression
 * reste complète même si une contrainte venait à changer.
 */
export async function DELETE() {
  try {
    const userId = await requireUserId();

    await deleteAllResults();
    await deleteProfile();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new ApiError(
        'reference_data_unavailable',
        "La suppression du compte n'est pas configurée sur ce serveur.",
      );
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error('Suppression du compte impossible: ' + error.message);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json(error.toBody(), { status: error.status });
    throw error;
  }
}
