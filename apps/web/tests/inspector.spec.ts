import { test, expect } from '@playwright/test';

test.describe('Inspector', () => {
  test('page loads with empty state', async ({ page }) => {
    await page.goto('/inspector');
    await expect(page.getByRole('link', { name: 'OCPP DebugKit' })).toBeVisible();
    await expect(page.getByText('Inspector')).toBeVisible();
    await expect(page.getByText('Paste OCPP Trace')).toBeVisible();
    await expect(page.getByText('Sample Scenarios')).toBeVisible();
    // Empty state message
    await expect(
      page.getByText('Paste a trace, upload a file, or select a sample scenario'),
    ).toBeVisible();
  });

  test('load sample scenario and see timeline', async ({ page }) => {
    await page.goto('/inspector');

    // Click the normal-session scenario button
    await page.getByRole('button', { name: 'normal-session' }).click();

    // The textarea should now have content
    const textarea = page.locator('textarea');
    await expect(textarea).not.toBeEmpty();

    // Click Analyze
    await page.getByRole('button', { name: 'Analyze' }).click();

    // Wait for results — stat cards should appear
    await expect(page.getByText('Events').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sessions').first()).toBeVisible();

    // Timeline should be present
    await expect(page.getByText('Event Timeline')).toBeVisible();
  });

  test('load failed-auth scenario and see failures', async ({ page }) => {
    await page.goto('/inspector');

    await page.getByRole('button', { name: 'failed-auth' }).click();
    await page.getByRole('button', { name: 'Analyze' }).click();

    // Wait for failure to appear — scope to the failures section to avoid
    // matching the trace JSON in the textarea. Use .first() because the
    // failed-auth fixture produces multiple FAILED_AUTHORIZATION failures.
    await expect(
      page.locator('[data-testid="failure-summary"]').getByText('FAILED_AUTHORIZATION').first(),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test('click event in timeline to inspect message', async ({ page }) => {
    await page.goto('/inspector');

    await page.getByRole('button', { name: 'normal-session' }).click();
    await page.getByRole('button', { name: 'Analyze' }).click();

    // Wait for timeline
    await expect(page.getByText('Event Timeline')).toBeVisible({ timeout: 10000 });

    // Click first event button in the timeline
    const firstEvent = page.locator('[data-event-id]').first();
    await firstEvent.click();

    // Message inspector should show details
    await expect(page.getByText('Message Inspector')).toBeVisible();
    await expect(page.getByText('Raw Message')).toBeVisible();
    await expect(page.getByText('Payload')).toBeVisible();
  });

  test('export report button appears after analysis', async ({ page }) => {
    await page.goto('/inspector');

    await page.getByRole('button', { name: 'normal-session' }).click();
    await page.getByRole('button', { name: 'Analyze' }).click();

    // Wait for results
    await expect(page.getByText('Event Timeline')).toBeVisible({ timeout: 10000 });

    // Export button should be visible
    await expect(page.getByRole('button', { name: 'Export Report' })).toBeVisible();
  });

  test('handles invalid input gracefully', async ({ page }) => {
    await page.goto('/inspector');

    // Type invalid JSON
    await page.locator('textarea').fill('{ invalid json }');
    await page.getByRole('button', { name: 'Analyze' }).click();

    // Should show error message (not crash)
    await expect(page.getByText('Error:')).toBeVisible({ timeout: 10000 });
  });
});
