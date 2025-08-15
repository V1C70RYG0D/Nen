#!/usr/bin/env node

/**
 * Frontend Pages Testing & Fixing Script
 * Systematically tests all frontend pages and identifies/fixes issues
 */

const fs = require('fs');
const path = require('path');

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalPages: 0,
    workingPages: 0,
    issuesFound: 0,
    issuesFixed: 0
  },
  pages: [],
  issues: [],
  fixes: []
};

// List of all frontend pages to test
const FRONTEND_PAGES = [
  { file: 'index.tsx', route: '/', name: 'Homepage', critical: true },
  { file: 'index-new.tsx', route: '/index-new', name: 'New Homepage', critical: false },
  { file: 'betting.tsx', route: '/betting', name: 'Betting Page', critical: true },
  { file: 'create-room.tsx', route: '/create-room', name: 'Create Room', critical: true },
  { file: 'debug-api.tsx', route: '/debug-api', name: 'Debug API', critical: false },
  { file: 'leaderboard.tsx', route: '/leaderboard', name: 'Leaderboard', critical: true },
  { file: 'marketplace.tsx', route: '/marketplace', name: 'Marketplace', critical: true },
  { file: 'matches.tsx', route: '/matches', name: 'Matches List', critical: true },
  { file: 'profile.tsx', route: '/profile', name: 'Profile', critical: true },
  { file: 'profile-test.tsx', route: '/profile-test', name: 'Profile Test', critical: false },
  { file: 'test-buttons.tsx', route: '/test-buttons', name: 'Test Buttons', critical: false },
  { file: 'training.tsx', route: '/training', name: 'Training', critical: true },
  { file: 'training-fixed.tsx', route: '/training-fixed', name: 'Training Fixed', critical: false },
  { file: 'training-gi-compliant.tsx', route: '/training-gi-compliant', name: 'Training GI', critical: false },
  { file: 'training-no-ssr.tsx', route: '/training-no-ssr', name: 'Training No SSR', critical: false },
  { file: 'training-simple.tsx', route: '/training-simple', name: 'Training Simple', critical: false },
  { file: 'training-test.tsx', route: '/training-test', name: 'Training Test', critical: false },
  { file: '_app.tsx', route: null, name: 'App Component', critical: true },
  { file: '_document.tsx', route: null, name: 'Document Component', critical: true }
];

// Dynamic routes to test
const DYNAMIC_ROUTES = [
  { pattern: 'arena/[matchId].tsx', route: '/arena/test-match', name: 'Arena Match View', critical: true },
  { pattern: 'marketplace/[listingId].tsx', route: '/marketplace/test-listing', name: 'Marketplace Listing', critical: true },
  { pattern: 'matches/[matchId].tsx', route: '/matches/test-match', name: 'Match Details', critical: true },
  { pattern: 'training/[sessionId].tsx', route: '/training/test-session', name: 'Training Session', critical: true }
];

const FRONTEND_DIR = path.join(__dirname, 'frontend', 'pages');
const COMPONENTS_DIR = path.join(__dirname, 'frontend', 'components');

class PageTester {
  constructor() {
    console.log('🧪 Frontend Pages Testing & Fixing Script');
    console.log('==========================================');
  }

  // Check if page file exists and is readable
  checkPageFile(pageInfo) {
    const filePath = path.join(FRONTEND_DIR, pageInfo.file);
    const result = {
      ...pageInfo,
      filePath,
      exists: false,
      readable: false,
      syntaxValid: false,
      issues: [],
      content: null
    };

    try {
      // Check if file exists
      if (fs.existsSync(filePath)) {
        result.exists = true;
        
        // Try to read file
        try {
          result.content = fs.readFileSync(filePath, 'utf8');
          result.readable = true;
          
          // Basic syntax validation
          result.syntaxValid = this.validateSyntax(result.content, pageInfo);
          
        } catch (readError) {
          result.issues.push(`File read error: ${readError.message}`);
        }
      } else {
        result.issues.push('Page file does not exist');
      }
    } catch (error) {
      result.issues.push(`Check error: ${error.message}`);
    }

    return result;
  }

  // Basic syntax validation for React/TypeScript files
  validateSyntax(content, pageInfo) {
    const issues = [];

    // Check for basic React structure
    if (!content.includes('export default') && !content.includes('export {')) {
      issues.push('Missing default export');
    }

    // Check for common syntax errors
    const braceBalance = this.checkBraceBalance(content);
    if (braceBalance !== 0) {
      issues.push(`Unbalanced braces (${braceBalance > 0 ? 'missing closing' : 'extra closing'})`);
    }

    // Check for JSX syntax issues
    if (content.includes('return (') && !content.includes('</')) {
      if (content.includes('<div') || content.includes('<span') || content.includes('<h1')) {
        issues.push('Possible unclosed JSX elements');
      }
    }

    // Check for import issues
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    importLines.forEach((line, index) => {
      if (!line.includes('from') && !line.includes('import(')) {
        issues.push(`Invalid import syntax on line ${index + 1}: ${line.trim()}`);
      }
    });

    // Check for TypeScript errors
    if (pageInfo.file.endsWith('.tsx') || pageInfo.file.endsWith('.ts')) {
      // Look for obvious TypeScript issues
      if (content.includes(': JSX.Element') && !content.includes('React')) {
        issues.push('JSX.Element type used without React import');
      }
    }

    // Store issues in the page info
    if (issues.length > 0) {
      testResults.issues.push({
        page: pageInfo.name,
        file: pageInfo.file,
        type: 'syntax',
        issues: issues
      });
    }

    return issues.length === 0;
  }

  // Simple brace balance checker
  checkBraceBalance(content) {
    let balance = 0;
    for (const char of content) {
      if (char === '{') balance++;
      if (char === '}') balance--;
    }
    return balance;
  }

  // Check for common component dependencies
  checkDependencies(pageInfo, content) {
    const issues = [];
    const dependencies = [];

    // Extract imports
    const importMatches = content.match(/import .+ from ['"]([^'"]+)['"]/g) || [];
    importMatches.forEach(match => {
      const moduleName = match.match(/from ['"]([^'"]+)['"]/)[1];
      dependencies.push(moduleName);
    });

    // Check for components that might not exist
    const componentImports = dependencies.filter(dep => dep.startsWith('@/components/'));
    componentImports.forEach(componentPath => {
      const fullPath = path.join(COMPONENTS_DIR, componentPath.replace('@/components/', ''));
      const possiblePaths = [
        `${fullPath}.tsx`,
        `${fullPath}.ts`,
        `${fullPath}/index.tsx`,
        `${fullPath}/index.ts`
      ];
      
      const exists = possiblePaths.some(p => fs.existsSync(p));
      if (!exists) {
        issues.push(`Component not found: ${componentPath}`);
      }
    });

    return { dependencies, issues };
  }

  // Test a single page
  async testPage(pageInfo) {
    console.log(`\n📄 Testing: ${pageInfo.name} (${pageInfo.file})`);
    
    const result = this.checkPageFile(pageInfo);
    
    if (!result.exists) {
      console.log(`   ❌ File does not exist: ${result.filePath}`);
      return result;
    }
    
    if (!result.readable) {
      console.log(`   ❌ Cannot read file`);
      return result;
    }
    
    console.log(`   ✅ File exists and is readable`);
    
    if (!result.syntaxValid) {
      console.log(`   ⚠️  Syntax issues found`);
    } else {
      console.log(`   ✅ Basic syntax looks good`);
    }

    // Check dependencies
    const depCheck = this.checkDependencies(pageInfo, result.content);
    if (depCheck.issues.length > 0) {
      console.log(`   ⚠️  Dependency issues: ${depCheck.issues.length}`);
      result.issues.push(...depCheck.issues);
    } else {
      console.log(`   ✅ Dependencies look good`);
    }

    // Log any issues found
    if (result.issues.length > 0) {
      console.log(`   Issues found:`);
      result.issues.forEach(issue => console.log(`     - ${issue}`));
    }

    return result;
  }

  // Test all pages
  async runTests() {
    console.log(`\n🔍 Testing ${FRONTEND_PAGES.length} pages...\n`);

    for (const pageInfo of FRONTEND_PAGES) {
      const result = await this.testPage(pageInfo);
      testResults.pages.push(result);
      testResults.summary.totalPages++;

      if (result.exists && result.readable && result.syntaxValid && result.issues.length === 0) {
        testResults.summary.workingPages++;
      } else {
        testResults.summary.issuesFound++;
      }
    }

    // Test dynamic routes (check if files exist)
    console.log('\n📋 Checking dynamic routes...');
    for (const route of DYNAMIC_ROUTES) {
      const filePath = path.join(FRONTEND_DIR, route.pattern);
      const exists = fs.existsSync(filePath);
      console.log(`   ${exists ? '✅' : '❌'} ${route.name} (${route.pattern})`);
      
      if (!exists) {
        testResults.issues.push({
          page: route.name,
          file: route.pattern,
          type: 'missing',
          issues: ['Dynamic route file does not exist']
        });
      }
    }
  }

  // Generate fix suggestions
  generateFixes() {
    console.log('\n🔧 Generating fixes for issues...');

    testResults.issues.forEach(issue => {
      if (issue.type === 'syntax') {
        issue.issues.forEach(syntaxIssue => {
          if (syntaxIssue.includes('Unbalanced braces')) {
            testResults.fixes.push({
              page: issue.page,
              issue: syntaxIssue,
              fix: 'Check and balance JSX braces, ensure all components are properly closed',
              priority: 'high'
            });
          }
          if (syntaxIssue.includes('Missing default export')) {
            testResults.fixes.push({
              page: issue.page,
              issue: syntaxIssue,
              fix: 'Add "export default" for the main component',
              priority: 'high'
            });
          }
          if (syntaxIssue.includes('Component not found')) {
            testResults.fixes.push({
              page: issue.page,
              issue: syntaxIssue,
              fix: 'Create missing component or fix import path',
              priority: 'medium'
            });
          }
        });
      }
    });
  }

  // Generate final report
  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total Pages: ${testResults.summary.totalPages}`);
    console.log(`Working Pages: ${testResults.summary.workingPages}`);
    console.log(`Pages with Issues: ${testResults.summary.issuesFound}`);
    console.log(`Success Rate: ${((testResults.summary.workingPages / testResults.summary.totalPages) * 100).toFixed(1)}%`);

    if (testResults.issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      testResults.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.page} (${issue.file})`);
        issue.issues.forEach(i => console.log(`   - ${i}`));
      });
    }

    if (testResults.fixes.length > 0) {
      console.log('\n🔧 RECOMMENDED FIXES:');
      testResults.fixes.forEach((fix, index) => {
        console.log(`\n${index + 1}. ${fix.page} [${fix.priority.toUpperCase()}]`);
        console.log(`   Issue: ${fix.issue}`);
        console.log(`   Fix: ${fix.fix}`);
      });
    }

    // Save detailed report
    const reportPath = path.join(__dirname, 'frontend-pages-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return testResults;
  }

  async run() {
    try {
      await this.runTests();
      this.generateFixes();
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
      const hasIssues = results.summary.issuesFound > 0;
      console.log(hasIssues ? '\n⚠️  Issues found - see above for details' : '\n🎉 All pages look good!');
      process.exit(hasIssues ? 1 : 0);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = PageTester;
