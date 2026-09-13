'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { InputField } from '@/components/ds/InputField';
import { Banner } from '@/components/ds/Banner';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getNeedsSnapshot } from '@/lib/needs-session';

/**
 * Connexion et création de compte (FR-022).
 *
 * L'application ne vérifie aucun mot de passe: le formulaire les transmet
 * directement à Supabase Auth, qui gère identité, sessions et cookies. Rien de
 * tout cela ne transite par notre code ni par notre base (principe V).
 */
export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Un résultat obtenu en mode invité sera proposé au rattachement (FR-024).
  const hasGuestResult = typeof window !== 'undefined' && getNeedsSnapshot() !== null;

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
          : await client.auth.signUp({ email, password });
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
        setNotice('Compte créé. Confirmez votre adresse e-mail, puis connectez-vous.');
        setMode('signin');
        return;
      }
    }

    router.push('/mon-profil');
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-[440px] flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-xs font-semibold text-neutral-900">
          {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
        </h1>
        <p className="text-sm text-neutral-600">
          Un compte permet de conserver votre profil et l&apos;historique de vos résultats. Le calcul
          reste accessible sans compte.
        </p>
      </header>

      {hasGuestResult ? (
        <Banner title="Votre résultat en cours">
          Vous avez un résultat calculé sans compte. Après connexion, vous pourrez l&apos;enregistrer
          dans votre historique. <strong>Sans cet enregistrement, il sera perdu</strong> à la fermeture
          de votre navigateur.
        </Banner>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField label="Adresse e-mail" name="email" type="email" required autoComplete="email" />
          <InputField
            label="Mot de passe" name="password" type="password" required minLength={8}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            hint="Huit caractères minimum. Il est vérifié par notre fournisseur d'identité, jamais par cette application."
          />
          {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
          {notice ? <p role="status" className="text-sm text-neutral-700">{notice}</p> : null}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
          </Button>
        </form>
      </Card>

      <Button
        hierarchy="secondary-gray"
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
      >
        {mode === 'signin' ? "Créer un compte" : "J'ai déjà un compte"}
      </Button>
    </main>
  );
}
