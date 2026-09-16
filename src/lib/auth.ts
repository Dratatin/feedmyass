import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiError } from '@/lib/errors';

/**
 * Identité de l'appelant.
 *
 * L'identité vient entièrement de Supabase Auth: l'application ne vérifie aucun
 * mot de passe et ne fabrique aucune session (FR-022). Elle ne conserve que
 * l'identifiant renvoyé ici pour rattacher ses propres données (FR-023).
 */
export async function getCurrentUserId(): Promise<string | null> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

/** Variante pour les points d'entrée réservés aux utilisateurs connectés. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new ApiError('unauthorized', 'Vous devez être connecté pour effectuer cette action.');
  }
  return userId;
}
