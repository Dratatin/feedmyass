import { describe, expect, it } from 'vitest';
import { computeBasalMetabolicRate, computeEnergyNeedKcal } from '@/domain/needs/energy';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import type { ActivityLevel, Profile, ReferenceSex } from '@/domain/types';
import { nutrientsFixture, intakesFixture } from './fixtures/reference';

/**
 * Conformité aux références officielles (SC-005, principe II).
 *
 * Les valeurs attendues sont calculées À LA MAIN depuis les équations publiées
 * (Henry 2005, table conservée dans docs/sources/table_henry_2005.xlsx) et
 * écrites en dur ici. Elles ne sont pas dérivées du fichier de référence: une
 * erreur de saisie dans ce fichier doit faire échouer ce test.
 *
 *   Hommes  18-29: 16,0 x P + 545   30-59: 14,2 x P + 593   60-70: 13,5 x P + 514
 *   Femmes  18-29: 13,1 x P + 558   30-59: 11,5 x P + 636   60-70: 11,0 x P + 561
 *   NAP (coefficients officiels, milieu de chaque intervalle):
 *     sédentaire 1,50 | légèrement actif 1,65 | modérément actif 1,80 | actif vigoureux 2,05
 */

type ControlProfile = {
  label: string;
  profile: Profile;
  expectedBmr: number;
  expectedEnergy: number;
};

const p = (
  weightKg: number,
  age: number,
  referenceSex: ReferenceSex,
  activityLevel: ActivityLevel,
): Profile => ({ weightKg, heightCm: 175, age, referenceSex, activityLevel });

const CONTROL_PROFILES: ControlProfile[] = [
  { label: 'H 25 ans 70 kg sédentaire (NAP 1,50)', profile: p(70, 25, 'male', 'sedentary'), expectedBmr: 1665, expectedEnergy: 2497.5 },
  { label: 'H 35 ans 75 kg modérément actif (NAP 1,80)', profile: p(75, 35, 'male', 'active'), expectedBmr: 1658, expectedEnergy: 2984.4 },
  { label: 'H 65 ans 80 kg légèrement actif (NAP 1,65)', profile: p(80, 65, 'male', 'low_active'), expectedBmr: 1594, expectedEnergy: 2630.1 },
  { label: 'H 18 ans 60 kg actif vigoureux (NAP 2,05)', profile: p(60, 18, 'male', 'very_active'), expectedBmr: 1505, expectedEnergy: 3085.25 },
  { label: 'H 59 ans 90 kg sédentaire (NAP 1,50)', profile: p(90, 59, 'male', 'sedentary'), expectedBmr: 1871, expectedEnergy: 2806.5 },
  { label: 'F 22 ans 55 kg modérément actif (NAP 1,80)', profile: p(55, 22, 'female', 'active'), expectedBmr: 1278.5, expectedEnergy: 2301.3 },
  { label: 'F 40 ans 62 kg sédentaire (NAP 1,50)', profile: p(62, 40, 'female', 'sedentary'), expectedBmr: 1349, expectedEnergy: 2023.5 },
  { label: 'F 68 ans 58 kg actif vigoureux (NAP 2,05)', profile: p(58, 68, 'female', 'very_active'), expectedBmr: 1199, expectedEnergy: 2457.95 },
  { label: 'F 30 ans 70 kg légèrement actif (NAP 1,65)', profile: p(70, 30, 'female', 'low_active'), expectedBmr: 1441, expectedEnergy: 2377.65 },
  { label: 'F 18 ans 50 kg modérément actif (NAP 1,80)', profile: p(50, 18, 'female', 'active'), expectedBmr: 1213, expectedEnergy: 2183.4 },
];

describe('conformité aux équations de Henry', () => {
  it('couvre au moins dix profils de contrôle', () => {
    expect(CONTROL_PROFILES.length).toBeGreaterThanOrEqual(10);
  });

  for (const { label, profile, expectedBmr, expectedEnergy } of CONTROL_PROFILES) {
    it('métabolisme de base — ' + label, () => {
      expect(computeBasalMetabolicRate(profile, energyReference)).toBeCloseTo(expectedBmr, 1);
    });

    it('dépense énergétique journalière — ' + label, () => {
      expect(computeEnergyNeedKcal(profile, energyReference)).toBeCloseTo(expectedEnergy, 1);
    });
  }

  it('refuse un âge hors des tranches de la table', () => {
    expect(() => computeBasalMetabolicRate(p(70, 80, 'male', 'active'), energyReference)).toThrow();
  });
});

describe('résolution des apports de référence', () => {
  const refs = { nutrients: nutrientsFixture, intakes: intakesFixture, energy: energyReference };
  const profile = p(75, 35, 'male', 'active'); // DEJ attendue: 2984,4 kcal
  const needs = computeNeeds(profile, refs);
  const daily = (code: string) => needs.daily.find((n) => n.nutrient === code);

  it('convertit une référence par kg en valeur absolue', () => {
    // Protéines: RNP ANSES de 0,83 g/kg -> 0,83 x 75 = 62,25 g
    expect(daily('protein')?.value).toBeCloseTo(62.25, 2);
  });

  it('reprend telle quelle une référence absolue', () => {
    expect(daily('calcium')?.value).toBe(950);
    expect(daily('iron')?.value).toBe(11);
    expect(daily('vitamin_c')?.value).toBe(110);
  });

  it('distingue les références qui dépendent du sexe', () => {
    const female = computeNeeds(p(75, 35, 'female', 'active'), refs);
    expect(daily('magnesium')?.value).toBe(380);
    expect(female.daily.find((n) => n.nutrient === 'magnesium')?.value).toBe(300);
  });

  it("convertit une référence par MJ d'apport énergétique", () => {
    // Vitamine B1: 0,1 mg/MJ. 2984,4 kcal = 12,487 MJ -> 1,249 mg
    expect(daily('vitamin_b1')?.value).toBeCloseTo(1.249, 2);
  });

  it("convertit un intervalle en pourcentage de l'apport énergétique", () => {
    // Lipides: 35 à 40 % de 2984,4 kcal, à 9 kcal/g -> 116,1 à 132,6 g
    expect(daily('lipids')?.value).toBeCloseTo(116.1, 1);
    expect(daily('lipids')?.valueMax).toBeCloseTo(132.6, 1);
  });

  it('exprime la semaine comme sept fois la journée (FR-006)', () => {
    for (const nutrient of needs.daily) {
      const weekly = needs.weekly.find((n) => n.nutrient === nutrient.nutrient);
      expect(weekly?.value).toBeCloseTo(nutrient.value * 7, 6);
    }
  });
});
