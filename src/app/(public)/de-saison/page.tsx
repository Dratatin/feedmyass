import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonStyles } from '@/components/ds/Button';
import { MonthRibbon } from '@/components/ds/MonthRibbon';
import { FoodIcon } from '@/components/ds/FoodIcon';
import { monthName, seasonRangeLabel, shortFoodLabel } from '@/lib/months';
import foods from '@/data/reference/foods.json';
import seasonality from '@/data/reference/seasonality.json';

/**
 * Le calendrier de saison, écran public à part entière (FR-124).
 *
 * L'accueil promettait « voir ce qui est de saison » et menait à un écran qui
 * réclamait un profil; il a ensuite mené à huit produits en pied de page. Ni
 * l'un ni l'autre ne répondait vraiment: la question appelle la liste complète,
 * et la possibilité de regarder un autre mois.
 *
 * Aucun compte, aucun profil, aucun calcul: c'est une lecture directe de la
 * table de saisonnalité du projet (ADEME / Manger Bouger, France
 * métropolitaine), la même que celle qui filtre la liste d'ingrédients — ce que
 * cette page montre en septembre est exactement ce qui pourra y entrer.
 */

export const metadata: Metadata = {
  title: 'Fruits et légumes de saison — FeedMyAss',
  description:
    'Le calendrier des fruits et légumes de saison en France métropolitaine, mois par mois, avec ' +
    'leur période de disponibilité.',
};

type Produce = {
  code: string;
  label: string;
  months: number[];
};

/** Mois demandé, ramené à un mois valide: `?mois=17` n'existe pas. */
function resolveMonth(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(value) || value < 1 || value > 12) return new Date().getMonth() + 1;
  return value;
}

function produceOfMonth(month: number): { legumes: Produce[]; fruits: Produce[] } {
  const inSeason = new Set(
    seasonality.seasonality.filter((row) => row.month === month).map((row) => row.food_code),
  );

  const monthsByFood = new Map<string, number[]>();
  for (const row of seasonality.seasonality) {
    const months = monthsByFood.get(row.food_code);
    if (months) months.push(row.month);
    else monthsByFood.set(row.food_code, [row.month]);
  }

  const collect = (category: string): Produce[] =>
    foods.foods
      .filter((f) => f.is_fruit_vegetable && f.category === category && inSeason.has(f.code))
      .map((f) => {
        const label = shortFoodLabel(f.label);
        return {
          code: f.code,
          label,
          months: (monthsByFood.get(f.code) ?? []).sort((a, b) => a - b),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

  return { legumes: collect('legume'), fruits: collect('fruit') };
}

function ProduceGrid({ items, family, month }: {
  items: Produce[];
  family: 'legume' | 'fruit';
  /** Mois consulté: c'est lui que le ruban met en avant, pas le premier mois du produit. */
  month: number;
}) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
      {items.map((item) => (
        <li
          key={item.code}
          className="flex flex-col gap-3 rounded-[var(--radius-bloc)] border-[1.5px] border-solid border-line bg-surface px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <FoodIcon family={family} size={26} />
            <span className="flex flex-col gap-[2px]">
              <span className="text-sm font-semibold text-ink">{item.label}</span>
              <span className="type-data text-xs tracking-label uppercase text-ink-muted">
                {seasonRangeLabel(item.months)}
              </span>
            </span>
          </div>
          <MonthRibbon currentMonth={month} seasonMonths={item.months} size="sm" />
        </li>
      ))}
    </ul>
  );
}

export default async function SeasonPage({ searchParams }: PageProps<'/de-saison'>) {
  const params = await searchParams;
  const month = resolveMonth(params.mois);
  const { legumes, fruits } = produceOfMonth(month);
  const total = legumes.length + fruits.length;
  const isCurrentMonth = month === new Date().getMonth() + 1;

  return (
    <main className="flex w-full flex-1 flex-col">
      <div className="w-full border-b-[1.5px] border-solid border-line bg-paper-deep">
        <div className="mx-auto flex w-full max-w-page flex-col gap-5 px-4 py-9 md:px-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-display-md text-ink md:text-display-lg">
              De saison en {monthName(month)}
            </h1>
            <p className="max-w-[68ch] text-lg text-ink-soft">
              {total} fruits et légumes disponibles en France métropolitaine
              {isCurrentMonth ? ' ce mois-ci' : ''}. Ce sont exactement ceux que votre liste
              d&apos;ingrédients peut vous proposer{isCurrentMonth ? '' : ' à cette période'}.
            </p>
          </div>

          <div className="flex max-w-[520px] flex-col gap-[9px]">
            <p className="type-data text-xs tracking-label uppercase text-ink-muted">
              Regarder un autre mois
            </p>
            <MonthRibbon currentMonth={month} hrefOf={(m) => '/de-saison?mois=' + m} />
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        {total === 0 ? (
          <p className="text-md text-ink-soft">
            Aucun fruit ni légume du catalogue n&apos;est répertorié pour ce mois.
          </p>
        ) : null}

        {legumes.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-[10px] text-display-xs text-ink">
              <FoodIcon family="legume" size={24} />
              Légumes
              <span className="type-data text-xs font-normal tracking-label text-ink-muted">
                {legumes.length}
              </span>
            </h2>
            <ProduceGrid items={legumes} family="legume" month={month} />
          </section>
        ) : null}

        {fruits.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-[10px] text-display-xs text-ink">
              <FoodIcon family="fruit" size={24} />
              Fruits
              <span className="type-data text-xs font-normal tracking-label text-ink-muted">
                {fruits.length}
              </span>
            </h2>
            <ProduceGrid items={fruits} family="fruit" month={month} />
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 border-t-[1.5px] border-solid border-line pt-6">
          <Link href="/profil" className={buttonStyles({ size: 'lg' })}>
            Calculer mes besoins
          </Link>
          <p className="text-sm text-ink-soft">
            Vos besoins d&apos;abord, puis la liste d&apos;ingrédients qui les couvre avec ces
            produits.
          </p>
        </div>

        <p className="text-xs text-ink-muted">
          Source&nbsp;: {seasonality._meta.source} — version {seasonality._meta.version}, relevée le{' '}
          {new Date(seasonality._meta.retrieved_at).toLocaleDateString('fr-FR', {
            dateStyle: 'long',
          })}
          .
        </p>
      </div>
    </main>
  );
}
