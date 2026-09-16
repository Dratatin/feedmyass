import { cn } from '@/lib/cn';

/**
 * Chiffres clés.
 *
 * L'écran des besoins affiche 26 lignes. Sans point d'entrée, l'utilisateur les
 * lit toutes ou n'en lit aucune: ces trois chiffres lui donnent l'essentiel
 * avant le détail (FR-108).
 *
 * L'énergie porte le fond myrtille parce que tout le reste en dépend — les
 * apports en pourcentage de l'apport énergétique comme les besoins en vitamines
 * du groupe B, exprimés par mégajoule.
 */
export type KeyFigure = {
  label: string;
  value: string;
  unit: string;
  emphasis?: boolean;
};

export function KeyFigures({ figures }: { figures: KeyFigure[] }) {
  return (
    <dl className="grid w-full grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3">
      {figures.map((figure) => (
        <div
          key={figure.label}
          className={cn(
            'flex flex-col gap-[3px] border-[1.5px] border-solid px-4 py-[15px]',
            'rounded-[var(--radius-bloc)]',
            figure.emphasis ? 'border-brand bg-brand-wash' : 'border-line bg-surface',
          )}
        >
          <dt className="type-data text-xs tracking-label uppercase text-ink-muted">
            {figure.label}
          </dt>
          <dd className="type-display m-0 text-display-sm tabular-nums text-ink">
            {figure.value}
            <span className="type-data ml-1 text-xs font-normal tracking-normal text-ink-muted">
              {figure.unit}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
