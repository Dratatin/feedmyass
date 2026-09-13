import { Badge } from '@/components/ds/Badge';
import { Card } from '@/components/ds/Card';
import { listResults } from '@/data/repositories/results';

/**
 * Historique des résultats (FR-026, FR-027).
 *
 * Chaque entrée porte le profil utilisé AU MOMENT du calcul. Modifier son profil
 * ensuite ne change rien ici: les entrées sont immuables, garanti en base par
 * l'absence de politique de mise à jour et par un trigger de refus.
 */
export default async function HistoryPage() {
  const results = await listResults();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-xs font-semibold text-neutral-900">Historique</h1>
        <p className="text-sm text-neutral-600">
          Chaque résultat conserve le profil utilisé au moment du calcul. Modifier votre profil ne
          modifie aucun résultat déjà enregistré.
        </p>
      </header>

      {results.length === 0 ? (
        <p className="text-md text-neutral-600">
          Aucun résultat enregistré. Calculez vos besoins, puis enregistrez le résultat.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {results.map((result) => {
            const snapshot = result.profileSnapshot as Record<string, unknown>;
            return (
              <li key={result.id}>
                <Card
                  title={new Date(result.generatedAt).toLocaleString('fr-FR', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">
                      {result.period === 'day' ? 'Par jour' : 'Par semaine'}
                    </Badge>
                    <span className="text-sm text-neutral-600">
                      Profil utilisé&nbsp;: {String(snapshot.weight_kg)} kg,{' '}
                      {String(snapshot.height_cm)} cm, {String(snapshot.age)} ans
                    </span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
