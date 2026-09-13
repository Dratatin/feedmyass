import type { Needs, NeedValue, Nutrient, Profile } from '@/domain/types';
import { computeEnergyNeedKcal, type EnergyReference } from './energy';
import { resolveIntakeValue, type IntakeBasis } from './reference-intakes';

export * from './energy';
export * from './reference-intakes';

/**
 * Calcul des besoins nutritionnels.
 *
 * PRINCIPE III (non négociable): `Profile` ne porte aucun champ de régime, et
 * cette fonction ne reçoit rien d'autre. Il est donc structurellement impossible
 * d'écrire ici un calcul influencé par le régime déclaré (FR-008).
 */

export type IntakeReference = {
  nutrientCode: string;
  referenceSex: string;
  ageMin: number;
  ageMax: number;
  kind: 'RNP' | 'AS' | 'BEM';
  basis: IntakeBasis;
  value: number;
  valueMax: number | null;
  source: string;
  version: string;
};

export type NeedsReferences = {
  nutrients: Nutrient[];
  intakes: IntakeReference[];
  energy: EnergyReference;
};

export function computeNeeds(profile: Profile, references: NeedsReferences): Needs {
  const energyKcal = computeEnergyNeedKcal(profile, references.energy);

  const daily: NeedValue[] = [];
  const missingReferences: string[] = [];

  for (const nutrient of [...references.nutrients].sort((a, b) => a.displayOrder - b.displayOrder)) {
    if (nutrient.code === 'energy') {
      daily.push({
        nutrient: nutrient.code,
        label: nutrient.label,
        value: energyKcal,
        unit: nutrient.unit,
        kind: 'BEM',
        reference: { source: references.energy.source, version: references.energy.version },
      });
      continue;
    }

    const intake = references.intakes.find(
      (i) =>
        i.nutrientCode === nutrient.code &&
        i.referenceSex === profile.referenceSex &&
        profile.age >= i.ageMin &&
        profile.age <= i.ageMax,
    );

    if (!intake) {
      // Aucune référence officielle applicable: le nutriment est signalé plutôt
      // que comblé par une valeur inventée (principe II).
      missingReferences.push(nutrient.code);
      continue;
    }

    const resolved = resolveIntakeValue(intake, profile, energyKcal);
    daily.push({
      nutrient: nutrient.code,
      label: nutrient.label,
      value: resolved.value,
      ...(resolved.valueMax !== undefined ? { valueMax: resolved.valueMax } : {}),
      unit: nutrient.unit,
      kind: intake.kind,
      reference: { source: intake.source, version: intake.version },
    });
  }

  // La semaine vaut exactement sept fois la journée (FR-006).
  const weekly: NeedValue[] = daily.map((need) => ({
    ...need,
    value: need.value * 7,
    ...(need.valueMax !== undefined ? { valueMax: need.valueMax * 7 } : {}),
  }));

  return {
    daily,
    weekly,
    missingReferences,
    referenceVersions: {
      energy_equations: references.energy.version,
      reference_intakes: references.intakes[0]?.version ?? 'inconnue',
    },
  };
}
