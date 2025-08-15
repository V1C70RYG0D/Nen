#!/usr/bin/env node

/**
 * Frontend Page Tester
 * Tests all frontend pages for accessibility, errors, and functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_URL = 'http://localhost:3030';
const TEST_TIMEOUT = 30000;

// List of pages to test
const PAGES_TO_TEST = [
  '/',
  '/index-new',
  '/betting',
  '/create-room',
  '/debug-api',
  '/leaderboard', 
  '/marketplace',
  '/matches',
  '/profile',
  '/profile-test',
  '/test-buttons',
  '/training',
  '/training-fixed',
  '/training-gi-compliant',
  '/training-no-ssr',
  '/training-simple',
  '/training-test',
  '/arena/test-match-123',
  '/marketplace/test-listing-123',
  '/matches/test-match-456',
  '/training/test-session-789'
];

class PageTester {
  constructor() {
    this.browser = null;
    this.results = {
      tested: 0,
      passed: 0,
      failed: 0,
      errors: [],
      pageResults: []
    };
  }

  async init() {
    console.log('🚀 Starting frontend page testing...');
    console.log(`Testing against: ${FRONTEND_URL}`);
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testPage(pagePath) {
    const page = await this.browser.newPage();
    const pageUrl = `${FRONTEND_URL}${pagePath}`;
    const result = {
      path: pagePath,
      url: pageUrl,
      status: 'unknown',
      loadTime: 0,
      errors: [],
      warnings: [],
      title: '',
      hasContent: false,
      responsiveDesign: false,
      accessibility: {
        score: 0,
        issues: []
      }
    };

    try {
      console.log(`Testing: ${pageUrl}`);
      
      // Set up error tracking
      const errors = [];
      const warnings = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`Console Error: ${msg.text()}`);
        } else if (msg.type() === 'warning') {
          warnings.push(`Console Warning: ${msg.text()}`);
        }
      });

      page.on('pageerror', (error) => {
        errors.push(`Page Error: ${error.message}`);
      });

      page.on('requestfailed', (request) => {
        errors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
      });

      // Navigate to page
      const startTime = Date.now();
      const response = await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });
      const loadTime = Date.now() - startTime;

      result.loadTime = loadTime;
      result.errors = errors;
      result.warnings = warnings;

      // Check response status
      if (!response || response.status() >= 400) {
        result.status = 'failed';
        result.errors.push(`HTTP Status: ${response ? response.status() : 'No response'}`);
        return result;
      }

      // Get page title
      result.title = await page.title();

      // Check if page has content
      const bodyText = await page.evaluate(() => document.body.innerText);
      result.hasContent = bodyText.length > 100; // Arbitrary threshold

      // Check for specific error messages
      const hasErrorMessages = await page.evaluate(() => {
        const errorPatterns = [
          'Error',
          'Something went wrong',
          'Page not found',
          '404',
          '500',
          'Internal Server Error',
          'Cannot read properties',
          'TypeError',
          'ReferenceError'
        ];
        
        const pageText = document.body.innerText.toLowerCase();
        return errorPatterns.some(pattern => pageText.includes(pattern.toLowerCase()));
      });

      if (hasErrorMessages) {
        result.errors.push('Error messages found on page');
      }

      // Check for React hydration errors
      const hasHydrationErrors = await page.evaluate(() => {
        const consoleErrors = window.console._errors || [];
        return consoleErrors.some(error => 
          error.includes('hydration') || 
          error.includes('hydrate') ||
          error.includes('server-rendered HTML')
        );
      });

      if (hasHydrationErrors) {
        result.errors.push('React hydration errors detected');
      }

      // Check responsive design (basic check)
      await page.setViewport({ width: 375, height: 667 }); // Mobile
      await page.waitForTimeout(1000);
      const mobileHeight = await page.evaluate(() => document.body.scrollHeight);
      
      await page.setViewport({ width: 1200, height: 800 }); // Desktop
      await page.waitForTimeout(1000);
      const desktopHeight = await page.evaluate(() => document.body.scrollHeight);
      
      result.responsiveDesign = Math.abs(mobileHeight - desktopHeight) > 50;

      // Basic accessibility check
      const accessibilityIssues = await page.evaluate(() => {
        const issues = [];
        
        // Check for images without alt text
        const images = document.querySelectorAll('img');
        images.forEach((img, index) => {
          if (!img.alt && !img.getAttribute('aria-label')) {
            issues.push(`Image ${index + 1} missing alt text`);
          }
        });

        // Check for buttons without text or aria-label
        const buttons = document.querySelectorAll('button');
        buttons.forEach((btn, index) => {
          if (!btn.innerText.trim() && !btn.getAttribute('aria-label')) {
            issues.push(`Button ${index + 1} missing accessible text`);
          }
        });

        // Check for heading structure
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length === 0) {
          issues.push('No heading elements found');
        }

        return issues;
      });

      result.accessibility.issues = accessibilityIssues;
      result.accessibility.score = Math.max(0, 100 - (accessibilityIssues.length * 10));

      // Determine overall status
      if (result.errors.length === 0 && result.hasContent) {
        result.status = 'passed';
      } else if (result.errors.length > 0) {
        result.status = 'failed';
      } else {
        result.status = 'warning';
      }

      console.log(`✅ ${pagePath}: ${result.status} (${loadTime}ms)`);

    } catch (error) {
      result.status = 'failed';
      result.errors.push(`Test Error: ${error.message}`);
      console.log(`❌ ${pagePath}: FAILED - ${error.message}`);
    } finally {
      await page.close();
    }

    return result;
  }

  async runAllTests() {
    console.log(`\n📋 Testing ${PAGES_TO_TEST.length} pages...\n`);

    for (const pagePath of PAGES_TO_TEST) {
      const result = await this.testPage(pagePath);
      this.results.pageResults.push(result);
      this.results.tested++;

      if (result.status === 'passed') {
        this.results.passed++;
      } else {
        this.results.failed++;
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total Pages Tested: ${this.results.tested}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.tested) * 100).toFixed(1)}%`);

    console.log('\n🔍 DETAILED RESULTS');
    console.log('===================');

    this.results.pageResults.forEach(result => {
      const status = result.status === 'passed' ? '✅' : 
                    result.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`\n${status} ${result.path}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Load Time: ${result.loadTime}ms`);
      console.log(`   Title: ${result.title}`);
      console.log(`   Has Content: ${result.hasContent}`);
      console.log(`   Responsive: ${result.responsiveDesign}`);
      console.log(`   Accessibility Score: ${result.accessibility.score}/100`);

      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.forEach(error => console.log(`     - ${error}`));
      }

      if (result.warnings.length > 0) {
        console.log(`   Warnings:`);
        result.warnings.forEach(warning => console.log(`     - ${warning}`));
      }

      if (result.accessibility.issues.length > 0) {
        console.log(`   Accessibility Issues:`);
        result.accessibility.issues.forEach(issue => console.log(`     - ${issue}`));
      }
    });

    // Save detailed report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        tested: this.results.tested,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.tested) * 100).toFixed(1)
      },
      pages: this.results.pageResults
    };

    const reportPath = path.join(__dirname, 'frontend-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return this.results;
  }

  async run() {
    try {
      await this.init();
      await this.runAllTests();
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new PageTester();
  tester.run()
    .then(results => {
      const exitCode = results.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = PageTester;
