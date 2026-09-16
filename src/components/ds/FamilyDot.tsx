import { cn } from '@/lib/cn';
import { familyOfCategory, type FoodFamily } from '@/lib/months';

/**
 * Pastille de famille d'aliment.
 *
 * La couleur ne porte JAMAIS seule l'information (principe VI): la pastille est
 * toujours accompagnée du nom de la famille, soit à côté d'elle, soit sur la
 * sous-ligne de l'ingrédient, soit dans la légende qui précède le tableau. Elle
 * accélère la lecture, elle ne la remplace pas.
 */

const familyClasses: Record<FoodFamily, string> = {
  legume: 'bg-famille-legume',
  fruit: 'bg-famille-fruit',
  cereale: 'bg-famille-cereale',
  legumineuse: 'bg-famille-legumineuse',
  proteine: 'bg-famille-proteine',
  coque: 'bg-famille-coque',
  grasse: 'bg-famille-grasse',
  autre: 'bg-ink-muted',
};

export function FamilyDot({ family }: { family: FoodFamily }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-[9px] shrink-0 rounded-full', familyClasses[family])}
    />
  );
}

export function CategoryDot({ category }: { category: string }) {
  return <FamilyDot family={familyOfCategory(category)} />;
}
