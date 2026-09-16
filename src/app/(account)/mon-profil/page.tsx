import Link from 'next/link';
import { buttonStyles } from '@/components/ds/Button';
import { Panel } from '@/components/ds/Panel';
import { fetchProfile } from '@/data/repositories/profiles';

/**
 * Profil enregistré (FR-025).
 *
 * Rendu côté serveur: les données viennent de la base avec la session de
 * l'utilisateur, donc filtrées par RLS.
 *
 * Cette page ne rend pas de <main>: c'est le gabarit de l'espace personnel qui
 * le porte, et un document n'a qu'un seul point de repère principal.
 */
const SEX_LABELS: Record<string, string> = { female: 'Femme', male: 'Homme' };
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sédentaire (NAP 1,50)', low_active: 'Peu actif (NAP 1,65)',
  active: 'Actif (NAP 1,80)', very_active: 'Très actif (NAP 2,05)',
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
      <>
        <h1 className="text-display-sm text-ink">Mon profil</h1>
        <p className="max-w-[62ch] text-md text-ink-soft">
          Aucun profil enregistré pour l&apos;instant. Calculez vos besoins puis enregistrez le
          résultat: votre profil sera conservé.
        </p>
        <div>
          <Link href="/profil" className={buttonStyles({ size: 'lg' })}>
            Calculer mes besoins
          </Link>
        </div>
      </>
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
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm text-ink">Mon profil</h1>
        <p className="text-md text-ink-soft">Repris automatiquement à chaque visite.</p>
      </header>

      <Panel>
        <dl className="flex flex-col">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-wrap justify-between gap-2 border-b border-solid border-line-soft py-[9px] last:border-b-0"
            >
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="type-data text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-[10px]">
          <Link href="/profil" className={buttonStyles()}>
            Mettre à jour et recalculer
          </Link>
          <Link href="/liste" className={buttonStyles({ hierarchy: 'secondary' })}>
            Ma liste d&apos;ingrédients
          </Link>
        </div>
      </Panel>
    </>
  );
}
