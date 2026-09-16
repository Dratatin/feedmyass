import type { ReactNode } from 'react';

/**
 * Gabarit à deux colonnes: un rail, une colonne principale.
 *
 * Le rail est rendu AVANT le contenu dans le DOM, donc avant les champs dans
 * l'ordre de tabulation. C'est voulu — il porte la navigation du parcours — et
 * c'est ce qui borne sa taille: le test de navigation au clavier de la 001
 * accorde dix tabulations pour atteindre le premier champ du formulaire de
 * profil, dont deux sont prises par l'en-tête et trois par le rail.
 *
 * LE FOND DU RAIL DÉBORDE DU CONTENEUR. La largeur de page borne le contenu,
 * jamais une couleur: sans le débord, la bande de paille s'arrêterait au bord
 * du conteneur centré et laisserait une marge de papier clair à sa gauche, ce
 * qui donne l'impression d'un bloc coupé. Le pseudo-élément prolonge donc le
 * fond jusqu'au bord de la fenêtre, comme le fait l'en-tête du site.
 *
 * Sous 760 px, le rail passe au-dessus du contenu: c'est la seule mise en page
 * qui garde les commandes de régime accessibles sans défilement horizontal
 * (FR-031). Le débord n'a alors plus lieu d'être, le rail occupant déjà toute
 * la largeur.
 */
export function PageShell({ rail, children }: { rail?: ReactNode; children: ReactNode }) {
  if (!rail) {
    return (
      <main className="mx-auto flex w-full max-w-[64rem] flex-col gap-6 px-4 py-10 md:px-8">
        {children}
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-page">
      <div className="grid grid-cols-1 md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside
          className={
            'relative flex flex-col gap-6 border-b-[1.5px] border-solid border-line bg-paper-deep ' +
            'px-5 py-6 md:border-r-[1.5px] md:border-b-0 ' +
            'md:before:absolute md:before:inset-y-0 md:before:right-full md:before:w-[50vw] ' +
            'md:before:bg-paper-deep md:before:content-[""]'
          }
        >
          {rail}
        </aside>
        <main className="flex min-w-0 flex-col gap-6 px-4 py-7 md:px-8 md:py-9">{children}</main>
      </div>
    </div>
  );
}
