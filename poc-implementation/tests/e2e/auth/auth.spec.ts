import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { TestDataManager } from '../utils/TestDataManager';

test.describe('Authentication Flow', () => {
  let authPage: AuthPage;
  let testDataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    testDataManager = new TestDataManager();

// Verify API is healthy before running tests
    const isHealthy = await testDataManager.verifyApiHealth();
    if (!isHealthy) {
      throw new Error('API is not healthy. Cannot run tests.');
    }

    // Seed initial test data
    await testDataManager.seedTestData();
  });

  test.afterEach(async () => {
    // Clean up any test data created during the test
    await testDataManager.cleanupTestData();
  });

  test('should display login page elements correctly', async () => {
    await authPage.gotoLogin();
    await authPage.verifyLoginPageElements();
    await authPage.verifyTitle('Nen Platform - Login');
  });

  test('should display register page elements correctly', async () => {
    await authPage.gotoRegister();
    await authPage.verifyRegisterPageElements();
    await authPage.verifyTitle('Nen Platform - Register');
  });

test('should successfully register a new user and verify email', async () => {
    await authPage.gotoRegister();

    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    await authPage.register(testUser.username, testUser.email, testUser.password);

    // Simulate email verification via email service mock
    const verificationLink = await testDataManager.simulateEmailVerification(testUser.email);
    await authPage.page.goto(verificationLink);

    // Verify account activation success
    const successMessage = await authPage.getSuccessMessage();
    expect(successMessage).toContain('Your account has been activated');
  });

  test('should show error for duplicate username registration', async () => {
    // Create a user first
    const existingUser = await testDataManager.createTestUser();

    await authPage.gotoRegister();
    await authPage.register(existingUser.username, 'different@email.com', 'TestPassword123!');

    // Check for error message
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('Username already exists');
  });

  test('should successfully login with valid credentials', async () => {
    // Create a test user
    const testUser = await testDataManager.createTestUser();

    await authPage.gotoLogin();
    await authPage.login(testUser.username, testUser.password);

    // Verify redirect to dashboard
    await authPage.verifyUrl('/dashboard');

    // Verify authentication state
    await authPage.verifyAuthState(true);

    // Verify user is logged in
    const isLoggedIn = await authPage.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test('should show error for invalid login credentials', async () => {
    await authPage.gotoLogin();
    await authPage.login('invalid_username', 'invalid_password');

    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid credentials');
  });

test('should maintain session and handle token expiration', async () => {
    // Create and login a test user
    const testUser = await testDataManager.createTestUser();
    await authPage.gotoLogin();
    await authPage.login(testUser.username, testUser.password);

    // Verify logged in state
    expect(await authPage.isLoggedIn()).toBe(true);
    await authPage.verifyAuthState(true);

    // Simulate expiration after refresh token usage
    await testDataManager.simulateTokenExpiration(testUser);

    // Attempt accessing protected route
    await authPage.gotoProtectedPage();
    const isAccessDenied = await authPage.isAccessDenied();
    expect(isAccessDenied).toBe(true);

    // Verify redirect to login page
    await authPage.verifyUrl('/login');
    await authPage.verifyAuthState(false);
  });

test('should handle social authentication and OAuth flows', async () => {
    // Create and login a test user
    const testUser = await testDataManager.createTestUser();
    await authPage.gotoLogin();
    await authPage.login(testUser.username, testUser.password);

    // Mock OAuth login flow
    const isOAuthConnected = await authPage.connectOAuthProvider("google");

    expect(isOAuthConnected).toBe(true);

    // Validate error handling for invalid OAuth attempt
    const invalidOAuthAttempt = await testDataManager.simulateOAuthError();
    expect(invalidOAuthAttempt).toContain('OAuth authentication failed');
  });

  test('should handle password reset flow', async () => {
    // Create a test user
    const testUser = await testDataManager.createTestUser();

    await authPage.gotoLogin();
    await authPage.requestPasswordReset(testUser.email);

    const successMessage = await authPage.getSuccessMessage();
    expect(successMessage).toContain('Password reset email sent');
  });

  test('should validate form fields', async () => {
    await authPage.gotoRegister();

    // Try to register with empty fields
    await authPage.register('', '', '');

    // Should show validation errors
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('required');
  });

  test('should maintain session across page refreshes', async () => {
    // Create and login a test user
    const testUser = await testDataManager.createTestUser();
    await authPage.gotoLogin();
    await authPage.login(testUser.username, testUser.password);

    // Verify logged in
    expect(await authPage.isLoggedIn()).toBe(true);

    // Refresh page
    await authPage.page.reload();

    // Should still be logged in
    expect(await authPage.isLoggedIn()).toBe(true);
  });

  test('should handle concurrent login attempts', async () => {
    const testUser = await testDataManager.createTestUser();

    // Simulate multiple login attempts
    const loginPromises = Array(3).fill(null).map(async () => {
      const newPage = await authPage.page.context().newPage();
      const newAuthPage = new AuthPage(newPage);
      await newAuthPage.gotoLogin();
      await newAuthPage.login(testUser.username, testUser.password);
      return newAuthPage.isLoggedIn();
    });

    const results = await Promise.all(loginPromises);

    // All should succeed
    results.forEach(isLoggedIn => {
      expect(isLoggedIn).toBe(true);
    });
  });
});
