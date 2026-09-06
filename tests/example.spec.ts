import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
    await page.goto('https://smart-wear-gules.vercel.app/');

    await expect(page).toHaveTitle(/SmartWear/i);
});