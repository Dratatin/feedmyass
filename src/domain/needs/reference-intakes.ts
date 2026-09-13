import type { Profile } from '@/domain/types';
import { kcalToMegajoules } from './energy';

/**
 * Résolution d'un apport de référence en valeur absolue par jour.
 *
 * Les références officielles ne sont pas toutes exprimées de la même façon: les
 * protéines sont données par kg de poids, les vitamines B1 et B3 par MJ d'apport
 * énergétique, les lipides et glucides en intervalle de pourcentage de l'apport
 * énergétique. Convertir ces formes en un nombre est un calcul, pas une
 * interprétation: chaque règle est écrite ici et testée.
 */

export type IntakeBasis = 'absolute' | 'per_kg' | 'per_mj' | 'percent_energy';

export type ResolvableIntake = {
  nutrientCode: string;
  basis: IntakeBasis;
  value: number;
  valueMax: number | null;
};

/**
 * Coefficients d'Atwater, nécessaires pour convertir un pourcentage de l'apport
 * énergétique en grammes. Ce sont les mêmes que ceux utilisés pour reconstituer
 * l'énergie des aliments dans le catalogue CIQUAL.
 */
const KCAL_PER_GRAM: Record<string, number> = {
  lipids: 9,
  carbohydrates: 4,
  protein: 4,
  fiber: 2,
};

export type ResolvedIntake = { value: number; valueMax?: number };

export function resolveIntakeValue(
  intake: ResolvableIntake,
  profile: Profile,
  energyKcal: number,
): ResolvedIntake {
  switch (intake.basis) {
    case 'absolute':
      return { value: intake.value };

    case 'per_kg':
      return { value: intake.value * profile.weightKg };

    case 'per_mj':
      return { value: intake.value * kcalToMegajoules(energyKcal) };

    case 'percent_energy': {
      const kcalPerGram = KCAL_PER_GRAM[intake.nutrientCode];
      if (kcalPerGram === undefined) {
        throw new Error(
          'Référence en pourcentage de l\'apport énergétique sans densité énergétique connue: ' +
            intake.nutrientCode,
        );
      }
      const toGrams = (percent: number) => (energyKcal * percent) / 100 / kcalPerGram;
      return {
        value: toGrams(intake.value),
        ...(intake.valueMax !== null ? { valueMax: toGrams(intake.valueMax) } : {}),
      };
    }
  }
}
