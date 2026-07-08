import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('page loads and shows hero', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('OCPP DebugKit');
    await expect(page.locator('h1')).toHaveText('OCPP DebugKit');
  });

  test('hero has CTA links', async ({ page }) => {
    await page.goto('/');
    const inspectorLink = page.getByRole('link', { name: 'Try Inspector' });
    await expect(inspectorLink).toBeVisible();
    await expect(inspectorLink).toHaveAttribute('href', '/inspector');

    const githubLink = page.getByRole('link', { name: 'View on GitHub' });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', /github\.com/);
  });

  test('features section is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();
    await expect(page.getByText('Inspect').first()).toBeVisible();
    await expect(page.getByText('Detect').first()).toBeVisible();
    await expect(page.getByText('Test').first()).toBeVisible();
    await expect(page.getByText('Report').first()).toBeVisible();
  });

  test("what it's not section is present", async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText("What it's not")).toBeVisible();
    await expect(page.getByText('Not a CSMS')).toBeVisible();
    await expect(page.getByText('Not a simulator')).toBeVisible();
    await expect(page.getByText('Not a compliance tool')).toBeVisible();
  });

  test('footer has links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'GitHub' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'npm' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Docs' })).toBeVisible();
    await expect(footer.getByText('Apache 2.0 License')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('can navigate from landing to inspector', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Try Inspector' }).click();
    await expect(page).toHaveURL('/inspector');
    await expect(page.getByText('OCPP Inspector')).toBeVisible();
  });

  test('can navigate to docs', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Docs' }).first().click();
    await expect(page).toHaveURL('/docs');
    await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible();
  });
});
