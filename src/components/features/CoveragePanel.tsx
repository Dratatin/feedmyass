import { CoverageMeter } from '@/components/ds/CoverageMeter';
import { Panel } from '@/components/ds/Panel';
import { Pill } from '@/components/ds/Pill';
import { Register, type Column } from '@/components/ds/Register';
import type { CoverageEntry, PlanGap } from '@/domain/types';

/**
 * Détail de couverture et écarts (FR-015, FR-017).
 *
 * Chaque nutriment affiche sa jauge, le pourcentage atteint et le seuil qui lui
 * est applicable. Les seuils diffèrent d'une ligne à l'autre (100 % pour
 * l'énergie, les protéines et les micronutriments prioritaires, 80 % sinon):
 * le trait d'encre sur la jauge est donc indispensable pour que 88 % se lise
 * comme un succès ou comme un écart.
 *
 * Les nutriments sous leur seuil sont nommés, avec la raison: c'est l'exigence
 * de FR-017, et la contrepartie honnête d'une liste qui ne peut pas tout
 * couvrir.
 */

const REASON_LABELS: Record<PlanGap['reason'], string> = {
  diet_restriction: 'le régime déclaré ne donne pas accès à une source suffisante',
  seasonality_restriction: 'aucune source suffisante n\'est de saison ce mois-ci',
  no_source_available: 'aucun aliment du catalogue ne permet de le couvrir',
};

export function CoveragePanel({ coverage, gaps }: { coverage: CoverageEntry[]; gaps: PlanGap[] }) {
  const columns: Column<CoverageEntry>[] = [
    { key: 'label', header: 'Nutriment', render: (row) => <span className="font-semibold">{row.label}</span> },
    {
      key: 'meter',
      header: 'Couverture',
      render: (row) => (
        <span className="grid min-w-[168px] grid-cols-[1fr_auto] items-center gap-[11px]">
          <CoverageMeter
            ratio={row.ratio}
            threshold={row.threshold}
            meetsThreshold={row.meetsThreshold}
          />
          <span className="type-data text-sm">{Math.round(row.ratio * 100)} %</span>
        </span>
      ),
    },
    {
      key: 'threshold',
      header: 'Seuil',
      align: 'right',
      render: (row) => <span className="type-data">{Math.round(row.threshold * 100)} %</span>,
    },
    {
      key: 'status',
      header: 'État',
      render: (row) => (
        <Pill tone={row.meetsThreshold ? 'saison' : 'under'}>
          {row.meetsThreshold ? 'atteint' : 'sous le seuil'}
        </Pill>
      ),
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      {gaps.length > 0 ? (
        <Panel
          title={
            gaps.length === 1
              ? 'Un nutriment reste sous son seuil'
              : gaps.length + ' nutriments restent sous leur seuil'
          }
          description="Cette liste ne les couvre pas entièrement. Voici lesquels et pourquoi."
        >
          <ul className="flex flex-col gap-[9px]">
            {gaps.map((gap) => {
              const entry = coverage.find((c) => c.nutrient === gap.nutrient);
              return (
                <li key={gap.nutrient} className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">{entry?.label ?? gap.nutrient}</span>
                  {' — '}
                  {Math.round((entry?.ratio ?? gap.ratio) * 100)} % des besoins couverts,{' '}
                  {REASON_LABELS[gap.reason]}.
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Register
        columns={columns}
        rows={coverage}
        rowKey={(row) => row.nutrient}
        caption="Couverture atteinte par la liste, nutriment par nutriment. Le trait marque le seuil applicable."
      />
    </div>
  );
}
