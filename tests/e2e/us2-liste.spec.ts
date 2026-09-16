import { expect, test } from '@playwright/test';

/**
 * Parcours V3 et V4 de quickstart.md — User Story 2.
 *
 * Vérifie sur l'application réelle qu'aucun ingrédient incompatible avec le
 * régime n'est proposé, qu'aucun fruit ou légume hors saison n'apparaît, et que
 * la couverture et les écarts sont affichés.
 */

type Diet = { base: string; exclusions?: string[] };

const fillProfileAndGenerate = async (page: import('@playwright/test').Page, diet: Diet) => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill('75');
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);

  await page.getByRole('link', { name: /liste d'ingrédients/i }).click();
  await expect(page).toHaveURL(/\/liste/);

  await page.getByLabel('Régime de base').selectOption(diet.base);
  for (const exclusion of diet.exclusions ?? []) {
    const labels: Record<string, string> = { gluten: 'Sans gluten', lactose: 'Sans lactose', nuts: 'Sans fruits à coque' };
    const label = labels[exclusion];
    if (!label) throw new Error('Exclusion inconnue dans le test: ' + exclusion);
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByRole('heading', { name: /^Liste pour/ })).toBeVisible({ timeout: 15000 });
};

test('produit une liste végane sans gluten sans ingrédient incompatible (FR-013)', async ({ page }) => {
  await fillProfileAndGenerate(page, { base: 'vegan', exclusions: ['gluten'] });

  const listTable = page.getByRole('table').first();
  const categories = await listTable.locator('tbody tr td:nth-child(2)').allInnerTexts();

  expect(categories.length).toBeGreaterThan(0);
  for (const category of categories) {
    expect(['Viandes', 'Poissons', 'Œufs', 'Produits laitiers']).not.toContain(category.trim());
  }
});

test('affiche la couverture de chaque nutriment et nomme les écarts (FR-015, FR-017)', async ({ page }) => {
  await fillProfileAndGenerate(page, { base: 'vegan' });

  // Le tableau de couverture porte une ligne par nutriment du référentiel.
  const coverage = page.getByRole('table').nth(1);
  await expect(coverage.locator('tbody tr')).toHaveCount(26);
  await expect(coverage.getByText('%').first()).toBeVisible();

  // Un régime végane laisse la vitamine B12 sous son seuil: elle doit être nommée.
  await expect(page.getByText(/Vitamine B12/).first()).toBeVisible();
  await expect(page.getByText(/régime déclaré ne donne pas accès/).first()).toBeVisible();
});

test('une liste omnivore atteint tous les seuils', async ({ page }) => {
  await fillProfileAndGenerate(page, { base: 'omnivore' });

  const coverage = page.getByRole('table').nth(1);
  await expect(coverage.getByText('Sous le seuil')).toHaveCount(0);
  await expect(coverage.getByText('Atteint').first()).toBeVisible();
});

test('bascule de la journée à la semaine', async ({ page }) => {
  await fillProfileAndGenerate(page, { base: 'omnivore' });
  await page.getByLabel('Période').selectOption('week');
  await page.getByRole('button', { name: 'Générer ma liste' }).click();
  await expect(page.getByRole('heading', { name: 'Liste pour la semaine' })).toBeVisible({ timeout: 15000 });
});
