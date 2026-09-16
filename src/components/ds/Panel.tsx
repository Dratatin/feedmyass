import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Bloc encadré.
 *
 * Réservé aux formulaires et aux blocs d'action: dans cette direction, un
 * encadrement signifie « objet séparé, sur lequel on agit ». Les registres et
 * les listes de résultats n'en portent pas, ils se posent directement sur le
 * papier (docs/design-system.md, règle 2).
 */
export function Panel({ title, description, children, className }: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex w-full flex-col gap-4 border-[1.5px] border-solid border-line bg-surface p-5',
        'rounded-[var(--radius-bloc)]',
        className,
      )}
    >
      {title ? (
        <header className="flex flex-col gap-1">
          <h2 className="text-lg text-ink">{title}</h2>
          {description ? <p className="text-sm text-ink-soft">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
