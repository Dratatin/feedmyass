import { expect, test } from '@playwright/test';

/**
 * Responsive (FR-031, SC-008).
 *
 * De 320 px à 1920 px, aucune perte de fonctionnalité et aucun défilement
 * horizontal de la page. Seuls les tableaux ont le droit de défiler
 * horizontalement, dans leur propre conteneur.
 */

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

const hasHorizontalOverflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

for (const path of ['/', '/profil', '/connexion']) {
  test('aucun défilement horizontal sur ' + path, async ({ page }) => {
    await page.goto(path);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
}

test('aucun défilement horizontal sur les résultats et la liste', async ({ page }) => {
  await fillProfile(page);
  expect(await hasHorizontalOverflow(page), 'écran des besoins').toBe(false);

  await page.goto('/liste');
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByText('Régime : Omnivore')).toBeVisible({ timeout: 15000 });
  expect(await hasHorizontalOverflow(page), 'écran de la liste').toBe(false);
});

test('le tableau des besoins défile dans son propre conteneur', async ({ page }) => {
  await fillProfile(page);

  // Le tableau peut être plus large que l'écran, mais son conteneur doit gérer
  // le débordement au lieu de le répercuter sur la page.
  const overflow = await page.getByRole('table').evaluate((table) => {
    const container = table.parentElement!;
    return getComputedStyle(container).overflowX;
  });
  expect(['auto', 'scroll']).toContain(overflow);
});

test('le parcours complet reste réalisable à cette largeur', async ({ page }) => {
  await fillProfile(page);
  await expect(page.getByRole('heading', { name: 'Vos besoins nutritionnels' })).toBeVisible();
  await page.getByRole('button', { name: 'Par semaine' }).click();
  await expect(page.getByRole('table')).toBeVisible();

  await page.getByRole('link', { name: /liste d'ingrédients/i }).click();
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByText('Régime : Omnivore')).toBeVisible({ timeout: 15000 });
});
