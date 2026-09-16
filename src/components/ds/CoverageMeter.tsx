import { cn } from '@/lib/cn';

/**
 * Jauge de couverture, avec le seuil dessiné sur l'échelle.
 *
 * Les seuils ne sont pas les mêmes d'un nutriment à l'autre (100 % pour
 * l'énergie, les protéines et les micronutriments prioritaires, 80 % sinon,
 * FR-016). Une jauge sans son seuil serait donc illisible: 88 % peut être un
 * succès ou un écart selon la ligne. Le trait d'encre marque la position réelle
 * du seuil applicable (FR-110).
 *
 * La jauge est décorative au sens des lecteurs d'écran: le pourcentage et
 * l'état sont écrits en toutes lettres dans les cellules voisines, la couleur
 * n'est jamais le seul indice (FR-104).
 */
export function CoverageMeter({ ratio, threshold, meetsThreshold }: {
  /** Couverture atteinte, 1 valant 100 %. Peut dépasser 1. */
  ratio: number;
  /** Seuil applicable, 0,8 ou 1. */
  threshold: number;
  meetsThreshold: boolean;
}) {
  const width = Math.min(Math.max(ratio, 0), 1) * 100;
  const tick = Math.min(Math.max(threshold, 0), 1) * 100;

  return (
    <span
      aria-hidden="true"
      className="relative block h-[8px] w-full min-w-[94px] rounded-full bg-line-soft"
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 rounded-full',
          meetsThreshold ? 'bg-saison' : 'bg-miel',
        )}
        style={{ width: width + '%' }}
      />
      <span
        className="absolute -top-[3px] -bottom-[3px] w-[1.5px] rounded-[2px] bg-ink"
        style={{ left: tick + '%' }}
      />
    </span>
  );
}
