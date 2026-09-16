import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rafraîchissement de la session Supabase à chaque requête, et aiguillage des
 * pages réservées aux utilisateurs connectés.
 *
 * Convention Next 16: ce qui s'appelait middleware s'appelle désormais proxy,
 * dans un fichier src/proxy.ts exportant une fonction nommée proxy.
 *
 * L'application ne gère ni mot de passe ni session: elle se contente de faire
 * circuler les cookies que Supabase Auth pose et renouvelle (FR-022, principe V).
 */

/**
 * Pages de l'espace personnel. Les points d'entrée `/api` n'y figurent pas: ils
 * doivent répondre 401 en JSON, pas rediriger vers un écran HTML.
 *
 * Cet aiguillage est une commodité de navigation. Le cloisonnement des DONNÉES
 * ne repose pas dessus mais sur RLS (FR-028), et chaque page le revérifie.
 */
const PROTECTED_PATHS = ['/mon-profil', '/historique', '/donnees'];

const isProtected = (pathname: string) =>
  PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Appel indispensable: c'est lui qui renouvelle le jeton expiré.
  const { data } = await supabase.auth.getUser();

  if (!data.user && isProtected(request.nextUrl.pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = '/connexion';
    target.search = '';
    // La page demandée voyage avec la redirection: après connexion,
    // l'utilisateur atterrit là où il allait, pas sur un accueil générique.
    target.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);

    const redirect = NextResponse.redirect(target);
    // Les cookies rafraîchis ci-dessus doivent suivre, sinon la session
    // renouvelée serait perdue par la redirection.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
};
