import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
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
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/connexion');

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6 px-4 py-10">
      <nav aria-label="Espace personnel" className="flex flex-wrap gap-4 text-sm">
        <Link href="/mon-profil" className="font-medium text-brand-700 underline">Mon profil</Link>
        <Link href="/historique" className="font-medium text-brand-700 underline">Historique</Link>
        <Link href="/donnees" className="font-medium text-brand-700 underline">Mes données</Link>
      </nav>
      {children}
    </div>
  );
}
