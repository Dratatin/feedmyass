import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Champ de saisie du design system "BDD de composants de base".
 *
 * Source Figma : composant Input field (noeud 1090:57817).
 * Valeurs relevées sur les variantes 1091:63795 (label + texte d'aide) et
 * 1094:7212 (état destructif, pour les erreurs de validation).
 *
 * Le design system décline six types (Default, Payment input, Leading dropdown,
 * Leading text, Trailing dropdown...) et quatre états. Seul le type Default est
 * implémenté ici, avec l'état destructif: c'est ce dont les écrans ont besoin.
 * Les autres sont à relever dans Figma le jour où ils servent (principe VI).
 */

export type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** Texte d'aide affiché sous le champ. Remplacé par `error` le cas échéant. */
  hint?: string;
  /** Message d'erreur: bascule le champ en état destructif (FR-002). */
  error?: string;
};

export function InputField({ label, hint, error, className, ...props }: InputFieldProps) {
  const id = useId();
  const describedById = error ? id + '-error' : hint ? id + '-hint' : undefined;
  const destructive = Boolean(error);

  return (
    <div className="flex w-full flex-col gap-[6px]">
      {/* Tout champ porte un libellé explicite associé (FR-033). */}
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>

      <div
        className={cn(
          'flex w-full items-center gap-[8px] overflow-hidden bg-base-white px-[14px] py-[10px]',
          'rounded-[var(--radius-ds)] border border-solid shadow-[var(--shadow-xs)]',
          destructive ? 'border-red-300' : 'border-neutral-300',
          'focus-within:border-brand-600',
        )}
      >
        <input
          id={id}
          aria-invalid={destructive || undefined}
          aria-describedby={describedById}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-md text-neutral-900 outline-none',
            'placeholder:text-neutral-500 disabled:text-neutral-500',
            className,
          )}
          {...props}
        />
        {destructive ? (
          // Icône exportée depuis Figma et versionnée: l'URL d'asset Figma expire.
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/icons/alert-circle.svg" alt="" aria-hidden="true" className="size-[16px] shrink-0" />
        ) : null}
      </div>

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
