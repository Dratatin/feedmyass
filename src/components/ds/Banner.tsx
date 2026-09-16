import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Bandeau d'information.
 *
 * JUSTIFICATION (principe VI): le design system ne contient pas de composant
 * bandeau ou alerte. Les valeurs reprennent le motif du Badge relevé dans Figma
 * (fond en nuance 50, texte en nuance 700 de la même famille), appliqué à un
 * bloc pleine largeur.
 *
 * Ce composant porte la mention exigée par FR-010 sur tout écran de résultat,
 * d'où le rôle ARIA « note » plutôt qu'« alert »: c'est une information
 * permanente, pas une alerte contextuelle.
 */

type Tone = 'info' | 'warning';

const toneClasses: Record<Tone, string> = {
  info: 'bg-neutral-50 border-neutral-200 text-neutral-700',
  warning: 'bg-orange-50 border-orange-200 text-orange-900',
};

export function Banner({ tone = 'info', title, children }: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside
      role="note"
      className={cn(
        'flex w-full flex-col gap-1 border border-solid p-4',
        'rounded-[var(--radius-ds)] text-sm',
        toneClasses[tone],
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div>{children}</div>
    </aside>
  );
}
