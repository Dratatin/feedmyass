'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { InputField } from '@/components/ds/InputField';
import { SelectField } from '@/components/ds/SelectField';
import { storeNeeds } from '@/lib/needs-session';

/**
 * Écran de saisie du profil (FR-001, FR-002).
 *
 * Accessible sans compte (FR-024). Composé uniquement de composants du design
 * system. Le régime alimentaire n'est PAS demandé ici: il ne sert qu'à la liste
 * d'ingrédients (US2) et n'entre pas dans le calcul des besoins (principe III).
 */

type FieldErrors = Record<string, string>;

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sédentaire — peu ou pas d\'exercice' },
  { value: 'low_active', label: 'Peu actif — marche quotidienne, exercice léger' },
  { value: 'active', label: 'Actif — exercice régulier ou travail physique' },
  { value: 'very_active', label: 'Très actif — exercice intense ou métier très physique' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      router.push('/besoins');
    } catch {
      setGlobalError("Le calcul n'a pas pu aboutir. Vérifiez votre connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-xs font-semibold text-neutral-900">Votre profil</h1>
        <p className="text-sm text-neutral-600">
          Ces informations servent à estimer vos besoins. Aucun compte n&apos;est nécessaire.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <InputField
            label="Poids (kg)" name="weight_kg" type="number" inputMode="decimal" step="0.1"
            min={30} max={250} required placeholder="70" hint="Entre 30 et 250 kg"
            error={errors.weight_kg}
          />
          <InputField
            label="Taille (cm)" name="height_cm" type="number" inputMode="numeric"
            min={120} max={230} required placeholder="175"
            hint="Entre 120 et 230 cm. N'entre pas dans le calcul énergétique, sert au contrôle de cohérence."
            error={errors.height_cm}
          />
          <InputField
            label="Âge (années)" name="age" type="number" inputMode="numeric"
            min={18} max={70} required placeholder="35" hint="Entre 18 et 70 ans"
            error={errors.age}
          />
          <SelectField
            label="Table de référence utilisée" name="reference_sex" required defaultValue=""
            hint="Les références officielles sont publiées par sexe. Ce choix ne préjuge pas de votre identité de genre."
            error={errors.reference_sex}
          >
            <option value="" disabled>Choisissez une table</option>
            <option value="female">Femme</option>
            <option value="male">Homme</option>
          </SelectField>
          <SelectField
            label="Niveau d'activité physique" name="activity_level" required defaultValue=""
            error={errors.activity_level}
          >
            <option value="" disabled>Choisissez un niveau</option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </SelectField>

          {globalError ? (
            <p role="alert" className="text-sm text-red-500">{globalError}</p>
          ) : null}

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Calcul en cours…' : 'Calculer mes besoins'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
