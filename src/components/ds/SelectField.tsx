import type { SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Sélecteur.
 *
 * JUSTIFICATION (principe VI, création d'un composant hors design system):
 * le design system "BDD de composants de base" ne contient aucun composant de
 * sélection autonome. Ses pages sont Buttons, Inputs, Badges, Tooltips, Modals,
 * Icons, Logos et assets décoratifs; le composant Input field propose bien des
 * types « Leading dropdown » et « Trailing dropdown », mais ce sont des champs
 * de saisie accolés à un menu, pas un sélecteur.
 *
 * Ce composant n'invente donc aucune valeur: il reprend exactement les métriques
 * relevées sur Input field (noeud 1091:63795) — bordure Neutral/300, padding
 * 14/10, rayon et ombre du design system, typographie Text md/Regular — pour que
 * formulaire et sélecteur restent visuellement homogènes.
 */

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
};

export function SelectField({ label, hint, error, className, children, ...props }: SelectFieldProps) {
  const id = useId();
  const describedById = error ? id + '-error' : hint ? id + '-hint' : undefined;
  const destructive = Boolean(error);

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>

      <select
        id={id}
        aria-invalid={destructive || undefined}
        aria-describedby={describedById}
        className={cn(
          'w-full bg-base-white px-[14px] py-[10px] text-md text-neutral-900',
          'rounded-[var(--radius-ds)] border border-solid shadow-[var(--shadow-xs)]',
          destructive ? 'border-red-300' : 'border-neutral-300',
          'focus:border-brand-600 focus:outline-none disabled:text-neutral-500',
          className,
        )}
        {...props}
      >
        {children}
      </select>

      {error ? (
        <p id={id + '-error'} role="alert" className="w-full text-sm text-red-500">
          {error}
        </p>
      ) : hint ? (
        <p id={id + '-hint'} className="w-full text-sm text-neutral-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
