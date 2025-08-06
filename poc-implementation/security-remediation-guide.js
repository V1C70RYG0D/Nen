#!/usr/bin/env node

/**
 * Security Remediation Guide
 * Provides actionable steps to fix identified security vulnerabilities
 */

const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

class SecurityRemediationGuide {
  constructor() {
    this.remediations = [];
    this.criticalIssues = [];
    this.highIssues = [];
    this.mediumIssues = [];
  }

  log(message, level = 'INFO') {
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      WARN: '\x1b[33m',
      ERROR: '\x1b[31m',
      CRITICAL: '\x1b[41m'
    };
    console.log(`${colors[level]}[${level}] ${message}\x1b[0m`);
  }

  addRemediation(severity, title, description, steps, verification = null) {
    const remediation = {
      severity,
      title,
      description,
      steps,
      verification,
      timestamp: new Date().toISOString()
    };

    this.remediations.push(remediation);

    switch(severity) {
      case 'CRITICAL':
        this.criticalIssues.push(remediation);
        break;
      case 'HIGH':
        this.highIssues.push(remediation);
        break;
      case 'MEDIUM':
        this.mediumIssues.push(remediation);
        break;
    }
  }

  // Generate strong JWT secret
  generateStrongJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Generate secure environment configuration
  async generateSecureEnvironmentConfig() {
    try {
      const envContent = await fs.readFile('.env', 'utf8');
      let updatedContent = envContent;

      // Generate strong JWT secret
      const strongJWTSecret = this.generateStrongJWTSecret();
      updatedContent = updatedContent.replace(
        /JWT_SECRET=.*$/m,
        `JWT_SECRET=${strongJWTSecret}`
      );

      // Add refresh token secret if not present
      if (!updatedContent.includes('REFRESH_TOKEN_SECRET=')) {
        const refreshSecret = this.generateStrongJWTSecret();
        updatedContent += `\nREFRESH_TOKEN_SECRET=${refreshSecret}\n`;
      }

      // Update CORS_ORIGIN to be more restrictive in production
      updatedContent = updatedContent.replace(
        /CORS_ORIGIN=\*$/m,
        'CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com'
      );

      // Add security headers configuration
      if (!updatedContent.includes('SECURITY_HEADERS_ENABLED=')) {
        updatedContent += `\n# Security Configuration\nSECURITY_HEADERS_ENABLED=true\nCSP_ENABLED=true\nHSTS_ENABLED=true\n`;
      }

      await fs.writeFile('.env.secure', updatedContent);
      
      this.log('✓ Generated secure environment configuration in .env.secure', 'SUCCESS');
      return true;
    } catch (error) {
      this.log(`✗ Failed to generate secure environment config: ${error.message}`, 'ERROR');
      return false;
    }
  }

  // Create security middleware enhancements
  async createSecurityMiddlewareEnhancements() {
    const securityMiddlewareContent = `
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
});

// Rate limiting middleware
export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit?.resetTime?.getTime() - Date.now() || 0) / 1000
    });
  }
});

// Strict authentication rate limiting for sensitive endpoints
export const authRateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
  message: {
    error: 'Too many authentication attempts from this IP, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Basic XSS prevention
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\\//g, '&#x2F;');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// CORS configuration
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Request validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details.map((d: any) => d.message)
      });
    }
    next();
  };
};

// Session security middleware
export const secureSessionConfig = {
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const
  }
};
`;

    try {
      await fs.writeFile('backend/src/middleware/security.ts', securityMiddlewareContent);
      this.log('✓ Created enhanced security middleware', 'SUCCESS');
      return true;
    } catch (error) {
      this.log(`✗ Failed to create security middleware: ${error.message}`, 'ERROR');
      return false;
    }
  }

  // Create package.json security dependencies update
  async updateSecurityDependencies() {
    try {
      const packageJsonPath = 'package.json';
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      // Add security dependencies
      const securityDependencies = {
        'helmet': '^7.0.0',
        'express-rate-limit': '^7.0.0',
        'express-validator': '^7.0.0',
        'cors': '^2.8.5',
        'bcrypt': '^5.1.0',
        'joi': '^17.9.0',
        'express-session': '^1.17.0',
        'connect-redis': '^7.1.0'
      };

      // Update dependencies
      packageJson.dependencies = { ...packageJson.dependencies, ...securityDependencies };

      // Update devDependencies for security testing
      const securityDevDependencies = {
        '@types/bcrypt': '^5.0.0',
        '@types/cors': '^2.8.0',
        '@types/express-session': '^1.17.0',
        'audit-ci': '^6.6.1',
        'snyk': '^1.0.0'
      };

      packageJson.devDependencies = { ...packageJson.devDependencies, ...securityDevDependencies };

      // Add security scripts
      const securityScripts = {
        'security:audit': 'npm audit --audit-level=moderate',
        'security:fix': 'npm audit fix',
        'security:check': 'audit-ci --config audit-ci.json',
        'security:snyk': 'snyk test'
      };

      packageJson.scripts = { ...packageJson.scripts, ...securityScripts };

      await fs.writeFile('package.json.secure', JSON.stringify(packageJson, null, 2));
      this.log('✓ Created updated package.json with security dependencies', 'SUCCESS');
      return true;
    } catch (error) {
      this.log(`✗ Failed to update security dependencies: ${error.message}`, 'ERROR');
      return false;
    }
  }

  // Create Python requirements security update
  async updatePythonSecurityRequirements() {
    try {
      const requirementsPath = 'ai/requirements.txt';
      const requirements = await fs.readFile(requirementsPath, 'utf8');
      
      // Update flask-cors to version 6.0.0 or higher
      let updatedRequirements = requirements.replace(/flask-cors==5\.0\.0/g, 'flask-cors>=6.0.0');
      
      // Update torch to latest stable version
      updatedRequirements = updatedRequirements.replace(/torch==2\.7\.1/g, 'torch>=2.1.0,<3.0.0');

      // Add security-related packages
      const securityPackages = `
# Security packages
cryptography>=41.0.0
pydantic>=2.0.0
python-jose>=3.3.0
passlib>=1.7.4
`;

      updatedRequirements += securityPackages;

      await fs.writeFile('ai/requirements.secure.txt', updatedRequirements);
      this.log('✓ Created secure Python requirements', 'SUCCESS');
      return true;
    } catch (error) {
      this.log(`✗ Failed to update Python requirements: ${error.message}`, 'ERROR');
      return false;
    }
  }

  // Create security configuration files
  async createSecurityConfigFiles() {
    // Create audit-ci configuration
    const auditCiConfig = {
      "moderate": true,
      "high": true,
      "critical": true,
      "report-type": "summary",
      "allowlist": []
    };

    // Create security policy file
    const securityPolicy = `
# Security Policy

## Reporting Security Issues

Please report security vulnerabilities to security@nenplatform.com

## Security Measures

### Authentication
- JWT-based authentication with secure secrets
- Wallet signature verification for Solana integration
- Session management with secure cookies

### Authorization
- Role-based access control (RBAC)
- Resource ownership validation
- Permission-based endpoint protection

### Input Validation
- Request sanitization middleware
- Schema validation using Joi
- XSS protection
- SQL injection prevention

### Network Security
- CORS configuration
- Rate limiting
- HTTPS enforcement
- Security headers (CSP, HSTS, etc.)

### Data Protection
- Environment variable security
- Secure secret management
- Encryption for sensitive data
- Secure session configuration
`;

    // Create security headers configuration
    const securityHeadersConfig = `
# Security Headers Configuration

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: ws:; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
`;

    try {
      await fs.writeFile('audit-ci.json', JSON.stringify(auditCiConfig, null, 2));
      await fs.writeFile('SECURITY.md', securityPolicy);
      await fs.writeFile('security-headers.conf', securityHeadersConfig);
      this.log('✓ Created security configuration files', 'SUCCESS');
      return true;
    } catch (error) {
      this.log(`✗ Failed to create security config files: ${error.message}`, 'ERROR');
      return false;
    }
  }

  // Generate remediation steps
  generateRemediationSteps() {
    // Critical: Fix JWT Secret
    this.addRemediation(
      'CRITICAL',
      'Fix JWT Secret Configuration',
      'The JWT secret is using a default/weak value that must be changed immediately',
      [
        '1. Generate a strong JWT secret using crypto.randomBytes(64).toString("hex")',
        '2. Update the JWT_SECRET in .env file',
        '3. Add REFRESH_TOKEN_SECRET with a different strong secret',
        '4. Restart all services',
        '5. Verify that authentication still works with new secrets'
      ],
      'Test JWT authentication endpoint to ensure tokens are properly signed'
    );

    // Critical: Remove Default Secrets
    this.addRemediation(
      'CRITICAL',
      'Remove Default/Weak Secrets from Environment',
      'Default secrets found in .env file present critical security risk',
      [
        '1. Replace "generate-strong-secret-in-production" with actual strong secrets',
        '2. Generate unique secrets for each environment (dev, staging, prod)',
        '3. Use environment-specific secret management',
        '4. Never commit secrets to version control',
        '5. Use secret management tools like HashiCorp Vault or AWS Secrets Manager in production'
      ],
      'Verify no default secret strings remain in environment configuration'
    );

    // High: Update Python Dependencies
    this.addRemediation(
      'HIGH',
      'Update Vulnerable Python Dependencies',
      'Flask-CORS and Torch packages have known vulnerabilities',
      [
        '1. Update flask-cors to version 6.0.0 or higher: pip install flask-cors>=6.0.0',
        '2. Update torch to latest stable version: pip install "torch>=2.1.0,<3.0.0"',
        '3. Run pip-audit again to verify fixes',
        '4. Test AI service functionality after updates',
        '5. Add automated dependency vulnerability scanning to CI/CD'
      ],
      'Run "python -m pip_audit -r ai/requirements.txt" to confirm no vulnerabilities'
    );

    // High: Update NPM Dependencies
    this.addRemediation(
      'HIGH',
      'Fix NPM Dependency Vulnerabilities',
      'Multiple NPM packages have known security vulnerabilities',
      [
        '1. Run "npm audit fix" to automatically fix compatible issues',
        '2. For breaking changes, run "npm audit fix --force" (test thoroughly after)',
        '3. Manually update critical packages like axios, crypto-js',
        '4. Review and update @metaplex-foundation packages',
        '5. Add npm audit to CI/CD pipeline'
      ],
      'Run "npm audit" to confirm vulnerability count is reduced or eliminated'
    );

    // Medium: Add Security Middleware
    this.addRemediation(
      'MEDIUM',
      'Implement Security Middleware',
      'Add comprehensive security middleware for protection against common attacks',
      [
        '1. Install security packages: npm install helmet express-rate-limit express-validator cors',
        '2. Implement the security middleware created in backend/src/middleware/security.ts',
        '3. Add rate limiting to authentication endpoints',
        '4. Configure CORS properly for production',
        '5. Add input sanitization middleware',
        '6. Implement security headers middleware'
      ],
      'Test API endpoints to ensure security headers and rate limiting are active'
    );

    // Medium: Add Encryption Libraries
    this.addRemediation(
      'MEDIUM',
      'Add Data Encryption Capabilities',
      'No obvious encryption libraries found for protecting sensitive data',
      [
        '1. Add encryption libraries: npm install bcrypt crypto-js',
        '2. Implement password hashing using bcrypt',
        '3. Add encryption for sensitive data at rest',
        '4. Use crypto module for secure token generation',
        '5. Implement data encryption for PII storage'
      ],
      'Verify encryption functions work properly and sensitive data is protected'
    );

    // Medium: Improve Session Security
    this.addRemediation(
      'MEDIUM',
      'Enhance Session Security',
      'Improve session management with secure configurations',
      [
        '1. Add express-session and connect-redis: npm install express-session connect-redis',
        '2. Configure secure session cookies (httpOnly, secure, sameSite)',
        '3. Implement session invalidation on logout',
        '4. Add session timeout handling',
        '5. Use Redis for session storage in production'
      ],
      'Test session behavior and verify secure cookie attributes'
    );

    // Medium: Add Security Headers
    this.addRemediation(
      'MEDIUM',
      'Implement Security Headers',
      'Add security headers to protect against common web vulnerabilities',
      [
        '1. Install helmet: npm install helmet',
        '2. Configure CSP, HSTS, X-Frame-Options, etc.',
        '3. Add security headers to all responses',
        '4. Test headers using security scanner',
        '5. Adjust CSP policy for WebSocket and API needs'
      ],
      'Use online security header checkers to verify proper configuration'
    );
  }

  // Run all remediation steps
  async runAllRemediations() {
    this.log('🔧 Starting Security Remediation Process...', 'INFO');

    this.generateRemediationSteps();

    // Generate secure configurations
    await this.generateSecureEnvironmentConfig();
    await this.createSecurityMiddlewareEnhancements();
    await this.updateSecurityDependencies();
    await this.updatePythonSecurityRequirements();
    await this.createSecurityConfigFiles();

    // Generate comprehensive report
    const report = {
      title: 'Security Remediation Guide',
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.remediations.length,
        critical: this.criticalIssues.length,
        high: this.highIssues.length,
        medium: this.mediumIssues.length
      },
      remediations: this.remediations,
      filesGenerated: [
        '.env.secure',
        'backend/src/middleware/security.ts',
        'package.json.secure',
        'ai/requirements.secure.txt',
        'audit-ci.json',
        'SECURITY.md',
        'security-headers.conf'
      ]
    };

    // Write report
    await fs.writeFile('SECURITY_REMEDIATION_GUIDE.md', this.formatMarkdownReport(report));
    await fs.writeFile('security-remediation-results.json', JSON.stringify(report, null, 2));

    this.log('✅ Security remediation guide completed!', 'SUCCESS');
    this.log('📋 Report generated: SECURITY_REMEDIATION_GUIDE.md', 'SUCCESS');

    return report;
  }

  formatMarkdownReport(report) {
    let markdown = `# ${report.title}\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `This guide provides actionable steps to fix the ${report.summary.totalIssues} security issues identified:\n\n`;
    markdown += `- **Critical Issues:** ${report.summary.critical} (Fix immediately)\n`;
    markdown += `- **High Priority Issues:** ${report.summary.high} (Fix within 24-48 hours)\n`;
    markdown += `- **Medium Priority Issues:** ${report.summary.medium} (Fix within 1 week)\n\n`;

    // Files Generated
    markdown += `## Generated Files\n\n`;
    markdown += `The following files have been created to help with remediation:\n\n`;
    for (const file of report.filesGenerated) {
      markdown += `- \`${file}\`\n`;
    }
    markdown += `\n`;

    // Remediation Steps by Priority
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM'];
    
    for (const priority of priorities) {
      const issues = report.remediations.filter(r => r.severity === priority);
      if (issues.length === 0) continue;
      
      markdown += `## ${priority} Priority Issues\n\n`;
      
      for (const issue of issues) {
        markdown += `### ${issue.title}\n\n`;
        markdown += `**Description:** ${issue.description}\n\n`;
        markdown += `**Remediation Steps:**\n`;
        for (const step of issue.steps) {
          markdown += `${step}\n`;
        }
        markdown += `\n`;
        
        if (issue.verification) {
          markdown += `**Verification:** ${issue.verification}\n\n`;
        }
      }
    }

    // Implementation Order
    markdown += `## Recommended Implementation Order\n\n`;
    markdown += `1. **Immediate (Within 1 hour):**\n`;
    markdown += `   - Fix JWT secrets and remove default secrets\n`;
    markdown += `   - Update .env file with secure configuration\n\n`;
    
    markdown += `2. **Within 24 hours:**\n`;
    markdown += `   - Update vulnerable dependencies (Python and NPM)\n`;
    markdown += `   - Install security middleware packages\n\n`;
    
    markdown += `3. **Within 1 week:**\n`;
    markdown += `   - Implement security middleware\n`;
    markdown += `   - Add encryption capabilities\n`;
    markdown += `   - Configure security headers\n`;
    markdown += `   - Set up automated security scanning\n\n`;

    // Quick Start Commands
    markdown += `## Quick Start Commands\n\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `# 1. Fix critical environment issues\n`;
    markdown += `cp .env.secure .env\n`;
    markdown += `\n`;
    markdown += `# 2. Update dependencies\n`;
    markdown += `npm install\n`;
    markdown += `pip install -r ai/requirements.secure.txt\n`;
    markdown += `\n`;
    markdown += `# 3. Run security checks\n`;
    markdown += `npm audit\n`;
    markdown += `python -m pip_audit -r ai/requirements.txt\n`;
    markdown += `\n`;
    markdown += `# 4. Install security packages\n`;
    markdown += `npm install helmet express-rate-limit express-validator cors bcrypt\n`;
    markdown += `\`\`\`\n\n`;

    return markdown;
  }
}

// Run if called directly
if (require.main === module) {
  const guide = new SecurityRemediationGuide();
  guide.runAllRemediations()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Remediation failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityRemediationGuide;
