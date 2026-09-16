import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { seasonOfMonth } from '@/lib/months';

/**
 * Étiquette d'état.
 *
 * Les tons ne sont pas décoratifs: le vert dit « de saison » ou « seuil
 * atteint », le miel « sous le seuil », le neutre ne dit rien qu'un classement.
 * Le ton `month` prend la couleur de la saison du mois — c'est ce qui permet à
 * un historique de montrer qu'un résultat de février n'a pas proposé les mêmes
 * ingrédients qu'un résultat de septembre.
 *
 * Le libellé porte toujours le sens en toutes lettres: la couleur ne le porte
 * jamais seule (principe VI).
 */

type Tone = 'saison' | 'under' | 'neutral';

const toneClasses: Record<Tone, string> = {
  saison: 'bg-saison-wash text-saison',
  under: 'bg-miel-wash text-miel',
  neutral: 'bg-paper-deep text-ink-soft',
};

const seasonClasses = {
  hiver: 'bg-hiver-wash text-hiver',
  printemps: 'bg-printemps-wash text-printemps',
  ete: 'bg-ete-wash text-ete',
  automne: 'bg-automne-wash text-automne',
} as const;

const base =
  'inline-flex items-center justify-center whitespace-nowrap rounded-full px-[10px] py-[3px] ' +
  'type-data text-xs tracking-label uppercase';

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn(base, toneClasses[tone])}>{children}</span>;
}

/** Étiquette teintée par la saison du mois indiqué. */
export function MonthPill({ month, children }: { month: number; children: ReactNode }) {
  return <span className={cn(base, seasonClasses[seasonOfMonth(month)])}>{children}</span>;
}
