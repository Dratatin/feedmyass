import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Clients Supabase utilisables dans le navigateur.
 *
 * Ce module NE DOIT PAS importer `next/headers`: il est chargé par des
 * composants clients, où cette API n'existe pas.
 *
 * Les variables d'environnement sont lues par accès LITTÉRAL et non via une
 * clé dynamique: Next ne remplace `process.env.NEXT_PUBLIC_X` par sa valeur
 * dans le bundle client que lorsque l'accès est écrit en toutes lettres. Un
 * `process.env[nom]` reste indéfini côté navigateur.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante: ${name}. Copier .env.example vers .env.local et la renseigner.`,
    );
  }
  return value;
}

export const supabaseUrl = () =>
  required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');

export const supabaseAnonKey = () =>
  required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

/** Client navigateur: c'est lui qui parle à Supabase Auth depuis les formulaires. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
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
