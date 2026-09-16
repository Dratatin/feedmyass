'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { buttonStyles } from '@/components/ds/Button';
import { KeyFigures } from '@/components/ds/KeyFigures';
import { PageShell } from '@/components/ds/PageShell';
import { Register, type Column } from '@/components/ds/Register';
import { DataFreshness } from '@/components/features/DataFreshness';
import { DisclaimerBanner } from '@/components/features/DisclaimerBanner';
import { SaveResultButton } from '@/components/features/SaveResultButton';
import { StepRail } from '@/components/features/StepRail';
import { getNeedsServerSnapshot, getNeedsSnapshot, subscribeNeeds, type StoredNeeds } from '@/lib/needs-session';
import type { NeedValue, Period } from '@/domain/types';

/**
 * Écran des besoins nutritionnels (FR-005, FR-006, FR-009, FR-010).
 *
 * Chaque nutriment est affiché avec sa valeur, son unité, la nature de la
 * référence utilisée (RNP, AS ou BEM) et sa source, comme l'exige FR-009. La
 * bascule jour/semaine matérialise FR-006.
 *
 * Les trois chiffres clés en tête donnent un point d'entrée à un tableau de 26
 * lignes (FR-108 de la 002): sans eux, l'utilisateur lit tout ou ne lit rien.
 * L'énergie garde son fond myrtille jusque dans le registre — c'est la valeur
 * dont toutes les autres dépendent.
 */

const PERIOD_LABELS: Record<Period, string> = { day: 'Par jour', week: 'Par semaine' };

function round(value: number): number {
  return value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
}

function formatValue(need: NeedValue): string {
  const base = round(need.value).toLocaleString('fr-FR');
  if (need.valueMax === undefined) return base;
  return base + ' à ' + round(need.valueMax).toLocaleString('fr-FR');
}

/**
 * Organisme émetteur d'une référence.
 *
 * Les sources complètes font trois lignes et se répètent à l'identique sur 26
 * lignes; couper à la soixantième lettre produisait « ... en vitamines et
 * minér ». Seul l'émetteur est affiché ici, la source intégrale restant lisible
 * dans « D'où viennent ces chiffres » plus bas (FR-009, FR-038).
 */
function issuer(source: string): string {
  return (source.split(/\s—\s|,\s/)[0] ?? source).trim();
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
      <PageShell>
        <h1 className="text-display-sm text-ink">Aucun résultat</h1>
        <p className="text-md text-ink-soft">
          Renseignez votre profil pour obtenir vos besoins nutritionnels.
        </p>
        <div>
          <Link href="/profil" className={buttonStyles({ size: 'lg' })}>
            Renseigner mon profil
          </Link>
        </div>
      </PageShell>
    );
  }

  const rows = period === 'day' ? stored.needs.daily : stored.needs.weekly;
  const figureOf = (code: string) => rows.find((row) => row.nutrient === code);
  const energy = figureOf('energy');
  const protein = figureOf('protein');
  const suffix = period === 'day' ? '/j' : '/sem.';

  const columns: Column<NeedValue>[] = [
    {
      key: 'label',
      header: 'Nutriment',
      render: (row) => <span className="font-semibold">{row.label}</span>,
    },
    {
      key: 'value',
      header: 'Besoin',
      align: 'right',
      render: (row) => (
        <span className="type-data whitespace-nowrap">
          {formatValue(row)}
          <span className="ml-1 text-xs text-ink-muted">{row.unit}</span>
        </span>
      ),
    },
    {
      key: 'kind',
      header: 'Référence',
      render: (row) => (
        <span className="flex flex-col gap-[3px]">
          <span
            className={
              'type-data inline-flex w-fit rounded-full border-[1.5px] border-solid px-2 text-xs tracking-label ' +
              (row.kind === 'BEM'
                ? 'border-brand bg-brand-wash text-brand'
                : 'border-line-strong text-ink-soft')
            }
          >
            {row.kind}
          </span>
          <span className="text-xs text-ink-muted">
            {issuer(row.reference.source)} · {row.reference.version}
          </span>
        </span>
      ),
    },
  ];

  return (
    <PageShell rail={<StepRail current={2} currentMonth={new Date().getMonth() + 1} />}>
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm text-ink">Vos besoins nutritionnels</h1>
        <p className="type-data text-xs text-ink-muted">Profil&nbsp;: {stored.profileSummary}</p>
      </header>

      <DisclaimerBanner />

      {energy ? (
        <KeyFigures
          figures={[
            {
              label: 'Énergie',
              value: round(energy.value).toLocaleString('fr-FR'),
              unit: energy.unit + suffix,
              emphasis: true,
            },
            ...(protein
              ? [
                  {
                    label: 'Protéines',
                    value: round(protein.value).toLocaleString('fr-FR'),
                    unit: protein.unit + suffix,
                  },
                ]
              : []),
            {
              label: 'Nutriments suivis',
              value: String(rows.length),
              unit: 'références',
            },
          ]}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex overflow-hidden rounded-full border-[1.5px] border-solid border-line-strong bg-surface"
          role="group"
          aria-label="Période"
        >
          {(['day', 'week'] as Period[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={
                'type-data px-[18px] py-[8px] text-xs tracking-label uppercase ' +
                (period === value
                  ? 'bg-ink font-semibold text-paper'
                  : 'text-ink-soft hover:bg-brand-wash')
              }
            >
              {PERIOD_LABELS[value]}
            </button>
          ))}
        </div>

        <p className="flex flex-wrap gap-x-[18px] gap-y-1 text-xs text-ink-soft">
          <span>
            <span className="type-data font-medium text-ink">RNP</span> référence pour la population
          </span>
          <span>
            <span className="type-data font-medium text-ink">AS</span> apport satisfaisant
          </span>
          <span>
            <span className="type-data font-medium text-ink">BEM</span> besoin énergétique moyen
          </span>
        </p>
      </div>

      <Register
        columns={columns}
        rows={rows}
        rowKey={(row) => row.nutrient}
        highlightKey="energy"
        caption={
          PERIOD_LABELS[period] +
          '. RNP: référence nutritionnelle pour la population. AS: apport satisfaisant. ' +
          'BEM: besoin énergétique moyen.'
        }
      />

      {stored.needs.missingReferences.length > 0 ? (
        <p className="max-w-[72ch] text-sm text-ink-soft">
          Aucune référence officielle applicable n&apos;a été trouvée pour&nbsp;:{' '}
          {stored.needs.missingReferences.join(', ')}. Ces nutriments ne sont pas estimés plutôt que
          de l&apos;être à partir d&apos;une valeur non sourcée.
        </p>
      ) : null}

      <SaveResultButton profile={stored.profile} period={period} />

      <div className="flex flex-wrap gap-[10px]">
        <Link href="/liste" className={buttonStyles({ size: 'lg' })}>
          Obtenir ma liste d&apos;ingrédients
        </Link>
        <Link href="/profil" className={buttonStyles({ hierarchy: 'secondary', size: 'lg' })}>
          Modifier mon profil
        </Link>
      </div>

      <DataFreshness />
    </PageShell>
  );
}
