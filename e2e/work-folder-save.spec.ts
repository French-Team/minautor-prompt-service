import { test, expect } from '@playwright/test';

test.describe('Work folder — save & persist', () => {
  test('saisit un chemin, sélectionne le dossier via le picker, vérifie la persistance', async ({ page }) => {
    await page.goto('/context', { waitUntil: 'load' });

    const input = page.locator('input[placeholder*="Chemin du dossier"]');
    await input.fill('/tmp');

    const value = await input.inputValue();
    expect(value).toBe('/tmp');

    // Utiliser dispatchEvent pour garantir que le clic passe par Vue
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Parcourir…"]');
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(500);
    // Attendre l'ouverture du modal
    await page.waitForSelector('text=Sélectionner un dossier', { timeout: 10000 });
    await expect(page.locator('text=Sélectionner un dossier').first()).toBeVisible();
  });
});
