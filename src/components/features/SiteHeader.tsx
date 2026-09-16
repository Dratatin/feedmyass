import Link from 'next/link';
import { Button } from '@/components/ds/Button';
import { SignOutButton } from '@/components/features/SignOutButton';
import { getCurrentUserId } from '@/lib/auth';

/**
 * En-tête commun à toutes les pages: c'est lui qui rend la connexion
 * atteignable (FR-022) et la déconnexion possible (scénario US3 « se
 * déconnecter, se reconnecter depuis un autre appareil »).
 *
 * JUSTIFICATION (principe VI): le design system « BDD de composants de base »
 * ne contient aucun composant de navigation — c'est le constat écrit en T023,
 * qui avait alors laissé la navigation de côté faute de parcours à naviguer.
 * L'en-tête est donc composé des tokens et du Button relevés dans Figma, sans
 * inventer de valeur nouvelle.
 *
 * L'état affiché vient du serveur: le rendu ne montre jamais « Connexion » à
 * quelqu'un qui l'est déjà, contrairement à une détection faite après
 * hydratation.
 */
export async function SiteHeader() {
  let userId: string | null = null;
  try {
    userId = await getCurrentUserId();
  } catch {
    // Configuration Supabase absente: le site reste consultable en mode
    // visiteur plutôt que de renvoyer une erreur sur toutes les pages.
    userId = null;
  }

  return (
    <header className="border-b border-solid border-neutral-200 bg-base-white">
      <div className="mx-auto flex max-w-[880px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-md font-semibold text-neutral-900">
          FeedMyAss
        </Link>

        <nav aria-label="Compte" className="flex flex-wrap items-center gap-2">
          {userId ? (
            <>
              <Link href="/mon-profil">
                <Button hierarchy="secondary-gray" size="sm">
                  Mon espace
                </Button>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/connexion">
              <Button size="sm">Connexion</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
