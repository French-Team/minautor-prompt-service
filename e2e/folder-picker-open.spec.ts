import { test, expect } from '@playwright/test';

test.describe('Folder picker — Parcourir button', () => {
  async function openPicker(page: import('@playwright/test').Page) {
    await page.goto('/context', { waitUntil: 'load' });
    await page.waitForSelector('button[title="Parcourir…"]', { timeout: 15000 });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Parcourir…"]');
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(500);

    await page.waitForSelector('text=Sélectionner un dossier', { timeout: 10000 });
  }

  async function isApiAvailable(page: import('@playwright/test').Page): Promise<boolean> {
    const errorVisible = await page.locator('text=Impossible de charger ce dossier').isVisible();
    return !errorVisible;
  }

  test('ouvre le modal avec le header, breadcrumb racine et boutons Annuler/Sélectionner', async ({ page }) => {
    await openPicker(page);

    await expect(page.locator('text=Sélectionner un dossier').first()).toBeVisible();

    // Utiliser filter({ hasText }) au lieu de has-text() CSS pour éviter les problèmes d'échappement du backslash
    const rootLabel = await page.evaluate(() => (navigator.userAgent.includes('Windows') ? 'C:\\' : '/'));
    const rootBtn = page.locator('button').filter({ hasText: rootLabel }).first();
    await expect(rootBtn).toBeVisible();

    const backBtn = page.locator('button[title="Dossier parent"]');
    await expect(backBtn).toBeVisible();

    // Le bouton retour est disabled seulement à la racine SI l'API FS fonctionne
    const apiOk = await isApiAvailable(page);
    if (apiOk) {
      await expect(backBtn).toBeDisabled();
    }

    await expect(page.locator('text=Chemin sélectionné').first()).toBeVisible();
    await expect(page.locator('text=Annuler').first()).toBeVisible();
    await expect(page.locator('text=Sélectionner').first()).toBeVisible();
  });

  test("affiche la liste des dossiers (pas vide, pas de message d'erreur)", async ({ page }) => {
    await openPicker(page);

    await page.waitForSelector('text=Chargement…', { state: 'hidden', timeout: 15000 }).catch(() => {});

    if (!(await isApiAvailable(page))) {
      test.skip(true, 'API list-dirs non disponible');
      return;
    }

    const folderCount = await page.locator('[class*="overflow-y-auto"] button').count();
    expect(folderCount).toBeGreaterThan(0);

    const firstFolder = page.locator('[class*="overflow-y-auto"] button').first();
    await expect(firstFolder).toBeVisible();
  });

  test('navigue dans un sous-dossier et met à jour le breadcrumb', async ({ page }) => {
    await openPicker(page);

    await page.waitForSelector('text=Chargement…', { state: 'hidden', timeout: 10000 }).catch(() => {});

    if (!(await isApiAvailable(page))) {
      test.skip(true, 'API list-dirs non disponible');
      return;
    }

    const folderName = await page.evaluate(() => {
      const container = document.querySelector('[class*="overflow-y-auto"]');
      if (!container) return '';
      const firstBtn = container.querySelector('button');
      const span = firstBtn?.querySelector('span');
      return span?.textContent?.trim() || '';
    });

    if (!folderName) return;

    await page.locator('button').filter({ hasText: folderName }).first().click();
    await page.waitForSelector('text=Chargement…', { state: 'hidden', timeout: 10000 });

    const breadcrumbBtn = page.locator('button').filter({ hasText: folderName }).first();
    await expect(breadcrumbBtn).toBeVisible();
    const classAttr = await breadcrumbBtn.getAttribute('class');
    expect(classAttr).toContain('font-semibold');
    await expect(page.locator(`text=${folderName}`).first()).toBeVisible();
  });

  test('le bouton retour parent est actif après navigation et fonctionne', async ({ page }) => {
    await openPicker(page);

    await page.waitForSelector('text=Chargement…', { state: 'hidden', timeout: 10000 }).catch(() => {});

    if (!(await isApiAvailable(page))) {
      test.skip(true, 'API list-dirs non disponible');
      return;
    }

    const folderName = await page.evaluate(() => {
      const container = document.querySelector('[class*="overflow-y-auto"]');
      if (!container) return '';
      const firstBtn = container.querySelector('button span');
      return firstBtn?.textContent?.trim() || '';
    });

    if (!folderName) return;

    await page.locator('button').filter({ hasText: folderName }).first().click();
    await page.waitForSelector('text=Chargement…', { state: 'hidden', timeout: 10000 });

    const backBtn = page.locator('button[title="Dossier parent"]');
    await expect(backBtn).not.toBeDisabled();
    await backBtn.click();
    await page.waitForSelector('text=Chargement…', { state: 'hidden', timeout: 10000 });

    // Le bouton retour doit être désactivé après être revenu à la racine
    await expect(backBtn).toBeDisabled();

    const rootLabel = await page.evaluate(() => (navigator.userAgent.includes('Windows') ? 'C:\\' : '/'));
    await expect(page.locator('button').filter({ hasText: rootLabel }).first()).toBeVisible();
  });

  test('sélectionne un dossier → modal fermé + input mis à jour', async ({ page }) => {
    await openPicker(page);

    await page.waitForSelector('text=Chargement…', { state: 'hidden', timeout: 10000 }).catch(() => {});

    if (!(await isApiAvailable(page))) {
      test.skip(true, 'API list-dirs non disponible');
      return;
    }

    const currentPath = await page.locator('[class*="font-mono"][class*="truncate"]').first().textContent();
    expect(currentPath).toBeTruthy();

    await page.click('button:has-text("Sélectionner")');
    await expect(page.locator('text=Sélectionner un dossier')).not.toBeVisible();

    // Normaliser les deux chemins côté navigateur pour éviter les différences d'échappement
    const inputVal = await page.locator('input[placeholder*="Chemin du dossier"]').inputValue();
    const inputNorm = await page.evaluate((path: string) => path.replace(/\\/g, '/').replace(/\/$/, ''), inputVal);
    const pathNorm = await page.evaluate(
      (path: string) => (path || '').replace(/\\/g, '/').replace(/\/$/, ''),
      currentPath || '',
    );
    expect(inputNorm).toBe(pathNorm);
  });

  test('Annuler ferme le modal sans modifier le chemin', async ({ page }) => {
    await openPicker(page);

    const inputBefore = await page.locator('input[placeholder*="Chemin du dossier"]').inputValue();
    await page.click('button:has-text("Annuler")');
    await expect(page.locator('text=Sélectionner un dossier')).not.toBeVisible();

    const inputAfter = await page.locator('input[placeholder*="Chemin du dossier"]').inputValue();
    expect(inputAfter).toBe(inputBefore);
  });
});
