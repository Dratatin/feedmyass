'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ds/Button';
import { Notice } from '@/components/ds/Notice';
import { Panel } from '@/components/ds/Panel';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Mes données personnelles (FR-029, FR-030).
 *
 * Export et suppression définitive. L'export passe par une requête puis un
 * téléchargement déclenché côté navigateur, pour que le fichier arrive avec la
 * session de l'utilisateur.
 */
export default function PersonalDataPage() {
  const router = useRouter();
  const [pending, setPending] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function exportData() {
    setPending('export');
    setError(null);
    try {
      const response = await fetch('/api/account/export');
      if (!response.ok) throw new Error('export impossible');
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = 'feedmyass-donnees-personnelles.json';
      link.click();
      URL.revokeObjectURL(href);
    } catch {
      setError("L'export n'a pas pu être généré. Réessayez dans un instant.");
    } finally {
      setPending(null);
    }
  }

  async function deleteAccount() {
    setPending('delete');
    setError(null);
    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (!response.ok) throw new Error('suppression impossible');
      await createSupabaseBrowserClient().auth.signOut();
      router.push('/');
      router.refresh();
    } catch {
      setError("La suppression n'a pas abouti. Réessayez dans un instant.");
      setPending(null);
    }
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm text-ink">Mes données</h1>
        <p className="max-w-[68ch] text-md text-ink-soft">
          Cette application conserve votre profil physiologique, votre régime déclaré et
          l&apos;historique de vos résultats. Elle ne détient ni votre mot de passe ni vos sessions,
          qui sont gérés par notre fournisseur d&apos;identité.
        </p>
      </header>

      <Panel
        title="Exporter mes données"
        description="Tout ce que l'application détient sur vous, dans un fichier JSON."
      >
        <div>
          <Button onClick={exportData} disabled={pending !== null}>
            {pending === 'export' ? 'Préparation…' : 'Télécharger mes données'}
          </Button>
        </div>
      </Panel>

      <Panel
        title="Supprimer mon compte"
        description="Profil et historique effacés définitivement."
      >
        {confirming ? (
          <div className="flex flex-col gap-3">
            <Notice tone="caution" title="Cette action est définitive">
              Votre profil, tout votre historique et votre compte seront supprimés. Il n&apos;est pas
              possible de revenir en arrière.
            </Notice>
            <div className="flex flex-wrap gap-[10px]">
              <Button hierarchy="danger" onClick={deleteAccount} disabled={pending !== null}>
                {pending === 'delete' ? 'Suppression…' : 'Confirmer la suppression'}
              </Button>
              <Button
                hierarchy="secondary"
                onClick={() => setConfirming(false)}
                disabled={pending !== null}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button hierarchy="danger" onClick={() => setConfirming(true)}>
              Supprimer mon compte
            </Button>
          </div>
        )}
        {error ? (
          <p role="alert" className="text-sm font-semibold text-framboise">
            {error}
          </p>
        ) : null}
      </Panel>
    </>
  );
}
