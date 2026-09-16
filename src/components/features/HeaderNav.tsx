'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonStyles } from '@/components/ds/Button';
import { SignOutButton } from '@/components/features/SignOutButton';

/**
 * Navigation de l'en-tête.
 *
 * Composant client uniquement pour connaître la page courante: proposer
 * « Connexion » à quelqu'un qui est déjà sur l'écran de connexion est une
 * invitation à tourner en rond (constat du parcours à la main, 2026-09-18).
 * L'état de connexion, lui, vient du serveur — il ne doit jamais clignoter
 * après hydratation.
 *
 * Le nombre de liens est volontairement tenu: le test de navigation au clavier
 * accorde dix tabulations pour atteindre le premier champ du formulaire de
 * profil, dont trois sont consommées par le rail.
 */
export function HeaderNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation" className="flex flex-wrap items-center gap-2">
      {pathname !== '/de-saison' ? (
        <Link
          href="/de-saison"
          className="rounded-full px-3 py-[6px] text-sm text-paper-deep hover:bg-paper/10 hover:text-paper"
        >
          De saison
        </Link>
      ) : null}

      {signedIn ? (
        <>
          <Link href="/mon-profil" className={buttonStyles({ hierarchy: 'secondary', size: 'sm' })}>
            Mon espace
          </Link>
          <SignOutButton />
        </>
      ) : pathname !== '/connexion' ? (
        <Link href="/connexion" className={buttonStyles({ size: 'sm' })}>
          Connexion
        </Link>
      ) : null}
    </nav>
  );
}
