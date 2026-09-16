import type { SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Sélecteur.
 *
 * Mêmes métriques que `InputField` — bordure `line-strong`, rayon de champ,
 * même rythme vertical — pour qu'un formulaire mêlant les deux reste d'un seul
 * tenant.
 */

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
};

export function SelectField({ label, hint, error, className, children, ...props }: SelectFieldProps) {
  const id = useId();
  const describedById = error ? id + '-error' : hint ? id + '-hint' : undefined;
  const rejected = Boolean(error);

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>

      <select
        id={id}
        aria-invalid={rejected || undefined}
        aria-describedby={describedById}
        className={cn(
          'w-full border-[1.5px] border-solid px-[13px] py-[10px] text-md text-ink',
          'rounded-[var(--radius-champ)]',
          rejected
            ? 'border-framboise bg-framboise-wash'
            : 'border-line-strong bg-surface hover:border-ink-soft',
          'focus:border-brand focus:outline-none disabled:text-ink-muted',
          className,
        )}
        {...props}
      >
        {children}
      </select>

      {error ? (
        <p id={id + '-error'} role="alert" className="w-full text-sm font-semibold text-framboise">
          {error}
        </p>
      ) : hint ? (
        <p id={id + '-hint'} className="w-full text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
