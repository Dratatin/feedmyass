import Link from 'next/link';
import { buttonStyles } from '@/components/ds/Button';
import { MonthRibbon } from '@/components/ds/MonthRibbon';
import { FoodIcon } from '@/components/ds/FoodIcon';
import { monthName, seasonRangeLabel, shortFoodLabel } from '@/lib/months';
import foods from '@/data/reference/foods.json';
import seasonality from '@/data/reference/seasonality.json';
import nutrients from '@/data/reference/nutrients.json';

/**
 * Accueil. Écran d'entrée du parcours public: le calcul des besoins et la liste
 * d'ingrédients sont accessibles sans compte (FR-024).
 *
 * L'ardoise du marché porte le mois en cours et le ruban des douze mois: le
 * visiteur voit avant toute chose que la réponse dépend de la date (FR-106).
 * L'étal en dessous affiche de vrais produits de saison, lus dans la table du
 * projet — pas une liste écrite à la main qui mentirait en février.
 */

/**
 * Huit produits de saison ce mois-ci, lus dans la table du projet.
 *
 * Les produits illustrés passent devant, et fruits et légumes sont mélangés à
 * parts égales: sans cela, l'ordre alphabétique du catalogue donne un étal de
 * huit fruits, ce qui est joli et faux.
 */
function seasonalStall(month: number) {
  const inSeason = new Set(
    seasonality.seasonality.filter((row) => row.month === month).map((row) => row.food_code),
  );

  const monthsOf = (code: string) =>
    seasonality.seasonality.filter((row) => row.food_code === code).map((row) => row.month);

  const pick = (category: string) =>
    foods.foods
      .filter((f) => f.is_fruit_vegetable && f.category === category && inSeason.has(f.code))
      .map((f) => {
        const label = shortFoodLabel(f.label);
        return {
          code: f.code,
          label,
          months: monthsOf(f.code),
          family: category === 'fruit' ? ('fruit' as const) : ('legume' as const),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

  const fruits = pick('fruit');
  const legumes = pick('legume');
  const stall: ReturnType<typeof pick> = [];
  // Le catalogue distingue « Chou blanc », « Chou rouge » et « Chou frisé »:
  // trois entrées justes, mais un étal qui ne montrerait que des choux. Un seul
  // représentant par produit.
  const seen = new Set<string>();
  const add = (item: (typeof fruits)[number] | undefined) => {
    if (!item || stall.length >= 8) return;
    const produce = item.label.split(' ')[0]?.toLowerCase() ?? item.label;
    if (seen.has(produce)) return;
    seen.add(produce);
    stall.push(item);
  };
  for (let i = 0; stall.length < 8 && (i < fruits.length || i < legumes.length); i += 1) {
    add(legumes[i]);
    add(fruits[i]);
  }
  return stall;
}

export default function HomePage() {
  const month = new Date().getMonth() + 1;
  const stall = seasonalStall(month);
  const produceCount = foods.foods.filter((f) => f.is_fruit_vegetable).length;
  const seasonalCount = new Set(
    seasonality.seasonality.filter((row) => row.month === month).map((row) => row.food_code),
  ).size;

  return (
    // Chaque bande occupe toute la largeur de la fenêtre et centre son contenu:
    // un fond coloré ne doit jamais s'arrêter au bord du conteneur, sinon il se
    // lit comme un bloc coupé (retour de revue du 2026-09-17).
    <main className="flex w-full flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-page flex-1 grid-cols-1 content-center gap-10 px-4 pt-12 pb-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:px-8">
        <div className="flex flex-col gap-5">
          <h1 className="max-w-[15ch] text-display-md text-ink md:text-display-lg lg:text-display-xl">
            Ce dont votre corps a besoin, et ce qu&apos;il y a{' '}
            <span className="text-saison">sur les étals</span>.
          </h1>
          <p className="max-w-[54ch] text-lg text-ink-soft">
            Poids, âge, sexe de référence, niveau d&apos;activité&nbsp;: vos besoins journaliers et
            hebdomadaires calculés sur les références ANSES, puis les ingrédients de saison qui les
            couvrent. Sans compte, sans recette miracle.
          </p>

          <div className="flex flex-wrap items-center gap-[10px]">
            <Link href="/profil" className={buttonStyles({ size: 'lg' })}>
              Calculer mes besoins
            </Link>
            {/* Ce lien pointait vers /liste, qui exige un profil: le visiteur
                cliquait « voir ce qui est de saison » et tombait sur « Aucun
                profil ». Il mène maintenant à l'étal, juste en dessous, qui
                répond vraiment à la question posée. */}
            <Link
              href="/de-saison"
              className={buttonStyles({ hierarchy: 'secondary', size: 'lg' })}
            >
              Voir ce qui est de saison
            </Link>
          </div>

          <ul className="flex flex-wrap gap-[7px]">
            {[
              nutrients.nutrients.length + ' nutriments suivis',
              foods.foods.length + ' aliments',
              'Références ANSES 2021',
              'France métropolitaine',
            ].map((chip) => (
              <li
                key={chip}
                className="rounded-full border-[1.5px] border-solid border-line-strong bg-surface px-3 py-[3px] text-xs text-ink-soft"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>

        {/* L'ardoise du marché. Elle a porté une écriture manuscrite (Caveat)
            puis une légère inclinaison, retirées l'une après l'autre: la
            première vieillissait la page, la seconde rendait son texte flou en
            permanence — incliner un bloc de 0,7°, c'est rastériser ses glyphes
            puis les faire pivoter. Son caractère tient maintenant au fond le
            plus sombre du site et à sa typo de titre. */}
        <aside className="flex flex-col gap-4 self-center rounded-[var(--radius-bloc)] border-[1.5px] border-solid border-line bg-band px-6 pt-6 pb-7">
          <p className="type-display text-display-xs text-ink">
            Nous sommes en {monthName(month)}
          </p>
          <div className="flex flex-col gap-[9px]">
            <p className="type-data text-xs tracking-label uppercase text-ink-muted">Les douze mois</p>
            <MonthRibbon currentMonth={month} />
          </div>
          <p className="text-sm text-ink-soft">
            {produceCount} fruits et légumes au catalogue,{' '}
            <strong className="font-semibold text-ink">
              {seasonalCount ? seasonalCount : 'aucun'} de saison
            </strong>{' '}
            aujourd&apos;hui.
          </p>
        </aside>
      </div>

      {stall.length > 0 ? (
        <section
          id="de-saison"
          className="w-full scroll-mt-4 border-t-[1.5px] border-solid border-line bg-paper-deep"
        >
          <div className="mx-auto flex w-full max-w-page flex-col gap-[14px] px-4 py-7 md:px-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="type-data text-xs font-medium tracking-label uppercase text-ink-muted">
                De saison en {monthName(month)}
              </h2>
              {/* La flèche avance d'un cheveu au survol: le geste dit « ça
                  continue par là » mieux que la couleur seule. */}
              <Link
                href="/de-saison"
                className="group text-sm font-semibold text-brand hover:text-brand-hover"
              >
                Les {seasonalCount} produits de saison ce mois-ci{' '}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform group-hover:translate-x-[5px]"
                >
                  →
                </span>
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-[10px] sm:grid-cols-4 lg:grid-cols-8">
              {stall.map((item) => (
                <li
                  key={item.code}
                  className="flex flex-col items-start gap-[7px] rounded-[var(--radius-bloc)] border-[1.5px] border-solid border-line bg-surface px-[13px] pt-3 pb-[13px]"
                >
                  <FoodIcon family={item.family} />
                  <span className="text-sm font-semibold text-ink">{item.label}</span>
                  {/* La période, en trois mots: une carte n'a pas la place d'un
                      ruban, mais elle doit dire jusqu'à quand. */}
                  <span className="type-data text-xs tracking-label uppercase text-ink-muted">
                    {seasonRangeLabel(item.months)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <footer className="w-full border-t-[1.5px] border-solid border-line">
        <div className="mx-auto flex w-full max-w-page flex-col gap-[6px] px-4 py-7 text-sm text-ink-muted md:px-8">
          <p>
            <strong className="font-semibold text-ink-soft">Estimation informative.</strong> Ni
            diagnostic, ni conseil médical personnalisé. Ce service ne remplace pas un professionnel
            de santé.
          </p>
          <p>
            Références&nbsp;: ANSES 2021, Henry 2005, CIQUAL 2020, calendrier de saison France
            métropolitaine.
          </p>
        </div>
      </footer>
    </main>
  );
}
