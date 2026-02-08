import { test, expect } from '@playwright/test';

test.describe('Page Load Tests', () => {
  test('Home page loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FullCourtVision/);
    await expect(page.locator('h1')).toContainText(/FullCourtVision|Basketball/);
    
    // Check for no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('Players page loads without errors', async ({ page }) => {
    await page.goto('/players');
    await expect(page).toHaveTitle(/Players|FullCourtVision/);
    
    // Wait for the players table to load
    await expect(page.locator('[data-testid="players-table"], table, .players')).toBeVisible({ timeout: 10000 });
    
    // Check response status
    const response = await page.waitForResponse(resp => resp.url().includes('/players') && resp.status() === 200);
    expect(response.status()).toBe(200);
  });

  test('Teams page loads without errors', async ({ page }) => {
    await page.goto('/teams');
    await expect(page).toHaveTitle(/Teams|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });

  test('Organisations page loads without errors', async ({ page }) => {
    await page.goto('/organisations');
    await expect(page).toHaveTitle(/Organisations|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });

  test('Leaderboards page loads without errors', async ({ page }) => {
    await page.goto('/leaderboards');
    await expect(page).toHaveTitle(/Leaderboards|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });

  test('Rising Stars page loads without errors', async ({ page }) => {
    await page.goto('/rising-stars');
    await expect(page).toHaveTitle(/Rising Stars|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });

  test('Compare page loads without errors', async ({ page }) => {
    await page.goto('/compare');
    await expect(page).toHaveTitle(/Compare|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });

  test('Search page loads without errors', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveTitle(/Search|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });

  test('Heatmap page loads without errors', async ({ page }) => {
    await page.goto('/heatmap');
    await expect(page).toHaveTitle(/Heatmap|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });

  test('Grades page loads without errors', async ({ page }) => {
    await page.goto('/grades');
    await expect(page).toHaveTitle(/Grades|FullCourtVision/);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, .content')).toBeVisible();
  });
});