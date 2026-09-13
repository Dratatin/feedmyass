import raw from './energy-equations.json';
import type {
  ActivityLevelReference,
  BmrEquation,
  EnergyReference,
} from '@/domain/needs/energy';
import type { ActivityLevel, ReferenceSex } from '@/domain/types';

/**
 * Adaptateur entre le fichier de référence versionné et le type attendu par le
 * domaine. Les équations sont embarquées dans le dépôt et non en base: elles ne
 * changent qu'avec une publication scientifique, et le calcul doit rester
 * possible sans accès réseau (FR-036).
 */
export const energyReference: EnergyReference = {
  bmrEquations: raw.bmr_equations.map(
    (e): BmrEquation => ({
      referenceSex: e.reference_sex as ReferenceSex,
      ageMin: e.age_min,
      ageMax: e.age_max,
      kcalPerKg: e.kcal_per_kg,
      kcalConstant: e.kcal_constant,
    }),
  ),
  activityLevels: raw.activity_levels.map(
    (a): ActivityLevelReference => ({
      code: a.code as ActivityLevel,
      label: a.label,
      nap: a.nap,
    }),
  ),
  source: raw._meta.source,
  version: raw._meta.version,
};
