import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { MONTH_INITIALS, MONTH_NAMES, ribbonLabel, seasonOfMonth, type Season } from '@/lib/months';

/**
 * Ruban des douze mois: le motif d'identité de la direction.
 *
 * Il n'est pas décoratif. Il porte l'information dont dépend toute la liste
 * d'ingrédients — le mois de consultation (FR-014) — et il la porte de la même
 * façon partout où elle apparaît: dans le rail pour la date du jour, sur une
 * ligne d'ingrédient pour sa période de disponibilité.
 *
 * Chaque mois prend la teinte de sa saison. Décembre n'a pas la couleur de
 * juillet parce qu'on n'y mange pas la même chose.
 *
 * Les douze initiales n'ont aucun sens lues une par une par un lecteur
 * d'écran: le ruban est donc exposé comme une image porteuse de sens, avec un
 * texte de remplacement qui nomme les mois en toutes lettres (FR-104).
 */

const seasonFull: Record<Season, string> = {
  hiver: 'bg-hiver text-surface',
  printemps: 'bg-printemps text-surface',
  ete: 'bg-ete text-surface',
  automne: 'bg-automne text-surface',
};

const seasonWash: Record<Season, string> = {
  hiver: 'bg-hiver-wash text-ink',
  printemps: 'bg-printemps-wash text-ink',
  ete: 'bg-ete-wash text-ink',
  automne: 'bg-automne-wash text-ink',
};

export function MonthRibbon({ currentMonth, seasonMonths, size = 'md', hrefOf }: {
  /** Mois en cours, de 1 à 12. Toujours mis en évidence. */
  currentMonth: number;
  /** Mois de disponibilité à teinter. Absent: seul le mois en cours est marqué. */
  seasonMonths?: number[];
  size?: 'sm' | 'md';
  /**
   * Rend chaque mois cliquable. Le ruban devient alors une navigation — il perd
   * son rôle d'image et chaque case gagne le nom du mois en toutes lettres,
   * puisqu'une initiale n'est pas une destination annonçable.
   */
  hrefOf?: (month: number) => string;
}) {
  const inSeason = new Set(seasonMonths ?? []);

  const cellClass = (month: number) => {
    const season = seasonOfMonth(month);
    return cn(
      'block text-center type-data',
      size === 'sm'
        ? 'rounded-[3px] text-[10px] leading-[18px]'
        : 'rounded-[var(--radius-champ)] text-xs leading-[22px]',
      month === currentMonth
        ? cn('font-semibold', seasonFull[season])
        : inSeason.has(month)
          ? seasonWash[season]
          : 'bg-line-soft text-ink-muted',
    );
  };

  const gridClass = cn('grid w-full grid-cols-12', size === 'sm' ? 'gap-[2px]' : 'gap-[3px]');

  if (hrefOf) {
    return (
      <nav aria-label="Choisir un mois" className={gridClass}>
        {MONTH_INITIALS.map((initial, index) => {
          const month = index + 1;
          return (
            <Link
              key={month}
              href={hrefOf(month) as Route}
              aria-current={month === currentMonth ? 'page' : undefined}
              className={cn(cellClass(month), 'no-underline hover:opacity-80')}
            >
              <span aria-hidden="true">{initial}</span>
              <span className="sr-only">{MONTH_NAMES[index]}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div role="img" aria-label={ribbonLabel(currentMonth, seasonMonths)} className={gridClass}>
      {MONTH_INITIALS.map((initial, index) => (
        <span key={index + 1} aria-hidden="true" className={cellClass(index + 1)}>
          {initial}
        </span>
      ))}
    </div>
  );
}
