import Link from 'next/link';
import { buttonStyles } from '@/components/ds/Button';
import { Vignette, VignetteSprite } from '@/components/ds/Vignette';
import { SignOutButton } from '@/components/features/SignOutButton';
import { getCurrentUserId } from '@/lib/auth';

/**
 * En-tête commun à toutes les pages: c'est lui qui rend la connexion
 * atteignable (FR-022) et la déconnexion possible.
 *
 * Il ne porte QUE la marque et l'état de connexion. La navigation du parcours
 * vit dans le rail (`StepRail`), et ce partage n'est pas qu'esthétique: le test
 * de navigation au clavier de la 001 accorde dix tabulations pour atteindre le
 * premier champ du formulaire de profil. Deux sont consommées ici, trois par le
 * rail; ajouter des liens ici les prendrait sur cette marge.
 *
 * L'état affiché vient du serveur: le rendu ne montre jamais « Connexion » à
 * quelqu'un qui l'est déjà, contrairement à une détection faite après
 * hydratation.
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
    <header className="bg-ink">
      <VignetteSprite />
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="type-display flex items-center gap-2 text-lg text-paper no-underline"
        >
          <Vignette name="pomme" size={22} />
          FeedMyAss
        </Link>

        <nav aria-label="Compte" className="flex flex-wrap items-center gap-2">
          {userId ? (
            <>
              <Link
                href="/mon-profil"
                className={buttonStyles({ hierarchy: 'secondary', size: 'sm' })}
              >
                Mon espace
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/connexion" className={buttonStyles({ size: 'sm' })}>
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
