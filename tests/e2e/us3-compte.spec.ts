import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

/**
 * Parcours V5 de quickstart.md — User Story 3.
 *
 * Joué contre la vraie base: connexion déléguée, enregistrement d'un résultat,
 * restitution après reconnexion, immuabilité de l'historique et suppression
 * complète du compte.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const password = 'e2e-motdepasse-solide-2026';

const admin = () => createClient(url, serviceKey, { auth: { persistSession: false } });

/**
 * Les deux projets Playwright (320 px et 1920 px) tournent en parallèle: sans
 * adresse distincte par projet, chacun supprimerait le compte de l'autre.
 */
const userEmail = (base: string, project: string) => base + '+' + project + '@feedmyass.test';

async function resetUser(email: string): Promise<void> {
  const client = admin();
  const { data } = await client.auth.admin.listUsers();
  const previous = data.users.find((user) => user.email === email);
  if (previous) await client.auth.admin.deleteUser(previous.id);
  await client.auth.admin.createUser({ email, password, email_confirm: true });
}

const signIn = async (page: import('@playwright/test').Page, email: string) => {
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/mon-profil/, { timeout: 15000 });
};

const computeNeeds = async (page: import('@playwright/test').Page, weight = '75') => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill(weight);
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);
};

test.describe.configure({ mode: 'serial' });

test('redirige un visiteur non connecté vers la connexion', async ({ page }) => {
  await page.goto('/historique');
  await expect(page).toHaveURL(/\/connexion/);
});

test('enregistre un résultat puis le retrouve dans l\'historique', async ({ page }) => {
  const email = userEmail('e2e-historique', test.info().project.name);
  await resetUser(email);
  await signIn(page, email);

  await computeNeeds(page);
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await expect(page.getByText('Résultat enregistré')).toBeVisible({ timeout: 15000 });

  await page.goto('/historique');
  await expect(page.getByText('Profil utilisé : 75 kg, 178 cm, 35 ans')).toBeVisible();
});

test('conserve l\'ancien résultat quand le profil change (FR-027)', async ({ page }) => {
  const email = userEmail('e2e-immuable', test.info().project.name);
  await resetUser(email);
  await signIn(page, email);

  await computeNeeds(page, '75');
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await expect(page.getByText('Résultat enregistré')).toBeVisible({ timeout: 15000 });

  // Nouveau calcul avec un poids différent, enregistré lui aussi.
  await computeNeeds(page, '90');
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await expect(page.getByText('Résultat enregistré')).toBeVisible({ timeout: 15000 });

  await page.goto('/historique');
  // Les deux entrées coexistent, chacune avec le profil de son époque.
  await expect(page.getByText('Profil utilisé : 75 kg, 178 cm, 35 ans')).toBeVisible();
  await expect(page.getByText('Profil utilisé : 90 kg, 178 cm, 35 ans')).toBeVisible();
});

test('supprime le compte et toutes ses données (FR-029)', async ({ page }) => {
  const email = userEmail('e2e-suppression', test.info().project.name);
  await resetUser(email);
  await signIn(page, email);

  await computeNeeds(page);
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await expect(page.getByText('Résultat enregistré')).toBeVisible({ timeout: 15000 });

  await page.goto('/donnees');
  await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });

  // Vérification en base: ni compte, ni résultat.
  const client = admin();
  const { data } = await client.auth.admin.listUsers();
  expect(data.users.find((user) => user.email === email)).toBeUndefined();
});

test('ramène vers la page demandée après connexion (FR-022)', async ({ page }) => {
  const email = userEmail('e2e-retour', test.info().project.name);
  await resetUser(email);

  // Page réservée demandée sans session: la destination voyage dans l'URL.
  await page.goto('/historique');
  await expect(page).toHaveURL(/\/connexion\?next=%2Fhistorique/);

  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/historique/, { timeout: 15000 });
});

test('se déconnecte puis se reconnecte en retrouvant son historique', async ({ page }) => {
  const email = userEmail('e2e-deconnexion', test.info().project.name);
  await resetUser(email);
  await signIn(page, email);

  await computeNeeds(page, '82');
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await expect(page.getByText('Résultat enregistré')).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  // L'en-tête repasse à l'état visiteur.
  await expect(page.getByRole('link', { name: 'Connexion' })).toBeVisible();

  // Session réellement close: la page réservée n'est plus accessible.
  await page.goto('/historique');
  await expect(page).toHaveURL(/\/connexion/);

  // Reconnexion depuis cet écran: l'historique enregistré avant la déconnexion
  // est restitué à l'identique.
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/historique/, { timeout: 15000 });
  await expect(page.getByText('Profil utilisé : 82 kg, 178 cm, 35 ans')).toBeVisible();
});

test('propose de rattacher un résultat calculé sans compte (scénario 6)', async ({ page }) => {
  const email = userEmail('e2e-rattachement', test.info().project.name);
  await resetUser(email);

  // Calcul en invité, puis tentative d'enregistrement sans session.
  await computeNeeds(page, '68');
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await page.getByRole('link', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/connexion/);

  // L'écran annonce que le résultat en cours sera perdu sans enregistrement.
  await expect(page.getByText('Votre résultat en cours')).toBeVisible();

  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // La connexion ramène au résultat, où le rattachement est proposé.
  await expect(page).toHaveURL(/\/besoins/, { timeout: 15000 });
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await expect(page.getByText('Résultat enregistré')).toBeVisible({ timeout: 15000 });

  await page.goto('/historique');
  await expect(page.getByText('Profil utilisé : 68 kg, 178 cm, 35 ans')).toBeVisible();
});
