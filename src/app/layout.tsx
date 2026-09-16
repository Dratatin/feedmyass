import type { Metadata } from 'next';
import { Fraunces, Recursive } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/features/SiteHeader';
import './globals.css';

/**
 * Les deux familles de la direction « Encre & Saison », chargées par
 * next/font: les fichiers sont servis depuis notre propre domaine, sans appel
 * à Google au chargement de la page, et sans décalage de mise en page
 * (FR-105).
 *
 * Les axes variables sont demandés explicitement parce qu'ils FONT ces
 * polices: sans SOFT ni WONK, Fraunces est une autre fonte; sans CASL,
 * Recursive est une grotesque quelconque; sans MONO, elle n'a pas de chasse
 * fixe pour les chiffres. Les valeurs de ces axes sont posées dans
 * globals.css.
 */
const display = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-display-family',
  display: 'swap',
});

const sans = Recursive({
  subsets: ['latin'],
  axes: ['CASL', 'MONO'],
  variable: '--font-sans-family',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FeedMyAss — besoins nutritionnels et ingrédients de saison',
  description:
    'Estimation informative de vos besoins nutritionnels journaliers et hebdomadaires, et liste ' +
    "d'ingrédients de saison pour les couvrir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // lang="fr": l'interface est en français (FR-034).
  return (
    <html lang="fr" className={display.variable + ' ' + sans.variable}>
      {/* Colonne pleine hauteur: le contenu occupe au minimum la fenêtre, quelle
          que soit la page. Sans cela, un écran court — une connexion, un état
          vide — laissait sous lui une bande de papier nu, et le pied de page
          remontait au milieu de l'écran. */}
      <body className="flex min-h-screen flex-col">
        {/* L'en-tête porte l'état de connexion, donc il est rendu pour toutes
            les pages, publiques comprises: le calcul reste accessible sans
            compte (FR-024) mais la connexion est toujours à portée. */}
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
