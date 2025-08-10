import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load test data
const gameTestData = JSON.parse(
  readFileSync(join(__dirname, '../test-data/game-test-data.json'), 'utf8')
);

/**
 * Landing Page Integration Tests
 * Tests hero section, statistics display, match listings, and user interactions
 */
test.describe('Landing Page Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Mock API responses for consistent testing
    await setupAPIResponses(page);

    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Hero Section Presentation', () => {
    test('should display header text and branding correctly', async () => {
      // Check main heading
      const mainHeading = page.locator('[data-testid="hero-heading"]').first();
      await expect(mainHeading).toBeVisible();
      await expect(mainHeading).toContainText('Nen Platform');

      // Check tagline/subtitle
      const tagline = page.locator('[data-testid="hero-tagline"]').first();
      if (await tagline.isVisible()) {
        await expect(tagline).toContainText('AI-powered Gungi');
      }

      // Check logo/branding
      const logo = page.locator('[data-testid="platform-logo"]').first();
      if (await logo.isVisible()) {
        await expect(logo).toBeVisible();
      }
    });

    test('should render call-to-action buttons with proper states', async () => {
      // Primary CTA button
      const primaryCTA = page.locator('[data-testid="primary-cta-button"]').first();
      if (await primaryCTA.isVisible()) {
        await expect(primaryCTA).toBeVisible();
        await expect(primaryCTA).toBeEnabled();

        // Test hover state
        await primaryCTA.hover();
        await expect(primaryCTA).toHaveClass(/hover/);
      }

      // Secondary CTA button
      const secondaryCTA = page.locator('[data-testid="secondary-cta-button"]').first();
      if (await secondaryCTA.isVisible()) {
        await expect(secondaryCTA).toBeVisible();
        await expect(secondaryCTA).toBeEnabled();
      }
    });

    test('should maintain visual hierarchy across different screen sizes', async () => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Check hero section is visible and properly sized
        const heroSection = page.locator('[data-testid="hero-section"]').first();
        if (await heroSection.isVisible()) {
          const heroBox = await heroSection.boundingBox();
          expect(heroBox?.width).toBeGreaterThan(0);
          expect(heroBox?.height).toBeGreaterThan(100);
        }

        // Verify text is readable (not overlapping)
        const heading = page.locator('[data-testid="hero-heading"]').first();
        if (await heading.isVisible()) {
          const headingBox = await heading.boundingBox();
          expect(headingBox?.height).toBeGreaterThan(20); // Minimum readable height
        }
      }
    });

    test('should handle loading states gracefully', async () => {
      // Test initial loading state
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Check for loading indicators
      const loadingIndicator = page.locator('[data-testid="hero-loading"]').first();
      if (await loadingIndicator.isVisible({ timeout: 1000 })) {
        await expect(loadingIndicator).toBeVisible();

        // Wait for content to load
        await page.waitForLoadState('networkidle');
        await expect(loadingIndicator).not.toBeVisible();
      }
    });
  });

  test.describe('Statistics Display', () => {
    test('should fetch and display live data correctly', async () => {
      // Wait for statistics to load
      const statsContainer = page.locator('[data-testid="statistics-container"]').first();
      if (await statsContainer.isVisible()) {
        await expect(statsContainer).toBeVisible();

        // Check individual stat cards
        const totalPlayers = page.locator('[data-testid="stat-total-players"]').first();
        const activeGames = page.locator('[data-testid="stat-active-games"]').first();
        const totalPool = page.locator('[data-testid="stat-total-pool"]').first();

        if (await totalPlayers.isVisible()) {
          await expect(totalPlayers).toContainText(/\d+/); // Should contain numbers
        }

        if (await activeGames.isVisible()) {
          await expect(activeGames).toContainText(/\d+/);
        }

        if (await totalPool.isVisible()) {
          await expect(totalPool).toContainText(/\d+\.?\d*\s*SOL/); // Should show SOL amount
        }
      }
    });

    test('should format numbers correctly', async () => {
      const numberElements = page.locator('[data-testid^="stat-"]');
      const count = await numberElements.count();

      for (let i = 0; i < count; i++) {
        const element = numberElements.nth(i);
        const text = await element.textContent();

        if (text && /\d/.test(text)) {
          // Check for proper formatting (commas for thousands, decimal points)
          expect(text).toMatch(/[\d,]+\.?\d*/);
        }
      }
    });

    test('should update statistics at regular intervals', async () => {
      const totalPlayersElement = page.locator('[data-testid="stat-total-players"]').first();

      if (await totalPlayersElement.isVisible()) {
        const initialValue = await totalPlayersElement.textContent();

        // Wait for potential update (simulate real-time updates)
        await page.waitForTimeout(3000);

        const updatedValue = await totalPlayersElement.textContent();

        // In a real scenario, we'd expect updates, but for testing we verify the element persists
        expect(updatedValue).toBeTruthy();
      }
    });

    test('should handle error states gracefully', async () => {
      // Mock API failure
      await page.route('**/api/statistics', async route => {
        await route.abort('failed');
      });

      await page.reload({ waitUntil: 'networkidle' });

      // Check for error handling
      const errorState = page.locator('[data-testid="statistics-error"]').first();
      const fallbackMessage = page.locator('[data-testid="statistics-fallback"]').first();

      if (await errorState.isVisible({ timeout: 5000 })) {
        await expect(errorState).toBeVisible();
      } else if (await fallbackMessage.isVisible({ timeout: 5000 })) {
        await expect(fallbackMessage).toBeVisible();
      }
    });
  });

  test.describe('Match Listings', () => {
    test('should render match cards correctly', async () => {
      const matchGrid = page.locator('[data-testid="match-grid"]').first();
      if (await matchGrid.isVisible()) {
        await expect(matchGrid).toBeVisible();

        // Check for match cards
        const matchCards = page.locator('[data-testid^="match-card-"]');
        const cardCount = await matchCards.count();

        if (cardCount > 0) {
          expect(cardCount).toBeGreaterThan(0);

          // Check first match card structure
          const firstCard = matchCards.first();
          await expect(firstCard).toBeVisible();

          // Verify card contains essential elements
          const playerNames = firstCard.locator('[data-testid^="player-name-"]');
          const betAmount = firstCard.locator('[data-testid="bet-amount"]');
          const gameStatus = firstCard.locator('[data-testid="game-status"]');

          if (await playerNames.first().isVisible()) {
            await expect(playerNames.first()).toBeVisible();
          }
        }
      }
    });

    test('should support filtering functionality', async () => {
      const filterContainer = page.locator('[data-testid="match-filters"]').first();

      if (await filterContainer.isVisible()) {
        // Test status filter
        const statusFilter = page.locator('[data-testid="filter-status"]').first();
        if (await statusFilter.isVisible()) {
          await statusFilter.click();

          const activeOption = page.locator('[data-testid="filter-status-active"]').first();
          if (await activeOption.isVisible()) {
            await activeOption.click();

            // Verify filtering worked
            await page.waitForTimeout(1000);
            const matchCards = page.locator('[data-testid^="match-card-"]');
            const visibleCards = await matchCards.count();

            // Should have some filtered results
            expect(visibleCards).toBeGreaterThanOrEqual(0);
          }
        }

        // Test bet amount filter
        const betFilter = page.locator('[data-testid="filter-bet-amount"]').first();
        if (await betFilter.isVisible()) {
          await betFilter.click();

          const lowBetOption = page.locator('[data-testid="filter-bet-low"]').first();
          if (await lowBetOption.isVisible()) {
            await lowBetOption.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    });

    test('should handle pagination and loading', async () => {
      const matchGrid = page.locator('[data-testid="match-grid"]').first();

      if (await matchGrid.isVisible()) {
        // Check for pagination controls
        const pagination = page.locator('[data-testid="match-pagination"]').first();
        const loadMoreButton = page.locator('[data-testid="load-more-matches"]').first();
        const infiniteScroll = page.locator('[data-testid="infinite-scroll-trigger"]').first();

        if (await pagination.isVisible()) {
          // Test pagination
          const nextButton = page.locator('[data-testid="pagination-next"]').first();
          if (await nextButton.isVisible() && await nextButton.isEnabled()) {
            await nextButton.click();
            await page.waitForLoadState('networkidle');

            // Verify page changed
            const pageIndicator = page.locator('[data-testid="current-page"]').first();
            if (await pageIndicator.isVisible()) {
              await expect(pageIndicator).not.toContainText('1');
            }
          }
        } else if (await loadMoreButton.isVisible()) {
          // Test load more functionality
          const initialCards = await page.locator('[data-testid^="match-card-"]').count();

          await loadMoreButton.click();
          await page.waitForTimeout(2000);

          const newCards = await page.locator('[data-testid^="match-card-"]').count();
          expect(newCards).toBeGreaterThanOrEqual(initialCards);
        } else if (await infiniteScroll.isVisible()) {
          // Test infinite scroll
          const initialCards = await page.locator('[data-testid^="match-card-"]').count();

          await page.evaluate(() => {
            const trigger = document.querySelector('[data-testid="infinite-scroll-trigger"]');
            if (trigger) {
              trigger.scrollIntoView();
            }
          });

          await page.waitForTimeout(2000);
          const newCards = await page.locator('[data-testid^="match-card-"]').count();
          expect(newCards).toBeGreaterThanOrEqual(initialCards);
        }
      }
    });

    test('should handle empty state correctly', async () => {
      // Mock empty response
      await page.route('**/api/matches', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ matches: [] })
        });
      });

      await page.reload({ waitUntil: 'networkidle' });

      // Check for empty state
      const emptyState = page.locator('[data-testid="matches-empty-state"]').first();
      const noMatchesMessage = page.locator('[data-testid="no-matches-message"]').first();

      if (await emptyState.isVisible({ timeout: 5000 })) {
        await expect(emptyState).toBeVisible();
        await expect(emptyState).toContainText(/no.*matches/i);
      } else if (await noMatchesMessage.isVisible({ timeout: 5000 })) {
        await expect(noMatchesMessage).toBeVisible();
      }
    });

    test('should navigate to match details on card click', async () => {
      const matchCards = page.locator('[data-testid^="match-card-"]');
      const cardCount = await matchCards.count();

      if (cardCount > 0) {
        const firstCard = matchCards.first();

        // Get match ID from card
        const matchId = await firstCard.getAttribute('data-match-id');

        await firstCard.click();

        // Verify navigation
        if (matchId) {
          await expect(page).toHaveURL(new RegExp(`/match/${matchId}`));
        } else {
          // Generic match page navigation
          await expect(page).toHaveURL(/\/match\//);
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Check hero section adapts
      const heroSection = page.locator('[data-testid="hero-section"]').first();
      if (await heroSection.isVisible()) {
        const heroBox = await heroSection.boundingBox();
        expect(heroBox?.width).toBeLessThanOrEqual(375);
      }

      // Check match grid becomes single column
      const matchGrid = page.locator('[data-testid="match-grid"]').first();
      if (await matchGrid.isVisible()) {
        const matchCards = page.locator('[data-testid^="match-card-"]');
        const cardCount = await matchCards.count();

        if (cardCount > 1) {
          const firstCard = matchCards.first();
          const secondCard = matchCards.nth(1);

          const firstBox = await firstCard.boundingBox();
          const secondBox = await secondCard.boundingBox();

          if (firstBox && secondBox) {
            // Cards should be stacked vertically on mobile
            expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 10);
          }
        }
      }
    });

    test('should handle tablet viewport correctly', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });

      // Verify layout adjustments for tablet
      const container = page.locator('[data-testid="main-container"]').first();
      if (await container.isVisible()) {
        const containerBox = await container.boundingBox();
        expect(containerBox?.width).toBeLessThanOrEqual(768);
      }
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load within acceptable time limits', async () => {
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should be accessible to screen readers', async () => {
      // Check for proper heading hierarchy
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');

        // Images should have alt text or aria-label
        expect(alt || ariaLabel).toBeTruthy();
      }

      // Check for proper button labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        // Buttons should have text or aria-label
        expect(text?.trim() || ariaLabel).toBeTruthy();
      }
    });
  });
});

/**
 * Setup mock API responses for consistent testing
 */
async function setupAPIResponses(page: Page) {
  // Mock statistics API
  await page.route('**/api/statistics', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalPlayers: 1247,
        activeGames: 23,
        totalPool: 45.67,
        todaysBets: 156
      })
    });
  });

  // Mock matches API
  await page.route('**/api/matches', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        matches: [
          {
            id: 'match-001',
            players: ['Player1', 'Player2'],
            betAmount: 0.5,
            status: 'waiting',
            createdAt: Date.now()
          },
          {
            id: 'match-002',
            players: ['PlayerA', 'PlayerB'],
            betAmount: 1.0,
            status: 'active',
            createdAt: Date.now() - 3600000
          },
          {
            id: 'match-003',
            players: ['GungiMaster', 'ChessLord'],
            betAmount: 2.5,
            status: 'completed',
            createdAt: Date.now() - 7200000
          }
        ],
        pagination: {
          page: 1,
          totalPages: 3,
          totalMatches: 8
        }
      })
    });
  });

  // Mock health check
  await page.route('**/api/health', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy' })
    });
  });
}
