'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ds/Badge';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { DataTable, type Column } from '@/components/ds/DataTable';
import { DisclaimerBanner } from '@/components/features/DisclaimerBanner';
import { getNeedsServerSnapshot, getNeedsSnapshot, subscribeNeeds, type StoredNeeds } from '@/lib/needs-session';
import type { NeedValue, Period } from '@/domain/types';

/**
 * Écran des besoins nutritionnels (FR-005, FR-006, FR-009, FR-010).
 *
 * Chaque nutriment est affiché avec sa valeur, son unité, la nature de la
 * référence utilisée (RNP, AS ou BEM) et sa source, comme l'exige FR-009. La
 * bascule jour/semaine matérialise FR-006.
 */

const PERIOD_LABELS: Record<Period, string> = { day: 'Par jour', week: 'Par semaine' };

function formatValue(need: NeedValue): string {
  const round = (v: number) => (v >= 100 ? Math.round(v) : Math.round(v * 100) / 100);
  const base = round(need.value).toLocaleString('fr-FR');
  if (need.valueMax === undefined) return base;
  return base + ' à ' + round(need.valueMax).toLocaleString('fr-FR');
}

export default function NeedsPage() {
  // Lecture d'une source hors React: useSyncExternalStore évite les rendus en
  // cascade d'un setState dans un effet, et gère le rendu serveur.
  const stored: StoredNeeds | null = useSyncExternalStore(
    subscribeNeeds,
    getNeedsSnapshot,
    getNeedsServerSnapshot,
  );
  const [period, setPeriod] = useState<Period>('day');

  if (stored === null) {
    return (
      <main className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 py-10">
        <h1 className="text-display-xs font-semibold text-neutral-900">Aucun résultat</h1>
        <p className="text-md text-neutral-600">
          Renseignez votre profil pour obtenir vos besoins nutritionnels.
        </p>
        <Link href="/profil">
          <Button size="lg">Renseigner mon profil</Button>
        </Link>
      </main>
    );
  }

  const rows = period === 'day' ? stored.needs.daily : stored.needs.weekly;

  const columns: Column<NeedValue>[] = [
    { key: 'label', header: 'Nutriment', render: (row) => row.label },
    { key: 'value', header: 'Besoin', align: 'right', render: (row) => formatValue(row) + ' ' + row.unit },
    {
      key: 'kind',
      header: 'Référence',
      render: (row) => (
        <span className="flex flex-col gap-1">
          <span className="font-medium text-neutral-700">{row.kind}</span>
          <span className="text-xs text-neutral-500">{row.reference.source.slice(0, 60)}</span>
        </span>
      ),
    },
  ];

  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-xs font-semibold text-neutral-900">Vos besoins nutritionnels</h1>
        <p className="text-sm text-neutral-600">Profil&nbsp;: {stored.profileSummary}</p>
      </header>

      <DisclaimerBanner />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Période">
        {(['day', 'week'] as Period[]).map((value) => (
          <Button
            key={value}
            hierarchy={period === value ? 'primary' : 'secondary-gray'}
            aria-pressed={period === value}
            onClick={() => setPeriod(value)}
          >
            {PERIOD_LABELS[value]}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.nutrient}
        caption={
          PERIOD_LABELS[period] +
          '. RNP: référence nutritionnelle pour la population. AS: apport satisfaisant. ' +
          'BEM: besoin énergétique moyen.'
        }
      />

      {stored.needs.missingReferences.length > 0 ? (
        <Card title="Nutriments sans référence disponible">
          <p className="text-sm text-neutral-600">
            Aucune référence officielle applicable n&apos;a été trouvée pour&nbsp;:{' '}
            {stored.needs.missingReferences.join(', ')}. Ces nutriments ne sont pas estimés plutôt
            que de l&apos;être à partir d&apos;une valeur non sourcée.
          </p>
        </Card>
      ) : null}

      <Card title="Traçabilité">
        <p className="text-sm text-neutral-600">
          Versions des données de référence utilisées pour ce résultat&nbsp;:
        </p>
        <ul className="flex flex-wrap gap-2">
          {Object.entries(stored.needs.referenceVersions).map(([key, version]) => (
            <li key={key}>
              <Badge tone="success">{key}&nbsp;: {version}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Link href="/profil">
        <Button hierarchy="secondary-gray">Modifier mon profil</Button>
      </Link>
    </main>
  );
}
