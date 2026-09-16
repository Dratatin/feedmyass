import { Panel } from '@/components/ds/Panel';
import nutrients from '@/data/reference/nutrients.json';
import intakes from '@/data/reference/reference-intakes.json';
import foods from '@/data/reference/foods.json';
import seasonality from '@/data/reference/seasonality.json';
import energy from '@/data/reference/energy-equations.json';

/**
 * Fraîcheur et provenance des données de référence (FR-036, FR-038).
 *
 * Les données de référence sont embarquées dans l'application: aucun appel
 * réseau n'est nécessaire pour calculer, et l'indisponibilité d'un service tiers
 * ne rend rien inutilisable. En contrepartie, l'utilisateur doit pouvoir voir de
 * quand elles datent.
 */
const SOURCES = [
  { label: 'Besoins énergétiques', meta: energy._meta },
  { label: 'Apports de référence', meta: intakes._meta },
  { label: 'Composition des aliments', meta: foods._meta },
  { label: 'Saisonnalité', meta: seasonality._meta },
  { label: 'Référentiel des nutriments', meta: nutrients._meta },
];

export function DataFreshness() {
  return (
    <Panel
      title="D'où viennent ces chiffres"
      description="Les données de référence sont embarquées dans l'application: le calcul ne dépend d'aucun service extérieur."
    >
      <ul className="flex flex-col gap-[10px]">
        {SOURCES.map(({ label, meta }) => (
          <li
            key={label}
            className="flex flex-col gap-[1px] border-b border-solid border-line-soft pb-[9px] last:border-b-0 last:pb-0"
          >
            <span className="text-sm font-semibold text-ink">{label}</span>
            <span className="text-sm text-ink-soft">{meta.source}</span>
            <span className="type-data text-xs text-ink-muted">
              Version {meta.version} — relevée le{' '}
              {new Date(meta.retrieved_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
