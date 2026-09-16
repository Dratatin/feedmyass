import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/features/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'FeedMyAss — besoins nutritionnels et ingrédients de saison',
  description:
    'Estimation informative de vos besoins nutritionnels journaliers et hebdomadaires, et liste ' +
    "d'ingrédients de saison pour les couvrir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // lang="fr": l'interface est en français (FR-034).
  return (
    <html lang="fr">
      <body>
        {/* L'en-tête porte l'état de connexion, donc il est rendu pour toutes
            les pages, publiques comprises: le calcul reste accessible sans
            compte (FR-024) mais la connexion est toujours à portée. */}
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
