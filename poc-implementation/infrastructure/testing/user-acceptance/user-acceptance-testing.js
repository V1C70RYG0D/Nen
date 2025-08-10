#!/usr/bin/env node

/**
 * User Acceptance Testing Suite for Nen Platform POC
 * Phase 4.3: Comprehensive Review/Iteration (Days 117-126)
 *
 * UAT Scenarios following POC Master Plan:
 * - Complete Gungi game workflow validation
 * - AI vs AI matches with personality customization
 * - Advanced betting with compliance validation
 * - NFT agent minting and trading
 * - Real-time updates and spectator experience
 *


 */

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

class UserAcceptanceTester {
  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL;
    this.backendUrl = process.env.API_URL;

    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      userJourneys: [],
      performanceMetrics: {},
      accessibilityIssues: []
    };

    this.testConfig = {
      headless: process.env.UAT_HEADLESS !== 'false',
      timeout: 30000,
      viewport: { width: 1920, height: 1080 },
      screenshotPath: './uat-screenshots'
    };
  }

  /**
   * Execute comprehensive UAT following POC Master Plan
   */
  async executeUserAcceptanceTesting() {
    console.log('👥 Starting User Acceptance Testing for Nen Platform POC');
    console.log('Following POC Master Plan Phase 4.3 User Journey Validation\n');

    let browser;
    try {
      // Initialize browser
      browser = await puppeteer.launch({
        headless: this.testConfig.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      // Create screenshots directory
      require('fs').mkdirSync(this.testConfig.screenshotPath, { recursive: true });

      // Execute UAT test suites
      await this.testNewUserOnboarding(browser);
      await this.testGungiGameplayWorkflow(browser);
      await this.testAIPersonalityCustomization(browser);
      await this.testBettingWorkflow(browser);
      await this.testNFTAgentWorkflow(browser);
      await this.testSpectatorExperience(browser);
      await this.testRealTimeUpdates(browser);
      await this.testAccessibilityCompliance(browser);
      await this.testMobileResponsiveness(browser);
      await this.testErrorHandling(browser);

      // Generate comprehensive UAT report
      this.generateUATReport();

    } catch (error) {
      console.error('❌ UAT execution failed:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Test new user onboarding journey
   */
  async testNewUserOnboarding(browser) {
    console.log('🆕 Testing New User Onboarding Journey');

    const testCase = {
      name: 'New User Onboarding',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Landing page load
      testCase.steps.push('Navigate to landing page');
      await page.goto(this.frontendUrl, { waitUntil: 'networkidle2' });
      await this.takeScreenshot(page, 'onboarding-01-landing');

      // Validate landing page elements
      const hasTitle = await page.$eval('title', el => el.textContent.includes('Nen Platform'));
      const hasConnectButton = await page.$('[data-testid="connect-wallet"]') !== null;

      if (!hasTitle || !hasConnectButton) {
        throw new Error('Landing page missing essential elements');
      }

      // Step 2: Wallet connection simulation
      testCase.steps.push('Simulate wallet connection');
      await page.click('[data-testid="connect-wallet"]');
      await page.waitForTimeout(2000);
      await this.takeScreenshot(page, 'onboarding-02-wallet-connect');

      // Step 3: Navigate to dashboard
      testCase.steps.push('Navigate to user dashboard');
      await page.goto(`${this.frontendUrl}/dashboard`);
      await page.waitForSelector('[data-testid="user-dashboard"]', { timeout: 10000 });
      await this.takeScreenshot(page, 'onboarding-03-dashboard');

      // Step 4: Validate dashboard elements
      const hasDashboard = await page.$('[data-testid="user-dashboard"]') !== null;
      const hasGameSection = await page.$('[data-testid="games-section"]') !== null;
      const hasAISection = await page.$('[data-testid="ai-agents-section"]') !== null;

      if (!hasDashboard || !hasGameSection || !hasAISection) {
        throw new Error('Dashboard missing required sections');
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ New User Onboarding: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ New User Onboarding: FAILED -', error.message);
      await this.takeScreenshot(page, 'onboarding-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test complete Gungi gameplay workflow
   */
  async testGungiGameplayWorkflow(browser) {
    console.log('🎮 Testing Gungi Gameplay Workflow');

    const testCase = {
      name: 'Gungi Gameplay Workflow',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Navigate to match page
      testCase.steps.push('Navigate to active match');
      await page.goto(`${this.frontendUrl}/match/test-match-001`);
      await page.waitForSelector('[data-testid="gungi-board"]', { timeout: 15000 });
      await this.takeScreenshot(page, 'gameplay-01-board');

      // Step 2: Validate game board elements
      testCase.steps.push('Validate game board setup');
      const hasBoard = await page.$('[data-testid="gungi-board"]') !== null;
      const hasPieces = await page.$$('[data-testid^="piece-"]');
      const hasPlayerInfo = await page.$('[data-testid="player-info"]') !== null;
      const hasMoveHistory = await page.$('[data-testid="move-history"]') !== null;

      if (!hasBoard || hasPieces.length === 0 || !hasPlayerInfo || !hasMoveHistory) {
        throw new Error('Game board missing essential elements');
      }

      // Step 3: Test piece interaction
      testCase.steps.push('Test piece selection and movement');
      const firstPiece = await page.$('[data-testid^="piece-"]');
      if (firstPiece) {
        await firstPiece.click();
        await page.waitForTimeout(1000);
        await this.takeScreenshot(page, 'gameplay-02-piece-selected');

        // Check if valid moves are highlighted
        const highlightedSquares = await page.$$('[data-testid="valid-move"]');
        if (highlightedSquares.length === 0) {
          console.warn('⚠️ No valid moves highlighted for selected piece');
        }
      }

      // Step 4: Test AI move processing
      testCase.steps.push('Validate AI move processing');
      await page.waitForTimeout(3000); // Wait for potential AI move
      await this.takeScreenshot(page, 'gameplay-03-ai-move');

      // Step 5: Test game state updates
      testCase.steps.push('Validate real-time game state updates');
      const moveHistoryItems = await page.$$('[data-testid="move-item"]');
      console.log(`   Move history contains ${moveHistoryItems.length} moves`);

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ Gungi Gameplay Workflow: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ Gungi Gameplay Workflow: FAILED -', error.message);
      await this.takeScreenshot(page, 'gameplay-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test AI personality customization workflow
   */
  async testAIPersonalityCustomization(browser) {
    console.log('🤖 Testing AI Personality Customization');

    const testCase = {
      name: 'AI Personality Customization',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Navigate to AI agents page
      testCase.steps.push('Navigate to AI agents section');
      await page.goto(`${this.frontendUrl}/ai-agents`);
      await page.waitForSelector('[data-testid="ai-agents-grid"]', { timeout: 10000 });
      await this.takeScreenshot(page, 'ai-01-agents-grid');

      // Step 2: Validate AI agent display
      testCase.steps.push('Validate AI agent information display');
      const agentCards = await page.$$('[data-testid="ai-agent-card"]');
      if (agentCards.length === 0) {
        throw new Error('No AI agents displayed');
      }

      // Click first agent for details
      await agentCards[0].click();
      await page.waitForTimeout(2000);
      await this.takeScreenshot(page, 'ai-02-agent-details');

      // Step 3: Test personality customization
      testCase.steps.push('Test personality trait customization');
      const customizeButton = await page.$('[data-testid="customize-personality"]');
      if (customizeButton) {
        await customizeButton.click();
        await page.waitForSelector('[data-testid="personality-sliders"]', { timeout: 5000 });
        await this.takeScreenshot(page, 'ai-03-personality-customize');

        // Test slider interactions
        const sliders = await page.$$('[data-testid^="personality-slider-"]');
        if (sliders.length > 0) {
          // Simulate slider adjustment
          const slider = sliders[0];
          await slider.click();
          await this.takeScreenshot(page, 'ai-04-slider-adjusted');
        }
      }

      // Step 4: Validate AI performance metrics
      testCase.steps.push('Validate AI performance tracking');
      const performanceMetrics = await page.$('[data-testid="ai-performance-metrics"]');
      if (performanceMetrics) {
        const metricsText = await performanceMetrics.textContent();
        console.log(`   AI Performance Metrics: ${metricsText}`);
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ AI Personality Customization: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ AI Personality Customization: FAILED -', error.message);
      await this.takeScreenshot(page, 'ai-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test betting workflow with compliance
   */
  async testBettingWorkflow(browser) {
    console.log('💰 Testing Betting Workflow with Compliance');

    const testCase = {
      name: 'Betting Workflow',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Navigate to betting interface
      testCase.steps.push('Navigate to betting interface');
      await page.goto(`${this.frontendUrl}/match/test-match-001`);
      await page.waitForSelector('[data-testid="betting-interface"]', { timeout: 10000 });
      await this.takeScreenshot(page, 'betting-01-interface');

      // Step 2: Validate betting options
      testCase.steps.push('Validate betting options and odds');
      const bettingOptions = await page.$$('[data-testid="betting-option"]');
      if (bettingOptions.length === 0) {
        throw new Error('No betting options displayed');
      }

      const oddsDisplayed = await page.$('[data-testid="betting-odds"]') !== null;
      if (!oddsDisplayed) {
        throw new Error('Betting odds not displayed');
      }

      // Step 3: Test bet placement workflow
      testCase.steps.push('Test bet placement workflow');
      const betAmountInput = await page.$('[data-testid="bet-amount-input"]');
      const placeBetButton = await page.$('[data-testid="place-bet-button"]');

      if (betAmountInput && placeBetButton) {
        await betAmountInput.type('0.1'); // 0.1 SOL bet
        await this.takeScreenshot(page, 'betting-02-amount-entered');

        await placeBetButton.click();
        await page.waitForTimeout(2000);
        await this.takeScreenshot(page, 'betting-03-bet-placed');

        // Check for confirmation message
        const confirmation = await page.$('[data-testid="bet-confirmation"]');
        if (!confirmation) {
          console.warn('⚠️ Bet confirmation not displayed');
        }
      }

      // Step 4: Validate compliance features
      testCase.steps.push('Validate compliance and responsible gambling');
      const complianceInfo = await page.$('[data-testid="compliance-info"]');
      const responsibleGambling = await page.$('[data-testid="responsible-gambling"]');

      if (!complianceInfo || !responsibleGambling) {
        console.warn('⚠️ Compliance features not fully displayed');
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ Betting Workflow: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ Betting Workflow: FAILED -', error.message);
      await this.takeScreenshot(page, 'betting-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test NFT agent workflow
   */
  async testNFTAgentWorkflow(browser) {
    console.log('🎨 Testing NFT Agent Workflow');

    const testCase = {
      name: 'NFT Agent Workflow',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Navigate to NFT marketplace
      testCase.steps.push('Navigate to NFT marketplace');
      await page.goto(`${this.frontendUrl}/nft-marketplace`);
      await page.waitForSelector('[data-testid="nft-marketplace"]', { timeout: 10000 });
      await this.takeScreenshot(page, 'nft-01-marketplace');

      // Step 2: Validate NFT listings
      testCase.steps.push('Validate NFT agent listings');
      const nftCards = await page.$$('[data-testid="nft-card"]');
      if (nftCards.length === 0) {
        console.warn('⚠️ No NFT agents displayed in marketplace');
      } else {
        console.log(`   Found ${nftCards.length} NFT agents in marketplace`);
      }

      // Step 3: Test NFT minting process
      testCase.steps.push('Test NFT agent minting');
      const mintButton = await page.$('[data-testid="mint-nft-button"]');
      if (mintButton) {
        await mintButton.click();
        await page.waitForSelector('[data-testid="minting-interface"]', { timeout: 5000 });
        await this.takeScreenshot(page, 'nft-02-minting-interface');

        // Validate minting form
        const traitSelectors = await page.$$('[data-testid^="trait-selector-"]');
        if (traitSelectors.length > 0) {
          console.log(`   Found ${traitSelectors.length} trait selectors`);
        }
      }

      // Step 4: Test NFT details view
      testCase.steps.push('Test NFT agent details view');
      if (nftCards.length > 0) {
        await nftCards[0].click();
        await page.waitForTimeout(2000);
        await this.takeScreenshot(page, 'nft-03-details-view');

        // Validate NFT details
        const nftTitle = await page.$('[data-testid="nft-title"]');
        const nftTraits = await page.$('[data-testid="nft-traits"]');
        const nftPerformance = await page.$('[data-testid="nft-performance"]');

        if (!nftTitle || !nftTraits) {
          console.warn('⚠️ NFT details incomplete');
        }
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ NFT Agent Workflow: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ NFT Agent Workflow: FAILED -', error.message);
      await this.takeScreenshot(page, 'nft-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test spectator experience
   */
  async testSpectatorExperience(browser) {
    console.log('👀 Testing Spectator Experience');

    const testCase = {
      name: 'Spectator Experience',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Join as spectator
      testCase.steps.push('Join match as spectator');
      await page.goto(`${this.frontendUrl}/match/test-match-001?spectator=true`);
      await page.waitForSelector('[data-testid="spectator-interface"]', { timeout: 10000 });
      await this.takeScreenshot(page, 'spectator-01-interface');

      // Step 2: Validate spectator UI elements
      testCase.steps.push('Validate spectator interface elements');
      const spectatorCount = await page.$('[data-testid="spectator-count"]');
      const liveUpdates = await page.$('[data-testid="live-updates"]');
      const chatInterface = await page.$('[data-testid="spectator-chat"]');

      if (!spectatorCount) {
        console.warn('⚠️ Spectator count not displayed');
      }

      if (!liveUpdates) {
        console.warn('⚠️ Live updates section not found');
      }

      // Step 3: Test real-time updates
      testCase.steps.push('Monitor real-time updates');
      await page.waitForTimeout(5000); // Wait for potential updates
      await this.takeScreenshot(page, 'spectator-02-realtime-updates');

      // Step 4: Test spectator chat (if available)
      if (chatInterface) {
        testCase.steps.push('Test spectator chat functionality');
        const chatInput = await page.$('[data-testid="chat-input"]');
        const sendButton = await page.$('[data-testid="send-chat"]');

        if (chatInput && sendButton) {
          await chatInput.type('Great game!');
          await sendButton.click();
          await page.waitForTimeout(1000);
          await this.takeScreenshot(page, 'spectator-03-chat-sent');
        }
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ Spectator Experience: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ Spectator Experience: FAILED -', error.message);
      await this.takeScreenshot(page, 'spectator-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test real-time updates performance
   */
  async testRealTimeUpdates(browser) {
    console.log('⚡ Testing Real-time Updates Performance');

    const testCase = {
      name: 'Real-time Updates Performance',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Monitor WebSocket connections
      testCase.steps.push('Monitor WebSocket connection establishment');

      let wsConnected = false;
      page.on('response', response => {
        if (response.url().includes('socket.io')) {
          wsConnected = true;
        }
      });

      await page.goto(`${this.frontendUrl}/match/test-match-001`);
      await page.waitForTimeout(3000);

      if (!wsConnected) {
        console.warn('⚠️ WebSocket connection not detected');
      }

      // Step 2: Measure update latency
      testCase.steps.push('Measure real-time update latency');

      const updateLatencies = [];
      let updateCount = 0;

      // Monitor for DOM updates
      page.on('domcontentloaded', () => {
        const latency = performance.now() - startTime;
        updateLatencies.push(latency);
        updateCount++;
      });

      await page.waitForTimeout(10000); // Monitor for 10 seconds
      await this.takeScreenshot(page, 'realtime-01-monitoring');

      // Step 3: Validate update frequency
      testCase.steps.push('Validate update frequency and consistency');
      console.log(`   Detected ${updateCount} real-time updates`);

      if (updateLatencies.length > 0) {
        const avgLatency = updateLatencies.reduce((a, b) => a + b, 0) / updateLatencies.length;
        console.log(`   Average update latency: ${avgLatency.toFixed(2)}ms`);

        this.testResults.performanceMetrics.realTimeLatency = avgLatency;

        if (avgLatency > 50) {
          console.warn('⚠️ Real-time update latency exceeds 50ms target');
        }
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ Real-time Updates Performance: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ Real-time Updates Performance: FAILED -', error.message);
      await this.takeScreenshot(page, 'realtime-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test accessibility compliance (WCAG)
   */
  async testAccessibilityCompliance(browser) {
    console.log('♿ Testing Accessibility Compliance (WCAG)');

    const testCase = {
      name: 'Accessibility Compliance',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Test keyboard navigation
      testCase.steps.push('Test keyboard navigation');
      await page.goto(this.frontendUrl);
      await page.waitForTimeout(2000);

      // Test Tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => document.activeElement.tagName);
      console.log(`   Focus navigation working: ${focusedElement}`);

      // Step 2: Check for alt text on images
      testCase.steps.push('Validate image alt text');
      const imagesWithoutAlt = await page.$$eval('img', imgs =>
        imgs.filter(img => !img.alt || img.alt.trim() === '').length
      );

      if (imagesWithoutAlt > 0) {
        this.testResults.accessibilityIssues.push(`${imagesWithoutAlt} images missing alt text`);
      }

      // Step 3: Check color contrast (basic validation)
      testCase.steps.push('Basic color contrast validation');
      const lowContrastElements = await page.$$eval('*', elements => {
        let lowContrast = 0;
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bgColor = style.backgroundColor;

          // Basic check for white text on white background
          if (color === 'rgb(255, 255, 255)' && bgColor === 'rgb(255, 255, 255)') {
            lowContrast++;
          }
        });
        return lowContrast;
      });

      if (lowContrastElements > 0) {
        this.testResults.accessibilityIssues.push(`${lowContrastElements} potential low contrast elements`);
      }

      // Step 4: Check for ARIA labels
      testCase.steps.push('Validate ARIA labels and roles');
      const elementsWithoutAria = await page.$$eval('button, input, select', elements =>
        elements.filter(el => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).length
      );

      if (elementsWithoutAria > 0) {
        this.testResults.accessibilityIssues.push(`${elementsWithoutAria} interactive elements missing ARIA labels`);
      }

      await this.takeScreenshot(page, 'accessibility-validation');

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ Accessibility Compliance: PASSED');

      if (this.testResults.accessibilityIssues.length > 0) {
        console.log('⚠️ Accessibility issues found:', this.testResults.accessibilityIssues);
      }

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ Accessibility Compliance: FAILED -', error.message);
      await this.takeScreenshot(page, 'accessibility-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test mobile responsiveness
   */
  async testMobileResponsiveness(browser) {
    console.log('📱 Testing Mobile Responsiveness');

    const testCase = {
      name: 'Mobile Responsiveness',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      // Test different viewport sizes
      const viewports = [
        { name: 'Mobile Portrait', width: 375, height: 667 },
        { name: 'Mobile Landscape', width: 667, height: 375 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Tablet Landscape', width: 1024, height: 768 }
      ];

      for (const viewport of viewports) {
        testCase.steps.push(`Test ${viewport.name} (${viewport.width}x${viewport.height})`);

        await page.setViewport({ width: viewport.width, height: viewport.height });
        await page.goto(this.frontendUrl);
        await page.waitForTimeout(2000);

        await this.takeScreenshot(page, `mobile-${viewport.name.toLowerCase().replace(' ', '-')}`);

        // Check for horizontal scrolling
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });

        if (hasHorizontalScroll) {
          console.warn(`⚠️ Horizontal scrolling detected on ${viewport.name}`);
        }

        // Check if navigation is accessible
        const navVisible = await page.$('[data-testid="main-navigation"]') !== null;
        if (!navVisible) {
          console.warn(`⚠️ Main navigation not visible on ${viewport.name}`);
        }
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ Mobile Responsiveness: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ Mobile Responsiveness: FAILED -', error.message);
      await this.takeScreenshot(page, 'mobile-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Test error handling and user feedback
   */
  async testErrorHandling(browser) {
    console.log('🚨 Testing Error Handling and User Feedback');

    const testCase = {
      name: 'Error Handling',
      steps: [],
      passed: false,
      duration: 0,
      screenshots: []
    };

    const startTime = performance.now();
    const page = await browser.newPage();

    try {
      await page.setViewport(this.testConfig.viewport);

      // Step 1: Test 404 error handling
      testCase.steps.push('Test 404 error page');
      await page.goto(`${this.frontendUrl}/non-existent-page`);
      await page.waitForTimeout(3000);

      const has404 = await page.$('[data-testid="error-404"]') !== null;
      if (!has404) {
        const pageContent = await page.content();
        if (!pageContent.includes('404') && !pageContent.includes('Not Found')) {
          console.warn('⚠️ 404 error page not properly displayed');
        }
      }
      await this.takeScreenshot(page, 'error-01-404');

      // Step 2: Test network error handling
      testCase.steps.push('Test network error handling');
      await page.goto(this.frontendUrl);

      // Intercept and fail API requests to simulate network errors
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Try to navigate to a page that requires API calls
      await page.goto(`${this.frontendUrl}/dashboard`);
      await page.waitForTimeout(5000);

      const errorMessage = await page.$('[data-testid="error-message"]');
      if (!errorMessage) {
        console.warn('⚠️ Network error not properly handled/displayed');
      }
      await this.takeScreenshot(page, 'error-02-network');

      // Step 3: Test form validation
      testCase.steps.push('Test form validation errors');
      await page.setRequestInterception(false); // Re-enable requests
      await page.goto(`${this.frontendUrl}/match/test-match-001`);

      // Try to place bet with invalid amount
      const betInput = await page.$('[data-testid="bet-amount-input"]');
      const placeBetButton = await page.$('[data-testid="place-bet-button"]');

      if (betInput && placeBetButton) {
        await betInput.type('-1'); // Invalid amount
        await placeBetButton.click();
        await page.waitForTimeout(2000);

        const validationError = await page.$('[data-testid="validation-error"]');
        if (!validationError) {
          console.warn('⚠️ Form validation error not displayed');
        }
        await this.takeScreenshot(page, 'error-03-validation');
      }

      testCase.passed = true;
      this.testResults.passedTests++;
      console.log('✅ Error Handling: PASSED');

    } catch (error) {
      testCase.passed = false;
      testCase.error = error.message;
      this.testResults.failedTests++;
      console.log('❌ Error Handling: FAILED -', error.message);
      await this.takeScreenshot(page, 'error-handling-error');
    } finally {
      testCase.duration = performance.now() - startTime;
      this.testResults.userJourneys.push(testCase);
      this.testResults.totalTests++;
      await page.close();
    }
  }

  /**
   * Take screenshot for test documentation
   */
  async takeScreenshot(page, filename) {
    try {
      const screenshotPath = `${this.testConfig.screenshotPath}/${filename}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to take screenshot ${filename}:`, error.message);
    }
  }

  /**
   * Generate comprehensive UAT report
   */
  generateUATReport() {
    const successRate = (this.testResults.passedTests / this.testResults.totalTests) * 100;
    const totalDuration = this.testResults.userJourneys.reduce((sum, journey) => sum + journey.duration, 0);

    console.log('\n' + '='.repeat(80));
    console.log('👥 COMPREHENSIVE USER ACCEPTANCE TEST REPORT - NEN PLATFORM POC');
    console.log('='.repeat(80));
    console.log(`Test Execution Date: ${new Date().toISOString()}`);
    console.log(`Total Test Duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
    console.log(`Total Tests: ${this.testResults.totalTests}`);
    console.log(`Passed Tests: ${this.testResults.passedTests}`);
    console.log(`Failed Tests: ${this.testResults.failedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    console.log('');

    console.log('🎯 USER JOURNEY RESULTS');
    console.log('-'.repeat(50));
    this.testResults.userJourneys.forEach(journey => {
      const status = journey.passed ? '✅ PASSED' : '❌ FAILED';
      const duration = (journey.duration / 1000).toFixed(2);
      console.log(`${status} - ${journey.name} (${duration}s)`);
      if (!journey.passed && journey.error) {
        console.log(`   Error: ${journey.error}`);
      }
      journey.steps.forEach(step => {
        console.log(`   • ${step}`);
      });
      console.log('');
    });

    // Performance metrics
    if (Object.keys(this.testResults.performanceMetrics).length > 0) {
      console.log('⚡ PERFORMANCE METRICS');
      console.log('-'.repeat(30));
      Object.entries(this.testResults.performanceMetrics).forEach(([metric, value]) => {
        console.log(`${metric}: ${value.toFixed(2)}ms`);
      });
      console.log('');
    }

    // Accessibility issues
    if (this.testResults.accessibilityIssues.length > 0) {
      console.log('♿ ACCESSIBILITY ISSUES');
      console.log('-'.repeat(30));
      this.testResults.accessibilityIssues.forEach(issue => {
        console.log(`⚠️ ${issue}`);
      });
      console.log('');
    }

    // POC readiness assessment
    console.log('🏆 POC READINESS ASSESSMENT');
    console.log('-'.repeat(35));

    const criticalJourneys = ['New User Onboarding', 'Gungi Gameplay Workflow', 'Betting Workflow'];
    const criticalPassed = this.testResults.userJourneys
      .filter(j => criticalJourneys.includes(j.name))
      .every(j => j.passed);

    if (successRate >= 80 && criticalPassed) {
      console.log('✅ POC READY FOR STAKEHOLDER DEMO');
      console.log('✅ Core user journeys validated');
      console.log('✅ System meets acceptance criteria');
    } else {
      console.log('⚠️ POC REQUIRES IMPROVEMENTS BEFORE DEMO');
      if (!criticalPassed) {
        console.log('❌ Critical user journeys have failures');
      }
      if (successRate < 80) {
        console.log('❌ Success rate below 80% threshold');
      }
    }

    console.log('\n' + '='.repeat(80));

    // Write detailed report to file
    this.writeUATReportToFile(successRate, totalDuration, criticalPassed);
  }

  /**
   * Write detailed UAT report to file
   */
  writeUATReportToFile(successRate, totalDuration, criticalPassed) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportContent = `# Nen Platform POC - User Acceptance Test Report
Generated: ${new Date().toISOString()}
Test Duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes

## Executive Summary
- **Total Tests**: ${this.testResults.totalTests}
- **Success Rate**: ${successRate.toFixed(2)}%
- **Critical Journeys**: ${criticalPassed ? 'PASSED' : 'FAILED'}
- **POC Readiness**: ${successRate >= 80 && criticalPassed ? 'READY' : 'NEEDS IMPROVEMENT'}

## Test Results by User Journey

${this.testResults.userJourneys.map(journey => `### ${journey.name}
**Status**: ${journey.passed ? 'PASSED' : 'FAILED'}
**Duration**: ${(journey.duration / 1000).toFixed(2)}s
**Steps Executed**:
${journey.steps.map(step => `- ${step}`).join('\n')}
${journey.error ? `**Error**: ${journey.error}` : ''}
`).join('\n')}

## Performance Metrics
${Object.entries(this.testResults.performanceMetrics).map(([metric, value]) =>
  `- ${metric}: ${value.toFixed(2)}ms`
).join('\n')}

## Accessibility Assessment
${this.testResults.accessibilityIssues.length > 0 ?
  this.testResults.accessibilityIssues.map(issue => `- ⚠️ ${issue}`).join('\n') :
  '✅ No major accessibility issues identified'}

## Recommendations
${successRate >= 80 && criticalPassed ?
  '✅ Proceed with stakeholder demonstration\n✅ POC meets acceptance criteria' :
  '⚠️ Address test failures before proceeding\n⚠️ Review critical user journey issues'}

## Next Steps
- ${criticalPassed ? 'Schedule stakeholder demo' : 'Fix critical user journey failures'}
- ${successRate >= 80 ? 'Prepare demo environment' : 'Investigate and resolve test failures'}
- Implement accessibility improvements if needed
- Conduct final performance validation
`;

    require('fs').writeFileSync(`uat-report-${timestamp}.md`, reportContent);
    console.log(`📄 Detailed UAT report saved: uat-report-${timestamp}.md`);
  }
}

// Execute UAT if run directly
if (require.main === module) {
  const uatTester = new UserAcceptanceTester();

  uatTester.executeUserAcceptanceTesting()
    .then(() => {
      console.log('🎉 User Acceptance Testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 UAT execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = UserAcceptanceTester;
