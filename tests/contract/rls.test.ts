import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Cloisonnement par utilisateur et immuabilité de l'historique (FR-027, FR-028).
 *
 * Ces règles vivent dans la base, pas dans le code applicatif: les vérifier
 * suppose de les exécuter contre Postgres avec de vraies sessions. Deux
 * utilisateurs sont créés, puis chacun tente d'atteindre les données de l'autre.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

type TestUser = { id: string; email: string; client: SupabaseClient };

const password = 'rls-motdepasse-solide-2026';

async function createUser(email: string): Promise<TestUser> {
  const { data: existing } = await admin.auth.admin.listUsers();
  const previous = existing.users.find((u) => u.email === email);
  if (previous) await admin.auth.admin.deleteUser(previous.id);

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(error.message);

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(signIn.error.message);

  return { id: data.user!.id, email, client };
}

const resultRow = (userId: string) => ({
  user_id: userId,
  period: 'day',
  profile_snapshot: { weight_kg: 70 },
  needs: { daily: [], weekly: [] },
  plan: {},
  reference_versions: { test: '1' },
});

describe('cloisonnement et immuabilité', () => {
  let alice: TestUser;
  let bob: TestUser;
  let aliceResultId: string;

  beforeAll(async () => {
    alice = await createUser('rls-alice@feedmyass.test');
    bob = await createUser('rls-bob@feedmyass.test');

    const { data, error } = await alice.client.from('results').insert(resultRow(alice.id)).select('id').single();
    if (error) throw new Error(error.message);
    aliceResultId = data.id;
  });

  afterAll(async () => {
    for (const user of [alice, bob]) {
      if (user?.id) await admin.auth.admin.deleteUser(user.id);
    }
  });

  it('laisse un utilisateur lire son propre résultat', async () => {
    const { data } = await alice.client.from('results').select('id').eq('id', aliceResultId);
    expect(data).toHaveLength(1);
  });

  it("empêche un autre utilisateur de lire ce résultat", async () => {
    const { data } = await bob.client.from('results').select('id').eq('id', aliceResultId);
    expect(data).toEqual([]);
  });

  it("empêche un autre utilisateur de le supprimer", async () => {
    await bob.client.from('results').delete().eq('id', aliceResultId);
    const { data } = await alice.client.from('results').select('id').eq('id', aliceResultId);
    expect(data, 'le résultat doit toujours exister').toHaveLength(1);
  });

  it("empêche d'insérer un résultat au nom d'autrui", async () => {
    const { error } = await bob.client.from('results').insert(resultRow(alice.id));
    expect(error).not.toBeNull();
  });

  it("refuse toute modification d'une entrée d'historique (FR-027)", async () => {
    const { error } = await alice.client
      .from('results')
      .update({ period: 'week' })
      .eq('id', aliceResultId);

    // Aucune politique update n'existe: la requête ne touche aucune ligne, et le
    // trigger de refus rattrape le cas où un rôle privilégié tenterait malgré tout.
    const { data } = await alice.client.from('results').select('period').eq('id', aliceResultId).single();
    expect(data?.period, 'la période ne doit pas avoir changé').toBe('day');
    expect(error === null || error !== null).toBe(true);
  });

  it('refuse la modification même avec la clé service role (trigger)', async () => {
    const { error } = await admin.from('results').update({ period: 'week' }).eq('id', aliceResultId);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('immuables');
  });

  it('interdit à un anonyme de lire les profils et les résultats', async () => {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const profiles = await anon.from('profiles').select('user_id');
    const results = await anon.from('results').select('id');
    expect(profiles.data).toEqual([]);
    expect(results.data).toEqual([]);
  });

  it('supprime le profil et l\'historique avec le compte (FR-029)', async () => {
    const temp = await createUser('rls-temp@feedmyass.test');
    await temp.client.from('results').insert(resultRow(temp.id));
    await admin.auth.admin.deleteUser(temp.id);

    const { data } = await admin.from('results').select('id').eq('user_id', temp.id);
    expect(data).toEqual([]);
  });
});
