/**
 * Crée (ou réinitialise) l'utilisateur de test utilisé par les parcours e2e.
 *
 * Passe par l'API d'administration de Supabase pour créer un compte déjà
 * confirmé: les tests n'ont ainsi aucun e-mail à intercepter. Réservé au
 * développement, jamais exécuté en production.
 */
import { createClient } from '@supabase/supabase-js';

const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e@feedmyass.test';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e-motdepasse-solide-2026';

const main = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing } = await admin.auth.admin.listUsers();
  const previous = existing.users.find((user) => user.email === EMAIL);
  if (previous) {
    await admin.auth.admin.deleteUser(previous.id);
    console.log('ancien utilisateur de test supprimé');
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error('Création impossible: ' + error.message);

  console.log('utilisateur de test prêt:', data.user?.email, '| id:', data.user?.id);
};

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
