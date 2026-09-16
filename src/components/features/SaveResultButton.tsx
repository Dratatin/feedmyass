'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonStyles } from '@/components/ds/Button';
import type { Diet, Period } from '@/domain/types';
import type { StoredProfile } from '@/lib/needs-session';

/**
 * Enregistrement d'un résultat dans l'historique (FR-024, FR-026).
 *
 * Le bouton envoie le PROFIL, pas les besoins calculés: le serveur recalcule et
 * enregistre, ce qui rend sans effet toute falsification côté navigateur et
 * garantit qu'une entrée d'historique est reproductible depuis ses entrées.
 *
 * Pour un visiteur non connecté, c'est ici que se fait le rattachement annoncé
 * sur l'écran de connexion.
 */
export function SaveResultButton({ profile, diet, period }: {
  profile: StoredProfile;
  diet?: Diet;
  period: Period;
}) {
  const [state, setState] = useState<'idle' | 'pending' | 'saved' | 'unauthorized' | 'error'>('idle');

  async function save() {
    setState('pending');
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile, period, ...(diet ? { diet } : {}) }),
      });
      if (response.status === 401) { setState('unauthorized'); return; }
      setState(response.ok ? 'saved' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'saved') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm text-ink">Résultat enregistré dans votre historique.</p>
        <Link href="/historique" className={buttonStyles({ hierarchy: 'secondary' })}>Voir mon historique</Link>
      </div>
    );
  }

  if (state === 'unauthorized') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink">
          Connectez-vous pour conserver ce résultat. Sans cela, il sera perdu à la fermeture du
          navigateur.
        </p>
        <Link href="/connexion" className={buttonStyles()}>Se connecter</Link>
      </div>
    );
  }

  // La proposition est explicite plutôt que laissée à la seule présence du
  // bouton: c'est elle que voit l'utilisateur qui vient de se connecter avec un
  // résultat calculé en invité (scénario US3 n°6), puisque la connexion le
  // ramène ici.
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">
        Ce résultat n&apos;est conservé que le temps de votre visite. Enregistrez-le pour le
        retrouver dans votre historique.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {/* Secondaire: l'action primaire de ces écrans est le calcul ou la
            génération de la liste, une par écran (docs/design-system.md). */}
        <Button hierarchy="secondary" onClick={save} disabled={state === 'pending'}>
          {state === 'pending' ? 'Enregistrement…' : 'Enregistrer dans mon historique'}
        </Button>
        {state === 'error' ? (
          <p role="alert" className="text-sm text-framboise">L&apos;enregistrement a échoué.</p>
        ) : null}
      </div>
    </div>
  );
}
