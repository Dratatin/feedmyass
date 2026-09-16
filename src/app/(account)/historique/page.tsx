import { MonthPill } from '@/components/ds/Pill';
import { monthName } from '@/lib/months';
import { listResults } from '@/data/repositories/results';

/**
 * Historique des résultats (FR-026, FR-027).
 *
 * Chaque entrée porte le profil utilisé AU MOMENT du calcul. Modifier son profil
 * ensuite ne change rien ici: les entrées sont immuables, garanti en base par
 * l'absence de politique de mise à jour et par un trigger de refus.
 *
 * Chaque entrée porte aussi la couleur de la saison du mois où elle a été
 * calculée: c'est la trace visible du fait qu'un résultat de février n'a pas
 * proposé les mêmes ingrédients qu'un résultat de septembre.
 */
export default async function HistoryPage() {
  const results = await listResults();

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm text-ink">Historique</h1>
        <p className="max-w-[68ch] text-md text-ink-soft">
          Chaque résultat conserve le profil utilisé au moment du calcul. Modifier votre profil ne
          modifie aucun résultat déjà enregistré.
        </p>
      </header>

      {results.length === 0 ? (
        <p className="text-md text-ink-soft">
          Aucun résultat enregistré. Calculez vos besoins, puis enregistrez le résultat.
        </p>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {results.map((result) => {
            const snapshot = result.profileSnapshot as Record<string, unknown>;
            const generated = new Date(result.generatedAt);
            return (
              <li
                key={result.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-bloc)] border-[1.5px] border-solid border-line bg-surface px-4 py-[14px]"
              >
                <span className="type-data text-sm font-semibold text-ink">
                  {generated.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
                </span>
                <span className="text-sm text-ink-soft">
                  {result.period === 'day' ? 'Par jour' : 'Par semaine'} — Profil utilisé&nbsp;:{' '}
                  {String(snapshot.weight_kg)} kg, {String(snapshot.height_cm)} cm,{' '}
                  {String(snapshot.age)} ans
                </span>
                <MonthPill month={generated.getMonth() + 1}>
                  {monthName(generated.getMonth() + 1)}
                </MonthPill>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
