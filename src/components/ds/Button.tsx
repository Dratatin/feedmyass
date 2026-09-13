import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Bouton du design system "BDD de composants de base".
 *
 * Source Figma : fichier rjkPVphG56oIJElZVnK82I, composant Buttons/Button
 * (noeud 1038:34411). Valeurs relevées sur les variantes :
 *   - tailles   : 1040:3 (sm), 1038:34410 (md), 1040:9 (lg), 1040:15 (xl)
 *   - états     : 1041:34506 (hover), 1041:34790 (disabled)
 *   - hiérarchie: 1041:35818 (secondary gray)
 *
 * Le design system définit sept hiérarchies. Seules les deux dont les valeurs
 * ont été relevées sont implémentées ici. Les cinq autres (Secondary color,
 * Tertiary color, Tertiary gray, Link color, Link gray) doivent être ajoutées
 * en relevant leurs valeurs dans Figma, jamais en les inventant (principe VI).
 */

type Hierarchy = 'primary' | 'secondary-gray';
type Size = 'sm' | 'md' | 'lg' | 'xl';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  hierarchy?: Hierarchy;
  size?: Size;
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-[14px] py-[8px] text-sm',
  md: 'px-[16px] py-[10px] text-sm',
  lg: 'px-[18px] py-[10px] text-md',
  xl: 'px-[20px] py-[12px] text-md',
};

const hierarchyClasses: Record<Hierarchy, string> = {
  primary: cn(
    'bg-brand-600 border-brand-600 text-base-white',
    'hover:bg-brand-700 hover:border-brand-700',
    'disabled:bg-brand-200 disabled:border-brand-200',
  ),
  'secondary-gray': cn(
    'bg-base-white border-neutral-300 text-neutral-700',
    'hover:bg-neutral-50',
    'disabled:bg-neutral-50 disabled:border-neutral-200 disabled:text-neutral-400',
  ),
};

export function Button({
  hierarchy = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap border border-solid font-semibold',
        'rounded-[var(--radius-ds)] shadow-[var(--shadow-xs)]',
        'disabled:cursor-not-allowed',
        sizeClasses[size],
        hierarchyClasses[hierarchy],
        className,
      )}
      {...props}
    />
  );
}
