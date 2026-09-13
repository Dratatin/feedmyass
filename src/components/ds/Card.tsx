import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Carte.
 *
 * JUSTIFICATION (principe VI): le design system ne contient pas de composant
 * carte. Aucune valeur n'est inventée: le conteneur reprend les tokens relevés
 * dans Figma — fond Base/White, bordure Neutral/200, rayon et ombre du design
 * system — et la typographie de l'échelle officielle.
 */
export function Card({ title, description, children, className }: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex w-full flex-col gap-4 bg-base-white p-5',
        'rounded-[var(--radius-ds)] border border-solid border-neutral-200 shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      {title ? (
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          {description ? <p className="text-sm text-neutral-600">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
