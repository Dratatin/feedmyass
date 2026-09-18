import { Apple, Bean, Carrot, Droplets, Egg, Nut, Sprout, Wheat } from 'lucide-react';
import { familyOfCategory, type FoodFamily } from '@/lib/months';

/**
 * Pictogramme de famille d'aliment.
 *
 * Remplace les vignettes dessinées à la main de la première version: huit
 * dessins pour plusieurs centaines d'aliments donnaient un catalogue illustré au
 * hasard, où un produit avait son image et son voisin non (revue du
 * 2026-09-19). Le choix
 * retenu est « une icône par famille », prise dans une banque officielle plutôt
 * que redessinée.
 *
 * Source: Lucide (https://lucide.dev), licence ISC. Les icônes sont des tracés
 * au trait de 24×24 sans remplissage: elles prennent la couleur de leur famille
 * par `currentColor` et restent lisibles sur le fond sombre de la direction.
 *
 * Elles ne portent JAMAIS l'information seules: chaque emploi est accompagné du
 * nom de l'aliment ou de sa famille en toutes lettres (principe VI), d'où
 * `aria-hidden` partout.
 */

const ICONS = {
  legume: Carrot,
  fruit: Apple,
  cereale: Wheat,
  legumineuse: Bean,
  proteine: Egg,
  vegetal: Sprout,
  coque: Nut,
  grasse: Droplets,
  autre: Bean,
} as const satisfies Record<FoodFamily, unknown>;

const COLORS: Record<FoodFamily, string> = {
  legume: 'text-famille-legume',
  fruit: 'text-famille-fruit',
  cereale: 'text-famille-cereale',
  legumineuse: 'text-famille-legumineuse',
  proteine: 'text-famille-proteine',
  vegetal: 'text-famille-vegetal',
  coque: 'text-famille-coque',
  grasse: 'text-famille-grasse',
  autre: 'text-ink-muted',
};

export function FoodIcon({ family, size = 22 }: { family: FoodFamily; size?: number }) {
  const Icon = ICONS[family];
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={1.75}
      className={COLORS[family] + ' shrink-0'}
    />
  );
}

export function CategoryIcon({ category, size }: { category: string; size?: number }) {
  return <FoodIcon family={familyOfCategory(category)} size={size} />;
}
