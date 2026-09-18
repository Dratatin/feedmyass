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

/**
 * Deux natures d'écart, et elles n'appellent pas du tout la même phrase.
 *
 * Un écart de SAISON se referme tout seul: le même régime couvrira le nutriment
 * dans trois mois. Il n'y a rien à faire, sinon revenir.
 *
 * Un écart de RÉGIME ou d'absence de source, lui, ne se referme pas: aucune
 * assiette compatible ne peut atteindre le besoin, quelle que soit la
 * combinaison. Le taire serait malhonnête — la personne croirait qu'il suffit de
 * mieux manger. Le dire l'est, à condition de rester dans le registre de
 * l'information: on constate que l'alimentation seule n'y suffira probablement
 * pas, et on renvoie vers un professionnel de santé. Pas de posologie, pas de
 * produit nommé, aucune prescription (principe IV).
 */
const STRUCTURAL_REASONS: PlanGap['reason'][] = ['diet_restriction', 'no_source_available'];

export function CoveragePanel({ coverage, gaps }: { coverage: CoverageEntry[]; gaps: PlanGap[] }) {
  const structurels = gaps
    .filter((gap) => STRUCTURAL_REASONS.includes(gap.reason))
    .map((gap) => coverage.find((c) => c.nutrient === gap.nutrient)?.label ?? gap.nutrient);

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

          {structurels.length > 0 ? (
            <p className="mt-4 border-t-[1.5px] border-solid border-line pt-4 text-sm text-ink-soft">
              Pour <span className="font-semibold text-ink">{structurels.join(', ')}</span>, aucune
              combinaison d&apos;aliments compatibles avec ce régime n&apos;atteint le besoin :
              ce n&apos;est pas une question de mieux composer ses repas. Un complément alimentaire
              sera probablement nécessaire, et c&apos;est un point à voir avec un professionnel de
              santé, qui pourra en juger au vu de votre situation.
            </p>
          ) : null}
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
