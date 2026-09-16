'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { Notice } from '@/components/ds/Notice';
import { Button } from '@/components/ds/Button';
import { Panel } from '@/components/ds/Panel';
import { InputField } from '@/components/ds/InputField';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getNeedsServerSnapshot, getNeedsSnapshot, subscribeNeeds } from '@/lib/needs-session';

/**
 * Formulaire de connexion et de création de compte (FR-022).
 *
 * L'application ne vérifie aucun mot de passe: le formulaire les transmet
 * directement à Supabase Auth, qui gère identité, sessions et cookies. Rien de
 * tout cela ne transite par notre code ni par notre base (principe V).
 */
export function SignInForm({ next, linkFailed }: { next: string; linkFailed: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Un résultat obtenu en mode invité sera proposé au rattachement (FR-024).
  // La session du navigateur est lue via useSyncExternalStore et non pendant le
  // rendu: le serveur ne la voit pas, et une lecture directe ferait diverger le
  // HTML rendu de celui de l'hydratation.
  const hasGuestResult =
    useSyncExternalStore(subscribeNeeds, getNeedsSnapshot, getNeedsServerSnapshot) !== null;

  /**
   * Où atterrir une fois connecté: la page demandée si le proxy en a interrompu
   * l'accès, sinon l'écran des résultats quand un calcul invité attend d'être
   * rattaché (scénario US3 n°6), et à défaut l'espace personnel.
   */
  function destination(): Route {
    if (next) return next as Route;
    return (getNeedsSnapshot() !== null ? '/besoins' : '/mon-profil') as Route;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    let authError: { message: string } | null = null;
    let client;
    try {
      client = createSupabaseBrowserClient();
      const result =
        mode === 'signin'
          ? await client.auth.signInWithPassword({ email, password })
          : await client.auth.signUp({
              email,
              password,
              // Le lien de confirmation doit revenir sur notre route d'échange:
              // c'est elle qui transforme le code reçu en session.
              options: { emailRedirectTo: confirmationUrl(next) },
            });
      authError = result.error;
    } catch (caught) {
      // Une configuration absente ne doit pas laisser le formulaire figé.
      authError = { message: caught instanceof Error ? caught.message : 'Connexion impossible.' };
    }

    setPending(false);

    if (authError || !client) {
      setError(authError?.message ?? 'Connexion impossible.');
      return;
    }

    if (mode === 'signup') {
      const { data } = await client.auth.getSession();
      if (!data.session) {
        setNotice(
          'Compte créé. Ouvrez le lien de confirmation envoyé par e-mail: il vous ramènera ici, ' +
            'connecté.',
        );
        setMode('signin');
        return;
      }
    }

    router.push(destination());
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-[440px] flex-col gap-[18px] px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm text-ink">
          {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
        </h1>
        <p className="text-sm text-ink-soft">
          Un compte permet de conserver votre profil et l&apos;historique de vos résultats. Le
          calcul reste accessible sans compte.
        </p>
      </header>

      {linkFailed ? (
        <Notice tone="caution" title="Lien de confirmation inutilisable">
          Ce lien a expiré ou a déjà servi. Connectez-vous ci-dessous, ou créez de nouveau votre
          compte pour recevoir un lien valide.
        </Notice>
      ) : null}

      {next ? (
        <Notice title="Connexion requise">
          Cette page fait partie de votre espace personnel. Une fois connecté, vous y serez ramené
          automatiquement.
        </Notice>
      ) : null}

      {hasGuestResult ? (
        <Notice title="Votre résultat en cours">
          Vous avez un résultat calculé sans compte. Après connexion, vous pourrez
          l&apos;enregistrer dans votre historique.{' '}
          <strong>Sans cet enregistrement, il sera perdu</strong> à la fermeture de votre
          navigateur.
        </Notice>
      ) : null}

      <Panel>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField
            label="Adresse e-mail"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
          <InputField
            label="Mot de passe"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            hint="Huit caractères minimum. Il est vérifié par notre fournisseur d'identité, jamais par cette application."
          />
          {error ? (
            <p role="alert" className="text-sm text-framboise">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="text-sm text-ink">
              {notice}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="justify-center" disabled={pending}>
            {pending ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
          </Button>
        </form>
      </Panel>

      {/* Bascule entre connexion et création: une phrase, pas un second bouton
          primaire. L'action principale de cet écran est unique. */}
      <p className="text-sm text-ink-soft">
        {mode === 'signin' ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'}{' '}
        <button
          type="button"
          className="font-semibold text-brand underline"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
        >
          {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
        </button>
      </p>
    </main>
  );
}

/** URL absolue de la route d'échange, seule forme acceptée par le fournisseur. */
function confirmationUrl(next: string): string {
  const url = new URL('/auth/callback', window.location.origin);
  if (next) url.searchParams.set('next', next);
  return url.toString();
}
