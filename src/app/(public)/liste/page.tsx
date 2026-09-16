'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Button, buttonStyles } from '@/components/ds/Button';
import { CheckboxField } from '@/components/ds/CheckboxField';
import { CategoryDot, FamilyDot } from '@/components/ds/FamilyDot';
import { MonthRibbon } from '@/components/ds/MonthRibbon';
import { Notice } from '@/components/ds/Notice';
import { PageShell } from '@/components/ds/PageShell';
import { Pill } from '@/components/ds/Pill';
import { Register, type Column } from '@/components/ds/Register';
import { SelectField } from '@/components/ds/SelectField';
import { CoveragePanel } from '@/components/features/CoveragePanel';
import { DietChangeNotice } from '@/components/features/DietChangeNotice';
import { DataFreshness } from '@/components/features/DataFreshness';
import { DisclaimerBanner } from '@/components/features/DisclaimerBanner';
import { SaveResultButton } from '@/components/features/SaveResultButton';
import { StepRail } from '@/components/features/StepRail';
import { getNeedsServerSnapshot, getNeedsSnapshot, subscribeNeeds, type StoredNeeds } from '@/lib/needs-session';
import { CATEGORY_GROUP_LABELS, FAMILY_LABELS, familyOfCategory, type FoodFamily } from '@/lib/months';
import type { DietBase, Exclusion, IngredientPlan, IngredientPlanItem, Period } from '@/domain/types';

/**
 * Écran de la liste d'ingrédients (FR-012 à FR-018).
 *
 * Le régime est demandé ICI et pas sur l'écran de profil: il ne sert qu'à
 * choisir les aliments et n'a jamais touché au calcul des besoins (principe
 * III). Les commandes vivent dans le rail, à côté du ruban des mois: ce sont
 * les deux choses qui décident du contenu de la liste.
 *
 * Chaque fruit ou légume porte son propre ruban de saison (FR-107 de la 002).
 * Les autres aliments portent la mention « toute l'année »: un ruban vide ne
 * voudrait rien dire.
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
  // Régime de la liste précédente, pour signaler un changement (US4).
  const [previousBase, setPreviousBase] = useState<DietBase | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().getMonth() + 1;

  if (stored === null) {
    // L'état vide garde le rail: perdre la navigation du parcours au moment
    // précis où l'on ne sait pas où l'on est serait le pire moment pour la
    // retirer (constat du parcours à la main, 2026-09-18).
    return (
      <PageShell rail={<StepRail current={3} currentMonth={currentMonth} />}>
        <h1 className="text-display-sm text-ink">Encore une étape</h1>
        <p className="max-w-[62ch] text-md text-ink-soft">
          La liste d&apos;ingrédients se construit à partir de vos besoins, et vos besoins se
          calculent à partir de votre profil. Comptez une dizaine de secondes.
        </p>
        <div>
          <Link href="/profil" className={buttonStyles({ size: 'lg' })}>
            Renseigner mon profil
          </Link>
        </div>
      </PageShell>
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
      setPreviousBase(plan ? plan.diet.base : null);
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
        <span className="flex items-baseline gap-[7px]">
          <CategoryDot category={row.category} />
          <span className="flex flex-col gap-[2px]">
            <span className="font-semibold">{row.label}</span>
            {row.isFortified ? (
              // FR-018: un aliment enrichi doit être identifié comme tel.
              <span className="text-xs text-ink-muted">aliment enrichi</span>
            ) : null}
          </span>
        </span>
      ),
    },
    {
      // Colonne à part entière, et pas seulement la sous-ligne de l'ingrédient:
      // c'est la catégorie qui prouve qu'aucun aliment incompatible avec le
      // régime n'est proposé (FR-013), et elle doit être lisible telle quelle.
      key: 'category',
      header: 'Catégorie',
      render: (row) => CATEGORY_GROUP_LABELS[row.category] ?? row.category,
    },
    {
      key: 'season',
      header: 'Saison',
      render: (row) =>
        row.seasonMonths && row.seasonMonths.length > 0 ? (
          <span className="block min-w-[156px]">
            <MonthRibbon
              currentMonth={currentMonth}
              seasonMonths={row.seasonMonths}
              size="sm"
            />
          </span>
        ) : (
          <Pill>toute l&apos;année</Pill>
        ),
    },
    {
      key: 'quantity',
      header: 'Quantité',
      align: 'right',
      render: (row) => (
        <span className="type-data flex flex-col gap-[2px] whitespace-nowrap">
          <span>
            {row.displayQuantity.value} × {row.displayQuantity.unit}
          </span>
          <span className="text-xs text-ink-muted">{row.quantityG} g</span>
        </span>
      ),
    },
  ];

  // Familles réellement présentes: une légende qui annoncerait sept couleurs
  // pour trois familles affichées serait du bruit.
  const families: FoodFamily[] = plan
    ? [...new Set(plan.items.map((item) => familyOfCategory(item.category)))]
    : [];

  /**
   * La liste affichée ne correspond plus aux commandes du rail.
   *
   * Constat du parcours à la main (2026-09-18): passer la période à « semaine »
   * laissait à l'écran une liste titrée « pour la journée », sans rien qui
   * signale qu'elle était périmée. La régénération n'est pas automatique — le
   * solveur tourne pendant une seconde et l'utilisateur coche souvent plusieurs
   * exclusions d'affilée — mais l'écart, lui, doit se voir.
   */
  const stale =
    plan !== null &&
    (plan.diet.base !== base ||
      plan.period !== period ||
      plan.diet.exclusions.length !== exclusions.length ||
      !plan.diet.exclusions.every((e) => exclusions.includes(e)));

  return (
    <PageShell
      rail={
        <>
          <StepRail current={3} currentMonth={currentMonth} />

          <div className="flex flex-col gap-3">
            <SelectField
              label="Régime de base"
              value={base}
              onChange={(e) => setBase(e.target.value as DietBase)}
            >
              {DIET_BASES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </SelectField>

            <fieldset className="flex flex-col gap-2 border-0 p-0">
              <legend className="type-data pb-1 text-xs tracking-label uppercase text-ink-muted">
                Exclusions
              </legend>
              {EXCLUSIONS.map((exclusion) => (
                <CheckboxField
                  key={exclusion.value}
                  label={exclusion.label}
                  checked={exclusions.includes(exclusion.value)}
                  onChange={(e) =>
                    setExclusions((current) =>
                      e.target.checked
                        ? [...current, exclusion.value]
                        : current.filter((v) => v !== exclusion.value),
                    )
                  }
                />
              ))}
            </fieldset>

            <SelectField
              label="Période"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              <option value="day">Pour la journée</option>
              <option value="week">Pour la semaine</option>
            </SelectField>

            <Button className="w-full" onClick={generate} disabled={pending}>
              {pending ? 'Génération en cours…' : 'Générer ma liste'}
            </Button>
            {error ? (
              <p role="alert" className="text-sm font-semibold text-framboise">
                {error}
              </p>
            ) : null}
          </div>
        </>
      }
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm text-ink">Votre liste d&apos;ingrédients</h1>
        <p className="type-data text-xs text-ink-muted">Profil&nbsp;: {stored.profileSummary}</p>
      </header>

      <DisclaimerBanner />

      {plan && previousBase && previousBase !== plan.diet.base ? (
        <DietChangeNotice
          previousDiet={DIET_BASES.find((d) => d.value === previousBase)?.label ?? previousBase}
          currentDiet={DIET_BASES.find((d) => d.value === plan.diet.base)?.label ?? plan.diet.base}
        />
      ) : null}

      {stale ? (
        <Notice tone="caution" title="Cette liste ne correspond plus à votre sélection">
          Vous avez changé de régime ou de période depuis la dernière génération. Cliquez sur
          «&nbsp;Générer ma liste&nbsp;» pour la mettre à jour.
        </Notice>
      ) : null}

      {plan ? (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-display-xs text-ink">
              {'Liste ' + (plan.period === 'day' ? 'pour la journée' : 'pour la semaine')}
            </h2>
            <p className="max-w-[72ch] text-sm text-ink-soft">
              {'Régime : ' +
                (DIET_BASES.find((d) => d.value === plan.diet.base)?.label ?? plan.diet.base) +
                (plan.diet.exclusions.length ? ' (' + plan.diet.exclusions.join(', ') + ')' : '') +
                ' — ' +
                plan.items.length +
                ' ingrédients ' +
                (plan.period === 'day' ? 'pour la journée' : 'pour la semaine') +
                '. Les fruits et légumes proposés sont de saison à la date de génération.'}
            </p>

            {families.length > 0 ? (
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                {families.map((family) => (
                  <span key={family} className="inline-flex items-center gap-[6px]">
                    <FamilyDot family={family} />
                    {FAMILY_LABELS[family]}
                  </span>
                ))}
              </p>
            ) : null}

            <Register
              columns={columns}
              rows={plan.items}
              rowKey={(row) => row.foodCode}
              caption={
                'Liste ' +
                (plan.period === 'day' ? 'pour la journée' : 'pour la semaine') +
                '. Le ruban indique les mois de disponibilité de chaque fruit ou légume.'
              }
            />
          </div>

          <CoveragePanel coverage={plan.coverage} gaps={plan.gaps} />

          <SaveResultButton profile={stored.profile} diet={{ base, exclusions }} period={plan.period} />

          <DataFreshness />
        </>
      ) : (
        <p className="max-w-[62ch] text-md text-ink-soft">
          Choisissez votre régime dans le panneau de gauche, puis générez la liste. Elle ne
          proposera que des fruits et légumes disponibles ce mois-ci.
        </p>
      )}

      <div>
        <Link href="/besoins" className={buttonStyles({ hierarchy: 'secondary' })}>
          Revoir mes besoins
        </Link>
      </div>
    </PageShell>
  );
}
