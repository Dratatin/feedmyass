import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Clients Supabase.
 *
 * L'application ne gère ni mot de passe ni session: Supabase Auth s'en charge et
 * la session voyage dans des cookies gérés par @supabase/ssr (FR-022, principe V).
 * Aucun client ici n'utilise la clé service role: elle est réservée au seed, qui
 * s'exécute hors de l'application.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante: ${name}. Copier .env.example vers .env.local et la renseigner.`,
    );
  }
  return value;
}

const supabaseUrl = () => requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = () => requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

/** Client navigateur, porté par les composants clients. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}

/**
 * Client serveur (route handlers, composants serveur). Il lit et rafraîchit les
 * cookies de session; toute requête passe donc par les politiques RLS avec
 * l'identité réelle de l'appelant (FR-028).
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

/**
 * Client de lecture des données de référence.
 *
 * Les tables de référence sont en lecture publique (politiques RLS `using (true)`),
 * donc aucun contexte utilisateur n'est nécessaire. Ce client n'utilise pas les
 * cookies, ce qui le rend utilisable hors requête HTTP: scripts, tests, tâches.
 */
export function createSupabaseReferenceClient() {
  return createClient(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false } });
}
