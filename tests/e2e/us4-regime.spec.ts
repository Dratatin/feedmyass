import { expect, test } from '@playwright/test';

/**
 * Parcours V2 de quickstart.md — User Story 4.
 *
 * L'invariant du principe III vu depuis l'interface: changer de régime
 * recompose la liste d'ingrédients sans toucher aux besoins. La vérification
 * porte sur les valeurs réellement affichées, pas sur le code.
 */

const computeNeeds = async (page: import('@playwright/test').Page) => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill('75');
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);
};

const needsSnapshot = async (page: import('@playwright/test').Page) => {
  const rows = await page.getByRole('table').locator('tbody tr').allInnerTexts();
  return rows.map((row) => row.replace(/\s+/g, ' ').trim());
};

const DIET_LABELS: Record<string, string> = { omnivore: 'Omnivore', vegan: 'Végane', vegetarian: 'Végétarien', pescetarian: 'Pescétarien' };

/**
 * La liste affiche le régime qu'elle applique: attendre ce texte garantit que
 * l'on lit bien la nouvelle liste et non la précédente encore à l'écran.
 */
const generateList = async (page: import('@playwright/test').Page, base: string) => {
  await page.getByLabel('Régime de base').selectOption(base);
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByText('Régime : ' + DIET_LABELS[base])).toBeVisible({ timeout: 15000 });
  return page.getByRole('table').first().locator('tbody tr').allInnerTexts();
};

test('les besoins sont identiques quel que soit le régime (principe III, SC-004)', async ({ page }) => {
  await computeNeeds(page);
  const before = await needsSnapshot(page);

  await page.goto('/liste');
  await generateList(page, 'vegan');

  // Retour aux besoins: aucune valeur ne doit avoir bougé.
  await page.goto('/besoins');
  const after = await needsSnapshot(page);
  expect(after).toEqual(before);
});

test('changer de régime recompose la liste et le dit (US4)', async ({ page }) => {
  await computeNeeds(page);
  await page.goto('/liste');

  const omnivore = await generateList(page, 'omnivore');
  const vegan = await generateList(page, 'vegan');

  expect(omnivore.length).toBeGreaterThan(0);
  expect(vegan.length).toBeGreaterThan(0);
  expect(vegan).not.toEqual(omnivore);

  await expect(page.getByText("Vos besoins n'ont pas changé")).toBeVisible();
  await expect(page.getByText(/jamais de votre régime/)).toBeVisible();
});

test('la liste végane ne contient aucun produit animal', async ({ page }) => {
  await computeNeeds(page);
  await page.goto('/liste');
  await generateList(page, 'vegan');

  const categories = await page.getByRole('table').first().locator('tbody tr td:nth-child(2)').allInnerTexts();
  for (const category of categories) {
    expect(['Viandes', 'Poissons', 'Œufs', 'Produits laitiers']).not.toContain(category.trim());
  }
});
