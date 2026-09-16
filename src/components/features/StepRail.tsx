import Link from 'next/link';
import { MonthRibbon } from '@/components/ds/MonthRibbon';

/**
 * Parcours en trois étapes dans le rail (FR-109).
 *
 * La 001 n'avait aucune navigation: chaque écran était une impasse dont on ne
 * sortait que par les boutons du bas. Les trois étapes sont ici toujours
 * visibles et toujours atteignables.
 *
 * L'étape en cours est cerclée d'encre ET porte `aria-current`: ni la couleur
 * ni la forme ne portent seules l'information (principe VI).
 *
 * Le ruban des mois accompagne le parcours sur chacun de ses écrans (FR-106):
 * c'est le rappel permanent que la réponse dépend de la date.
 */

const STEPS = [
  { href: '/profil', label: 'Profil' },
  { href: '/besoins', label: 'Besoins' },
  { href: '/liste', label: 'Ingrédients' },
] as const;

export function StepRail({ current, currentMonth, reached = 3 }: {
  /** Étape en cours, de 1 à 3. */
  current: 1 | 2 | 3;
  currentMonth: number;
  /**
   * Dernière étape atteignable, de 1 à 3.
   *
   * Une étape au-delà n'est pas un lien: on ne consulte pas ses besoins avant
   * de les avoir calculés, ni sa liste avant d'avoir ses besoins (revue du
   * 2026-09-18). Elle reste visible et annoncée comme indisponible — la masquer
   * priverait l'utilisateur de la carte du parcours.
   */
  reached?: 1 | 2 | 3;
}) {
  return (
    <>
      <ol className="flex flex-col gap-[3px]">
        {STEPS.map((step, index) => {
          const rank = index + 1;
          const isCurrent = rank === current;
          const isDone = rank < current;
          const isLocked = rank > reached;

          const rowClass =
            'flex items-center gap-[10px] rounded-[var(--radius-champ)] ' +
            (isCurrent
              ? 'border-[1.5px] border-solid border-ink bg-surface px-[8.5px] py-[6.5px] text-ink'
              : isLocked
                ? 'px-[10px] py-[8px] text-ink-muted'
                : 'px-[10px] py-[8px] text-ink-soft hover:bg-surface');

          const marker = (
            <span
              aria-hidden="true"
              className={
                'grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] border-solid text-xs type-data ' +
                (isCurrent
                  ? 'border-brand bg-brand text-surface'
                  : isDone
                    ? 'border-saison bg-saison text-surface'
                    : isLocked
                      ? 'border-line border-dashed text-ink-muted'
                      : 'border-line-strong text-ink-muted')
              }
            >
              {isDone ? '✓' : rank}
            </span>
          );

          const label = (
            <span className={'text-sm ' + (isCurrent ? 'font-semibold' : '')}>
              {step.label}
              {isDone ? <span className="sr-only"> (étape franchie)</span> : null}
              {isLocked ? (
                <span className="sr-only"> (indisponible, étape précédente à faire)</span>
              ) : null}
            </span>
          );

          return (
            <li key={step.href}>
              {isLocked ? (
                <span className={rowClass} aria-disabled="true">
                  {marker}
                  {label}
                </span>
              ) : (
                <Link href={step.href} aria-current={isCurrent ? 'step' : undefined} className={rowClass}>
                  {marker}
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-[9px]">
        <p className="type-data text-xs tracking-label uppercase text-ink-muted">
          Mois de consultation
        </p>
        <MonthRibbon currentMonth={currentMonth} />
      </div>
    </>
  );
}
