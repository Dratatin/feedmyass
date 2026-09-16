import Link from 'next/link';
import { buttonStyles } from '@/components/ds/Button';
import { MonthRibbon } from '@/components/ds/MonthRibbon';
import { Vignette, type VignetteName } from '@/components/ds/Vignette';
import { monthName } from '@/lib/months';
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
 * Vignettes disponibles, associées au début du libellé CIQUAL.
 *
 * Le catalogue nomme « Courgette, pulpe et peau, crue » ce que l'étal appelle
 * une courgette: l'appariement se fait donc sur le premier mot, et un produit
 * sans vignette s'affiche très bien sans.
 */
const VIGNETTES: { prefix: string; name: VignetteName }[] = [
  { prefix: 'figue', name: 'figue' },
  { prefix: 'courgette', name: 'courgette' },
  { prefix: 'prune', name: 'prune' },
  { prefix: 'chou', name: 'chou' },
  { prefix: 'épinard', name: 'epinard' },
  { prefix: 'poire', name: 'poire' },
  { prefix: 'champignon', name: 'champignon' },
  { prefix: 'pomme', name: 'pomme' },
];

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

  const pick = (category: string) =>
    foods.foods
      .filter((f) => f.is_fruit_vegetable && f.category === category && inSeason.has(f.code))
      .map((f) => {
        const label = f.label.split(',')[0] ?? f.label;
        return {
          code: f.code,
          label,
          vignette: VIGNETTES.find((v) => label.toLowerCase().startsWith(v.prefix))?.name,
        };
      })
      .sort((a, b) => Number(Boolean(b.vignette)) - Number(Boolean(a.vignette)));

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

  return (
    // Chaque bande occupe toute la largeur de la fenêtre et centre son contenu:
    // un fond coloré ne doit jamais s'arrêter au bord du conteneur, sinon il se
    // lit comme un bloc coupé (retour de revue du 2026-09-17).
    <main className="w-full">
      <div className="mx-auto grid w-full max-w-page grid-cols-1 gap-8 px-4 pt-10 pb-8 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] md:px-8">
        <div className="flex flex-col gap-5">
          <h1 className="max-w-[16ch] text-display-md text-ink md:text-display-lg">
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
            {stall.length > 0 ? (
              <a
                href="#de-saison"
                className={buttonStyles({ hierarchy: 'secondary', size: 'lg' })}
              >
                Voir ce qui est de saison
              </a>
            ) : null}
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

        {/* L'ardoise du marché. Elle portait une écriture manuscrite (Caveat),
            retirée à la revue du 2026-09-18: le procédé vieillissait la page.
            Le caractère vient maintenant de la display et de la légère
            inclinaison, la seule de toute l'interface. */}
        <aside className="flex flex-col gap-4 self-start rounded-[var(--radius-bloc)] bg-ink px-6 pt-6 pb-7 md:-rotate-[0.7deg]">
          <p className="type-display text-display-xs text-paper">
            Nous sommes en {monthName(month)}
          </p>
          <div className="flex flex-col gap-[9px]">
            <p className="type-data text-xs tracking-label uppercase text-line">Les douze mois</p>
            <MonthRibbon currentMonth={month} />
          </div>
          <p className="text-sm text-line">
            {produceCount} fruits et légumes au catalogue,{' '}
            <strong className="font-semibold text-paper">
              {stall.length ? stall.length : 'aucun'} de saison
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
              <p className="text-sm text-ink-soft">
                Ces produits entreront dans votre liste d&apos;ingrédients si vous calculez vos
                besoins ce mois-ci.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-[10px] sm:grid-cols-4 lg:grid-cols-8">
              {stall.map((item) => (
                <li
                  key={item.code}
                  className="flex flex-col items-start gap-[7px] rounded-[var(--radius-bloc)] border-[1.5px] border-solid border-line bg-surface px-[13px] pt-3 pb-[13px]"
                >
                  {item.vignette ? <Vignette name={item.vignette} /> : null}
                  <span className="text-sm font-semibold text-ink">{item.label}</span>
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
