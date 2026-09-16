import Link from 'next/link';
import { HeaderNav } from '@/components/features/HeaderNav';
import { getCurrentUserId } from '@/lib/auth';
import { monthName, seasonOfMonth, type Season } from '@/lib/months';

/**
 * En-tête commun à toutes les pages: c'est lui qui rend la connexion
 * atteignable (FR-022) et la déconnexion possible.
 *
 * Refait à la revue du 2026-09-19. La version précédente était une barre de
 * liens quelconque, qui aurait pu coiffer n'importe quel site. Celle-ci porte
 * le mois en cours à côté de la marque, dans la couleur de sa saison: c'est la
 * variable dont dépend tout le produit, et le seul bandeau où elle a sa place
 * sur les écrans qui n'ont pas de rail.
 *
 * L'état de connexion vient du serveur: le rendu ne montre jamais « Connexion »
 * à quelqu'un qui l'est déjà, contrairement à une détection faite après
 * hydratation. La navigation, elle, est cliente — elle a besoin de la page
 * courante pour ne pas proposer un lien vers l'écran déjà affiché.
 */

const seasonChip: Record<Season, string> = {
  hiver: 'bg-hiver-wash text-hiver',
  printemps: 'bg-printemps-wash text-printemps',
  ete: 'bg-ete-wash text-ete',
  automne: 'bg-automne-wash text-automne',
};

export async function SiteHeader() {
  let userId: string | null = null;
  try {
    userId = await getCurrentUserId();
  } catch {
    // Configuration Supabase absente: le site reste consultable en mode
    // visiteur plutôt que de renvoyer une erreur sur toutes les pages.
    userId = null;
  }

  const month = new Date().getMonth() + 1;

  return (
    <header className="w-full border-b-[1.5px] border-solid border-line bg-band">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="type-display text-xl text-ink no-underline">
            FeedMyAss
          </Link>

          <span aria-hidden="true" className="h-6 w-px bg-line" />

          {/* Le mois en cours, dans la couleur de sa saison. Ce n'est pas une
              décoration: c'est lui qui décide de la liste d'ingrédients. */}
          <span
            className={
              'type-data rounded-full px-[10px] py-[3px] text-xs tracking-label uppercase ' +
              seasonChip[seasonOfMonth(month)]
            }
          >
            {monthName(month)}
          </span>
        </div>

        <HeaderNav signedIn={userId !== null} />
      </div>
    </header>
  );
}
