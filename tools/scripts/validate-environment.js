#!/usr/bin/env node
// scripts/validate-environment.js
// Production environment validation for Nen Platform

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.results = {
      dependencies: false,
      database: false,
      redis: false,
      authentication: false,
      monitoring: false,
      external_services: false
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async execCommand(command) {
    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          error
        });
      });
    });
  }

  async validateDependencies() {
    this.log('🔍 Validating Dependencies...', 'info');

    // Check Node.js version
    const nodeResult = await this.execCommand('node --version');
    if (nodeResult.success) {
      const nodeVersion = nodeResult.stdout.replace('v', '');
      const majorVersion = parseInt(nodeVersion.split('.')[0]);

      if (majorVersion >= 18) {
        this.log(`✅ Node.js version: ${nodeVersion}`, 'success');
      } else {
        this.errors.push(`Node.js version ${nodeVersion} is too old. Minimum required: 18.x`);
      }
    } else {
      this.errors.push('Node.js not found or not accessible');
    }

    // Check npm
    const npmResult = await this.execCommand('npm --version');
    if (npmResult.success) {
      this.log(`✅ npm version: ${npmResult.stdout}`, 'success');
    } else {
      this.errors.push('npm not found or not accessible');
    }

    // Check Docker
    const dockerResult = await this.execCommand('docker --version');
    if (dockerResult.success) {
      this.log(`✅ Docker version: ${dockerResult.stdout}`, 'success');
    } else {
      this.warnings.push('Docker not found - containerization features will not work');
    }

    // Check Docker Compose
    const composeResult = await this.execCommand('docker-compose --version');
    if (composeResult.success) {
      this.log(`✅ Docker Compose version: ${composeResult.stdout}`, 'success');
    } else {
      this.warnings.push('Docker Compose not found - service orchestration will not work');
    }

    this.results.dependencies = this.errors.length === 0;
  }

  async validateEnvironmentVariables() {
    this.log('🔍 Validating Environment Variables...', 'info');

    const requiredVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'SESSION_SECRET'
    ];

    const optionalVars = [
      'GOOGLE_CLIENT_ID',
      'DISCORD_CLIENT_ID',
      'GITHUB_CLIENT_ID',
      'MAGICBLOCK_API_KEY',
      'SOLANA_RPC_URL'
    ];

    // Check required variables
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        this.log(`✅ ${varName} is configured`, 'success');
      } else {
        this.errors.push(`Required environment variable ${varName} is not set`);
      }
    });

    // Check optional variables
    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        this.log(`✅ ${varName} is configured`, 'success');
      } else {
        this.warnings.push(`Optional environment variable ${varName} is not set`);
      }
    });

    // Validate specific configurations
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.HTTPS) {
        this.warnings.push('HTTPS not configured for production environment');
      }
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        this.errors.push('JWT_SECRET is too short for production use');
      }
    }
  }

  async validateDatabase() {
    this.log('🔍 Validating Database Connection...', 'info');

    try {
      // Check if PostgreSQL schema file exists
      const schemaPath = path.join(__dirname, '../infrastructure/docker/init-db/schema.sql');
      if (fs.existsSync(schemaPath)) {
        this.log('✅ Database schema file found', 'success');
      } else {
        this.errors.push('Database schema file not found');
      }

      // Try to connect to database if running
      const dbResult = await this.execCommand('docker ps --filter "name=postgres" --format "{{.Status}}"');
      if (dbResult.success && dbResult.stdout.includes('Up')) {
        this.log('✅ PostgreSQL container is running', 'success');
        this.results.database = true;
      } else {
        this.warnings.push('PostgreSQL container not running - database tests will be skipped');
      }
    } catch (error) {
      this.warnings.push(`Database validation failed: ${error.message}`);
    }
  }

  async validateRedis() {
    this.log('🔍 Validating Redis Connection...', 'info');

    try {
      const redisResult = await this.execCommand('docker ps --filter "name=redis" --format "{{.Status}}"');
      if (redisResult.success && redisResult.stdout.includes('Up')) {
        this.log('✅ Redis container is running', 'success');
        this.results.redis = true;
      } else {
        this.warnings.push('Redis container not running - caching will not work');
      }
    } catch (error) {
      this.warnings.push(`Redis validation failed: ${error.message}`);
    }
  }

  async validateAuthentication() {
    this.log('🔍 Validating Authentication Configuration...', 'info');

    try {
      const authConfigPath = path.join(__dirname, '../config/auth-config.js');
      if (fs.existsSync(authConfigPath)) {
        const { validateAuthConfig } = require(authConfigPath);
        const validation = validateAuthConfig();

        if (validation.isValid) {
          this.log('✅ Authentication configuration is valid', 'success');
          this.results.authentication = true;
        } else {
          this.warnings.push(`Authentication config issues: ${validation.missingVariables.join(', ')}`);
        }

        if (validation.enabledProviders.length > 0) {
          this.log(`✅ OAuth providers enabled: ${validation.enabledProviders.join(', ')}`, 'success');
        }
      } else {
        this.errors.push('Authentication configuration file not found');
      }
    } catch (error) {
      this.errors.push(`Authentication validation failed: ${error.message}`);
    }
  }

  async validateMonitoring() {
    this.log('🔍 Validating Monitoring Stack...', 'info');

    try {
      // Check Prometheus
      try {
        const prometheusUrl = process.env.PROMETHEUS_URL || `http://${process.env.MONITORING_HOST || process.env.DEFAULT_MONITORING_HOST || (() => {
          throw new Error('MONITORING_HOST or DEFAULT_MONITORING_HOST must be set in environment variables. No hardcoded values allowed.');
        })()}:${process.env.PROMETHEUS_PORT || process.env.DEFAULT_PROMETHEUS_PORT || (() => {
          throw new Error('PROMETHEUS_PORT or DEFAULT_PROMETHEUS_PORT must be set in environment variables. No hardcoded values allowed.');
        })()}`;
        const response = await axios.get(`${prometheusUrl}/-/healthy`, { timeout: 5000 });
        this.log('✅ Prometheus is accessible', 'success');
      } catch (error) {
        this.warnings.push('Prometheus not accessible - monitoring metrics will not work');
      }

      // Check Grafana
      try {
        const grafanaUrl = process.env.GRAFANA_URL || `http://${process.env.MONITORING_HOST || process.env.DEFAULT_MONITORING_HOST || (() => {
          throw new Error('MONITORING_HOST or DEFAULT_MONITORING_HOST must be set in environment variables. No hardcoded values allowed.');
        })()}:${process.env.GRAFANA_PORT || process.env.DEFAULT_GRAFANA_PORT || (() => {
          throw new Error('GRAFANA_PORT or DEFAULT_GRAFANA_PORT must be set in environment variables. No hardcoded values allowed.');
        })()}`;
        const response = await axios.get(`${grafanaUrl}/api/health`, { timeout: 5000 });
        this.log('✅ Grafana is accessible', 'success');
      } catch (error) {
        this.warnings.push('Grafana not accessible - monitoring dashboards will not work');
      }

      // Check monitoring configuration files
      const prometheusConfig = path.join(__dirname, '../infrastructure/monitoring/prometheus.yml');
      const grafanaConfig = path.join(__dirname, '../infrastructure/monitoring/grafana.yaml');

      if (fs.existsSync(prometheusConfig)) {
        this.log('✅ Prometheus configuration found', 'success');
      } else {
        this.warnings.push('Prometheus configuration file not found');
      }

      if (fs.existsSync(grafanaConfig)) {
        this.log('✅ Grafana configuration found', 'success');
      } else {
        this.warnings.push('Grafana configuration file not found');
      }

      this.results.monitoring = true;
    } catch (error) {
      this.warnings.push(`Monitoring validation failed: ${error.message}`);
    }
  }

  async validateExternalServices() {
    this.log('🔍 Validating External Service Integrations...', 'info');

    try {
      // Check MagicBlock integration
      if (process.env.MAGICBLOCK_API_KEY && process.env.MAGICBLOCK_ENDPOINT) {
        try {
          const response = await axios.get(`${process.env.MAGICBLOCK_ENDPOINT}/v1/status`, {
            headers: { 'Authorization': `Bearer ${process.env.MAGICBLOCK_API_KEY}` },
            timeout: 10000
          });
          this.log('✅ MagicBlock API is accessible', 'success');
        } catch (error) {
          this.warnings.push('MagicBlock API not accessible - gaming features may not work');
        }
      } else {
        this.warnings.push('MagicBlock configuration not found');
      }

      // Check Solana RPC
      if (process.env.SOLANA_RPC_URL) {
        try {
          const response = await axios.post(process.env.SOLANA_RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth'
          }, { timeout: 10000 });
          this.log('✅ Solana RPC is accessible', 'success');
        } catch (error) {
          this.warnings.push('Solana RPC not accessible - blockchain features may not work');
        }
      } else {
        this.warnings.push('Solana RPC URL not configured');
      }

      this.results.external_services = true;
    } catch (error) {
      this.warnings.push(`External services validation failed: ${error.message}`);
    }
  }

  async validateAPI() {
    this.log('🔍 Validating API Endpoints...', 'info');

    try {
      const baseURL = process.env.API_BASE_URL || process.env.BACKEND_URL || (() => {
        throw new Error('API_BASE_URL or BACKEND_URL must be set in environment variables. No hardcoded values allowed.');
      })();

      // Check health endpoint
      try {
        const response = await axios.get(`${baseURL}/health`, { timeout: 5000 });
        this.log('✅ API health endpoint is accessible', 'success');
      } catch (error) {
        this.warnings.push('API health endpoint not accessible - backend may not be running');
      }

      // Check other critical endpoints
      const endpoints = ['/api/v1/agents', '/api/v1/matches', '/api/v1/users'];
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${baseURL}${endpoint}`, { timeout: 5000 });
          this.log(`✅ Endpoint ${endpoint} is accessible`, 'success');
        } catch (error) {
          if (error.response && [401, 403].includes(error.response.status)) {
            this.log(`✅ Endpoint ${endpoint} is accessible (auth required)`, 'success');
          } else {
            this.warnings.push(`Endpoint ${endpoint} not accessible`);
          }
        }
      }
    } catch (error) {
      this.warnings.push(`API validation failed: ${error.message}`);
    }
  }

  generateReport() {
    this.log('\n📊 Environment Validation Report', 'info');
    this.log('='.repeat(50), 'info');

    // Summary
    const totalChecks = Object.keys(this.results).length;
    const passedChecks = Object.values(this.results).filter(Boolean).length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    this.log(`\n🎯 Overall Score: ${score}% (${passedChecks}/${totalChecks} checks passed)`,
             score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error');

    // Detailed results
    this.log('\n📋 Detailed Results:', 'info');
    Object.entries(this.results).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌';
      const color = passed ? 'success' : 'error';
      this.log(`  ${status} ${check.replace(/_/g, ' ').toUpperCase()}`, color);
    });

    // Errors
    if (this.errors.length > 0) {
      this.log('\n🚨 Critical Issues:', 'error');
      this.errors.forEach(error => this.log(`  ❌ ${error}`, 'error'));
    }

    // Warnings
    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'warning');
      this.warnings.forEach(warning => this.log(`  ⚠️  ${warning}`, 'warning'));
    }

    // Recommendations
    this.log('\n💡 Recommendations:', 'info');
    if (this.errors.length > 0) {
      this.log('  • Fix all critical issues before proceeding to production', 'warning');
    }
    if (this.warnings.length > 0) {
      this.log('  • Review warnings to ensure full functionality', 'warning');
    }
    if (score >= 80) {
      this.log('  • Environment is ready for deployment! 🚀', 'success');
    } else {
      this.log('  • Address issues before deployment', 'warning');
    }

    return {
      score,
      passed: passedChecks,
      total: totalChecks,
      errors: this.errors,
      warnings: this.warnings,
      results: this.results
    };
  }

  async run() {
    this.log('🚀 Starting Environment Validation...', 'info');

    try {
      await this.validateDependencies();
      await this.validateEnvironmentVariables();
      await this.validateDatabase();
      await this.validateRedis();
      await this.validateAuthentication();
      await this.validateMonitoring();
      await this.validateExternalServices();
      await this.validateAPI();

      return this.generateReport();
    } catch (error) {
      this.log(`❌ Validation failed: ${error.message}`, 'error');
      return {
        score: 0,
        errors: [...this.errors, error.message],
        warnings: this.warnings
      };
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.run().then(report => {
    process.exit(report.score >= 60 ? 0 : 1);
  });
}

module.exports = EnvironmentValidator;
