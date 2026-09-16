'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ds/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Déconnexion (FR-022).
 *
 * C'est le client Supabase qui efface la session: il supprime les cookies qu'il
 * a lui-même posés. L'application n'a aucune session à invalider de son côté.
 *
 * `router.refresh()` est indispensable: sans lui, l'en-tête rendu côté serveur
 * continuerait d'afficher l'état connecté jusqu'à la prochaine navigation.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      // Session déjà expirée côté fournisseur: le résultat visé est atteint.
    }
    router.push('/');
    router.refresh();
  }

  return (
    <Button hierarchy="secondary-gray" size="sm" onClick={signOut} disabled={pending}>
      {pending ? 'Déconnexion…' : 'Se déconnecter'}
    </Button>
  );
}
