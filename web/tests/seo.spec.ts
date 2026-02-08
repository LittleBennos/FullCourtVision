import { test, expect } from '@playwright/test';

test.describe('SEO Tests', () => {
  test.describe('Meta Tags', () => {
    test('Home page has required meta tags', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Title tag
      await expect(page).toHaveTitle(/.+/);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThan(60);
      
      // Meta description
      const description = await page.getAttribute('meta[name="description"]', 'content');
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(50);
      expect(description!.length).toBeLessThan(160);
      
      // Viewport meta tag
      const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
      expect(viewport).toBeTruthy();
      expect(viewport).toContain('width=device-width');
      
      // Character encoding
      // charset is set via <meta charset="utf-8"> which has no content attr
      const hasCharset = await page.locator('meta[charset]').count();
      expect(hasCharset).toBeGreaterThan(0);
    });

    test('Players page has appropriate meta tags', async ({ page }) => {
      await page.goto('/players');
      await page.waitForLoadState('networkidle');
      
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/players|fullcourtvision/);
      
      const description = await page.getAttribute('meta[name="description"]', 'content');
      expect(description).toBeTruthy();
      expect(description!.toLowerCase()).toMatch(/players|basketball|stats/);
    });

    test('Leaderboards page has appropriate meta tags', async ({ page }) => {
      await page.goto('/leaderboards');
      await page.waitForLoadState('networkidle');
      
      const title = await page.title();
      expect(title.toLowerCase()).toContain('leaderboard');
      
      const description = await page.getAttribute('meta[name="description"]', 'content');
      expect(description).toBeTruthy();
    });
  });

  test.describe('Open Graph Tags', () => {
    test('Home page has Open Graph tags', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // og:title
      const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
      expect(ogTitle).toBeTruthy();
      expect(ogTitle!.length).toBeGreaterThan(5);
      
      // og:description
      const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
      expect(ogDescription).toBeTruthy();
      expect(ogDescription!.length).toBeGreaterThan(10);
      
      // og:type
      const ogType = await page.getAttribute('meta[property="og:type"]', 'content');
      expect(ogType).toBeTruthy();
      expect(['website', 'article']).toContain(ogType);
      
      // og:url (optional — not all pages set it)
      const ogUrlEl = await page.locator('meta[property="og:url"]').count();
      if (ogUrlEl > 0) {
        const ogUrl = await page.getAttribute('meta[property="og:url"]', 'content');
        expect(ogUrl).toMatch(/^https?:\/\//);
      }
      
      // og:image (optional but recommended)
      const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
      if (ogImage) {
        expect(ogImage).toMatch(/^https?:\/\//);
      }
    });

    test('Player detail page has dynamic Open Graph tags', async ({ page }) => {
      // First get a player ID
      await page.goto('/players');
      await page.waitForLoadState('networkidle');
      
      // Look for player links
      const playerLinks = page.locator('a[href*="/players/"]');
      const playerCount = await playerLinks.count();
      
      if (playerCount > 0) {
        const firstPlayerHref = await playerLinks.first().getAttribute('href');
        
        if (firstPlayerHref) {
          await page.goto(firstPlayerHref);
          await page.waitForLoadState('networkidle');
          
          // Check for dynamic OG tags
          const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
          expect(ogTitle).toBeTruthy();
          
          const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
          expect(ogDescription).toBeTruthy();
          
          // Title should contain player-specific information
          const pageTitle = await page.title();
          expect(pageTitle.length).toBeGreaterThan(5);
        }
      } else {
        test.skip('No player links found for OG tag testing');
      }
    });
  });

  test.describe('Twitter Card Tags', () => {
    test('Home page has Twitter Card tags', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // twitter:card
      const twitterCard = await page.getAttribute('meta[name="twitter:card"]', 'content');
      if (twitterCard) {
        expect(['summary', 'summary_large_image']).toContain(twitterCard);
      }
      
      // twitter:title
      const twitterTitle = await page.getAttribute('meta[name="twitter:title"]', 'content');
      if (twitterTitle) {
        expect(twitterTitle.length).toBeGreaterThan(5);
      }
      
      // twitter:description
      const twitterDescription = await page.getAttribute('meta[name="twitter:description"]', 'content');
      if (twitterDescription) {
        expect(twitterDescription.length).toBeGreaterThan(10);
      }
    });
  });

  test.describe('Structured Data (JSON-LD)', () => {
    test('Home page has JSON-LD structured data', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const jsonLdScripts = page.locator('script[type="application/ld+json"]');
      const scriptCount = await jsonLdScripts.count();
      
      if (scriptCount > 0) {
        const jsonLdContent = await jsonLdScripts.first().textContent();
        expect(jsonLdContent).toBeTruthy();
        
        // Try to parse as valid JSON
        expect(() => JSON.parse(jsonLdContent!)).not.toThrow();
        
        const structuredData = JSON.parse(jsonLdContent!);
        expect(structuredData).toHaveProperty('@context');
        expect(structuredData).toHaveProperty('@type');
      } else {
        test.skip('No JSON-LD structured data found');
      }
    });

    test('Player page has Person structured data', async ({ page }) => {
      // Get a player page
      await page.goto('/players');
      await page.waitForLoadState('networkidle');
      
      const playerLinks = page.locator('a[href*="/players/"]');
      const playerCount = await playerLinks.count();
      
      if (playerCount > 0) {
        const firstPlayerHref = await playerLinks.first().getAttribute('href');
        
        if (firstPlayerHref) {
          await page.goto(firstPlayerHref);
          await page.waitForLoadState('networkidle');
          
          const jsonLdScripts = page.locator('script[type="application/ld+json"]');
          const scriptCount = await jsonLdScripts.count();
          
          expect(scriptCount).toBeGreaterThan(0);
          // Check that at least one JSON-LD has Person schema
          let foundPerson = false;
          for (let i = 0; i < scriptCount; i++) {
            const content = await jsonLdScripts.nth(i).textContent();
            const sd = JSON.parse(content!);
            const t = sd['@type'];
            if (t === 'Person' || (Array.isArray(t) && t.includes('Person'))) {
              foundPerson = true;
              expect(sd).toHaveProperty('name');
            }
          }
          expect(foundPerson).toBeTruthy();
        }
      } else {
        test.skip('No player links found for structured data testing');
      }
    });

    test('Organisation page has Organization structured data', async ({ page }) => {
      await page.goto('/organisations');
      await page.waitForLoadState('networkidle');
      
      const orgLinks = page.locator('a[href*="/organisations/"]');
      const orgCount = await orgLinks.count();
      
      if (orgCount > 0) {
        const firstOrgHref = await orgLinks.first().getAttribute('href');
        
        if (firstOrgHref) {
          await page.goto(firstOrgHref);
          await page.waitForLoadState('networkidle');
          
          const jsonLdScripts = page.locator('script[type="application/ld+json"]');
          const scriptCount = await jsonLdScripts.count();
          
          expect(scriptCount).toBeGreaterThan(0);
          let foundOrg = false;
          for (let i = 0; i < scriptCount; i++) {
            const content = await jsonLdScripts.nth(i).textContent();
            const sd = JSON.parse(content!);
            const t = sd['@type'];
            if (['Organization', 'SportsOrganization'].includes(t) || (Array.isArray(t) && t.some((x: string) => ['Organization', 'SportsOrganization'].includes(x)))) {
              foundOrg = true;
              expect(sd).toHaveProperty('name');
            }
          }
          expect(foundOrg).toBeTruthy();
        }
      } else {
        test.skip('No organisation links found for structured data testing');
      }
    });
  });

  test.describe('Sitemap and Robots', () => {
    test('Robots.txt is accessible', async ({ request }) => {
      const response = await request.get('/robots.txt');
      expect(response.status()).toBe(200);
      
      const content = await response.text();
      expect(content.toLowerCase()).toContain('user-agent');
    });

    test('Sitemap is accessible', async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      expect(response.status()).toBe(200);
      
      const content = await response.text();
      expect(content).toContain('<urlset');
      expect(content).toContain('xmlns');
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('Pages have semantic HTML structure', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check for semantic elements
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('nav, header')).toBeVisible();
      
      // Check for heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h1Count).toBeLessThanOrEqual(3); // Generally shouldn't have more than one h1 per page
    });

    test('Images have alt attributes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');
          
          // Alt attribute should exist (can be empty for decorative images)
          expect(alt).not.toBeNull();
        }
      }
    });
  });
});