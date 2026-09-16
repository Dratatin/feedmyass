import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Registre: le tableau de la direction « Encre & Saison ».
 *
 * Pas de cartouche, pas de fond alterné. Un filet d'encre sous l'en-tête, des
 * filets clairs entre les lignes, des en-têtes en capitales: c'est la mise en
 * page d'une table de composition, qui est exactement ce que ces écrans
 * affichent.
 *
 * Le conteneur gère son propre défilement horizontal: c'est la seule exception
 * tolérée à l'absence de défilement horizontal de la page (FR-031), et elle
 * évite qu'un tableau de 26 nutriments ne casse la mise en page à 320 px.
 *
 * Ce conteneur est focusable au clavier (`tabIndex={0}` et rôle de région): une
 * zone défilable qu'on ne peut pas atteindre au clavier est une violation WCAG,
 * constatée par axe-core à 320 px où le tableau déborde réellement.
 */
export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
};

export function Register<T>({ columns, rows, rowKey, caption, highlightKey }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  /** Clé de la ligne mise en avant: l'énergie, dont tout le reste dépend. */
  highlightKey?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={caption ?? 'Tableau de données'}
      className="w-full overflow-x-auto"
    >
      <table className="w-full border-collapse text-sm">
        {caption ? (
          <caption className="pb-2 text-left text-sm text-ink-soft">{caption}</caption>
        ) : null}
        <thead>
          <tr className="border-b-2 border-solid border-ink">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'type-data pr-3 pb-2 text-xs font-medium tracking-label uppercase text-ink-muted',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                'border-b border-solid border-line-soft last:border-b-2 last:border-line',
                highlightKey !== undefined && rowKey(row) === highlightKey ? 'bg-brand-wash' : '',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'py-[10px] pr-3 align-middle text-ink',
                    column.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
