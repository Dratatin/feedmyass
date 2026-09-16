import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Bouton de la direction « Encre & Saison » (docs/design-system.md).
 *
 * Trois hiérarchies, parce que trois suffisent aux écrans:
 *   - primary   : l'action qui fait avancer le parcours, une seule par écran;
 *   - secondary : tout le reste;
 *   - danger    : les actions irréversibles (suppression de compte).
 *
 * Forme en gélule et aucune ombre portée: c'est le marqueur de la direction,
 * qui pose la hiérarchie par les fonds et les filets, jamais par l'élévation.
 */

type Hierarchy = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  hierarchy?: Hierarchy;
  size?: Size;
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-[13px] py-[6px] text-sm',
  md: 'px-[18px] py-[9px] text-sm',
  lg: 'px-[24px] py-[11px] text-md',
};

const hierarchyClasses: Record<Hierarchy, string> = {
  primary: cn(
    'bg-brand border-brand text-surface',
    'hover:bg-brand-hover hover:border-brand-hover',
    'disabled:bg-line disabled:border-line disabled:text-ink-muted',
  ),
  secondary: cn(
    'bg-surface border-line-strong text-brand',
    'hover:bg-brand-wash hover:border-brand',
    'disabled:bg-paper disabled:border-line disabled:text-ink-muted',
  ),
  danger: cn(
    'bg-surface border-framboise text-framboise',
    'hover:bg-framboise-wash',
    'disabled:bg-paper disabled:border-line disabled:text-ink-muted',
  ),
};

/**
 * Classes du bouton, exposées pour les LIENS qui doivent en avoir l'allure.
 *
 * Un lien enveloppant un bouton (`<a><button>`) produit deux éléments
 * interactifs imbriqués: axe-core le signale (`nested-interactive`), et un
 * lecteur d'écran annonce une cible ambiguë. Une navigation est un lien, une
 * action est un bouton — et un lien qui ressemble à un bouton se fait avec ces
 * classes, pas avec un bouton dedans.
 */
export function buttonStyles({ hierarchy = 'primary', size = 'md', className }: {
  hierarchy?: Hierarchy;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full',
    'border-[1.5px] border-solid font-semibold no-underline',
    'disabled:cursor-not-allowed',
    sizeClasses[size],
    hierarchyClasses[hierarchy],
    className,
  );
}

export function Button({
  hierarchy = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonStyles({ hierarchy, size, className })} {...props} />;
}
