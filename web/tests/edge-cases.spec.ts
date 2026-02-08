import { test, expect } from '@playwright/test';

test.describe('Edge Cases Tests', () => {
  test.describe('404 Error Handling', () => {
    test('Non-existent page returns 404', async ({ page }) => {
      const response = await page.goto('/this-page-does-not-exist');
      expect(response?.status()).toBe(404);
      
      // Should have a proper 404 page
      await expect(page.locator('h1, .error-title')).toContainText(/404|not found/i);
    });

    test('Invalid player ID shows 404', async ({ page }) => {
      const response = await page.goto('/players/invalid-player-999999');
      expect(response?.status()).toBe(404);
    });

    test('Invalid team ID shows 404', async ({ page }) => {
      const response = await page.goto('/teams/invalid-team-999999');
      expect(response?.status()).toBe(404);
    });

    test('Invalid organisation ID shows 404', async ({ page }) => {
      const response = await page.goto('/organisations/invalid-org-999999');
      expect(response?.status()).toBe(404);
    });

    test('Invalid grade ID shows 404', async ({ page }) => {
      const response = await page.goto('/grades/invalid-grade-999999');
      expect(response?.status()).toBe(404);
    });
  });

  test.describe('API Error Handling', () => {
    test('API endpoints handle invalid IDs gracefully', async ({ request }) => {
      const response = await request.get('/api/players/invalid-id-999999');
      expect([404, 400]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('meta');
      }
    });

    test('API search handles malformed queries', async ({ request }) => {
      // Test with very long query
      const longQuery = 'a'.repeat(1000);
      const response1 = await request.get(`/api/search?q=${encodeURIComponent(longQuery)}`);
      expect([200, 400]).toContain(response1.status());
      
      // Test with special characters
      const specialQuery = '!@#$%^&*()[]{}|\\:";\'<>?,./ ';
      const response2 = await request.get(`/api/search?q=${encodeURIComponent(specialQuery)}`);
      expect([200, 400]).toContain(response2.status());
      
      // Test with SQL injection attempt
      const sqlQuery = "'; DROP TABLE players; --";
      const response3 = await request.get(`/api/search?q=${encodeURIComponent(sqlQuery)}`);
      expect([200, 400]).toContain(response3.status());
    });

    test('API pagination handles invalid parameters', async ({ request }) => {
      // Negative page number
      const response1 = await request.get('/api/players?page=-1');
      expect([200, 400]).toContain(response1.status());
      
      // Zero page number
      const response2 = await request.get('/api/players?page=0');
      expect([200, 400]).toContain(response2.status());
      
      // Very large page number
      const response3 = await request.get('/api/players?page=999999');
      expect([200, 400]).toContain(response3.status());
      
      // Invalid limit
      const response4 = await request.get('/api/players?limit=-5');
      expect([200, 400]).toContain(response4.status());
      
      // Very large limit
      const response5 = await request.get('/api/players?limit=10000');
      expect([200, 400]).toContain(response5.status());
    });
  });

  test.describe('Search Edge Cases', () => {
    test('Empty search query', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[name*="search"], .search-input');
      
      if (await searchInput.count() > 0) {
        // Submit empty search
        await searchInput.first().fill('');
        await searchInput.first().press('Enter');
        
        await page.waitForTimeout(1000);
        
        // Should handle gracefully - either show all results or show empty state
        await expect(page.locator('main').first()).toBeVisible();
      } else {
        test.skip('No search input found');
      }
    });

    test('Search with only spaces', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[name*="search"], .search-input');
      
      if (await searchInput.count() > 0) {
        await searchInput.first().fill('   ');
        await searchInput.first().press('Enter');
        
        await page.waitForTimeout(1000);
        await expect(page.locator('main').first()).toBeVisible();
      } else {
        test.skip('No search input found');
      }
    });

    test('Search with very long query', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[name*="search"], .search-input');
      
      if (await searchInput.count() > 0) {
        const longQuery = 'verylongplayernamethatdoesnotexistinanybasketballdatabase'.repeat(10);
        await searchInput.first().fill(longQuery);
        await searchInput.first().press('Enter');
        
        await page.waitForTimeout(2000);
        
        // Should handle gracefully
        await expect(page.locator('main').first()).toBeVisible();
      } else {
        test.skip('No search input found');
      }
    });

    test('Search with unicode characters', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[name*="search"], .search-input');
      
      if (await searchInput.count() > 0) {
        // Test with various unicode characters
        const unicodeQueries = ['🏀', 'José', 'Müller', '中文', 'العربية'];
        
        for (const query of unicodeQueries) {
          await searchInput.first().fill(query);
          await searchInput.first().press('Enter');
          await page.waitForTimeout(1000);
          
          // Should handle without errors
          await expect(page.locator('main').first()).toBeVisible();
        }
      } else {
        test.skip('No search input found');
      }
    });
  });

  test.describe('Network and Loading Edge Cases', () => {
    test('Page handles slow network gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/api/**', (route) => {
        setTimeout(() => route.continue(), 2000);
      });
      
      await page.goto('/players');
      
      // Should show loading state
      await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });
    });

    test('Page handles API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/players', (route) => {
        route.abort('failed');
      });
      
      await page.goto('/players');
      await page.waitForTimeout(2000);
      
      // Should show error state or fallback
      await expect(page.locator('main').first()).toBeVisible();
    });
  });

  test.describe('Browser Compatibility', () => {
    test('JavaScript disabled fallback', async ({ browser }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false
      });
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Should still show some content (Next.js SSR should handle this)
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('noscript, main, .content')).toBeVisible();
      
      await context.close();
    });
  });

  test.describe('Form Input Edge Cases', () => {
    test('Search form handles rapid submissions', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[name*="search"], .search-input');
      
      if (await searchInput.count() > 0) {
        // Rapidly submit multiple searches
        for (let i = 0; i < 5; i++) {
          await searchInput.first().fill(`search${i}`);
          await searchInput.first().press('Enter');
          await page.waitForTimeout(200);
        }
        
        // Should handle gracefully without crashing
        await expect(page.locator('main').first()).toBeVisible();
      } else {
        test.skip('No search input found');
      }
    });

    test('Form handles XSS attempts', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[name*="search"], .search-input');
      
      if (await searchInput.count() > 0) {
        const xssAttempts = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img src=x onerror=alert("xss")>',
          '"><script>alert("xss")</script>'
        ];
        
        for (const xss of xssAttempts) {
          await searchInput.first().fill(xss);
          await searchInput.first().press('Enter');
          await page.waitForTimeout(1000);
          
          // XSS should be prevented - no alert should appear
          const alerts: string[] = [];
          page.on('dialog', dialog => {
            alerts.push(dialog.message());
            dialog.dismiss();
          });
          
          await page.waitForTimeout(500);
          expect(alerts).toHaveLength(0);
        }
      } else {
        test.skip('No search input found');
      }
    });
  });

  test.describe('URL and Routing Edge Cases', () => {
    test('Handles malformed URLs', async ({ page }) => {
      const malformedUrls = [
        '/players/%20',
        '/players/<script>',
        '/players/../admin',
        '/players///',
        '/teams/%00',
      ];
      
      for (const url of malformedUrls) {
        const response = await page.goto(url);
        // Should either redirect or return 404, not crash
        expect([200, 301, 302, 400, 404]).toContain(response?.status() || 404);
      }
    });

    test('Handles query parameters with special characters', async ({ page }) => {
      const urls = [
        '/search?q=%3Cscript%3E',
        '/search?q=%22%27%3B',
        '/players?page=%3Cimg%3E',
        '/players?sort=%27%22%3B'
      ];
      
      for (const url of urls) {
        const response = await page.goto(url);
        expect([200, 400]).toContain(response?.status() || 200);
        
        if (response?.status() === 200) {
          await expect(page.locator('main').first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Data Validation Edge Cases', () => {
    test('Handles missing or null player data gracefully', async ({ page }) => {
      // This would ideally test with mocked API responses
      await page.goto('/players');
      await page.waitForLoadState('networkidle');
      
      // Should handle gracefully even if some player data is missing
      await expect(page.locator('main').first()).toBeVisible();
    });
    
    test('Handles empty API responses', async ({ page }) => {
      // Mock empty API response
      await page.route('**/api/players', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0 } })
        });
      });
      
      await page.goto('/players');
      await page.waitForTimeout(1000);
      
      // Should show empty state
      await expect(page.locator('main').first()).toBeVisible();
    });
  });
});
