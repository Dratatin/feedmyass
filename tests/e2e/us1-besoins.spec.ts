import { expect, test } from '@playwright/test';

/**
 * Parcours V1 de quickstart.md — User Story 1.
 *
 * Vérifie les quatre scénarios d'acceptation d'US1: saisie sans compte,
 * affichage complet avec source, relation hebdomadaire, refus motivé d'un
 * profil hors bornes, et présence de la mention non médicale.
 */

const fillProfile = async (page: import('@playwright/test').Page, weight = '75') => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill(weight);
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
};

test('affiche les besoins journaliers et hebdomadaires sans créer de compte', async ({ page }) => {
  await fillProfile(page);

  await expect(page).toHaveURL(/\/besoins/);
  await expect(page.getByRole('heading', { name: 'Vos besoins nutritionnels' })).toBeVisible();

  // Mention non médicale sur tout écran de résultat (FR-010).
  await expect(page.getByText('ni diagnostic')).toBeVisible();

  // Énergie et protéines présentes, avec la nature de la référence (FR-009).
  const table = page.getByRole('table');
  await expect(table.getByRole('row', { name: /Énergie/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Protéines/ })).toBeVisible();
  await expect(table.getByText('BEM').first()).toBeVisible();

  // Le référentiel compte 26 nutriments; l'en-tête ajoute une ligne.
  await expect(table.locator('tbody tr')).toHaveCount(26);
});

test('la valeur hebdomadaire vaut sept fois la valeur journalière (FR-006)', async ({ page }) => {
  await fillProfile(page);

  const energyCell = () => page.getByRole('row', { name: /Énergie/ }).getByRole('cell').nth(1);
  const parse = async () => {
    const text = (await energyCell().innerText()).replace(/\s|\u202f|\u00a0/g, '').replace('kcal', '');
    return Number(text.replace(',', '.'));
  };

  const daily = await parse();
  await page.getByRole('button', { name: 'Par semaine' }).click();
  const weekly = await parse();

  expect(weekly).toBeCloseTo(daily * 7, -1);
});

test('refuse un poids hors bornes en nommant le champ fautif (FR-002)', async ({ page }) => {
  await fillProfile(page, '400');

  await expect(page).toHaveURL(/\/profil/);
  const weight = page.getByLabel('Poids (kg)');
  await expect(weight).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert').first()).toContainText('30');
});

test("invite à saisir un profil quand aucun résultat n'est en session", async ({ page }) => {
  await page.goto('/besoins');
  await expect(page.getByRole('heading', { name: 'Aucun résultat' })).toBeVisible();
});
