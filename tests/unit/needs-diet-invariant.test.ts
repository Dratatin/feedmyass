import { describe, expect, it } from 'vitest';
import { computeNeeds } from '@/domain/needs';
import { energyReference } from '@/data/reference/energy';
import type { Profile } from '@/domain/types';
import { nutrientsFixture, intakesFixture } from './fixtures/reference';

/**
 * INVARIANT NON NÉGOCIABLE (principe III de la constitution, FR-008, SC-004).
 *
 * Le régime alimentaire ne doit avoir aucun effet sur les besoins calculés.
 * L'invariant est d'abord inscrit dans les types — `Profile` n'a pas de champ de
 * régime — mais un type ne protège pas d'un appel en JavaScript non typé ni
 * d'une régression future: ce test vérifie le comportement réel.
 */
describe('invariant besoins / régime', () => {
  const refs = { nutrients: nutrientsFixture, intakes: intakesFixture, energy: energyReference };

  const profile: Profile = {
    weightKg: 70,
    heightCm: 175,
    age: 35,
    referenceSex: 'male',
    activityLevel: 'active',
  };

  it('ignore tout champ de régime glissé dans le profil', () => {
    const reference = computeNeeds(profile, refs);

    for (const diet of ['omnivore', 'pescetarian', 'vegetarian', 'vegan']) {
      // Contournement délibéré du typage: on simule un appel non typé.
      const contaminated = { ...profile, diet: { base: diet, exclusions: ['gluten'] } } as Profile;
      expect(computeNeeds(contaminated, refs)).toEqual(reference);
    }
  });

  it('donne des besoins strictement identiques pour deux profils identiques', () => {
    const a = computeNeeds({ ...profile }, refs);
    const b = computeNeeds({ ...profile }, refs);
    expect(a).toEqual(b);
  });

  it("n'expose aucun paramètre de régime dans sa signature", () => {
    // @ts-expect-error le régime n'est pas une entrée du calcul des besoins (FR-008)
    const withDiet: Profile = { ...profile, diet: { base: 'vegan', exclusions: [] } };
    expect(withDiet).toBeDefined();
  });
});
