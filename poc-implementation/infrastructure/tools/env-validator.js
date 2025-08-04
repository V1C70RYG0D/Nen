/**
 * Environment Configuration Validator

 *
 * Validates environment configuration and prevents hardcoded values
 */

const fs = require('fs');
const path = require('path');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.projectRoot = process.cwd();
  }

  validateEnvironment() {
    console.log('🌍 Validating Environment Configuration...\n');

    this.checkEnvironmentFiles();
    this.validateRequiredVariables();
    this.checkForHardcodedValues();
    this.validateEnvironmentSpecificConfigs();
    this.checkSecurityConfiguration();
    this.validateExternalServiceConfigs();

    this.generateReport();
  }

  checkEnvironmentFiles() {
    console.log('📁 Checking environment files...');

    const requiredEnvFiles = [
      'config/.env.example',
      'config/.env.production'
    ];

    const optionalEnvFiles = [
      'config/.env',
      'config/.env.development',
      'config/.env.test',
      'config/.env.local'
    ];

    // Check required files
    for (const file of requiredEnvFiles) {
      const fullPath = path.join(this.projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Missing required environment file: ${file}`);
      } else {
        this.info.push(`✅ Found required file: ${file}`);
      }
    }

    // Check optional files
    for (const file of optionalEnvFiles) {
      const fullPath = path.join(this.projectRoot, file);
      if (fs.existsSync(fullPath)) {
        this.info.push(`Found optional file: ${file}`);
      }
    }

    // Check for .env in root (security risk)
    if (fs.existsSync(path.join(this.projectRoot, '.env'))) {
      this.errors.push('Environment file found in root directory - should be in config/ for security');
    }

    // Check file permissions
    const envFiles = [...requiredEnvFiles, ...optionalEnvFiles];
    for (const file of envFiles) {
      const fullPath = path.join(this.projectRoot, file);
      if (fs.existsSync(fullPath) && !file.includes('example')) {
        try {
          const stats = fs.statSync(fullPath);
          const permissions = (stats.mode & parseInt('777', 8)).toString(8);

          if (permissions !== '600' && permissions !== '400') {
            this.warnings.push(`Environment file ${file} has insecure permissions: ${permissions} (should be 600)`);
          }
        } catch (error) {
          this.warnings.push(`Could not check permissions for ${file}`);
        }
      }
    }
  }

  validateRequiredVariables() {
    console.log('🔍 Validating required environment variables...');

    const envConfig = this.loadEnvironmentConfig();

    const requiredVariables = {
      // Core application
      NODE_ENV: { type: 'string', values: ['development', 'production', 'test'] },
      PORT: { type: 'number', min: 1000, max: 65535 },

      // Database
      DATABASE_URL: { type: 'string', pattern: /^postgresql:\/\// },
      REDIS_URL: { type: 'string', pattern: /^redis:\/\// },

      // Security
      JWT_SECRET: { type: 'string', minLength: 32 },
      SESSION_SECRET: { type: 'string', minLength: 32 },

      // Blockchain
      SOLANA_RPC_URL: { type: 'string', pattern: /^https?:\/\// },

      // Frontend
      NEXT_PUBLIC_API_URL: { type: 'string', pattern: /^https?:\/\// }
    };

    const productionOnlyVariables = [
      'ENCRYPTION_KEY',
      'SENTRY_DSN',
      'NEW_RELIC_LICENSE_KEY',
      'DATADOG_API_KEY'
    ];

    // Validate required variables
    for (const [varName, config] of Object.entries(requiredVariables)) {
      const value = envConfig[varName];

      if (!value) {
        this.errors.push(`Missing required environment variable: ${varName}`);
        continue;
      }

      // Type validation
      if (config.type === 'number') {
        const numValue = parseInt(value);
        if (isNaN(numValue)) {
          this.errors.push(`${varName} must be a number, got: ${value}`);
        } else {
          if (config.min && numValue < config.min) {
            this.errors.push(`${varName} must be >= ${config.min}, got: ${numValue}`);
          }
          if (config.max && numValue > config.max) {
            this.errors.push(`${varName} must be <= ${config.max}, got: ${numValue}`);
          }
        }
      }

      // String validation
      if (config.type === 'string') {
        if (config.minLength && value.length < config.minLength) {
          this.errors.push(`${varName} must be at least ${config.minLength} characters long`);
        }

        if (config.pattern && !config.pattern.test(value)) {
          this.errors.push(`${varName} format is invalid`);
        }

        if (config.values && !config.values.includes(value)) {
          this.errors.push(`${varName} must be one of: ${config.values.join(', ')}, got: ${value}`);
        }
      }
    }

    // Check production-specific variables
    if (envConfig.NODE_ENV === 'production') {
      for (const varName of productionOnlyVariables) {
        if (!envConfig[varName]) {
          this.warnings.push(`Production deployment should have ${varName} configured`);
        }
      }
    }

    // Check for development-specific variables in production
    if (envConfig.NODE_ENV === 'production') {
      const devVariables = ['DEBUG', 'DEV_MODE', 'MOCK_'];
      for (const [varName, value] of Object.entries(envConfig)) {
        if (devVariables.some(dev => varName.includes(dev))) {
          this.warnings.push(`Development variable ${varName} found in production environment`);
        }
      }
    }
  }

  checkForHardcodedValues() {
    console.log('🔍 Scanning for hardcoded values...');

    const codeFiles = this.findCodeFiles();
    const hardcodedPatterns = [
      { name: 'URLs', pattern: /https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s"']*)?/, exclude: ['localhost', 'example.com', 'test.com'] },
      { name: 'API Keys', pattern: /[aA][pP][iI][-_]?[kK][eE][yY]\s*[:=]\s*['"][^'"]+['"]/ },
      { name: 'Database Strings', pattern: /(postgresql|mysql|mongodb):\/\/[^\s"']+/ },
      { name: 'Secret Keys', pattern: /[sS][eE][cC][rR][eE][tT][-_]?[kK][eE][yY]\s*[:=]\s*['"][^'"]+['"]/ },
      { name: 'Tokens', pattern: /[tT][oO][kK][eE][nN]\s*[:=]\s*['"][^'"]{20,}['"]/ },
      { name: 'Passwords', pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*['"][^'"]+['"]/ }
    ];

    let hardcodedCount = 0;

    for (const file of codeFiles) {
      if (file.includes('node_modules') || file.includes('.git') ||
          file.includes('test') || file.includes('spec') ||
          file.includes('.env.example') || file.includes('validator.js')) {
        continue;
      }

      try {
        const content = fs.readFileSync(file, 'utf8');

        for (const { name, pattern, exclude = [] } of hardcodedPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            let hasValidMatch = false;

            for (const match of matches) {
              const isExcluded = exclude.some(exc => match.includes(exc));
              if (!isExcluded) {
                const relativePath = path.relative(this.projectRoot, file);
                this.errors.push(`Hardcoded ${name} found in ${relativePath}: ${match.substring(0, 50)}...`);
                hardcodedCount++;
                hasValidMatch = true;
              }
            }
          }
        }

        // Check for magic numbers (excluding common ones)
        const magicNumberPattern = /(?<![a-zA-Z_])\b(?!0|1|2|10|100|1000)\d{3,}\b/g;
        const magicMatches = content.match(magicNumberPattern);
        if (magicMatches && magicMatches.length > 3) {
          const relativePath = path.relative(this.projectRoot, file);
          this.warnings.push(`Multiple magic numbers found in ${relativePath} - consider using constants`);
        }

      } catch (error) {
        // Skip files that can't be read
      }
    }

    if (hardcodedCount === 0) {
      this.info.push('✅ No obvious hardcoded values found');
    } else {
      console.log(`❌ Found ${hardcodedCount} potential hardcoded values`);
    }
  }

  validateEnvironmentSpecificConfigs() {
    console.log('🎯 Validating environment-specific configurations...');

    const environments = ['development', 'production', 'test'];

    for (const env of environments) {
      const envFile = path.join(this.projectRoot, 'config', `.env.${env}`);

      if (fs.existsSync(envFile)) {
        const config = this.loadEnvironmentFile(envFile);

        // Environment-specific validation
        switch (env) {
          case 'production':
            this.validateProductionConfig(config);
            break;
          case 'development':
            this.validateDevelopmentConfig(config);
            break;
          case 'test':
            this.validateTestConfig(config);
            break;
        }
      }
    }
  }

  validateProductionConfig(config) {
    // Production must have secure configurations
    const productionChecks = [
      { key: 'NODE_ENV', expected: 'production' },
      { key: 'DATABASE_SSL', expected: 'true' },
      { key: 'REDIS_TLS', expected: 'true' }
    ];

    for (const { key, expected } of productionChecks) {
      if (config[key] !== expected) {
        this.warnings.push(`Production config should have ${key}=${expected}`);
      }
    }

    // Check for development values in production
    const devIndicators = ['localhost', 'dev', 'test', 'mock', 'fake'];
    for (const [key, value] of Object.entries(config)) {
      if (value && devIndicators.some(indicator =>
        value.toLowerCase().includes(indicator))) {
        this.warnings.push(`Production config ${key} contains development-like value: ${value}`);
      }
    }
  }

  validateDevelopmentConfig(config) {
    // Development should have debug-friendly settings
    if (config.LOG_LEVEL !== 'debug' && config.LOG_LEVEL !== 'verbose') {
      this.info.push('Consider setting LOG_LEVEL=debug for development');
    }
  }

  validateTestConfig(config) {
    // Test environment should have test-specific settings
    if (!config.DATABASE_URL || !config.DATABASE_URL.includes('test')) {
      this.warnings.push('Test environment should use a separate test database');
    }
  }

  checkSecurityConfiguration() {
    console.log('🔒 Checking security configuration...');

    const envConfig = this.loadEnvironmentConfig();

    // Check JWT configuration
    if (envConfig.JWT_SECRET) {
      if (envConfig.JWT_SECRET.length < 32) {
        this.errors.push('JWT_SECRET should be at least 32 characters long');
      }

      if (envConfig.JWT_SECRET === 'your-secret-key' ||
          envConfig.JWT_SECRET === 'change-me') {
        this.errors.push('JWT_SECRET is using a default/example value');
      }
    }

    // Check session configuration
    if (envConfig.SESSION_SECRET) {
      if (envConfig.SESSION_SECRET.length < 32) {
        this.errors.push('SESSION_SECRET should be at least 32 characters long');
      }
    }

    // Check CORS configuration
    if (envConfig.CORS_ORIGIN === '*') {
      this.warnings.push('CORS_ORIGIN is set to wildcard (*) - consider restricting for security');
    }

    // Check rate limiting
    if (!envConfig.RATE_LIMIT_MAX) {
      this.warnings.push('Consider setting RATE_LIMIT_MAX for API protection');
    }
  }

  validateExternalServiceConfigs() {
    console.log('🔗 Validating external service configurations...');

    const envConfig = this.loadEnvironmentConfig();

    const externalServices = {
      // Blockchain services
      SOLANA_RPC_URL: { required: true, type: 'url' },
      MAGICBLOCK_API_KEY: { required: false, type: 'string' },

      // Database services
      DATABASE_URL: { required: true, type: 'url' },
      REDIS_URL: { required: true, type: 'url' },

      // Monitoring services
      SENTRY_DSN: { required: false, type: 'url' },
      NEW_RELIC_LICENSE_KEY: { required: false, type: 'string' },

      // Email services
      SENDGRID_API_KEY: { required: false, type: 'string' },

      // Storage services
      AWS_ACCESS_KEY_ID: { required: false, type: 'string' },
      AWS_SECRET_ACCESS_KEY: { required: false, type: 'string' }
    };

    for (const [service, config] of Object.entries(externalServices)) {
      const value = envConfig[service];

      if (config.required && !value) {
        this.errors.push(`Required external service configuration missing: ${service}`);
      }

      if (value && config.type === 'url') {
        try {
          new URL(value);
        } catch (error) {
          this.errors.push(`Invalid URL format for ${service}: ${value}`);
        }
      }
    }
  }

  loadEnvironmentConfig() {
    const envFile = path.join(this.projectRoot, 'config', '.env');

    if (fs.existsSync(envFile)) {
      return this.loadEnvironmentFile(envFile);
    }

    // Fallback to process.env
    return process.env;
  }

  loadEnvironmentFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = {};

      content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            let value = valueParts.join('=').trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            config[key.trim()] = value;
          }
        }
      });

      return config;
    } catch (error) {
      this.warnings.push(`Could not load environment file: ${filePath}`);
      return {};
    }
  }

  findCodeFiles() {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py'];
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

  generateReport() {
    console.log('\n🌍 ENVIRONMENT VALIDATION REPORT');
    console.log('='.repeat(50));

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (this.info.length > 0) {
      console.log(`\n✅ Information (${this.info.length}):`);
      this.info.forEach(info => console.log(`  • ${info}`));
    }

    const score = Math.max(0, 100 - (this.errors.length * 10) - (this.warnings.length * 2));
    console.log(`\n📊 Environment Configuration Score: ${score}/100`);

    if (this.errors.length === 0) {
      console.log('🎉 Environment configuration is valid!');
    } else {
      console.log('❌ Environment configuration needs attention.');
      console.log('\n🛠️  Quick fixes:');
      console.log('  1. Review and update config/.env with proper values');
      console.log('  2. Ensure all required environment variables are set');
      console.log('  3. Remove any hardcoded values from source code');
      console.log('  4. Use environment-specific configuration files');
      console.log('  5. Set proper file permissions (chmod 600) on .env files');
    }
  }
}

// Run the validator if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.validateEnvironment();
}

module.exports = EnvironmentValidator;
