import { test, expect, Page } from '@playwright/test';

// E2E Testing for Registration and Gameplay

test.describe('Main User Flow: Registration to Gameplay', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('User Registration and Command Test Sequence', async () => {
    // Simulate user registration
    await page.goto('/');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'password123');
    await page.click('text=/register');
    let response = await page.waitForResponse(response => response.url().includes('/register') && response.status() === 200);
    expect(await response.json()).toEqual(expect.objectContaining({ success: true }));

    // Test listing challenges
    response = await page.evaluate(async () => fetch('/challenges'));
    expect(response.status).toBe(200);
    const challenges = await response.json();
    expect(challenges).toHaveLength(10);

    // Start a challenge
    response = await page.evaluate(async () => fetch('/start?challenge_number=1', { method: 'POST' }));
    expect(response.status).toBe(200);
    const challenge = await response.json();
    expect(challenge).toEqual(expect.objectContaining({ contractAddress: expect.any(String) }));

    // Submit a valid flag
    response = await page.evaluate(async () => fetch('/submit?flag=ZOKYO{test_flag}', { method: 'POST' }));
    expect(response.status).toBe(200);
    const submitResult = await response.json();
    expect(submitResult).toEqual(expect.objectContaining({ validation: 'correct' }));

    // Submit an invalid flag
    response = await page.evaluate(async () => fetch('/submit?flag=WRONG{flag}', { method: 'POST' }));
    expect(response.status).toBe(400);
    const invalidSubmitResult = await response.json();
    expect(invalidSubmitResult).toEqual(expect.objectContaining({ error: 'Incorrect flag' }));

    // Check leaderboard
    response = await page.evaluate(async () => fetch('/leaderboard'));
    expect(response.status).toBe(200);
    const leaderboard = await response.json();
    expect(leaderboard).toBeInstanceOf(Array);

    // Unsolved challenges
    response = await page.evaluate(async () => fetch('/unsolved'));
    expect(response.status).toBe(200);
    const unsolvedChallenges = await response.json();
    expect(unsolvedChallenges).toHaveLength(9);
  });
});

