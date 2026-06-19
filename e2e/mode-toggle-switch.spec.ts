import { test, expect } from '@playwright/test';

test.describe('Mode toggle — dégradé/SSR switch', () => {
  async function clickButtonByText(page: import('@playwright/test').Page, text: string) {
    // Utiliser dispatchEvent pour garantir que le clic passe par Vue
    await page.evaluate((btnText) => {
      // Chercher le bouton par son contenu textuel
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim() === btnText) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return;
        }
      }
    }, text);
    await page.waitForTimeout(500);
  }

  async function checkState(
    page: import('@playwright/test').Page,
    expectedText: string,
    expectedBgClass: string,
    expectedLsValue: string | null,
  ) {
    const btn = page.locator('button').filter({ hasText: expectedText }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });

    const classAttr = await btn.getAttribute('class');
    expect(classAttr).toContain(expectedBgClass);

    const lsVal = await page.evaluate(() => localStorage.getItem('force-mode'));
    expect(lsVal).toBe(expectedLsValue);
  }

  test('alterne entre Auto, Dégradé et SSR — badge change de couleur + localStorage mis à jour', async ({ page }) => {
    await page.goto('/context', { waitUntil: 'load' });
    await page.waitForSelector('text=Réanalyser', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Nettoyer localStorage
    await page.evaluate(() => localStorage.removeItem('force-mode'));
    await page.reload();
    await page.waitForSelector('text=Réanalyser', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Auto → localStorage n'existe pas → null
    await checkState(page, 'Auto', 'bg-amber-50', null);

    // Auto → Dégradé (1er clic)
    await clickButtonByText(page, 'Auto');
    await checkState(page, 'Dégradé', 'bg-red-50', 'degraded');

    // Dégradé → SSR (2e clic)
    await clickButtonByText(page, 'Dégradé');
    await checkState(page, 'SSR', 'bg-blue-50', 'ssr');

    // SSR → Auto (3e clic)
    await clickButtonByText(page, 'SSR');
    await checkState(page, 'Auto', 'bg-amber-50', '');

    // Vérifier la persistance après reload
    await page.reload();
    await page.waitForSelector('text=Réanalyser', { timeout: 20000 });
    await page.waitForTimeout(1000);
    await checkState(page, 'Auto', 'bg-amber-50', '');
  });

  test('persiste le mode forcé après rechargement — SSR puis reload', async ({ page }) => {
    await page.goto('/context', { waitUntil: 'load' });
    await page.waitForSelector('text=Réanalyser', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Nettoyer localStorage
    await page.evaluate(() => localStorage.removeItem('force-mode'));
    await page.reload();
    await page.waitForSelector('text=Réanalyser', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Auto → Dégradé (1er clic)
    await clickButtonByText(page, 'Auto');

    // Dégradé → SSR (2e clic)
    await clickButtonByText(page, 'Dégradé');

    await expect(page.locator('text=SSR').first()).toBeVisible({ timeout: 5000 });

    // Vérifier localStorage avant reload
    const lsBefore = await page.evaluate(() => localStorage.getItem('force-mode'));
    expect(lsBefore).toBe('ssr');

    // Recharger
    await page.reload();
    await page.waitForSelector('text=Réanalyser', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Le mode SSR doit être restauré
    await expect(page.locator('text=SSR').first()).toBeVisible({ timeout: 5000 });

    const btnAfter = page.locator('button').filter({ hasText: 'SSR' }).first();
    const classAfter = await btnAfter.getAttribute('class');
    expect(classAfter).toContain('bg-blue-50');

    const lsAfter = await page.evaluate(() => localStorage.getItem('force-mode'));
    expect(lsAfter).toBe('ssr');
  });
});
