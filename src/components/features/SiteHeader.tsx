import Link from 'next/link';
import { Vignette, VignetteSprite } from '@/components/ds/Vignette';
import { HeaderNav } from '@/components/features/HeaderNav';
import { getCurrentUserId } from '@/lib/auth';

/**
 * En-tête commun à toutes les pages: c'est lui qui rend la connexion
 * atteignable (FR-022) et la déconnexion possible.
 *
 * L'état de connexion vient du serveur: le rendu ne montre jamais « Connexion »
 * à quelqu'un qui l'est déjà, contrairement à une détection faite après
 * hydratation. La navigation, elle, est cliente — elle a besoin de la page
 * courante pour ne pas proposer un lien vers l'écran déjà affiché.
 *
 * C'est aussi ici qu'est rendu le jeu de vignettes, une fois par page.
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
    <header className="w-full bg-ink">
      <VignetteSprite />
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="type-display flex items-center gap-2 text-lg text-paper no-underline"
        >
          <Vignette name="pomme" size={22} />
          FeedMyAss
        </Link>

        <HeaderNav signedIn={userId !== null} />
      </div>
    </header>
  );
}
