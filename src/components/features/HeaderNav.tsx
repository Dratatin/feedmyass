'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonStyles } from '@/components/ds/Button';
import { SignOutButton } from '@/components/features/SignOutButton';

/**
 * Navigation de l'en-tête.
 *
 * Composant client uniquement pour connaître la page courante: proposer un lien
 * vers l'écran déjà affiché est une invitation à tourner en rond. L'état de
 * connexion, lui, vient du serveur — il ne doit jamais clignoter après
 * hydratation.
 *
 * Les liens sont du texte, discrets; l'action de compte est un bouton
 * secondaire. L'en-tête n'est pas l'endroit d'une action primaire: celle-ci
 * appartient à l'écran, une par écran.
 *
 * Le nombre de liens est volontairement tenu: le test de navigation au clavier
 * accorde dix tabulations pour atteindre le premier champ du formulaire de
 * profil, dont trois sont consommées par le rail.
 */

const linkClass =
  'rounded-full px-3 py-[6px] text-sm text-ink-soft no-underline hover:bg-surface hover:text-ink';

export function HeaderNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation" className="flex flex-wrap items-center gap-1">
      {pathname !== '/de-saison' ? (
        <Link href="/de-saison" className={linkClass}>
          Le calendrier
        </Link>
      ) : null}

      {pathname !== '/profil' ? (
        <Link href="/profil" className={linkClass}>
          Mes besoins
        </Link>
      ) : null}

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

      {signedIn ? (
        <>
          <Link href="/mon-profil" className={buttonStyles({ hierarchy: 'secondary', size: 'sm' })}>
            Mon espace
          </Link>
          <SignOutButton />
        </>
      ) : pathname !== '/connexion' ? (
        <Link href="/connexion" className={buttonStyles({ hierarchy: 'secondary', size: 'sm' })}>
          Connexion
        </Link>
      ) : null}
    </nav>
  );
}
