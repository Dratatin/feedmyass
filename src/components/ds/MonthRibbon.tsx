import { cn } from '@/lib/cn';
import { MONTH_INITIALS, ribbonLabel, seasonOfMonth, type Season } from '@/lib/months';

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

export function MonthRibbon({ currentMonth, seasonMonths, size = 'md' }: {
  /** Mois en cours, de 1 à 12. Toujours mis en évidence. */
  currentMonth: number;
  /** Mois de disponibilité à teinter. Absent: seul le mois en cours est marqué. */
  seasonMonths?: number[];
  size?: 'sm' | 'md';
}) {
  const inSeason = new Set(seasonMonths ?? []);

  return (
    <div
      role="img"
      aria-label={ribbonLabel(currentMonth, seasonMonths)}
      className={cn('grid w-full grid-cols-12', size === 'sm' ? 'gap-[2px]' : 'gap-[3px]')}
    >
      {MONTH_INITIALS.map((initial, index) => {
        const month = index + 1;
        const season = seasonOfMonth(month);
        return (
          <span
            key={month}
            aria-hidden="true"
            className={cn(
              'text-center type-data',
              size === 'sm'
                ? 'rounded-[3px] text-[10px] leading-[18px]'
                : 'rounded-[var(--radius-champ)] text-xs leading-[22px]',
              month === currentMonth
                ? cn('font-semibold', seasonFull[season])
                : inSeason.has(month)
                  ? seasonWash[season]
                  : 'bg-line-soft text-ink-muted',
            )}
          >
            {initial}
          </span>
        );
      })}
    </div>
  );
}
