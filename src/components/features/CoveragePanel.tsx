import { Badge } from '@/components/ds/Badge';
import { Card } from '@/components/ds/Card';
import { DataTable, type Column } from '@/components/ds/DataTable';
import type { CoverageEntry, PlanGap } from '@/domain/types';

/**
 * Détail de couverture et écarts (FR-015, FR-017).
 *
 * Chaque nutriment affiche le pourcentage atteint et le seuil qui lui est
 * applicable. Les nutriments sous leur seuil sont nommés, avec la raison: c'est
 * l'exigence de FR-017, et la contrepartie honnête d'une liste qui ne peut pas
 * tout couvrir.
 */

const REASON_LABELS: Record<PlanGap['reason'], string> = {
  diet_restriction: 'le régime déclaré ne donne pas accès à une source suffisante',
  seasonality_restriction: 'aucune source suffisante n\'est de saison ce mois-ci',
  no_source_available: 'aucun aliment du catalogue ne permet de le couvrir',
};

export function CoveragePanel({ coverage, gaps }: { coverage: CoverageEntry[]; gaps: PlanGap[] }) {
  const columns: Column<CoverageEntry>[] = [
    { key: 'label', header: 'Nutriment', render: (row) => row.label },
    {
      key: 'ratio',
      header: 'Couverture',
      align: 'right',
      render: (row) => Math.round(row.ratio * 100) + ' %',
    },
    {
      key: 'threshold',
      header: 'Seuil',
      align: 'right',
      render: (row) => Math.round(row.threshold * 100) + ' %',
    },
    {
      key: 'status',
      header: 'État',
      render: (row) => (
        <Badge tone={row.meetsThreshold ? 'success' : 'error'}>
          {row.meetsThreshold ? 'Atteint' : 'Sous le seuil'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      {gaps.length > 0 ? (
        <Card
          title={gaps.length === 1 ? 'Un nutriment reste sous son seuil' : gaps.length + ' nutriments restent sous leur seuil'}
          description="Cette liste ne les couvre pas entièrement. Voici lesquels et pourquoi."
        >
          <ul className="flex flex-col gap-2">
            {gaps.map((gap) => {
              const entry = coverage.find((c) => c.nutrient === gap.nutrient);
              return (
                <li key={gap.nutrient} className="text-sm text-neutral-700">
                  <span className="font-medium">{entry?.label ?? gap.nutrient}</span>
                  {' — '}
                  {Math.round((entry?.ratio ?? gap.ratio) * 100)} % des besoins couverts,{' '}
                  {REASON_LABELS[gap.reason]}.
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        rows={coverage}
        rowKey={(row) => row.nutrient}
        caption="Couverture atteinte par la liste, nutriment par nutriment."
      />
    </div>
  );
}
