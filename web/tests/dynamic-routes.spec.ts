import { test, expect } from '@playwright/test';

test.describe('Dynamic Routes Tests', () => {
  let playerId: string;
  let teamId: string;
  let orgId: string;
  let gradeId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Get a sample player ID from the players API
    try {
      const playersResponse = await page.request.get('/api/players');
      const playersData = await playersResponse.json();
      if (playersData.data && playersData.data.length > 0) {
        playerId = playersData.data[0].id || playersData.data[0].player_id;
      }
    } catch (error) {
      console.log('Could not fetch player ID:', error);
    }

    // Get a sample team ID from the teams API
    try {
      const teamsResponse = await page.request.get('/api/teams');
      const teamsData = await teamsResponse.json();
      if (teamsData.data && teamsData.data.length > 0) {
        teamId = teamsData.data[0].id || teamsData.data[0].team_id;
      }
    } catch (error) {
      console.log('Could not fetch team ID:', error);
    }

    // Get a sample organisation ID from the organisations API
    try {
      const orgsResponse = await page.request.get('/api/organisations');
      const orgsData = await orgsResponse.json();
      if (orgsData.data && orgsData.data.length > 0) {
        orgId = orgsData.data[0].id || orgsData.data[0].organisation_id;
      }
    } catch (error) {
      console.log('Could not fetch organisation ID:', error);
    }

    await context.close();
  });

  test('Player detail page shows stats table', async ({ page }) => {
    test.skip(!playerId, 'No player ID available for testing');
    
    await page.goto(`/players/${playerId}`);
    await expect(page).toHaveTitle(/Player|FullCourtVision/);
    
    // Wait for the player stats to load
    await page.waitForLoadState('networkidle');
    
    // Check for player information
    await expect(page.locator('h1, .player-name, [data-testid="player-name"]')).toBeVisible();
    
    // Check for stats table or stats section
    await expect(page.locator('table, .stats, [data-testid="stats"], .player-stats')).toBeVisible({ timeout: 10000 });
  });

  test('Team detail page shows roster', async ({ page }) => {
    test.skip(!teamId, 'No team ID available for testing');
    
    await page.goto(`/teams/${teamId}`);
    await expect(page).toHaveTitle(/Team|FullCourtVision/);
    
    // Wait for the team details to load
    await page.waitForLoadState('networkidle');
    
    // Check for team information
    await expect(page.locator('h1, .team-name, [data-testid="team-name"]')).toBeVisible();
    
    // Check for roster or players list
    await expect(page.locator('.roster, .players, table, [data-testid="roster"]')).toBeVisible({ timeout: 10000 });
  });

  test('Organisation detail page shows teams and players', async ({ page }) => {
    test.skip(!orgId, 'No organisation ID available for testing');
    
    await page.goto(`/organisations/${orgId}`);
    await expect(page).toHaveTitle(/Organisation|FullCourtVision/);
    
    // Wait for the organisation details to load
    await page.waitForLoadState('networkidle');
    
    // Check for organisation information
    await expect(page.locator('h1, .organisation-name, [data-testid="organisation-name"]')).toBeVisible();
    
    // Check for teams or players section
    const content = page.locator('main, .content');
    await expect(content).toContainText(/teams|players|roster/i);
  });

  test('Grade detail page loads successfully', async ({ page }) => {
    // First, let's try to get some grade IDs from the grades page
    await page.goto('/grades');
    await page.waitForLoadState('networkidle');
    
    // Look for grade links or IDs
    const gradeLinks = page.locator('a[href*="/grades/"], .grade-link');
    const gradeCount = await gradeLinks.count();
    
    if (gradeCount > 0) {
      // Get the first grade link
      const firstGradeHref = await gradeLinks.first().getAttribute('href');
      if (firstGradeHref) {
        gradeId = firstGradeHref.split('/grades/')[1];
        
        await page.goto(`/grades/${gradeId}`);
        // Grade pages use the grade name as title (e.g. "A Men — Domestic")
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        
        // Wait for content to load
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main, .content')).toBeVisible();
      }
    } else {
      test.skip('No grade links found for testing');
    }
  });

  test('Invalid player ID returns 404', async ({ page }) => {
    const response = await page.goto('/players/invalid-player-id-999999');
    expect(response?.status()).toBe(404);
  });

  test('Invalid team ID returns 404', async ({ page }) => {
    const response = await page.goto('/teams/invalid-team-id-999999');
    expect(response?.status()).toBe(404);
  });

  test('Invalid organisation ID returns 404', async ({ page }) => {
    const response = await page.goto('/organisations/invalid-org-id-999999');
    expect(response?.status()).toBe(404);
  });

  test('Invalid grade ID returns 404', async ({ page }) => {
    const response = await page.goto('/grades/invalid-grade-id-999999');
    expect(response?.status()).toBe(404);
  });
});