'use client';

import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ds/Button';
import { InputField } from '@/components/ds/InputField';
import { PageShell } from '@/components/ds/PageShell';
import { Panel } from '@/components/ds/Panel';
import { SelectField } from '@/components/ds/SelectField';
import { StepRail } from '@/components/features/StepRail';
import {
  getNeedsServerSnapshot,
  getNeedsSnapshot,
  storeNeeds,
  subscribeNeeds,
} from '@/lib/needs-session';

/**
 * Écran de saisie du profil (FR-001, FR-002).
 *
 * Accessible sans compte (FR-024). Le régime alimentaire n'est PAS demandé ici:
 * il ne sert qu'à la liste d'ingrédients (US2) et n'entre pas dans le calcul des
 * besoins (principe III). C'est une propriété du code, et l'écran la rend
 * visible en le disant.
 */

type FieldErrors = Record<string, string>;

/**
 * Catégories et descriptions reprises de la table officielle des coefficients
 * NAP (docs/sources/coefficients_NAP_ANSES.csv). Les descriptions comptent
 * autant que les libellés: c'est ce qui permet à l'utilisateur de se situer
 * correctement, et le choix du niveau pèse directement sur le besoin calculé.
 *
 * Le coefficient est affiché parce qu'il est le multiplicateur du résultat:
 * l'utilisateur doit pouvoir voir ce qui agit sur son chiffre.
 *
 * La cinquième catégorie officielle (NAP 2,20 et plus: travail physique très
 * lourd, athlète à l'entraînement quotidien) n'est pas proposée, les sportifs de
 * haut niveau étant hors périmètre de la spécification.
 */
const ACTIVITY_LEVELS = [
  { value: 'sedentary', nap: '1,50', label: 'Sédentaire / inactif — posture surtout assise, moins de 30 min de marche par jour' },
  { value: 'low_active', nap: '1,65', label: 'Légèrement actif — assis la plupart du temps, environ 1 h de marche légère' },
  { value: 'active', nap: '1,80', label: 'Modérément actif — souvent debout ou en déplacement, sport 2 à 3 fois par semaine' },
  { value: 'very_active', nap: '2,05', label: 'Actif / vigoureux — travail physique régulier ou sport soutenu 3 à 4 fois par semaine' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * Profil déjà saisi pendant la visite, s'il y en a un.
   *
   * « Modifier mon profil » renvoyait un formulaire vide: pour corriger un
   * poids, il fallait ressaisir les cinq champs (constat du parcours à la main,
   * 2026-09-18). Le formulaire repart donc de la dernière saisie.
   *
   * Le rendu serveur ne voit pas la session du navigateur: les valeurs arrivent
   * après hydratation. La `key` du formulaire change à ce moment-là, ce qui
   * remonte les champs avec leurs valeurs par défaut — un champ non contrôlé
   * ignore une valeur par défaut qui change sans remontage.
   */
  const stored = useSyncExternalStore(subscribeNeeds, getNeedsSnapshot, getNeedsServerSnapshot);
  const previous = stored?.profile;
  const [activity, setActivity] = useState('');
  const selectedActivity = activity || previous?.activity_level || '';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setGlobalError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      weight_kg: Number(form.get('weight_kg')),
      height_cm: Number(form.get('height_cm')),
      age: Number(form.get('age')),
      reference_sex: String(form.get('reference_sex')),
      activity_level: String(form.get('activity_level')),
    };

    try {
      const response = await fetch('/api/needs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        const fields: FieldErrors = {};
        for (const issue of body.error?.fields ?? []) fields[issue.field] = issue.expected;
        setErrors(fields);
        if (Object.keys(fields).length === 0) setGlobalError(body.error?.message ?? 'Le calcul a échoué.');
        return;
      }

      storeNeeds({
        needs: {
          daily: body.daily,
          weekly: body.weekly,
          missingReferences: body.missing_references,
          referenceVersions: body.reference_versions,
        },
        disclaimer: body.disclaimer,
        profileSummary:
          payload.weight_kg + ' kg, ' + payload.height_cm + ' cm, ' + payload.age + ' ans',
        profile: payload,
      });
      // `replace` et non `push`: le formulaire et son résultat sont deux états
      // de la même action. Revenir en arrière depuis les besoins ramène là d'où
      // l'on venait, au lieu de rouvrir le formulaire qu'on vient de valider
      // (constat du parcours à la main, 2026-09-18).
      router.replace('/besoins');
    } catch {
      setGlobalError("Le calcul n'a pas pu aboutir. Vérifiez votre connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  const selectedNap = ACTIVITY_LEVELS.find((level) => level.value === selectedActivity)?.nap;

  return (
    <PageShell
      rail={
        <>
          <StepRail current={1} currentMonth={new Date().getMonth() + 1} reached={previous ? 3 : 1} />
          <p className="text-xs text-ink-muted">
            Rien ne quitte votre navigateur tant que vous n&apos;enregistrez pas de résultat.
          </p>
        </>
      }
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm text-ink">Votre profil</h1>
        <p className="max-w-[62ch] text-md text-ink-soft">
          Quatre valeurs suffisent au calcul. Le régime alimentaire sera demandé à l&apos;étape
          suivante&nbsp;: il ne touche jamais aux besoins.
        </p>
      </header>

      <Panel>
        <form
          key={previous ? 'repris' : 'vierge'}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            <InputField
              label="Poids (kg)" name="weight_kg" type="number" inputMode="decimal" step="0.1"
              min={30} max={250} required placeholder="70" hint="Entre 30 et 250 kg"
              defaultValue={previous?.weight_kg ?? ''}
              error={errors.weight_kg}
            />
            <InputField
              label="Taille (cm)" name="height_cm" type="number" inputMode="numeric"
              min={120} max={230} required placeholder="175"
              defaultValue={previous?.height_cm ?? ''}
              hint="Entre 120 et 230 cm. N'entre pas dans le calcul énergétique, sert au contrôle de cohérence."
              error={errors.height_cm}
            />
            <InputField
              label="Âge (années)" name="age" type="number" inputMode="numeric"
              min={18} max={70} required placeholder="35" hint="Entre 18 et 70 ans"
              defaultValue={previous?.age ?? ''}
              error={errors.age}
            />
            <SelectField
              label="Table de référence utilisée" name="reference_sex" required
              defaultValue={previous?.reference_sex ?? ''}
              hint="Les références officielles sont publiées par sexe. Ce choix ne préjuge pas de votre identité de genre."
              error={errors.reference_sex}
            >
              <option value="" disabled>Choisissez une table</option>
              <option value="female">Femme</option>
              <option value="male">Homme</option>
            </SelectField>
          </div>

          <SelectField
            label="Niveau d'activité physique" name="activity_level" required
            defaultValue={previous?.activity_level ?? ''}
            onChange={(event) => setActivity(event.target.value)}
            hint={
              selectedNap
                ? 'Coefficient NAP appliqué : ' + selectedNap + '. Votre besoin énergétique vaut votre métabolisme de base multiplié par ce coefficient.'
                : 'Le coefficient officiel correspondant multipliera votre métabolisme de base.'
            }
            error={errors.activity_level}
          >
            <option value="" disabled>Choisissez un niveau</option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </SelectField>

          {globalError ? (
            <p role="alert" className="text-sm font-semibold text-framboise">{globalError}</p>
          ) : null}

          <div>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'Calcul en cours…' : 'Calculer mes besoins'}
            </Button>
          </div>
        </form>
      </Panel>

      <p className="max-w-[70ch] text-sm text-ink-muted">
        La taille est contrôlée mais n&apos;entre pas dans le calcul énergétique&nbsp;: la table
        retenue est la variante poids seul des équations de Henry.
      </p>
    </PageShell>
  );
}
