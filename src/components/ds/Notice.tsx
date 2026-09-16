import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Message encadré.
 *
 * Le filet porte la couleur, donc le sens: myrtille pour une information,
 * miel pour la mention non médicale et les précautions, basilic pour ce qui
 * relève de la saison ou de l'invariant besoins/régime.
 *
 * Le rôle ARIA est « note » et non « alert »: ces messages sont permanents, ils
 * ne doivent pas interrompre un lecteur d'écran en cours de lecture.
 */

type Tone = 'info' | 'caution' | 'saison';

const toneClasses: Record<Tone, string> = {
  info: 'border-brand bg-brand-wash',
  caution: 'border-miel bg-miel-wash',
  saison: 'border-saison bg-saison-wash',
};

export function Notice({ tone = 'info', title, children }: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside
      role="note"
      className={cn(
        'flex w-full flex-col gap-1 border-[1.5px] border-solid px-4 py-3 text-sm text-ink',
        'rounded-[var(--radius-bloc)]',
        toneClasses[tone],
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className="text-ink-soft">{children}</div>
    </aside>
  );
}
