import { z } from 'zod';

/**
 * Schémas de validation. Les bornes reprennent data-model.md et sont doublées
 * par des contraintes CHECK en base (supabase/migrations/0002_user_data.sql).
 */

export const referenceSexSchema = z.enum(['female', 'male']);
export const activityLevelSchema = z.enum(['sedentary', 'low_active', 'active', 'very_active']);
export const dietBaseSchema = z.enum(['omnivore', 'pescetarian', 'vegetarian', 'vegan']);
export const exclusionSchema = z.enum(['gluten', 'lactose', 'nuts']);
export const periodSchema = z.enum(['day', 'week']);

/**
 * Entrée du calcul des besoins.
 *
 * `.strict()` n'est pas cosmétique: il fait rejeter toute clé inconnue, donc
 * tout champ de régime glissé dans la requête. C'est la traduction du principe
 * III et de FR-008 au niveau du contrat HTTP (cf. contracts/api.md).
 */
export const profileSchema = z
  .object({
    weight_kg: z.number().min(30, 'Poids attendu entre 30 et 250 kg').max(250, 'Poids attendu entre 30 et 250 kg'),
    height_cm: z.number().min(120, 'Taille attendue entre 120 et 230 cm').max(230, 'Taille attendue entre 120 et 230 cm'),
    age: z.number().int().min(18, 'Âge attendu entre 18 et 70 ans').max(70, 'Âge attendu entre 18 et 70 ans'),
    reference_sex: referenceSexSchema,
    activity_level: activityLevelSchema,
  })
  .strict();

export const dietSchema = z
  .object({
    base: dietBaseSchema,
    exclusions: z.array(exclusionSchema).default([]),
  })
  .strict();

export const planRequestSchema = z
  .object({
    profile: profileSchema,
    diet: dietSchema,
    period: periodSchema,
    generated_at: z.iso.datetime().optional(),
  })
  .strict();

/** Profil complet tel qu'enregistré pour un utilisateur (profil + régime). */
export const storedProfileSchema = profileSchema.extend({
  diet_base: dietBaseSchema,
  exclusions: z.array(exclusionSchema).default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type DietInput = z.infer<typeof dietSchema>;
export type PlanRequestInput = z.infer<typeof planRequestSchema>;
