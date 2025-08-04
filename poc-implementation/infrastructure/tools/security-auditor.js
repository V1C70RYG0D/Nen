/**
 * Security Audit and Compliance Validator


 *
 * Comprehensive security scanning and vulnerability assessment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixes = [];
    this.projectRoot = process.cwd();
    this.securityScore = 100;
  }

  async runSecurityAudit() {
    console.log('🔒 Starting Comprehensive Security Audit...\n');

    await this.checkDependencyVulnerabilities();
    await this.scanForSecrets();
    await this.validateEnvironmentSecurity();
    await this.checkFilePermissions();
    await this.auditAuthenticationSecurity();
    await this.validateInputSanitization();
    await this.checkCryptographicSecurity();
    await this.auditAPISecurityHeaders();
    await this.validateDataPrivacyCompliance();
    await this.checkContainerSecurity();
    await this.auditSmartContractSecurity();

    this.generateSecurityReport();
  }

  async checkDependencyVulnerabilities() {
    console.log('📦 Checking dependency vulnerabilities...');

    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });

      const audit = JSON.parse(auditResult);

      if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length > 0) {
        const vulnCount = Object.keys(audit.vulnerabilities).length;
        this.issues.push(`Found ${vulnCount} package vulnerabilities`);
        this.securityScore -= vulnCount * 5;

        // Categorize by severity
        let critical = 0, high = 0, moderate = 0, low = 0;

        Object.values(audit.vulnerabilities).forEach(vuln => {
          switch (vuln.severity) {
            case 'critical': critical++; break;
            case 'high': high++; break;
            case 'moderate': moderate++; break;
            case 'low': low++; break;
          }
        });

        if (critical > 0) this.issues.push(`${critical} CRITICAL vulnerabilities found`);
        if (high > 0) this.issues.push(`${high} HIGH severity vulnerabilities found`);
        if (moderate > 0) this.warnings.push(`${moderate} MODERATE vulnerabilities found`);
        if (low > 0) this.warnings.push(`${low} LOW severity vulnerabilities found`);
      } else {
        console.log('✅ No dependency vulnerabilities found');
      }
    } catch (error) {
      this.warnings.push('Could not run npm audit - ensure npm is installed');
    }

    // Check for package-lock.json
    if (!fs.existsSync(path.join(this.projectRoot, 'package-lock.json'))) {
      this.issues.push('Missing package-lock.json - dependency versions not locked');
      this.securityScore -= 10;
    }

    // Check for outdated packages
    try {
      const outdated = execSync('npm outdated --json', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });

      if (outdated.trim()) {
        const packages = JSON.parse(outdated);
        const outdatedCount = Object.keys(packages).length;
        this.warnings.push(`${outdatedCount} packages are outdated`);
      }
    } catch (error) {
      // npm outdated returns non-zero exit code when packages are outdated
    }
  }

  async scanForSecrets() {
    console.log('🕵️  Scanning for exposed secrets...');

    const secretPatterns = [
      { name: 'Private Keys', pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/, severity: 'critical' },
      { name: 'API Keys', pattern: /[aA][pP][iI][-_]?[kK][eE][yY]\s*[:=]\s*['"][^'"]+['"]/, severity: 'high' },
      { name: 'Passwords', pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*['"][^'"]+['"]/, severity: 'critical' },
      { name: 'Tokens', pattern: /[tT][oO][kK][eE][nN]\s*[:=]\s*['"][^'"]+['"]/, severity: 'high' },
      { name: 'Database URLs', pattern: /[dD][aA][tT][aA][bB][aA][sS][eE][-_]?[uU][rR][lL]\s*[:=]\s*['"][^'"]+['"]/, severity: 'high' },
      { name: 'JWT Secrets', pattern: /[jJ][wW][tT][-_]?[sS][eE][cC][rR][eE][tT]\s*[:=]\s*['"][^'"]+['"]/, severity: 'critical' },
      { name: 'AWS Keys', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
      { name: 'Generic Secrets', pattern: /[sS][eE][cC][rR][eE][tT]\s*[:=]\s*['"][^'"]+['"]/, severity: 'moderate' }
    ];

    const filesToScan = this.findCodeFiles();
    let secretsFound = 0;

    for (const file of filesToScan) {
      // Skip certain files
      if (file.includes('node_modules') || file.includes('.git') ||
          file.includes('coverage') || file.includes('dist') ||
          file.includes('build') || file.includes('.env.example')) {
        continue;
      }

      try {
        const content = fs.readFileSync(file, 'utf8');

        for (const { name, pattern, severity } of secretPatterns) {
          if (pattern.test(content)) {
            const message = `Potential ${name} found in ${path.relative(this.projectRoot, file)}`;

            if (severity === 'critical') {
              this.issues.push(message);
              this.securityScore -= 15;
            } else if (severity === 'high') {
              this.issues.push(message);
              this.securityScore -= 10;
            } else {
              this.warnings.push(message);
              this.securityScore -= 5;
            }

            secretsFound++;
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    if (secretsFound === 0) {
      console.log('✅ No exposed secrets found in code');
    } else {
      console.log(`❌ Found ${secretsFound} potential secret exposures`);
    }
  }

  async validateEnvironmentSecurity() {
    console.log('🌍 Validating environment security...');

    const envFiles = [
      'config/.env',
      'config/.env.local',
      'config/.env.development',
      'config/.env.production',
      '.env'
    ];

    let envIssues = 0;

    for (const envFile of envFiles) {
      const fullPath = path.join(this.projectRoot, envFile);

      if (fs.existsSync(fullPath)) {
        // Check file permissions
        const stats = fs.statSync(fullPath);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);

        if (permissions !== '600' && permissions !== '400') {
          this.issues.push(`Environment file ${envFile} has insecure permissions: ${permissions}`);
          this.securityScore -= 10;
          envIssues++;
        }

        // Check for production secrets in non-production files
        if (!envFile.includes('production') && !envFile.includes('example')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('prod') || content.includes('live')) {
            this.warnings.push(`Production-like values found in ${envFile}`);
          }
        }

        // Check for missing required security variables
        if (envFile.includes('production')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const requiredSecurityVars = [
            'JWT_SECRET',
            'ENCRYPTION_KEY',
            'SESSION_SECRET'
          ];

          for (const variable of requiredSecurityVars) {
            if (!content.includes(variable)) {
              this.warnings.push(`Missing security variable ${variable} in ${envFile}`);
            }
          }
        }
      }
    }

    // Check for .env in root (security risk)
    if (fs.existsSync(path.join(this.projectRoot, '.env'))) {
      this.issues.push('Environment file found in root directory - should be in config/');
      this.securityScore -= 15;
      envIssues++;
    }

    if (envIssues === 0) {
      console.log('✅ Environment security configuration looks good');
    } else {
      console.log(`❌ Found ${envIssues} environment security issues`);
    }
  }

  async checkFilePermissions() {
    console.log('📁 Checking file permissions...');

    const sensitiveFiles = [
      'config/.env',
      'config/.env.production',
      'infrastructure/k8s/secrets.yaml',
      'smart-contracts/target/deploy/*.json'
    ];

    let permissionIssues = 0;

    for (const file of sensitiveFiles) {
      const fullPath = path.join(this.projectRoot, file);

      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);

        if (permissions !== '600' && permissions !== '400') {
          this.issues.push(`Sensitive file ${file} has world-readable permissions: ${permissions}`);
          this.securityScore -= 5;
          permissionIssues++;
        }
      }
    }

    // Check for executable files that shouldn't be
    const codeFiles = this.findCodeFiles();
    for (const file of codeFiles.slice(0, 100)) { // Limit to avoid performance issues
      if (file.includes('node_modules')) continue;

      try {
        const stats = fs.statSync(file);
        if (stats.mode & parseInt('111', 8)) { // Check if executable
          if (!file.endsWith('.sh') && !file.endsWith('.py') &&
              !file.includes('bin/') && !file.includes('scripts/')) {
            this.warnings.push(`Code file has executable permissions: ${path.relative(this.projectRoot, file)}`);
          }
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

    if (permissionIssues === 0) {
      console.log('✅ File permissions look secure');
    } else {
      console.log(`❌ Found ${permissionIssues} file permission issues`);
    }
  }

  async auditAuthenticationSecurity() {
    console.log('🔐 Auditing authentication security...');

    const authFiles = this.findFiles(['**/auth/**', '**/middleware/**', '**/guards/**']);
    let authIssues = 0;

    for (const file of authFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for secure session configuration
      if (content.includes('session') && !content.includes('secure')) {
        this.warnings.push(`Session configuration may be missing secure flag in ${file}`);
      }

      // Check for JWT security
      if (content.includes('jwt') || content.includes('JWT')) {
        if (!content.includes('expiresIn') && !content.includes('exp')) {
          this.warnings.push(`JWT token missing expiration in ${file}`);
        }

        if (content.includes('none') || content.includes('HS256')) {
          this.warnings.push(`Consider using stronger JWT algorithm in ${file}`);
        }
      }

      // Check for password handling
      if (content.includes('password') && !content.includes('hash') && !content.includes('bcrypt')) {
        this.issues.push(`Plain text password handling detected in ${file}`);
        this.securityScore -= 15;
        authIssues++;
      }

      // Check for rate limiting
      if (content.includes('login') || content.includes('auth')) {
        if (!content.includes('rate') && !content.includes('limit') && !content.includes('throttle')) {
          this.warnings.push(`Consider implementing rate limiting in ${file}`);
        }
      }
    }

    if (authIssues === 0) {
      console.log('✅ Authentication security looks good');
    } else {
      console.log(`❌ Found ${authIssues} authentication security issues`);
    }
  }

  async validateInputSanitization() {
    console.log('🧹 Validating input sanitization...');

    const apiFiles = this.findFiles(['**/api/**', '**/routes/**', '**/controllers/**']);
    let sanitizationIssues = 0;

    for (const file of apiFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for SQL injection protection
      if (content.includes('query') || content.includes('exec')) {
        if (!content.includes('prepared') && !content.includes('parameterized') &&
            !content.includes('$1') && !content.includes('?')) {
          this.issues.push(`Potential SQL injection vulnerability in ${file}`);
          this.securityScore -= 20;
          sanitizationIssues++;
        }
      }

      // Check for XSS protection
      if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
        if (!content.includes('sanitize') && !content.includes('escape')) {
          this.issues.push(`Potential XSS vulnerability in ${file}`);
          this.securityScore -= 15;
          sanitizationIssues++;
        }
      }

      // Check for input validation
      if (content.includes('req.body') || content.includes('req.query')) {
        if (!content.includes('validate') && !content.includes('joi') &&
            !content.includes('yup') && !content.includes('zod')) {
          this.warnings.push(`Consider adding input validation in ${file}`);
        }
      }
    }

    if (sanitizationIssues === 0) {
      console.log('✅ Input sanitization looks good');
    } else {
      console.log(`❌ Found ${sanitizationIssues} input sanitization issues`);
    }
  }

  async checkCryptographicSecurity() {
    console.log('🔒 Checking cryptographic security...');

    const codeFiles = this.findCodeFiles();
    let cryptoIssues = 0;

    for (const file of codeFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for weak cryptographic algorithms
      const weakAlgorithms = ['md5', 'sha1', 'des', 'rc4'];
      for (const algorithm of weakAlgorithms) {
        if (content.toLowerCase().includes(algorithm)) {
          this.issues.push(`Weak cryptographic algorithm (${algorithm}) found in ${file}`);
          this.securityScore -= 10;
          cryptoIssues++;
        }
      }

      // Check for hardcoded cryptographic keys
      if (content.includes('crypto') && content.includes('createCipher')) {
        if (content.includes('"') || content.includes("'")) {
          this.warnings.push(`Potential hardcoded cryptographic key in ${file}`);
        }
      }

      // Check for secure random number generation
      if (content.includes('Math.random()')) {
        this.warnings.push(`Insecure random number generation in ${file} - use crypto.randomBytes()`);
      }
    }

    if (cryptoIssues === 0) {
      console.log('✅ Cryptographic security looks good');
    } else {
      console.log(`❌ Found ${cryptoIssues} cryptographic security issues`);
    }
  }

  async auditAPISecurityHeaders() {
    console.log('🛡️  Auditing API security headers...');

    const serverFiles = this.findFiles(['**/server.js', '**/app.js', '**/index.js']);
    let headerIssues = 0;

    const requiredHeaders = [
      'helmet',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];

    for (const file of serverFiles) {
      const content = fs.readFileSync(file, 'utf8');

      for (const header of requiredHeaders) {
        if (!content.includes(header)) {
          this.warnings.push(`Missing security header: ${header} in ${file}`);
        }
      }

      // Check for CORS configuration
      if (content.includes('cors') && content.includes('*')) {
        this.issues.push(`Overly permissive CORS configuration in ${file}`);
        this.securityScore -= 10;
        headerIssues++;
      }
    }

    if (headerIssues === 0) {
      console.log('✅ API security headers configuration looks good');
    } else {
      console.log(`❌ Found ${headerIssues} API security header issues`);
    }
  }

  async validateDataPrivacyCompliance() {
    console.log('🛡️  Validating data privacy compliance...');

    const privacyFiles = this.findFiles(['**/privacy/**', '**/gdpr/**', '**/data/**']);
    let privacyIssues = 0;

    // Check for GDPR compliance documentation
    const gdprFiles = ['PRIVACY_POLICY.md', 'GDPR_COMPLIANCE.md', 'DATA_PROTECTION.md'];
    let hasPrivacyDoc = false;

    for (const file of gdprFiles) {
      if (fs.existsSync(path.join(this.projectRoot, 'docs', file))) {
        hasPrivacyDoc = true;
        break;
      }
    }

    if (!hasPrivacyDoc) {
      this.warnings.push('Missing privacy policy or GDPR compliance documentation');
    }

    // Check for data anonymization
    const codeFiles = this.findCodeFiles();
    let hasDataAnonymization = false;

    for (const file of codeFiles) {
      const content = fs.readFileSync(file, 'utf8');

      if (content.includes('anonymize') || content.includes('hash') || content.includes('encrypt')) {
        hasDataAnonymization = true;
      }

      // Check for potential PII logging
      if (content.includes('console.log') || content.includes('logger')) {
        if (content.includes('email') || content.includes('phone') || content.includes('address')) {
          this.warnings.push(`Potential PII in logs: ${path.relative(this.projectRoot, file)}`);
        }
      }
    }

    if (!hasDataAnonymization) {
      this.warnings.push('Consider implementing data anonymization features');
    }

    console.log('✅ Data privacy validationed');
  }

  async checkContainerSecurity() {
    console.log('🐳 Checking container security...');

    const dockerFiles = this.findFiles(['**/Dockerfile*', '**/docker-compose*.yml']);
    let containerIssues = 0;

    for (const file of dockerFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for running as root
      if (!content.includes('USER ') && content.includes('FROM ')) {
        this.warnings.push(`Container may run as root: ${path.relative(this.projectRoot, file)}`);
      }

      // Check for hardcoded secrets
      if (content.includes('ENV ') &&
          (content.includes('PASSWORD') || content.includes('SECRET') || content.includes('KEY'))) {
        this.issues.push(`Hardcoded secrets in container: ${path.relative(this.projectRoot, file)}`);
        this.securityScore -= 15;
        containerIssues++;
      }

      // Check for latest tags
      if (content.includes(':latest')) {
        this.warnings.push(`Using 'latest' tag is not recommended: ${path.relative(this.projectRoot, file)}`);
      }
    }

    if (containerIssues === 0) {
      console.log('✅ Container security looks good');
    } else {
      console.log(`❌ Found ${containerIssues} container security issues`);
    }
  }

  async auditSmartContractSecurity() {
    console.log('⛓️  Auditing smart contract security...');

    const contractFiles = this.findFiles(['**/programs*.rs', '**/contracts*.sol']);
    let contractIssues = 0;

    for (const file of contractFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for common Solana security issues
      if (file.endsWith('.rs')) {
        // Check for proper account validation
        if (content.includes('account_info') && !content.includes('owner')) {
          this.warnings.push(`Consider validating account ownership in ${file}`);
        }

        // Check for overflow protection
        if (content.includes('checked_add') || content.includes('checked_sub')) {
          // Good practice
        } else if (content.includes('+') || content.includes('-')) {
          this.warnings.push(`Consider using checked arithmetic in ${file}`);
        }

        // Check for proper error handling
        if (!content.includes('Result<') && content.includes('unwrap')) {
          this.warnings.push(`Consider proper error handling instead of unwrap in ${file}`);
        }
      }

      // Check for reentrancy protection
      if (content.includes('transfer') && !content.includes('guard')) {
        this.warnings.push(`Consider reentrancy protection in ${file}`);
      }
    }

    if (contractIssues === 0) {
      console.log('✅ Smart contract security looks good');
    } else {
      console.log(`❌ Found ${contractIssues} smart contract security issues`);
    }
  }

  findCodeFiles() {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.sol'];
    const files = [];

    const walk = (dir) => {
      if (dir.includes('node_modules') || dir.includes('.git') ||
          dir.includes('coverage') || dir.includes('dist') || dir.includes('build')) {
        return;
      }

      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    walk(this.projectRoot);
    return files;
  }

  findFiles(patterns) {
    const glob = require('glob');
    let files = [];

    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, {
          cwd: this.projectRoot,
          ignore: ['node_modules/**', '.git/**', 'coverage/**', 'dist/**', 'build/**']
        });
        files.push(...matches.map(file => path.join(this.projectRoot, file)));
      } catch (error) {
        // Pattern not supported, skip
      }
    }

    return [...new Set(files)];
  }

  generateSecurityReport() {
    console.log('\n🔒 SECURITY AUDIT REPORT');
    console.log('='.repeat(50));

    const totalIssues = this.issues.length;
    const totalWarnings = this.warnings.length;

    console.log(`\n❌ Critical Security Issues: ${totalIssues}`);
    this.issues.forEach(issue => console.log(`  • ${issue}`));

    console.log(`\n⚠️  Security Warnings: ${totalWarnings}`);
    this.warnings.forEach(warning => console.log(`  • ${warning}`));

    if (this.fixes.length > 0) {
      console.log(`\n✅ Security Fixes Applied: ${this.fixes.length}`);
      this.fixes.forEach(fix => console.log(`  • ${fix}`));
    }

    // Ensure score doesn't go below 0
    this.securityScore = Math.max(0, this.securityScore);

    console.log(`\n🛡️  Security Score: ${this.securityScore}/100`);

    if (this.securityScore >= 90) {
      console.log('🎉 EXCELLENT! High security standards achieved.');
    } else if (this.securityScore >= 75) {
      console.log('👍 GOOD! Security posture is solid with minor improvements needed.');
    } else if (this.securityScore >= 60) {
      console.log('⚠️  MODERATE! Several security improvements recommended.');
    } else {
      console.log('❌ POOR! Immediate security improvements required.');
    }

    console.log('\n🛠️  Recommendations:');
    console.log('  1. Run regular dependency audits: npm audit');
    console.log('  2. Use security linting: npm install --save-dev eslint-plugin-security');
    console.log('  3. Implement automated security testing in CI/CD');
    console.log('  4. Regular penetration testing');
    console.log('  5. Security headers validation');
    console.log('  6. Input validation and sanitization');
    console.log('  7. Secure coding training for team');

    console.log('\n📚 Security Resources:');
    console.log('  • OWASP Top 10: https://owasp.org/www-project-top-ten/');
    console.log('  • Node.js Security Checklist: https://blog.risingstack.com/node-js-security-checklist/');
    console.log('  • Solana Security Best Practices: https://docs.solana.com/developing/programming-model/security');
  }
}

// Run the auditor if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runSecurityAudit().catch(console.error);
}

module.exports = SecurityAuditor;
