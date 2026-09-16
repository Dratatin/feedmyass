import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ActivityLevel, DietBase, Exclusion, ReferenceSex } from '@/domain/types';

/**
 * Profil enregistré d'un utilisateur connecté (FR-025).
 *
 * Toutes les lectures et écritures passent par le client porteur de la session:
 * les politiques RLS s'appliquent donc avec l'identité réelle de l'appelant, et
 * le cloisonnement ne dépend d'aucun filtre applicatif (FR-028).
 */

export type StoredProfileRow = {
  weightKg: number;
  heightCm: number;
  age: number;
  referenceSex: ReferenceSex;
  activityLevel: ActivityLevel;
  dietBase: DietBase;
  exclusions: Exclusion[];
};

export async function fetchProfile(): Promise<StoredProfileRow | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from('profiles')
    .select('weight_kg, height_cm, age, reference_sex, activity_level, diet_base, exclusions')
    .maybeSingle();

  if (error) throw new Error('Lecture du profil impossible: ' + error.message);
  if (!data) return null;

  return {
    weightKg: Number(data.weight_kg),
    heightCm: Number(data.height_cm),
    age: data.age,
    referenceSex: data.reference_sex,
    activityLevel: data.activity_level,
    dietBase: data.diet_base,
    exclusions: data.exclusions ?? [],
  };
}

export async function saveProfile(userId: string, profile: StoredProfileRow): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from('profiles').upsert(
    {
      user_id: userId,
      weight_kg: profile.weightKg,
      height_cm: profile.heightCm,
      age: profile.age,
      reference_sex: profile.referenceSex,
      activity_level: profile.activityLevel,
      diet_base: profile.dietBase,
      exclusions: profile.exclusions,
    },
    { onConflict: 'user_id' },
  );

  if (error) throw new Error('Enregistrement du profil impossible: ' + error.message);
}

export async function deleteProfile(): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from('profiles').delete().gte('age', 0);
  if (error) throw new Error('Suppression du profil impossible: ' + error.message);
}
