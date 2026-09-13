import { expect, test } from '@playwright/test';

/**
 * Performance perçue (SC-010): les résultats s'affichent en moins de 3 secondes.
 *
 * La mesure porte sur le temps ressenti par l'utilisateur — de la soumission du
 * formulaire à l'affichage des valeurs — et non sur une latence serveur isolée.
 */
const BUDGET_MS = 3000;

test('les besoins s\'affichent en moins de trois secondes', async ({ page }) => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill('75');
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');

  const started = Date.now();
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page.getByRole('heading', { name: 'Vos besoins nutritionnels' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Énergie/ })).toBeVisible();
  const elapsed = Date.now() - started;

  console.log('besoins affichés en ' + elapsed + ' ms');
  expect(elapsed).toBeLessThan(BUDGET_MS);
});

test('la liste d\'ingrédients s\'affiche en moins de trois secondes', async ({ page }) => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill('75');
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);
  await page.goto('/liste');

  const started = Date.now();
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByText('Régime : Omnivore')).toBeVisible();
  const elapsed = Date.now() - started;

  console.log('liste affichée en ' + elapsed + ' ms');
  expect(elapsed).toBeLessThan(BUDGET_MS);
});

test('le régime le plus contraint reste dans le budget', async ({ page }) => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill('75');
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);
  await page.goto('/liste');

  await page.getByLabel('Régime de base').selectOption('vegan');
  await page.getByLabel('Sans gluten').check();

  const started = Date.now();
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByText('Régime : Végane')).toBeVisible();
  const elapsed = Date.now() - started;

  console.log('liste végane sans gluten affichée en ' + elapsed + ' ms');
  expect(elapsed).toBeLessThan(BUDGET_MS);
});
