import type { ReactNode } from 'react';

/**
 * Tableau de données.
 *
 * JUSTIFICATION (principe VI): le design system ne contient pas de composant
 * tableau. Les bordures, fonds et typographies proviennent des tokens relevés
 * dans Figma; aucune valeur n'est inventée.
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

export function DataTable<T>({ columns, rows, rowKey, caption }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={caption ?? 'Tableau de données'}
      className="w-full overflow-x-auto rounded-[var(--radius-ds)] border border-solid border-neutral-200"
    >
      <table className="w-full border-collapse text-sm">
        {caption ? <caption className="px-4 py-3 text-left text-sm text-neutral-600">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-solid border-neutral-200 bg-neutral-50">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={
                  'px-4 py-3 font-medium text-neutral-600 ' +
                  (column.align === 'right' ? 'text-right' : 'text-left')
                }
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-solid border-neutral-200 last:border-b-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={
                    'px-4 py-3 text-neutral-900 ' + (column.align === 'right' ? 'text-right' : 'text-left')
                  }
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
