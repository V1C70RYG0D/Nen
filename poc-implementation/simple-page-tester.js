#!/usr/bin/env node

/**
 * Simple Frontend Page Tester
 * Tests all frontend pages for basic functionality
 */

const http = require('http');
const https = require('https');

const FRONTEND_URL = 'http://localhost:3030';
const BACKEND_URL = 'http://localhost:3031';

// List of pages to test
const PAGES_TO_TEST = [
  { path: '/', name: 'Homepage' },
  { path: '/index-new', name: 'New Homepage' },
  { path: '/betting', name: 'Betting Page' },
  { path: '/create-room', name: 'Create Room' },
  { path: '/debug-api', name: 'Debug API' },
  { path: '/leaderboard', name: 'Leaderboard' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/matches', name: 'Matches' },
  { path: '/profile', name: 'Profile' },
  { path: '/profile-test', name: 'Profile Test' },
  { path: '/test-buttons', name: 'Test Buttons' },
  { path: '/training', name: 'Training' },
  { path: '/training-fixed', name: 'Training Fixed' },
  { path: '/training-gi-compliant', name: 'Training GI Compliant' },
  { path: '/training-no-ssr', name: 'Training No SSR' },
  { path: '/training-simple', name: 'Training Simple' },
  { path: '/training-test', name: 'Training Test' }
];

// API endpoints to test
const API_ENDPOINTS = [
  { path: '/health', name: 'Health Check' },
  { path: '/api/matches', name: 'Matches API' },
  { path: '/api/agents', name: 'Agents API' }
];

class PageTester {
  constructor() {
    this.results = {
      pages: [],
      apis: [],
      summary: {
        totalPages: 0,
        passedPages: 0,
        failedPages: 0,
        totalApis: 0,
        passedApis: 0,
        failedApis: 0
      }
    };
  }

  async makeRequest(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data,
            headers: res.headers
          });
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async testPage(page) {
    const url = `${FRONTEND_URL}${page.path}`;
    const result = {
      ...page,
      url,
      status: 'unknown',
      statusCode: null,
      error: null,
      hasContent: false,
      title: '',
      loadTime: 0
    };

    try {
      console.log(`Testing page: ${page.name} (${page.path})`);
      
      const startTime = Date.now();
      const response = await this.makeRequest(url);
      const loadTime = Date.now() - startTime;
      
      result.statusCode = response.statusCode;
      result.loadTime = loadTime;
      
      // Analyze response
      if (response.statusCode === 200) {
        result.hasContent = response.data.length > 1000; // Basic content check
        
        // Extract title if HTML
        const titleMatch = response.data.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch) {
          result.title = titleMatch[1].trim();
        }
        
        // Check for error indicators
        const hasErrors = response.data.includes('Error:') || 
                         response.data.includes('500') ||
                         response.data.includes('Something went wrong') ||
                         response.data.includes('TypeError');
        
        if (hasErrors) {
          result.status = 'warning';
          result.error = 'Page contains error messages';
        } else {
          result.status = 'passed';
        }
      } else {
        result.status = 'failed';
        result.error = `HTTP ${response.statusCode}`;
      }
      
      const statusIcon = result.status === 'passed' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌';
      console.log(`  ${statusIcon} ${result.status.toUpperCase()} (${loadTime}ms) - ${result.title || 'No title'}`);
      
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      console.log(`  ❌ FAILED - ${error.message}`);
    }

    return result;
  }

  async testAPI(endpoint) {
    const url = `${BACKEND_URL}${endpoint.path}`;
    const result = {
      ...endpoint,
      url,
      status: 'unknown',
      statusCode: null,
      error: null,
      responseTime: 0
    };

    try {
      console.log(`Testing API: ${endpoint.name} (${endpoint.path})`);
      
      const startTime = Date.now();
      const response = await this.makeRequest(url);
      const responseTime = Date.now() - startTime;
      
      result.statusCode = response.statusCode;
      result.responseTime = responseTime;
      
      if (response.statusCode === 200) {
        result.status = 'passed';
      } else {
        result.status = 'failed';
        result.error = `HTTP ${response.statusCode}`;
      }
      
      const statusIcon = result.status === 'passed' ? '✅' : '❌';
      console.log(`  ${statusIcon} ${result.status.toUpperCase()} (${responseTime}ms)`);
      
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      console.log(`  ❌ FAILED - ${error.message}`);
    }

    return result;
  }

  async runAllTests() {
    console.log('🚀 Starting Frontend and API Testing...');
    console.log(`Frontend: ${FRONTEND_URL}`);
    console.log(`Backend: ${BACKEND_URL}`);
    console.log('');

    // Test backend APIs first
    console.log('🔧 Testing Backend APIs...');
    for (const endpoint of API_ENDPOINTS) {
      const result = await this.testAPI(endpoint);
      this.results.apis.push(result);
      this.results.summary.totalApis++;
      if (result.status === 'passed') {
        this.results.summary.passedApis++;
      } else {
        this.results.summary.failedApis++;
      }
    }

    console.log('');

    // Test frontend pages
    console.log('📄 Testing Frontend Pages...');
    for (const page of PAGES_TO_TEST) {
      const result = await this.testPage(page);
      this.results.pages.push(result);
      this.results.summary.totalPages++;
      if (result.status === 'passed') {
        this.results.summary.passedPages++;
      } else {
        this.results.summary.failedPages++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    console.log(`\n🔧 Backend APIs:`);
    console.log(`   Total: ${this.results.summary.totalApis}`);
    console.log(`   Passed: ${this.results.summary.passedApis}`);
    console.log(`   Failed: ${this.results.summary.failedApis}`);
    
    console.log(`\n📄 Frontend Pages:`);
    console.log(`   Total: ${this.results.summary.totalPages}`);
    console.log(`   Passed: ${this.results.summary.passedPages}`);
    console.log(`   Failed: ${this.results.summary.failedPages}`);
    
    const totalTests = this.results.summary.totalApis + this.results.summary.totalPages;
    const totalPassed = this.results.summary.passedApis + this.results.summary.passedPages;
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Overall Success Rate: ${successRate}%`);

    // Detailed results
    console.log('\n🔍 DETAILED RESULTS');
    console.log('===================');

    if (this.results.summary.failedApis > 0) {
      console.log('\n❌ Failed APIs:');
      this.results.apis.filter(api => api.status === 'failed').forEach(api => {
        console.log(`   ${api.name}: ${api.error}`);
      });
    }

    if (this.results.summary.failedPages > 0) {
      console.log('\n❌ Failed Pages:');
      this.results.pages.filter(page => page.status === 'failed').forEach(page => {
        console.log(`   ${page.name}: ${page.error}`);
      });
    }

    // Save report
    const reportPath = './frontend-test-report.json';
    require('fs').writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      apis: this.results.apis,
      pages: this.results.pages
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return this.results;
  }

  async run() {
    try {
      await this.runAllTests();
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new PageTester();
  tester.run()
    .then(results => {
      const hasFailures = results.summary.failedApis > 0 || results.summary.failedPages > 0;
      process.exit(hasFailures ? 1 : 0);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = PageTester;
