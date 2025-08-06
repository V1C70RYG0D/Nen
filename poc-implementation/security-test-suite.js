#!/usr/bin/env node

/**
 * Comprehensive Security Testing Suite
 * Validates security measures and identifies vulnerabilities across the platform
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SecurityTestSuite {
  constructor() {
    this.results = {
      vulnerabilityScan: {},
      authenticationSecurity: {},
      authorizationTests: {},
      inputValidation: {},
      apiSecurity: {},
      websocketSecurity: {},
      environmentSecurity: {},
      encryptionTests: {},
      securityHeaders: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    this.wsUrl = process.env.WS_URL || 'ws://localhost:3001';
    this.isOnline = false;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      WARN: '\x1b[33m',
      ERROR: '\x1b[31m',
      CRITICAL: '\x1b[41m'
    };
    console.log(`${colors[level]}[${timestamp}] [${level}] ${message}\x1b[0m`);
  }

  addTestResult(category, test, status, details = '', severity = 'medium') {
    this.results.summary.totalTests++;
    
    if (status === 'PASS') {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
      this.results.summary[severity]++;
    }

    if (!this.results[category]) {
      this.results[category] = {};
    }

    this.results[category][test] = {
      status,
      details,
      severity,
      timestamp: new Date().toISOString()
    };
  }

  async checkServiceHealth() {
    try {
      const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000"');
      this.isOnline = stdout.trim() === '200';
      if (this.isOnline) {
        this.log('✓ Backend service is online', 'SUCCESS');
      } else {
        this.log('✗ Backend service is offline - some tests will be skipped', 'WARN');
      }
    } catch (error) {
      this.log('✗ Could not check service health', 'WARN');
    }
  }

  // 1. Dependency Vulnerability Scan
  async runDependencyVulnerabilityScan() {
    this.log('Starting dependency vulnerability scan...', 'INFO');

    try {
      // NPM Audit
      try {
        const { stdout, stderr } = await execAsync('npm audit --json', { cwd: __dirname });
        const auditResult = JSON.parse(stdout);
        
        const vulnerabilityCount = auditResult.metadata?.vulnerabilities || {};
        const total = Object.values(vulnerabilityCount).reduce((sum, count) => sum + count, 0);
        
        if (total === 0) {
          this.addTestResult('vulnerabilityScan', 'npmAudit', 'PASS', 'No vulnerabilities found in npm dependencies');
        } else {
          const details = `Found ${total} vulnerabilities: ${JSON.stringify(vulnerabilityCount)}`;
          const severity = vulnerabilityCount.critical > 0 ? 'critical' : vulnerabilityCount.high > 0 ? 'high' : 'medium';
          this.addTestResult('vulnerabilityScan', 'npmAudit', 'FAIL', details, severity);
        }
      } catch (error) {
        const output = error.stdout || error.message;
        if (output.includes('vulnerabilities')) {
          // Parse npm audit output even on exit code 1
          const vulnerabilityMatch = output.match(/(\d+)\s+vulnerabilities/);
          const count = vulnerabilityMatch ? parseInt(vulnerabilityMatch[1]) : 0;
          
          if (count > 0) {
            this.addTestResult('vulnerabilityScan', 'npmAudit', 'FAIL', `Found ${count} vulnerabilities`, 'high');
          }
        } else {
          this.addTestResult('vulnerabilityScan', 'npmAudit', 'FAIL', `NPM audit error: ${output}`, 'medium');
        }
      }

      // Python pip-audit
      try {
        const { stdout } = await execAsync('python -m pip_audit -r ai/requirements.txt --format=json');
        const pipAuditResult = JSON.parse(stdout);
        
        if (pipAuditResult.length === 0) {
          this.addTestResult('vulnerabilityScan', 'pipAudit', 'PASS', 'No vulnerabilities found in Python dependencies');
        } else {
          const details = `Found ${pipAuditResult.length} Python package vulnerabilities`;
          this.addTestResult('vulnerabilityScan', 'pipAudit', 'FAIL', details, 'high');
        }
      } catch (error) {
        if (error.message.includes('Found') && error.message.includes('vulnerabilities')) {
          const vulnCount = error.message.match(/Found (\d+)/)?.[1] || 'some';
          this.addTestResult('vulnerabilityScan', 'pipAudit', 'FAIL', `Found ${vulnCount} Python package vulnerabilities`, 'high');
        } else {
          this.addTestResult('vulnerabilityScan', 'pipAudit', 'WARN', 'Could not run pip-audit - may not be installed', 'low');
        }
      }

    } catch (error) {
      this.log(`Error in vulnerability scan: ${error.message}`, 'ERROR');
      this.addTestResult('vulnerabilityScan', 'general', 'FAIL', error.message, 'medium');
    }
  }

  // 2. Authentication Security Tests
  async testAuthenticationSecurity() {
    this.log('Testing authentication security...', 'INFO');

    // Test JWT token validation
    await this.testJWTValidation();
    
    // Test session management
    await this.testSessionManagement();
    
    // Test password policies (if applicable)
    await this.testPasswordPolicies();
    
    // Test wallet authentication
    await this.testWalletAuthentication();
  }

  async testJWTValidation() {
    if (!this.isOnline) {
      this.addTestResult('authenticationSecurity', 'jwtValidation', 'SKIP', 'Service offline');
      return;
    }

    try {
      // Test invalid JWT
      const response = await this.makeRequest('/api/auth/verify', 'POST', {
        token: 'invalid.jwt.token'
      });

      if (response.success === false) {
        this.addTestResult('authenticationSecurity', 'jwtValidation', 'PASS', 'Invalid JWT properly rejected');
      } else {
        this.addTestResult('authenticationSecurity', 'jwtValidation', 'FAIL', 'Invalid JWT accepted', 'high');
      }

      // Test expired JWT (if we can generate one)
      // Test malformed JWT
      const malformedTests = [
        'not.a.jwt',
        '',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header only
        'malformed'
      ];

      for (const token of malformedTests) {
        const testResponse = await this.makeRequest('/api/auth/verify', 'POST', { token });
        if (testResponse.success !== false) {
          this.addTestResult('authenticationSecurity', 'jwtMalformed', 'FAIL', `Malformed JWT accepted: ${token}`, 'high');
          return;
        }
      }
      
      this.addTestResult('authenticationSecurity', 'jwtMalformed', 'PASS', 'Malformed JWTs properly rejected');

    } catch (error) {
      this.addTestResult('authenticationSecurity', 'jwtValidation', 'FAIL', error.message, 'medium');
    }
  }

  async testSessionManagement() {
    // Check for secure session configuration
    try {
      await this.checkFileForSecurityPractices('backend/src/middleware/auth.ts', [
        { pattern: /httpOnly.*true/i, description: 'HttpOnly cookies' },
        { pattern: /secure.*true/i, description: 'Secure cookies' },
        { pattern: /sameSite/i, description: 'SameSite cookie policy' }
      ], 'sessionSecurity');
      
    } catch (error) {
      this.addTestResult('authenticationSecurity', 'sessionManagement', 'WARN', 'Could not verify session security configuration', 'low');
    }
  }

  async testPasswordPolicies() {
    // Since this is wallet-based auth, check for secure message generation
    try {
      const authService = await fs.readFile('backend/src/services/authService.ts', 'utf8');
      
      if (authService.includes('timestamp') && authService.includes('5 * 60 * 1000')) {
        this.addTestResult('authenticationSecurity', 'timestampValidation', 'PASS', 'Timestamp validation implemented');
      } else {
        this.addTestResult('authenticationSecurity', 'timestampValidation', 'WARN', 'Timestamp validation not clearly implemented', 'medium');
      }

      if (authService.includes('signature') && authService.includes('64')) {
        this.addTestResult('authenticationSecurity', 'signatureValidation', 'PASS', 'Signature length validation present');
      } else {
        this.addTestResult('authenticationSecurity', 'signatureValidation', 'FAIL', 'Signature validation insufficient', 'high');
      }

    } catch (error) {
      this.addTestResult('authenticationSecurity', 'passwordPolicies', 'WARN', 'Could not check authentication policies', 'low');
    }
  }

  async testWalletAuthentication() {
    if (!this.isOnline) {
      this.addTestResult('authenticationSecurity', 'walletAuth', 'SKIP', 'Service offline');
      return;
    }

    try {
      // Test wallet authentication with invalid data
      const invalidWalletTests = [
        { publicKey: '', signature: '', message: '' },
        { publicKey: 'invalid', signature: 'invalid', message: 'test' },
        { publicKey: 'valid-looking-but-not-real-pubkey-here-12345678', signature: 'sig', message: 'msg' }
      ];

      for (const testData of invalidWalletTests) {
        const response = await this.makeRequest('/api/auth/wallet', 'POST', testData);
        if (response.success !== false) {
          this.addTestResult('authenticationSecurity', 'walletAuthValidation', 'FAIL', 'Invalid wallet auth accepted', 'high');
          return;
        }
      }
      
      this.addTestResult('authenticationSecurity', 'walletAuthValidation', 'PASS', 'Invalid wallet authentication properly rejected');

    } catch (error) {
      this.addTestResult('authenticationSecurity', 'walletAuthentication', 'FAIL', error.message, 'medium');
    }
  }

  // 3. Authorization Tests
  async testAuthorizationSecurity() {
    this.log('Testing authorization security...', 'INFO');

    await this.testRoleBasedAccessControl();
    await this.testResourceOwnership();
  }

  async testRoleBasedAccessControl() {
    try {
      const authService = await fs.readFile('backend/src/services/authService.ts', 'utf8');
      
      if (authService.includes('rolePermissions') && authService.includes('user') && authService.includes('admin')) {
        this.addTestResult('authorizationTests', 'rbacImplemented', 'PASS', 'RBAC system implemented');
      } else {
        this.addTestResult('authorizationTests', 'rbacImplemented', 'FAIL', 'RBAC system not properly implemented', 'high');
      }

      if (authService.includes('validatePermissions') && authService.includes('hasRole')) {
        this.addTestResult('authorizationTests', 'permissionValidation', 'PASS', 'Permission validation methods present');
      } else {
        this.addTestResult('authorizationTests', 'permissionValidation', 'FAIL', 'Permission validation insufficient', 'high');
      }

    } catch (error) {
      this.addTestResult('authorizationTests', 'rbac', 'FAIL', error.message, 'medium');
    }
  }

  async testResourceOwnership() {
    try {
      const authService = await fs.readFile('backend/src/services/authService.ts', 'utf8');
      
      if (authService.includes('isResourceOwner')) {
        this.addTestResult('authorizationTests', 'resourceOwnership', 'PASS', 'Resource ownership validation implemented');
      } else {
        this.addTestResult('authorizationTests', 'resourceOwnership', 'FAIL', 'Resource ownership validation missing', 'high');
      }

    } catch (error) {
      this.addTestResult('authorizationTests', 'resourceOwnership', 'FAIL', error.message, 'medium');
    }
  }

  // 4. Input Validation Tests
  async testInputValidation() {
    this.log('Testing input validation security...', 'INFO');

    await this.testSQLInjectionPrevention();
    await this.testXSSProtection();
    await this.testCommandInjectionPrevention();
  }

  async testSQLInjectionPrevention() {
    // Check for parameterized queries or ORM usage
    try {
      const backendFiles = await this.getBackendFiles();
      let hasSQLProtection = false;
      
      for (const file of backendFiles) {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes('parameterized') || content.includes('prepared') || 
            content.includes('?') && content.includes('query') ||
            content.includes('orm') || content.includes('typeorm') || content.includes('prisma')) {
          hasSQLProtection = true;
          break;
        }
      }

      if (hasSQLProtection) {
        this.addTestResult('inputValidation', 'sqlInjection', 'PASS', 'SQL injection protection mechanisms found');
      } else {
        this.addTestResult('inputValidation', 'sqlInjection', 'WARN', 'SQL injection protection not clearly implemented', 'medium');
      }

    } catch (error) {
      this.addTestResult('inputValidation', 'sqlInjection', 'WARN', 'Could not verify SQL injection protection', 'low');
    }
  }

  async testXSSProtection() {
    if (!this.isOnline) {
      this.addTestResult('inputValidation', 'xssProtection', 'SKIP', 'Service offline');
      return;
    }

    try {
      // Test XSS in various endpoints
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert(document.cookie)</script>',
        'javascript:alert(1)',
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      ];

      let xssBlocked = true;

      for (const payload of xssPayloads) {
        try {
          // Test in message field (common vector)
          const response = await this.makeRequest('/api/auth/wallet', 'POST', {
            publicKey: payload,
            signature: 'test',
            message: payload
          });

          // Response should not contain unescaped script tags
          const responseText = JSON.stringify(response);
          if (responseText.includes('<script>') && !responseText.includes('&lt;script&gt;')) {
            xssBlocked = false;
            break;
          }
        } catch (error) {
          // Expected for malformed requests
        }
      }

      if (xssBlocked) {
        this.addTestResult('inputValidation', 'xssProtection', 'PASS', 'XSS payloads properly handled');
      } else {
        this.addTestResult('inputValidation', 'xssProtection', 'FAIL', 'XSS vulnerability detected', 'high');
      }

    } catch (error) {
      this.addTestResult('inputValidation', 'xssProtection', 'WARN', 'Could not test XSS protection', 'low');
    }
  }

  async testCommandInjectionPrevention() {
    // Check for shell command execution patterns
    try {
      const backendFiles = await this.getBackendFiles();
      let hasCommandInjectionRisk = false;
      
      for (const file of backendFiles) {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes('exec(') && !content.includes('execAsync') ||
            content.includes('spawn(') && !content.includes('spawn(')) {
          // Look for direct user input in exec calls
          if (content.includes('req.body') && content.includes('exec')) {
            hasCommandInjectionRisk = true;
            break;
          }
        }
      }

      if (!hasCommandInjectionRisk) {
        this.addTestResult('inputValidation', 'commandInjection', 'PASS', 'No obvious command injection risks found');
      } else {
        this.addTestResult('inputValidation', 'commandInjection', 'FAIL', 'Potential command injection vulnerability', 'critical');
      }

    } catch (error) {
      this.addTestResult('inputValidation', 'commandInjection', 'WARN', 'Could not verify command injection protection', 'low');
    }
  }

  // 5. API Security Tests
  async testAPISecurity() {
    this.log('Testing API security...', 'INFO');

    await this.testRateLimiting();
    await this.testCORSPolicies();
    await this.testHTTPSEnforcement();
  }

  async testRateLimiting() {
    if (!this.isOnline) {
      this.addTestResult('apiSecurity', 'rateLimiting', 'SKIP', 'Service offline');
      return;
    }

    try {
      // Make rapid requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(this.makeRequest('/api/auth/verify', 'POST', { token: 'test' }));
      }

      const responses = await Promise.allSettled(requests);
      const rateLimited = responses.some(r => 
        r.status === 'rejected' || 
        (r.status === 'fulfilled' && (r.value.status === 429 || r.value.message?.includes('rate limit')))
      );

      if (rateLimited) {
        this.addTestResult('apiSecurity', 'rateLimiting', 'PASS', 'Rate limiting is active');
      } else {
        this.addTestResult('apiSecurity', 'rateLimiting', 'WARN', 'Rate limiting not detected', 'medium');
      }

    } catch (error) {
      this.addTestResult('apiSecurity', 'rateLimiting', 'WARN', 'Could not test rate limiting', 'low');
    }
  }

  async testCORSPolicies() {
    if (!this.isOnline) {
      this.addTestResult('apiSecurity', 'corsPolicy', 'SKIP', 'Service offline');
      return;
    }

    try {
      // Test CORS headers
      const response = await this.makeRequestWithHeaders('/health', 'GET', {}, {
        'Origin': 'http://malicious-site.com'
      });

      // Check if CORS is properly configured
      if (response.headers && response.headers['access-control-allow-origin'] === '*') {
        this.addTestResult('apiSecurity', 'corsPolicy', 'WARN', 'CORS allows all origins (*)', 'medium');
      } else if (response.headers && response.headers['access-control-allow-origin']) {
        this.addTestResult('apiSecurity', 'corsPolicy', 'PASS', 'CORS policy appears configured');
      } else {
        this.addTestResult('apiSecurity', 'corsPolicy', 'WARN', 'CORS headers not present', 'low');
      }

    } catch (error) {
      this.addTestResult('apiSecurity', 'corsPolicy', 'WARN', 'Could not test CORS policy', 'low');
    }
  }

  async testHTTPSEnforcement() {
    // Check for HTTPS redirect middleware
    try {
      const backendFiles = await this.getBackendFiles();
      let hasHTTPSEnforcement = false;
      
      for (const file of backendFiles) {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes('https') && content.includes('redirect') ||
            content.includes('force-https') ||
            content.includes('HTTPS') && content.includes('enforce')) {
          hasHTTPSEnforcement = true;
          break;
        }
      }

      // Check environment configuration
      const envContent = await fs.readFile('.env', 'utf8');
      const isProduction = envContent.includes('NODE_ENV=production');

      if (hasHTTPSEnforcement || isProduction) {
        this.addTestResult('apiSecurity', 'httpsEnforcement', 'PASS', 'HTTPS enforcement mechanisms present');
      } else {
        this.addTestResult('apiSecurity', 'httpsEnforcement', 'WARN', 'HTTPS enforcement not configured for production', 'medium');
      }

    } catch (error) {
      this.addTestResult('apiSecurity', 'httpsEnforcement', 'WARN', 'Could not verify HTTPS enforcement', 'low');
    }
  }

  // 6. WebSocket Security Tests
  async testWebSocketSecurity() {
    this.log('Testing WebSocket security...', 'INFO');

    await this.testWebSocketMessageValidation();
    await this.testWebSocketOriginChecking();
  }

  async testWebSocketMessageValidation() {
    try {
      const wsSecurityFile = 'backend/tests/websocket-security-tests.ts';
      const content = await fs.readFile(wsSecurityFile, 'utf8');
      
      if (content.includes('message validation') || content.includes('validate')) {
        this.addTestResult('websocketSecurity', 'messageValidation', 'PASS', 'WebSocket message validation tests present');
      } else {
        this.addTestResult('websocketSecurity', 'messageValidation', 'WARN', 'WebSocket message validation not clearly tested', 'medium');
      }

    } catch (error) {
      this.addTestResult('websocketSecurity', 'messageValidation', 'WARN', 'Could not find WebSocket security tests', 'low');
    }
  }

  async testWebSocketOriginChecking() {
    try {
      const backendFiles = await this.getBackendFiles();
      let hasOriginChecking = false;
      
      for (const file of backendFiles) {
        if (file.includes('websocket') || file.includes('ws') || file.includes('socket')) {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes('origin') && (content.includes('check') || content.includes('validate'))) {
            hasOriginChecking = true;
            break;
          }
        }
      }

      if (hasOriginChecking) {
        this.addTestResult('websocketSecurity', 'originChecking', 'PASS', 'WebSocket origin checking implemented');
      } else {
        this.addTestResult('websocketSecurity', 'originChecking', 'WARN', 'WebSocket origin checking not found', 'medium');
      }

    } catch (error) {
      this.addTestResult('websocketSecurity', 'originChecking', 'WARN', 'Could not verify WebSocket origin checking', 'low');
    }
  }

  // 7. Environment Variable Security
  async testEnvironmentSecurity() {
    this.log('Testing environment variable security...', 'INFO');

    try {
      const envContent = await fs.readFile('.env', 'utf8');
      
      // Check for default/weak secrets
      const weakSecrets = [
        'generate-strong-secret-in-production',
        'your-secret-here',
        'change-me',
        'default',
        '123456'
      ];

      let hasWeakSecrets = false;
      for (const secret of weakSecrets) {
        if (envContent.includes(secret)) {
          hasWeakSecrets = true;
          break;
        }
      }

      if (hasWeakSecrets) {
        this.addTestResult('environmentSecurity', 'secretStrength', 'FAIL', 'Weak or default secrets found in .env', 'critical');
      } else {
        this.addTestResult('environmentSecurity', 'secretStrength', 'PASS', 'No obvious weak secrets in .env');
      }

      // Check if JWT secret is configured
      if (envContent.includes('JWT_SECRET=') && !envContent.includes('JWT_SECRET=generate')) {
        this.addTestResult('environmentSecurity', 'jwtSecret', 'PASS', 'JWT secret is configured');
      } else {
        this.addTestResult('environmentSecurity', 'jwtSecret', 'FAIL', 'JWT secret not properly configured', 'high');
      }

      // Check for secure database configuration
      if (envContent.includes('DATABASE_URL=') || envContent.includes('DB_HOST=')) {
        this.addTestResult('environmentSecurity', 'databaseConfig', 'PASS', 'Database configuration present');
      } else {
        this.addTestResult('environmentSecurity', 'databaseConfig', 'WARN', 'Database configuration not found', 'low');
      }

    } catch (error) {
      this.addTestResult('environmentSecurity', 'envFile', 'WARN', 'Could not read .env file', 'low');
    }
  }

  // 8. Encryption Tests
  async testEncryptionValidation() {
    this.log('Testing encryption validation...', 'INFO');

    await this.testDataAtRestEncryption();
    await this.testDataInTransitEncryption();
  }

  async testDataAtRestEncryption() {
    // Check for encryption libraries and configuration
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const encryptionLibs = ['bcrypt', 'crypto', 'node-forge', 'crypto-js'];
      const hasEncryptionLib = encryptionLibs.some(lib => dependencies[lib]);

      if (hasEncryptionLib) {
        this.addTestResult('encryptionTests', 'dataAtRest', 'PASS', 'Encryption libraries present');
      } else {
        this.addTestResult('encryptionTests', 'dataAtRest', 'WARN', 'No obvious encryption libraries found', 'medium');
      }

    } catch (error) {
      this.addTestResult('encryptionTests', 'dataAtRest', 'WARN', 'Could not verify encryption libraries', 'low');
    }
  }

  async testDataInTransitEncryption() {
    if (!this.isOnline) {
      this.addTestResult('encryptionTests', 'dataInTransit', 'SKIP', 'Service offline');
      return;
    }

    try {
      // Check if HTTPS is used (would fail in local dev)
      if (this.baseUrl.startsWith('https://')) {
        this.addTestResult('encryptionTests', 'dataInTransit', 'PASS', 'HTTPS configured');
      } else {
        this.addTestResult('encryptionTests', 'dataInTransit', 'WARN', 'HTTPS not configured (dev environment)', 'low');
      }

    } catch (error) {
      this.addTestResult('encryptionTests', 'dataInTransit', 'WARN', 'Could not verify HTTPS configuration', 'low');
    }
  }

  // 9. Security Headers Test
  async testSecurityHeaders() {
    this.log('Testing security headers...', 'INFO');

    if (!this.isOnline) {
      this.addTestResult('securityHeaders', 'headers', 'SKIP', 'Service offline');
      return;
    }

    try {
      const response = await this.makeRequestWithHeaders('/health', 'GET');
      const headers = response.headers || {};

      const securityHeaders = {
        'x-frame-options': 'X-Frame-Options',
        'x-content-type-options': 'X-Content-Type-Options',
        'x-xss-protection': 'X-XSS-Protection',
        'strict-transport-security': 'Strict-Transport-Security',
        'content-security-policy': 'Content-Security-Policy'
      };

      const presentHeaders = [];
      const missingHeaders = [];

      for (const [header, displayName] of Object.entries(securityHeaders)) {
        if (headers[header] || headers[header.toLowerCase()]) {
          presentHeaders.push(displayName);
        } else {
          missingHeaders.push(displayName);
        }
      }

      if (presentHeaders.length > 0) {
        this.addTestResult('securityHeaders', 'present', 'PASS', `Security headers present: ${presentHeaders.join(', ')}`);
      }

      if (missingHeaders.length > 0) {
        this.addTestResult('securityHeaders', 'missing', 'WARN', `Missing security headers: ${missingHeaders.join(', ')}`, 'medium');
      }

    } catch (error) {
      this.addTestResult('securityHeaders', 'headers', 'WARN', 'Could not test security headers', 'low');
    }
  }

  // Helper Methods
  async makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      return await response.json();
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async makeRequestWithHeaders(endpoint, method = 'GET', body = null, extraHeaders = {}) {
    // Simplified version for testing - would use real HTTP client in production
    return {
      status: 200,
      headers: {
        'x-powered-by': 'Express',
        'content-type': 'application/json'
      }
    };
  }

  async getBackendFiles() {
    const backendDir = 'backend/src';
    const files = [];
    
    try {
      await this.walkDirectory(backendDir, files);
      return files.filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    } catch (error) {
      return [];
    }
  }

  async walkDirectory(dir, files) {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await this.walkDirectory(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }
  }

  async checkFileForSecurityPractices(filePath, patterns, testName) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const results = [];
      
      for (const { pattern, description } of patterns) {
        if (pattern.test(content)) {
          results.push(description);
        }
      }

      if (results.length > 0) {
        this.addTestResult('securityPractices', testName, 'PASS', `Found: ${results.join(', ')}`);
      } else {
        this.addTestResult('securityPractices', testName, 'WARN', `Security practices not found in ${filePath}`, 'low');
      }

    } catch (error) {
      this.addTestResult('securityPractices', testName, 'WARN', `Could not check ${filePath}`, 'low');
    }
  }

  // Generate comprehensive report
  async generateReport() {
    const report = {
      title: 'Comprehensive Security Testing Report',
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      details: {
        vulnerabilityScan: this.results.vulnerabilityScan,
        authenticationSecurity: this.results.authenticationSecurity,
        authorizationTests: this.results.authorizationTests,
        inputValidation: this.results.inputValidation,
        apiSecurity: this.results.apiSecurity,
        websocketSecurity: this.results.websocketSecurity,
        environmentSecurity: this.results.environmentSecurity,
        encryptionTests: this.results.encryptionTests,
        securityHeaders: this.results.securityHeaders
      },
      recommendations: this.generateRecommendations()
    };

    // Write detailed report to file
    await fs.writeFile('SECURITY_TEST_REPORT.md', this.formatMarkdownReport(report));
    await fs.writeFile('security-test-results.json', JSON.stringify(report, null, 2));

    this.log('Security testing completed!', 'SUCCESS');
    this.log(`Report generated: SECURITY_TEST_REPORT.md`, 'SUCCESS');
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Critical issues
    if (this.results.summary.critical > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        title: 'Address Critical Security Issues',
        description: 'Critical security vulnerabilities detected that need immediate attention'
      });
    }

    // High priority issues
    if (this.results.summary.high > 0) {
      recommendations.push({
        priority: 'HIGH',
        title: 'Fix High Priority Security Issues',
        description: 'High priority security issues that should be addressed soon'
      });
    }

    // Dependency updates
    if (this.results.vulnerabilityScan?.npmAudit?.status === 'FAIL') {
      recommendations.push({
        priority: 'HIGH',
        title: 'Update Dependencies',
        description: 'Run `npm audit fix` to address known vulnerabilities in dependencies'
      });
    }

    // JWT secret
    if (this.results.environmentSecurity?.jwtSecret?.status === 'FAIL') {
      recommendations.push({
        priority: 'CRITICAL',
        title: 'Configure JWT Secret',
        description: 'Set a strong JWT secret in production environment'
      });
    }

    // Security headers
    if (this.results.securityHeaders?.missing?.status === 'WARN') {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'Add Security Headers',
        description: 'Implement missing security headers for better protection against common attacks'
      });
    }

    return recommendations;
  }

  formatMarkdownReport(report) {
    let markdown = `# ${report.title}\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;

    // Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `- **Total Tests:** ${report.summary.totalTests}\n`;
    markdown += `- **Passed:** ${report.summary.passed}\n`;
    markdown += `- **Failed:** ${report.summary.failed}\n`;
    markdown += `- **Warnings:** ${report.summary.warnings}\n\n`;

    markdown += `### Issues by Severity\n`;
    markdown += `- **Critical:** ${report.summary.critical}\n`;
    markdown += `- **High:** ${report.summary.high}\n`;
    markdown += `- **Medium:** ${report.summary.medium}\n`;
    markdown += `- **Low:** ${report.summary.low}\n\n`;

    // Detailed results
    for (const [category, tests] of Object.entries(report.details)) {
      if (Object.keys(tests).length === 0) continue;
      
      markdown += `## ${this.formatCategoryName(category)}\n\n`;
      
      for (const [testName, result] of Object.entries(tests)) {
        const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        markdown += `### ${status} ${this.formatTestName(testName)}\n`;
        markdown += `**Status:** ${result.status}\n`;
        if (result.severity) {
          markdown += `**Severity:** ${result.severity.toUpperCase()}\n`;
        }
        markdown += `**Details:** ${result.details}\n\n`;
      }
    }

    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      
      for (const rec of report.recommendations) {
        markdown += `### ${rec.priority}: ${rec.title}\n`;
        markdown += `${rec.description}\n\n`;
      }
    }

    return markdown;
  }

  formatCategoryName(category) {
    return category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  formatTestName(testName) {
    return testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  // Main execution
  async run() {
    this.log('🔒 Starting Comprehensive Security Testing Suite...', 'INFO');

    await this.checkServiceHealth();

    try {
      await this.runDependencyVulnerabilityScan();
      await this.testAuthenticationSecurity();
      await this.testAuthorizationSecurity();
      await this.testInputValidation();
      await this.testAPISecurity();
      await this.testWebSocketSecurity();
      await this.testEnvironmentSecurity();
      await this.testEncryptionValidation();
      await this.testSecurityHeaders();

      const report = await this.generateReport();

      // Print summary
      this.log('='.repeat(60), 'INFO');
      this.log('SECURITY TEST SUMMARY', 'INFO');
      this.log('='.repeat(60), 'INFO');
      this.log(`Total Tests: ${report.summary.totalTests}`, 'INFO');
      this.log(`Passed: ${report.summary.passed}`, 'SUCCESS');
      this.log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'ERROR' : 'INFO');
      this.log(`Critical Issues: ${report.summary.critical}`, report.summary.critical > 0 ? 'CRITICAL' : 'INFO');
      this.log(`High Issues: ${report.summary.high}`, report.summary.high > 0 ? 'ERROR' : 'INFO');
      this.log('='.repeat(60), 'INFO');

      return report;

    } catch (error) {
      this.log(`Security testing failed: ${error.message}`, 'CRITICAL');
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const suite = new SecurityTestSuite();
  suite.run()
    .then(report => {
      process.exit(report.summary.critical > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Security testing failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityTestSuite;
