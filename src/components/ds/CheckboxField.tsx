import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

/**
 * Case à cocher.
 *
 * JUSTIFICATION (principe VI): aucun composant existant ne couvre un choix
 * multiple. Les exclusions de régime (sans gluten, sans lactose, sans fruits à
 * coque) en réclament un — une liste de cases, pas un sélecteur, puisqu'elles
 * se cumulent.
 *
 * Le libellé est associé par `htmlFor` et la case reste native: la coche du
 * système d'exploitation est mieux connue de l'utilisateur, et mieux gérée par
 * les technologies d'assistance, que n'importe quel dessin de remplacement.
 */
export function CheckboxField({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & { label: string }) {
  const id = useId();

  return (
    <div className="flex items-center gap-[9px]">
      <input
        id={id}
        type="checkbox"
        className="size-[17px] shrink-0 accent-brand"
        {...props}
      />
      <label htmlFor={id} className="text-sm text-ink">
        {label}
      </label>
    </div>
  );
}
