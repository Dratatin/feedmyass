import { NextResponse, type NextRequest } from 'next/server';
import { safeInternalPath } from '@/lib/redirects';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Retour du fournisseur d'identité (FR-022).
 *
 * Le lien de confirmation envoyé par e-mail à la création d'un compte, comme
 * tout parcours OAuth ajouté plus tard, ramène le navigateur ici avec un code
 * à usage unique. L'échange de ce code contre une session est la seule étape
 * que l'application doit exécuter elle-même: Supabase Auth vérifie le code et
 * pose les cookies, l'application ne fabrique aucune session (principe V).
 *
 * Sans cette route, un lien de confirmation aboutit sur une page d'accueil
 * anonyme et le compte tout juste validé reste inutilisable.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeInternalPath(searchParams.get('next'), '/mon-profil');

  // Le fournisseur signale ici un lien expiré ou déjà consommé.
  const providerError = searchParams.get('error_description') ?? searchParams.get('error');
  if (providerError || !code) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien', origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien', origin));
  }

  // Les cookies posés par l'échange ci-dessus voyagent avec cette redirection:
  // dans un route handler, le store de cookies alimente la réponse sortante.
  return NextResponse.redirect(new URL(next, origin));
}
