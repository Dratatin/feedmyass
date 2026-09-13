import Link from 'next/link';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { fetchProfile } from '@/data/repositories/profiles';

/**
 * Profil enregistré (FR-025).
 *
 * Rendu côté serveur: les données viennent de la base avec la session de
 * l'utilisateur, donc filtrées par RLS.
 */
const SEX_LABELS: Record<string, string> = { female: 'Femme', male: 'Homme' };
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sédentaire', low_active: 'Peu actif', active: 'Actif', very_active: 'Très actif',
};
const DIET_LABELS: Record<string, string> = {
  omnivore: 'Omnivore', pescetarian: 'Pescétarien', vegetarian: 'Végétarien', vegan: 'Végane',
};
const EXCLUSION_LABELS: Record<string, string> = {
  gluten: 'sans gluten', lactose: 'sans lactose', nuts: 'sans fruits à coque',
};

export default async function AccountProfilePage() {
  const profile = await fetchProfile();

  if (!profile) {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-display-xs font-semibold text-neutral-900">Mon profil</h1>
        <p className="text-md text-neutral-600">
          Aucun profil enregistré pour l&apos;instant. Calculez vos besoins puis enregistrez le
          résultat: votre profil sera conservé.
        </p>
        <div><Link href="/profil"><Button size="lg">Calculer mes besoins</Button></Link></div>
      </main>
    );
  }

  const rows: [string, string][] = [
    ['Poids', profile.weightKg + ' kg'],
    ['Taille', profile.heightCm + ' cm'],
    ['Âge', profile.age + ' ans'],
    ['Table de référence', SEX_LABELS[profile.referenceSex] ?? profile.referenceSex],
    ['Niveau d\'activité', ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel],
    ['Régime', DIET_LABELS[profile.dietBase] ?? profile.dietBase],
    [
      'Exclusions',
      profile.exclusions.length
        ? profile.exclusions.map((e) => EXCLUSION_LABELS[e] ?? e).join(', ')
        : 'aucune',
    ],
  ];

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-display-xs font-semibold text-neutral-900">Mon profil</h1>

      <Card description="Ce profil est repris automatiquement à chaque visite.">
        <dl className="flex flex-col gap-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-solid border-neutral-200 pb-2 last:border-b-0">
              <dt className="text-sm text-neutral-600">{label}</dt>
              <dd className="text-sm font-medium text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/profil"><Button size="lg">Mettre à jour et recalculer</Button></Link>
        <Link href="/liste"><Button size="lg" hierarchy="secondary-gray">Ma liste d&apos;ingrédients</Button></Link>
      </div>
    </main>
  );
}
