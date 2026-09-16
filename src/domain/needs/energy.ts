import type { ActivityLevel, Profile, ReferenceSex } from '@/domain/types';

/**
 * Besoin énergétique: métabolisme de base par les équations de Henry (2005),
 * multiplié par le niveau d'activité physique.
 *
 * Ce module est pur: il ne lit aucun fichier et n'appelle aucune base. La table
 * de référence lui est passée en argument, ce qui le rend testable sans
 * infrastructure et réutilisable par un autre appelant (FR-037).
 *
 * La TAILLE N'INTERVIENT PAS: la table retenue est la variante poids seul des
 * équations d'Oxford (FR-005, amendée le 2026-09-13).
 */

export type BmrEquation = {
  referenceSex: ReferenceSex;
  ageMin: number;
  ageMax: number;
  kcalPerKg: number;
  kcalConstant: number;
};

export type ActivityLevelReference = {
  code: ActivityLevel;
  label: string;
  nap: number;
  /** Intervalle officiel dont `nap` est le milieu, conservé pour affichage et traçabilité. */
  documentedRange: string;
  /** Description officielle du profil quotidien, affichée pour guider le choix. */
  description: string;
};

export type EnergyReference = {
  bmrEquations: BmrEquation[];
  activityLevels: ActivityLevelReference[];
  source: string;
  version: string;
};

/** Facteur de conversion officiel entre kilocalories et mégajoules. */
export const KJ_PER_KCAL = 4.184;

export function kcalToMegajoules(kcal: number): number {
  return (kcal * KJ_PER_KCAL) / 1000;
}

/**
 * Métabolisme de base en kcal/jour.
 *
 * Un profil qui ne tombe dans aucune tranche d'âge de la table provoque une
 * erreur explicite: la constitution interdit d'extrapoler une référence
 * officielle au-delà de son domaine de validité (principe II).
 */
export function computeBasalMetabolicRate(profile: Profile, reference: EnergyReference): number {
  const equation = reference.bmrEquations.find(
    (e) =>
      e.referenceSex === profile.referenceSex &&
      profile.age >= e.ageMin &&
      profile.age <= e.ageMax,
  );

  if (!equation) {
    throw new Error(
      "Aucune équation de référence pour ce profil (sexe de référence " +
        profile.referenceSex +
        ', âge ' +
        profile.age +
        '). Les profils hors des tranches publiées ne sont pas couverts.',
    );
  }

  return equation.kcalPerKg * profile.weightKg + equation.kcalConstant;
}

export function resolveActivityLevel(
  profile: Profile,
  reference: EnergyReference,
): ActivityLevelReference {
  const level = reference.activityLevels.find((a) => a.code === profile.activityLevel);
  if (!level) {
    throw new Error("Niveau d'activité inconnu: " + profile.activityLevel);
  }
  return level;
}

/** Dépense énergétique journalière = métabolisme de base x niveau d'activité. */
export function computeEnergyNeedKcal(profile: Profile, reference: EnergyReference): number {
  return computeBasalMetabolicRate(profile, reference) * resolveActivityLevel(profile, reference).nap;
}
