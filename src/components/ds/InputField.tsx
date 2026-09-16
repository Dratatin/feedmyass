import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Champ de saisie de la direction « Encre & Saison ».
 *
 * La bordure emploie `line-strong` et non `line`: un champ est un élément
 * d'interface, sa bordure doit atteindre 3:1 contre le fond (WCAG 1.4.11), ce
 * qu'un filet décoratif ne fait pas.
 *
 * L'état de refus n'est pas signalé par la seule couleur (principe VI): le
 * message écrit sous le champ nomme ce qui est attendu, et `aria-invalid`
 * l'annonce aux lecteurs d'écran.
 */

export type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** Texte d'aide affiché sous le champ. Remplacé par `error` le cas échéant. */
  hint?: string;
  /** Message d'erreur: bascule le champ en état de refus (FR-002). */
  error?: string;
};

export function InputField({ label, hint, error, className, ...props }: InputFieldProps) {
  const id = useId();
  const describedById = error ? id + '-error' : hint ? id + '-hint' : undefined;
  const rejected = Boolean(error);

  return (
    <div className="flex w-full flex-col gap-[6px]">
      {/* Tout champ porte un libellé explicite associé (FR-033). */}
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>

      <input
        id={id}
        aria-invalid={rejected || undefined}
        aria-describedby={describedById}
        className={cn(
          'w-full border-[1.5px] border-solid px-[13px] py-[10px] text-md text-ink outline-none',
          'rounded-[var(--radius-champ)] placeholder:text-ink-muted',
          rejected
            ? 'border-framboise bg-framboise-wash'
            : 'border-line-strong bg-surface hover:border-ink-soft',
          'focus:border-brand disabled:text-ink-muted',
          className,
        )}
        {...props}
      />

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
