import { test, expect } from '@playwright/test';

test.describe('Replay UI', () => {
  test('load sample scenario, switch to replay tab, step through events', async ({ page }) => {
    await page.goto('/inspector');

    // Load a scenario and analyze
    await page.getByRole('button', { name: 'normal-session' }).click();
    await page.getByRole('button', { name: 'Analyze' }).click();

    // Wait for results
    await expect(page.getByText('Event Timeline')).toBeVisible({ timeout: 10000 });

    // Switch to replay tab
    await page.getByRole('button', { name: 'replay' }).click();
    await expect(page.getByTestId('replay-view')).toBeVisible();

    // Check initial state — 1 / N events
    await expect(page.getByText('1 /')).toBeVisible();

    // Step forward
    await page.getByRole('button', { name: 'Forward →' }).click();
    await expect(page.getByText('2 /')).toBeVisible();

    // Step back
    await page.getByRole('button', { name: '← Back' }).click();
    await expect(page.getByText('1 /')).toBeVisible();
  });

  test('replay shows event payload when stepping', async ({ page }) => {
    await page.goto('/inspector');

    await page.getByRole('button', { name: 'normal-session' }).click();
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByText('Event Timeline')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'replay' }).click();
    await expect(page.getByTestId('replay-view')).toBeVisible();

    // Step forward — should show event details
    await page.getByRole('button', { name: 'Forward →' }).click();
    // The event payload should be visible as JSON
    await expect(page.locator('[data-testid="replay-view"] pre')).toBeVisible();
  });

  test('report view shows HTML report', async ({ page }) => {
    await page.goto('/inspector');

    await page.getByRole('button', { name: 'normal-session' }).click();
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByText('Event Timeline')).toBeVisible({ timeout: 10000 });

    // Switch to report tab
    await page.getByRole('button', { name: 'report' }).click();
    await expect(page.getByTestId('report-view')).toBeVisible();

    // Select HTML format
    const formatSelect = page.locator('select').first();
    await formatSelect.selectOption('html');

    // Switch back to report view to see the iframe
    await page.getByRole('button', { name: 'report' }).click();
    await expect(page.locator('[data-testid="report-view"] iframe')).toBeVisible({
      timeout: 10000,
    });
  });
});
