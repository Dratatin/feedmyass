import { SignInForm } from '@/components/features/SignInForm';
import { safeInternalPath } from '@/lib/redirects';

/**
 * Connexion et création de compte (FR-022).
 *
 * La page est rendue côté serveur pour lire la destination demandée dans
 * l'URL: c'est le proxy qui l'y a placée en interceptant une page réservée.
 * Le formulaire, lui, est un composant client — c'est le navigateur qui parle
 * directement à Supabase Auth, sans que mot de passe ni session ne traversent
 * cette application (principe V).
 */
export default async function SignInPage({ searchParams }: PageProps<'/connexion'>) {
  const params = await searchParams;

  return (
    <SignInForm next={safeInternalPath(params.next, '')} linkFailed={params.erreur === 'lien'} />
  );
}
