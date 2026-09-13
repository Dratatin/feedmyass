'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ds/Badge';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { DataTable, type Column } from '@/components/ds/DataTable';
import { SelectField } from '@/components/ds/SelectField';
import { CoveragePanel } from '@/components/features/CoveragePanel';
import { DisclaimerBanner } from '@/components/features/DisclaimerBanner';
import { getNeedsServerSnapshot, getNeedsSnapshot, subscribeNeeds, type StoredNeeds } from '@/lib/needs-session';
import type { DietBase, Exclusion, IngredientPlan, IngredientPlanItem, Period } from '@/domain/types';

/**
 * Écran de la liste d'ingrédients (FR-012 à FR-018).
 *
 * Le régime est demandé ICI et pas sur l'écran de profil: il ne sert qu'à
 * choisir les aliments et n'a jamais touché au calcul des besoins (principe III).
 */

const DIET_BASES: { value: DietBase; label: string }[] = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'pescetarian', label: 'Pescétarien' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Végane' },
];

const EXCLUSIONS: { value: Exclusion; label: string }[] = [
  { value: 'gluten', label: 'Sans gluten' },
  { value: 'lactose', label: 'Sans lactose' },
  { value: 'nuts', label: 'Sans fruits à coque' },
];

const CATEGORY_LABELS: Record<string, string> = {
  legume: 'Légumes', fruit: 'Fruits', legumineuse: 'Légumineuses', cereale: 'Céréales',
  viande: 'Viandes', poisson: 'Poissons', oeuf: 'Œufs', produit_laitier: 'Produits laitiers',
  matiere_grasse: 'Matières grasses', fruit_a_coque: 'Fruits à coque', autre: 'Autres',
};

export default function IngredientListPage() {
  const stored: StoredNeeds | null = useSyncExternalStore(
    subscribeNeeds,
    getNeedsSnapshot,
    getNeedsServerSnapshot,
  );

  const [base, setBase] = useState<DietBase>('omnivore');
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [period, setPeriod] = useState<Period>('day');
  const [plan, setPlan] = useState<IngredientPlan | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (stored === null) {
    return (
      <main className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 py-10">
        <h1 className="text-display-xs font-semibold text-neutral-900">Aucun profil</h1>
        <p className="text-md text-neutral-600">
          La liste d&apos;ingrédients se construit à partir de vos besoins. Renseignez d&apos;abord
          votre profil.
        </p>
        <Link href="/profil"><Button size="lg">Renseigner mon profil</Button></Link>
      </main>
    );
  }

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile: stored!.profile, diet: { base, exclusions }, period }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? 'La liste n\'a pas pu être générée.');
        return;
      }
      setPlan(body as IngredientPlan);
    } catch {
      setError("La liste n'a pas pu être générée. Vérifiez votre connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  const columns: Column<IngredientPlanItem>[] = [
    {
      key: 'label',
      header: 'Ingrédient',
      render: (row) => (
        <span className="flex flex-col gap-1">
          <span>{row.label}</span>
          {row.isFortified ? <span><Badge tone="success">Aliment enrichi</Badge></span> : null}
        </span>
      ),
    },
    { key: 'category', header: 'Catégorie', render: (row) => CATEGORY_LABELS[row.category] ?? row.category },
    {
      key: 'quantity',
      header: 'Quantité',
      align: 'right',
      render: (row) => (
        <span className="flex flex-col gap-1">
          <span>{row.displayQuantity.value} × {row.displayQuantity.unit}</span>
          <span className="text-xs text-neutral-500">{row.quantityG} g</span>
        </span>
      ),
    },
  ];

  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-xs font-semibold text-neutral-900">Votre liste d&apos;ingrédients</h1>
        <p className="text-sm text-neutral-600">Profil&nbsp;: {stored.profileSummary}</p>
      </header>

      <DisclaimerBanner />

      <Card title="Votre régime alimentaire" description="Il détermine les ingrédients proposés, jamais vos besoins.">
        <SelectField
          label="Régime de base" value={base}
          onChange={(e) => setBase(e.target.value as DietBase)}
        >
          {DIET_BASES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </SelectField>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-neutral-700">Exclusions</legend>
          {EXCLUSIONS.map((exclusion) => (
            <label key={exclusion.value} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={exclusions.includes(exclusion.value)}
                onChange={(e) =>
                  setExclusions((current) =>
                    e.target.checked
                      ? [...current, exclusion.value]
                      : current.filter((v) => v !== exclusion.value),
                  )
                }
              />
              {exclusion.label}
            </label>
          ))}
        </fieldset>

        <SelectField
          label="Période" value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="day">Pour la journée</option>
          <option value="week">Pour la semaine</option>
        </SelectField>

        <Button size="lg" onClick={generate} disabled={pending}>
          {pending ? 'Génération en cours…' : 'Générer ma liste'}
        </Button>
        {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
      </Card>

      {plan ? (
        <>
          <Card
            title={'Liste ' + (plan.period === 'day' ? 'pour la journée' : 'pour la semaine')}
            description={
              plan.items.length + ' ingrédients. Les fruits et légumes proposés sont de saison à la ' +
              'date de génération.'
            }
          >
            <DataTable columns={columns} rows={plan.items} rowKey={(row) => row.foodCode} />
          </Card>

          <CoveragePanel coverage={plan.coverage} gaps={plan.gaps} />
        </>
      ) : null}

      <Link href="/besoins"><Button hierarchy="secondary-gray">Revoir mes besoins</Button></Link>
    </main>
  );
}
