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
 * Sous 760 px, le rail passe au-dessus du contenu: c'est la seule mise en page
 * qui garde les commandes de régime accessibles sans défilement horizontal
 * (FR-031).
 */
export function PageShell({ rail, children }: { rail?: ReactNode; children: ReactNode }) {
  if (!rail) {
    return (
      <main className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 py-10">{children}</main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="grid grid-cols-1 md:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 border-b-[1.5px] border-solid border-line bg-paper-deep px-5 py-6 md:border-r-[1.5px] md:border-b-0">
          {rail}
        </aside>
        <main className="flex min-w-0 flex-col gap-6 px-4 py-7 md:px-7 md:py-8">{children}</main>
      </div>
    </div>
  );
}
