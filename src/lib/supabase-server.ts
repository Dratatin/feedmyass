import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAnonKey, supabaseUrl } from './supabase-browser';

/**
 * Client Supabase porteur de la session, pour les composants serveur et les
 * route handlers.
 *
 * L'application ne gère ni mot de passe ni session: elle lit et rafraîchit les
 * cookies posés par Supabase Auth (FR-022, principe V). Toute requête émise par
 * ce client passe donc par les politiques RLS avec l'identité réelle de
 * l'appelant (FR-028).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un composant serveur: le rafraîchissement de session
          // est assuré par le middleware, on peut ignorer.
        }
      },
    },
  });
}
