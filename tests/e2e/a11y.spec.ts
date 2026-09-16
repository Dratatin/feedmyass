import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibilité (FR-033, principe VI).
 *
 * Contrastes, libellés de champs et structure sont vérifiés par axe-core sur
 * les règles WCAG 2.1 niveau AA. La navigation au clavier est vérifiée
 * séparément: aucun outil automatique ne la couvre correctement.
 */

const analyse = (page: import('@playwright/test').Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

const fillProfile = async (page: import('@playwright/test').Page) => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill('75');
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);
};

test('accueil sans violation WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/');
  const results = await analyse(page);
  expect(results.violations.map((v) => v.id + ': ' + v.description)).toEqual([]);
});

test('saisie du profil sans violation WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/profil');
  const results = await analyse(page);
  expect(results.violations.map((v) => v.id + ': ' + v.description)).toEqual([]);
});

test('résultats sans violation WCAG 2.1 AA', async ({ page }) => {
  await fillProfile(page);
  const results = await analyse(page);
  expect(results.violations.map((v) => v.id + ': ' + v.description)).toEqual([]);
});

test('liste d\'ingrédients sans violation WCAG 2.1 AA', async ({ page }) => {
  await fillProfile(page);
  await page.goto('/liste');
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByText('Régime : Omnivore')).toBeVisible({ timeout: 15000 });
  const results = await analyse(page);
  expect(results.violations.map((v) => v.id + ': ' + v.description)).toEqual([]);
});

test('connexion sans violation WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/connexion');
  const results = await analyse(page);
  expect(results.violations.map((v) => v.id + ': ' + v.description)).toEqual([]);
});

test('le formulaire de profil est utilisable au clavier seul', async ({ page }) => {
  await page.goto('/profil');

  // L'en-tête (marque, connexion) précède le contenu: on tabule jusqu'au
  // premier champ, en bornant la boucle pour ne pas tourner indéfiniment si un
  // élément devenait inatteignable.
  const firstFieldId = await page.getByLabel('Poids (kg)').getAttribute('id');
  let reached = false;
  for (let step = 0; step < 10 && !reached; step += 1) {
    await page.keyboard.press('Tab');
    reached = (await page.locator(':focus').getAttribute('id')) === firstFieldId;
  }
  expect(reached, 'le premier champ est atteignable au clavier').toBe(true);

  // Les champs suivants s'enchaînent ensuite dans l'ordre visuel.
  const order = ['Taille (cm)', 'Âge (années)', 'Table de référence utilisée', "Niveau d'activité physique"];
  for (const label of order) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    const id = await focused.getAttribute('id');
    const labelFor = await page.locator('label[for="' + id + '"]').innerText();
    expect(labelFor, 'ordre de tabulation').toContain(label);
  }

  // Le bouton de soumission vient ensuite.
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText(/Calculer mes besoins/);
});
