import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Calendrier de saison et verrouillage du parcours (FR-120, FR-124, FR-125).
 *
 * Deux constats du parcours refait à la main le 2026-09-18: « voir ce qui est
 * de saison » ne menait nulle part, et les étapes du parcours étaient
 * consultables dans le désordre. Ces tests empêchent le retour de l'un comme de
 * l'autre.
 */

test("l'accueil mène au calendrier de saison, qui répond à la question posée", async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Voir ce qui est de saison' }).click();

  await expect(page).toHaveURL(/\/de-saison/);
  await expect(page.getByRole('heading', { name: /^De saison en/ })).toBeVisible();

  // La page montre des produits, pas une demande de profil.
  await expect(page.getByRole('heading', { name: /Légumes|Fruits/ }).first()).toBeVisible();
  await expect(page.getByText('Renseigner mon profil')).toHaveCount(0);
});

test('le calendrier se consulte mois par mois sans compte', async ({ page }) => {
  await page.goto('/de-saison?mois=1');
  await expect(page.getByRole('heading', { name: 'De saison en janvier' })).toBeVisible();

  await page.getByRole('link', { name: 'juillet' }).click();
  await expect(page).toHaveURL(/mois=7/);
  await expect(page.getByRole('heading', { name: 'De saison en juillet' })).toBeVisible();
});

test('un mois hors bornes retombe sur le mois courant', async ({ page }) => {
  await page.goto('/de-saison?mois=42');
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  await expect(page.getByRole('heading', { name: 'De saison en ' + mois })).toBeVisible();
});

test('les étapes suivantes ne sont pas atteignables sans la précédente', async ({ page }) => {
  await page.goto('/profil');

  // Le rail montre les trois étapes, mais seules celles atteintes sont des liens.
  await expect(page.getByRole('link', { name: /Profil/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^2 Besoins/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^3 Ingrédients/ })).toHaveCount(0);

  // Une fois le profil calculé, les deux suivantes s'ouvrent.
  await page.getByLabel('Poids (kg)').fill('75');
  await page.getByLabel('Taille (cm)').fill('178');
  await page.getByLabel('Âge (années)').fill('35');
  await page.getByLabel('Table de référence utilisée').selectOption('male');
  await page.getByLabel("Niveau d'activité physique").selectOption('active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);

  await expect(page.getByRole('link', { name: /Ingrédients/ })).toBeVisible();
});

test('le formulaire de profil est repris à la visite suivante (FR-122)', async ({ page }) => {
  await page.goto('/profil');
  await page.getByLabel('Poids (kg)').fill('82');
  await page.getByLabel('Taille (cm)').fill('180');
  await page.getByLabel('Âge (années)').fill('41');
  await page.getByLabel('Table de référence utilisée').selectOption('female');
  await page.getByLabel("Niveau d'activité physique").selectOption('low_active');
  await page.getByRole('button', { name: 'Calculer mes besoins' }).click();
  await expect(page).toHaveURL(/\/besoins/);

  await page.getByRole('link', { name: 'Modifier mon profil' }).click();
  await expect(page).toHaveURL(/\/profil/);

  await expect(page.getByLabel('Poids (kg)')).toHaveValue('82');
  await expect(page.getByLabel('Taille (cm)')).toHaveValue('180');
  await expect(page.getByLabel('Âge (années)')).toHaveValue('41');
  await expect(page.getByLabel('Table de référence utilisée')).toHaveValue('female');
  await expect(page.getByLabel("Niveau d'activité physique")).toHaveValue('low_active');
});

test('le calendrier de saison est sans violation WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/de-saison');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => v.id + ': ' + v.description)).toEqual([]);
});

test('le contenu occupe au moins la hauteur de la fenêtre (FR-126)', async ({ page }) => {
  for (const path of ['/', '/de-saison', '/profil', '/connexion']) {
    await page.goto(path);
    const fills = await page.evaluate(
      () => document.body.getBoundingClientRect().height >= window.innerHeight - 1,
    );
    expect(fills, path).toBe(true);
  }
});
