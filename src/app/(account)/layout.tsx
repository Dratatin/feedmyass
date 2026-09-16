import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageShell } from '@/components/ds/PageShell';
import { getCurrentUserId } from '@/lib/auth';

/**
 * Protection des routes de l'espace personnel.
 *
 * La vérification est faite côté serveur à chaque rendu: un visiteur non
 * connecté n'atteint jamais ces pages. Le cloisonnement des DONNÉES ne repose
 * pas là-dessus mais sur RLS — ceci n'est qu'une commodité de navigation.
 *
 * Le proxy redirige déjà ces chemins en conservant la page demandée. Ce second
 * filet garde son utilité: il protège aussi les pages qu'on ajouterait ici sans
 * penser à compléter la liste du proxy.
 *
 * Le rail change de contenu, pas de forme: le parcours cède la place aux trois
 * pages du compte.
 */
const PAGES = [
  { href: '/mon-profil', label: 'Mon profil' },
  { href: '/historique', label: 'Historique' },
  { href: '/donnees', label: 'Mes données' },
] as const;

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/connexion');

  return (
    <PageShell
      rail={
        <>
          <nav aria-label="Espace personnel">
            <ul className="flex flex-col gap-[3px]">
              {PAGES.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="block rounded-[var(--radius-champ)] px-[10px] py-[8px] text-sm text-ink-soft hover:bg-surface hover:text-ink"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-xs text-ink-muted">
            Profil, régime et historique. Ni mot de passe ni session ne sont conservés
            ici&nbsp;: ils appartiennent au fournisseur d&apos;identité.
          </p>
        </>
      }
    >
      {children}
    </PageShell>
  );
}
