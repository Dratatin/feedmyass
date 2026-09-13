import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Badge du design system "BDD de composants de base".
 *
 * Source Figma : composant Badge (noeud 1046:3819).
 * Valeurs relevées sur 1046:4837 (Success) et 1046:4357 (Error), qui établissent
 * le motif: fond dans la nuance 50 de la famille, texte dans la nuance 700,
 * padding 10/2, rayon 16 px, typographie Text sm/Medium.
 *
 * Le design system décline treize couleurs et trois tailles. Seules les deux
 * couleurs effectivement relevées sont exposées; les autres seront ajoutées en
 * relevant leurs valeurs dans Figma (principe VI). La taille md est la seule
 * implémentée, c'est celle dont les écrans ont besoin.
 */

type Tone = 'success' | 'error';

const toneClasses: Record<Tone, string> = {
  success: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-700',
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-[16px] px-[10px] py-[2px]',
        'text-sm font-medium',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
