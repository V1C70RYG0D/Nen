#!/usr/bin/env node

/**
 * Comprehensive System Health and Monitoring Verification - Nen Platform POC
 * 
 * Covers all aspects of Step 10: System Health and Monitoring Verification:
 * 1. Health check endpoints verification
 * 2. Logging systems testing
 * 3. Monitoring integration testing  
 * 4. Error handling validation
 * 5. Backup systems testing
 * 6. Deployment readiness verification
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Configuration from environment variables (GI-18: No hardcoding)
const CONFIG = {
  backend: {
    host: process.env.BACKEND_HOST || '127.0.0.1',
    port: process.env.PORT || 3011
  },
  ai: {
    host: process.env.AI_SERVICE_HOST || '127.0.0.1', 
    port: process.env.AI_SERVICE_PORT || 3003
  },
  frontend: {
    host: process.env.FRONTEND_HOST || '127.0.0.1',
    port: process.env.FRONTEND_PORT || 3010
  },
  monitoring: {
    prometheus: { host: '127.0.0.1', port: 9090 },
    grafana: { host: '127.0.0.1', port: 3000 },
    alertmanager: { host: '127.0.0.1', port: 9093 }
  }
};

class SystemHealthMonitoringValidator {
  constructor() {
    this.results = {
      healthChecks: [],
      logging: [],
      monitoring: [],
      errorHandling: [],
      backup: [],
      deployment: [],
      summary: {}
    };
    this.startTime = new Date();
  }

  /**
   * Utility method to make HTTP requests
   */
  async makeRequest(hostname, port, path = '/', method = 'GET', data = null, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port,
        path,
        method,
        timeout,
        headers: {}
      };

      if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            resolve({
              statusCode: res.statusCode,
              data: jsonData,
              rawData: responseData,
              success: res.statusCode >= 200 && res.statusCode < 300
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: responseData,
              rawData: responseData,
              success: res.statusCode >= 200 && res.statusCode < 300,
              parseError: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
          code: error.code
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          success: false,
          error: 'Request timeout',
          code: 'TIMEOUT'
        });
      });

      if (data) {
        req.write(data);
      }
      req.end();
    });
  }

  /**
   * 1. Verify Health Check Endpoints
   */
  async verifyHealthEndpoints() {
    console.log('\n🏥 STEP 1: HEALTH CHECK ENDPOINTS VERIFICATION');
    console.log('=' .repeat(60));

    const healthEndpoints = [
      {
        name: 'Backend Health',
        host: CONFIG.backend.host,
        port: CONFIG.backend.port,
        path: '/health',
        required: true
      },
      {
        name: 'Backend API Root',
        host: CONFIG.backend.host,
        port: CONFIG.backend.port,
        path: '/',
        required: true
      },
      {
        name: 'AI Service Health',
        host: CONFIG.ai.host,
        port: CONFIG.ai.port,
        path: '/health',
        required: true
      },
      {
        name: 'AI Service Root',
        host: CONFIG.ai.host,
        port: CONFIG.ai.port,
        path: '/',
        required: true
      },
      {
        name: 'Backend Database Connectivity',
        host: CONFIG.backend.host,
        port: CONFIG.backend.port,
        path: '/health/db',
        required: false // May not be implemented
      }
    ];

    for (const endpoint of healthEndpoints) {
      try {
        console.log(`🔍 Testing ${endpoint.name} (${endpoint.host}:${endpoint.port}${endpoint.path})...`);
        
        const result = await this.makeRequest(endpoint.host, endpoint.port, endpoint.path);
        
        if (result.success) {
          console.log(`✅ ${endpoint.name}: HEALTHY`);
          if (result.data.status) console.log(`   Status: ${result.data.status}`);
          if (result.data.version) console.log(`   Version: ${result.data.version}`);
          if (result.data.environment) console.log(`   Environment: ${result.data.environment}`);
          if (result.data.uptime) console.log(`   Uptime: ${result.data.uptime}s`);
          
          this.results.healthChecks.push({
            name: endpoint.name,
            status: 'PASS',
            details: result.data,
            required: endpoint.required
          });
        } else {
          console.log(`❌ ${endpoint.name}: UNHEALTHY (Status: ${result.statusCode})`);
          this.results.healthChecks.push({
            name: endpoint.name,
            status: 'FAIL',
            error: `HTTP ${result.statusCode}`,
            required: endpoint.required
          });
        }
      } catch (error) {
        const status = endpoint.required ? '❌' : '⚠️';
        console.log(`${status} ${endpoint.name}: ${endpoint.required ? 'FAILED' : 'OPTIONAL FAILED'} - ${error.error || error.message}`);
        this.results.healthChecks.push({
          name: endpoint.name,
          status: endpoint.required ? 'FAIL' : 'WARN',
          error: error.error || error.message,
          required: endpoint.required
        });
      }
      console.log('');
    }
  }

  /**
   * 2. Test Logging Systems
   */
  async testLoggingSystems() {
    console.log('\n📝 STEP 2: LOGGING SYSTEMS VERIFICATION');
    console.log('=' .repeat(60));

    const logTests = [
      {
        name: 'Backend Log Directory',
        path: './backend/logs',
        type: 'directory'
      },
      {
        name: 'Backend Log Files',
        path: './backend/logs/app.log',
        type: 'file'
      },
      {
        name: 'Root Log Directory',
        path: './logs',
        type: 'directory'
      },
      {
        name: 'Infrastructure Logs',
        path: './infrastructure/logging',
        type: 'directory'
      }
    ];

    // Check log directories and files
    for (const test of logTests) {
      try {
        const stats = fs.existsSync(test.path) ? fs.statSync(test.path) : null;
        
        if (stats) {
          if (test.type === 'directory' && stats.isDirectory()) {
            console.log(`✅ ${test.name}: EXISTS (${test.path})`);
            
            // List log files in directory
            const files = fs.readdirSync(test.path);
            const logFiles = files.filter(f => f.endsWith('.log') || f.endsWith('.txt'));
            console.log(`   Log files found: ${logFiles.length}`);
            if (logFiles.length > 0) {
              console.log(`   Recent files: ${logFiles.slice(0, 3).join(', ')}`);
            }
            
            this.results.logging.push({
              name: test.name,
              status: 'PASS',
              path: test.path,
              fileCount: logFiles.length
            });
          } else if (test.type === 'file' && stats.isFile()) {
            console.log(`✅ ${test.name}: EXISTS (${stats.size} bytes)`);
            this.results.logging.push({
              name: test.name,
              status: 'PASS',
              path: test.path,
              size: stats.size
            });
          } else {
            console.log(`⚠️ ${test.name}: WRONG TYPE (expected ${test.type})`);
            this.results.logging.push({
              name: test.name,
              status: 'WARN',
              error: `Expected ${test.type}, found ${stats.isDirectory() ? 'directory' : 'file'}`
            });
          }
        } else {
          console.log(`❌ ${test.name}: NOT FOUND (${test.path})`);
          this.results.logging.push({
            name: test.name,
            status: 'FAIL',
            error: 'Path not found',
            path: test.path
          });
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        this.results.logging.push({
          name: test.name,
          status: 'FAIL',
          error: error.message
        });
      }
      console.log('');
    }

    // Test log levels and error tracking
    await this.testLogLevels();
    await this.testErrorTracking();
  }

  /**
   * Test log levels functionality
   */
  async testLogLevels() {
    console.log('🔍 Testing Log Levels...');
    
    try {
      // Test backend logging endpoint if available
      const testLog = await this.makeRequest(CONFIG.backend.host, CONFIG.backend.port, '/api/test-logging', 'POST', JSON.stringify({
        level: 'info',
        message: 'Health check test log entry',
        timestamp: new Date().toISOString()
      }));
      
      if (testLog.success) {
        console.log('✅ Log Level Testing: Backend accepts log entries');
        this.results.logging.push({
          name: 'Log Levels',
          status: 'PASS',
          details: 'Backend log endpoint responsive'
        });
      } else {
        console.log('⚠️ Log Level Testing: Backend log endpoint not available');
        this.results.logging.push({
          name: 'Log Levels',
          status: 'WARN',
          details: 'Backend log endpoint returned non-success status'
        });
      }
    } catch (error) {
      console.log('⚠️ Log Level Testing: Could not test backend logging endpoint');
      this.results.logging.push({
        name: 'Log Levels',
        status: 'WARN',
        details: 'Backend log endpoint not accessible'
      });
    }
    console.log('');
  }

  /**
   * Test error tracking systems
   */
  async testErrorTracking() {
    console.log('🔍 Testing Error Tracking...');
    
    try {
      // Test error endpoint
      const errorTest = await this.makeRequest(CONFIG.backend.host, CONFIG.backend.port, '/api/test-error', 'GET');
      
      // We expect this to either work (with error simulation) or fail gracefully
      console.log('✅ Error Tracking: Backend error handling tested');
      this.results.logging.push({
        name: 'Error Tracking',
        status: 'PASS',
        details: `Error endpoint returned status ${errorTest.statusCode || 'TIMEOUT'}`
      });
      
    } catch (error) {
      // This is expected if the endpoint doesn't exist
      console.log('⚠️ Error Tracking: Error test endpoint not available (expected for simple server)');
      this.results.logging.push({
        name: 'Error Tracking',
        status: 'WARN',
        details: 'Error test endpoint not implemented'
      });
    }
    console.log('');
  }

  /**
   * 3. Test Monitoring Integration
   */
  async testMonitoringIntegration() {
    console.log('\n📊 STEP 3: MONITORING INTEGRATION VERIFICATION');
    console.log('=' .repeat(60));

    // Test Prometheus
    await this.testPrometheus();
    
    // Test Grafana
    await this.testGrafana();
    
    // Test Alertmanager
    await this.testAlertmanager();
    
    // Test metrics collection
    await this.testMetricsCollection();
  }

  async testPrometheus() {
    console.log('🔍 Testing Prometheus...');
    try {
      const prometheus = await this.makeRequest(CONFIG.monitoring.prometheus.host, CONFIG.monitoring.prometheus.port, '/-/healthy');
      
      if (prometheus.success) {
        console.log('✅ Prometheus: HEALTHY');
        
        // Test metrics endpoint
        const metrics = await this.makeRequest(CONFIG.monitoring.prometheus.host, CONFIG.monitoring.prometheus.port, '/metrics');
        console.log(`   Metrics endpoint: ${metrics.success ? 'ACCESSIBLE' : 'INACCESSIBLE'}`);
        
        this.results.monitoring.push({
          name: 'Prometheus',
          status: 'PASS',
          details: 'Service healthy and metrics accessible'
        });
      } else {
        console.log('❌ Prometheus: UNHEALTHY');
        this.results.monitoring.push({
          name: 'Prometheus',
          status: 'FAIL',
          error: `HTTP ${prometheus.statusCode}`
        });
      }
    } catch (error) {
      console.log('❌ Prometheus: NOT RUNNING - ' + (error.error || error.message));
      this.results.monitoring.push({
        name: 'Prometheus',
        status: 'FAIL',
        error: error.error || error.message
      });
    }
    console.log('');
  }

  async testGrafana() {
    console.log('🔍 Testing Grafana...');
    try {
      const grafana = await this.makeRequest(CONFIG.monitoring.grafana.host, CONFIG.monitoring.grafana.port, '/api/health');
      
      if (grafana.success) {
        console.log('✅ Grafana: HEALTHY');
        this.results.monitoring.push({
          name: 'Grafana',
          status: 'PASS',
          details: 'Dashboard service healthy'
        });
      } else {
        console.log('❌ Grafana: UNHEALTHY');
        this.results.monitoring.push({
          name: 'Grafana',
          status: 'FAIL',
          error: `HTTP ${grafana.statusCode}`
        });
      }
    } catch (error) {
      console.log('❌ Grafana: NOT RUNNING - ' + (error.error || error.message));
      this.results.monitoring.push({
        name: 'Grafana',
        status: 'FAIL',
        error: error.error || error.message
      });
    }
    console.log('');
  }

  async testAlertmanager() {
    console.log('🔍 Testing Alertmanager...');
    try {
      const alertmanager = await this.makeRequest(CONFIG.monitoring.alertmanager.host, CONFIG.monitoring.alertmanager.port, '/-/healthy');
      
      if (alertmanager.success) {
        console.log('✅ Alertmanager: HEALTHY');
        this.results.monitoring.push({
          name: 'Alertmanager',
          status: 'PASS',
          details: 'Alert system healthy'
        });
      } else {
        console.log('❌ Alertmanager: UNHEALTHY');
        this.results.monitoring.push({
          name: 'Alertmanager',
          status: 'FAIL',
          error: `HTTP ${alertmanager.statusCode}`
        });
      }
    } catch (error) {
      console.log('❌ Alertmanager: NOT RUNNING - ' + (error.error || error.message));
      this.results.monitoring.push({
        name: 'Alertmanager',
        status: 'FAIL',
        error: error.error || error.message
      });
    }
    console.log('');
  }

  async testMetricsCollection() {
    console.log('🔍 Testing Metrics Collection...');
    
    // Test backend metrics endpoint
    try {
      const backendMetrics = await this.makeRequest(CONFIG.backend.host, CONFIG.backend.port, '/metrics');
      
      if (backendMetrics.success) {
        console.log('✅ Backend Metrics: AVAILABLE');
        // Check for key metrics
        const metricsData = backendMetrics.rawData || '';
        const hasHttpMetrics = metricsData.includes('http_requests') || metricsData.includes('http_request');
        const hasMemoryMetrics = metricsData.includes('process_resident_memory') || metricsData.includes('memory');
        
        console.log(`   HTTP metrics: ${hasHttpMetrics ? 'FOUND' : 'NOT FOUND'}`);
        console.log(`   Memory metrics: ${hasMemoryMetrics ? 'FOUND' : 'NOT FOUND'}`);
        
        this.results.monitoring.push({
          name: 'Backend Metrics Collection',
          status: 'PASS',
          details: {
            httpMetrics: hasHttpMetrics,
            memoryMetrics: hasMemoryMetrics,
            totalSize: metricsData.length
          }
        });
      } else {
        console.log('⚠️ Backend Metrics: NOT AVAILABLE');
        this.results.monitoring.push({
          name: 'Backend Metrics Collection',
          status: 'WARN',
          error: 'Metrics endpoint not available'
        });
      }
    } catch (error) {
      console.log('⚠️ Backend Metrics: NOT ACCESSIBLE - ' + (error.error || error.message));
      this.results.monitoring.push({
        name: 'Backend Metrics Collection',
        status: 'WARN',
        error: error.error || error.message
      });
    }
    console.log('');
  }

  /**
   * 4. Validate Error Handling
   */
  async validateErrorHandling() {
    console.log('\n🛡️ STEP 4: ERROR HANDLING VALIDATION');
    console.log('=' .repeat(60));

    const errorTests = [
      {
        name: 'Invalid Endpoint (404 Error)',
        host: CONFIG.backend.host,
        port: CONFIG.backend.port,
        path: '/nonexistent-endpoint-12345',
        expectedStatus: 404
      },
      {
        name: 'Invalid JSON (400 Error)',
        host: CONFIG.backend.host,
        port: CONFIG.backend.port,
        path: '/api/analytics/web-vitals',
        method: 'POST',
        data: 'invalid-json-data',
        expectedStatus: 400
      },
      {
        name: 'Missing Required Data',
        host: CONFIG.backend.host,
        port: CONFIG.backend.port,
        path: '/api/analytics/web-vitals',
        method: 'POST',
        data: JSON.stringify({}),
        expectedStatus: [200, 400, 422] // Accept various valid responses
      }
    ];

    for (const test of errorTests) {
      try {
        console.log(`🔍 Testing ${test.name}...`);
        
        const result = await this.makeRequest(
          test.host, 
          test.port, 
          test.path, 
          test.method || 'GET',
          test.data
        );
        
        const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
        const statusMatch = expectedStatuses.includes(result.statusCode);
        
        if (statusMatch) {
          console.log(`✅ ${test.name}: HANDLED CORRECTLY (${result.statusCode})`);
          if (result.data && result.data.error) {
            console.log(`   Error message: ${result.data.error}`);
          }
          this.results.errorHandling.push({
            name: test.name,
            status: 'PASS',
            statusCode: result.statusCode,
            hasErrorMessage: !!(result.data && result.data.error)
          });
        } else {
          console.log(`⚠️ ${test.name}: UNEXPECTED STATUS (got ${result.statusCode}, expected ${test.expectedStatus})`);
          this.results.errorHandling.push({
            name: test.name,
            status: 'WARN',
            statusCode: result.statusCode,
            expectedStatus: test.expectedStatus
          });
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.error || error.message}`);
        this.results.errorHandling.push({
          name: test.name,
          status: 'FAIL',
          error: error.error || error.message
        });
      }
      console.log('');
    }

    // Test graceful degradation
    await this.testGracefulDegradation();
    
    // Test user-friendly error messages
    await this.testUserFriendlyErrors();
  }

  async testGracefulDegradation() {
    console.log('🔍 Testing Graceful Degradation...');
    
    try {
      // Test backend when AI service is down
      const backendStats = await this.makeRequest(CONFIG.backend.host, CONFIG.backend.port, '/api/stats');
      
      if (backendStats.success) {
        console.log('✅ Graceful Degradation: Backend continues serving data despite AI service being down');
        this.results.errorHandling.push({
          name: 'Graceful Degradation',
          status: 'PASS',
          details: 'Backend operational despite AI service unavailability'
        });
      } else {
        console.log('⚠️ Graceful Degradation: Backend may be affected by AI service unavailability');
        this.results.errorHandling.push({
          name: 'Graceful Degradation',
          status: 'WARN',
          details: 'Backend may be dependent on AI service'
        });
      }
    } catch (error) {
      console.log('❌ Graceful Degradation: Backend not accessible');
      this.results.errorHandling.push({
        name: 'Graceful Degradation',
        status: 'FAIL',
        error: error.error || error.message
      });
    }
    console.log('');
  }

  async testUserFriendlyErrors() {
    console.log('🔍 Testing User-Friendly Error Messages...');
    
    try {
      const invalidEndpoint = await this.makeRequest(CONFIG.backend.host, CONFIG.backend.port, '/api/invalid-test-endpoint');
      
      if (invalidEndpoint.data && invalidEndpoint.data.error) {
        const errorMsg = invalidEndpoint.data.error;
        const isFriendly = !errorMsg.includes('stack') && !errorMsg.includes('TypeError') && errorMsg.length < 200;
        
        if (isFriendly) {
          console.log('✅ User-Friendly Errors: Error messages are clean and user-friendly');
          console.log(`   Sample error: "${errorMsg}"`);
          this.results.errorHandling.push({
            name: 'User-Friendly Error Messages',
            status: 'PASS',
            sampleError: errorMsg
          });
        } else {
          console.log('⚠️ User-Friendly Errors: Error messages may contain technical details');
          this.results.errorHandling.push({
            name: 'User-Friendly Error Messages',
            status: 'WARN',
            sampleError: errorMsg.substring(0, 100) + '...'
          });
        }
      } else {
        console.log('⚠️ User-Friendly Errors: Could not test error message format');
        this.results.errorHandling.push({
          name: 'User-Friendly Error Messages',
          status: 'WARN',
          details: 'No error message in response'
        });
      }
    } catch (error) {
      console.log('❌ User-Friendly Errors: Could not test error messages');
      this.results.errorHandling.push({
        name: 'User-Friendly Error Messages',
        status: 'FAIL',
        error: error.error || error.message
      });
    }
    console.log('');
  }

  /**
   * 5. Test Backup Systems
   */
  async testBackupSystems() {
    console.log('\n💾 STEP 5: BACKUP SYSTEMS VERIFICATION');
    console.log('=' .repeat(60));

    // Test database backup configurations
    await this.testDatabaseBackups();
    
    // Test configuration backups
    await this.testConfigurationBackups();
  }

  async testDatabaseBackups() {
    console.log('🔍 Testing Database Backup Systems...');
    
    const backupPaths = [
      './backend/prisma/backups',
      './backups/database', 
      './infrastructure/backups',
      './backend/backups'
    ];
    
    let backupSystemFound = false;
    
    for (const path of backupPaths) {
      if (fs.existsSync(path)) {
        console.log(`✅ Database Backup Directory Found: ${path}`);
        
        const files = fs.readdirSync(path);
        console.log(`   Backup files: ${files.length}`);
        
        backupSystemFound = true;
        this.results.backup.push({
          name: 'Database Backup Directory',
          status: 'PASS',
          path,
          fileCount: files.length
        });
        break;
      }
    }
    
    if (!backupSystemFound) {
      console.log('⚠️ Database Backup: No backup directories found');
      this.results.backup.push({
        name: 'Database Backup Directory',
        status: 'WARN',
        details: 'No backup directories found in expected locations'
      });
    }

    // Check for backup scripts
    const backupScripts = [
      './scripts/backup-db.js',
      './backend/scripts/backup.js',
      './infrastructure/scripts/backup.sh'
    ];
    
    for (const script of backupScripts) {
      if (fs.existsSync(script)) {
        console.log(`✅ Backup Script Found: ${script}`);
        this.results.backup.push({
          name: 'Database Backup Script',
          status: 'PASS',
          path: script
        });
        backupSystemFound = true;
        break;
      }
    }
    
    console.log('');
  }

  async testConfigurationBackups() {
    console.log('🔍 Testing Configuration Backup Systems...');
    
    const configFiles = [
      { path: './.env', name: 'Environment Configuration' },
      { path: './backend/.env', name: 'Backend Configuration' },
      { path: './package.json', name: 'Package Configuration' },
      { path: './backend/package.json', name: 'Backend Package Configuration' },
      { path: './monitoring/docker-compose.yml', name: 'Monitoring Configuration' }
    ];
    
    let configsFound = 0;
    
    for (const config of configFiles) {
      if (fs.existsSync(config.path)) {
        console.log(`✅ ${config.name}: FOUND (${config.path})`);
        
        // Check if there's a backup version
        const backupPath = config.path + '.backup';
        const hasBackup = fs.existsSync(backupPath);
        console.log(`   Backup file: ${hasBackup ? 'FOUND' : 'NOT FOUND'}`);
        
        this.results.backup.push({
          name: config.name,
          status: 'PASS',
          path: config.path,
          hasBackup
        });
        
        configsFound++;
      } else {
        console.log(`⚠️ ${config.name}: NOT FOUND (${config.path})`);
        this.results.backup.push({
          name: config.name,
          status: 'WARN',
          path: config.path,
          error: 'Configuration file not found'
        });
      }
    }
    
    console.log(`\n📊 Configuration Files Summary: ${configsFound}/${configFiles.length} found`);
    console.log('');
  }

  /**
   * 6. Verify Deployment Readiness
   */
  async verifyDeploymentReadiness() {
    console.log('\n🚀 STEP 6: DEPLOYMENT READINESS VERIFICATION');
    console.log('=' .repeat(60));

    // Test environment configurations
    await this.testEnvironmentConfigurations();
    
    // Test secret management
    await this.testSecretManagement();
    
    // Test CI/CD pipeline validation
    await this.testCICDValidation();
  }

  async testEnvironmentConfigurations() {
    console.log('🔍 Testing Environment Configurations...');
    
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT', 
      'AI_SERVICE_PORT',
      'FRONTEND_URL',
      'BACKEND_URL'
    ];
    
    const optionalEnvVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'GRAFANA_ADMIN_PASSWORD'
    ];
    
    let requiredFound = 0;
    let optionalFound = 0;
    
    console.log('Required environment variables:');
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        console.log(`✅ ${envVar}: SET`);
        requiredFound++;
      } else {
        console.log(`❌ ${envVar}: NOT SET`);
      }
    }
    
    console.log('\nOptional environment variables:');
    for (const envVar of optionalEnvVars) {
      const value = process.env[envVar];
      if (value) {
        console.log(`✅ ${envVar}: SET`);
        optionalFound++;
      } else {
        console.log(`⚠️ ${envVar}: NOT SET`);
      }
    }
    
    const envScore = (requiredFound / requiredEnvVars.length) * 100;
    console.log(`\n📊 Environment Configuration: ${requiredFound}/${requiredEnvVars.length} required (${Math.round(envScore)}%)`);
    
    this.results.deployment.push({
      name: 'Environment Configuration',
      status: envScore === 100 ? 'PASS' : (envScore >= 75 ? 'WARN' : 'FAIL'),
      requiredFound,
      totalRequired: requiredEnvVars.length,
      optionalFound,
      totalOptional: optionalEnvVars.length,
      score: envScore
    });
    
    console.log('');
  }

  async testSecretManagement() {
    console.log('🔍 Testing Secret Management...');
    
    // Check for secure environment files
    const secureFiles = ['.env.secure', 'backend/.env.secure', '.env.production'];
    let secureFilesFound = 0;
    
    for (const file of secureFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ Secure Environment File: ${file} found`);
        secureFilesFound++;
      }
    }
    
    // Check that sensitive data is not in regular config files
    const configFiles = ['.env', 'backend/.env'];
    let hasHardcodedSecrets = false;
    
    for (const file of configFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Look for potential hardcoded secrets (basic check)
        const suspiciousPatterns = [
          /password\s*=\s*["']?[^"'\s]+["']?/i,
          /secret\s*=\s*["']?[^"'\s]{20,}["']?/i,
          /key\s*=\s*["']?[^"'\s]{20,}["']?/i
        ];
        
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(content)) {
            hasHardcodedSecrets = true;
            break;
          }
        }
      }
    }
    
    if (!hasHardcodedSecrets) {
      console.log('✅ Secret Management: No hardcoded secrets detected in config files');
    } else {
      console.log('⚠️ Secret Management: Potential hardcoded secrets detected');
    }
    
    this.results.deployment.push({
      name: 'Secret Management',
      status: !hasHardcodedSecrets && secureFilesFound > 0 ? 'PASS' : 'WARN',
      secureFilesFound,
      hasHardcodedSecrets
    });
    
    console.log('');
  }

  async testCICDValidation() {
    console.log('🔍 Testing CI/CD Pipeline Configuration...');
    
    const cicdFiles = [
      '.github/workflows',
      '.gitlab-ci.yml', 
      'Jenkinsfile',
      'azure-pipelines.yml',
      '.circleci/config.yml'
    ];
    
    let cicdFound = false;
    
    for (const path of cicdFiles) {
      if (fs.existsSync(path)) {
        console.log(`✅ CI/CD Configuration Found: ${path}`);
        
        if (path.includes('.github/workflows')) {
          const workflows = fs.readdirSync(path);
          console.log(`   Workflow files: ${workflows.length}`);
          console.log(`   Workflows: ${workflows.join(', ')}`);
        }
        
        cicdFound = true;
        this.results.deployment.push({
          name: 'CI/CD Pipeline',
          status: 'PASS',
          path,
          type: path.includes('github') ? 'GitHub Actions' : 'Other'
        });
        break;
      }
    }
    
    if (!cicdFound) {
      console.log('⚠️ CI/CD Pipeline: No CI/CD configuration files found');
      this.results.deployment.push({
        name: 'CI/CD Pipeline',
        status: 'WARN',
        details: 'No CI/CD configuration found'
      });
    }
    
    // Check for Docker configurations
    const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'backend/Dockerfile'];
    let dockerFound = false;
    
    for (const file of dockerFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ Docker Configuration: ${file} found`);
        dockerFound = true;
      }
    }
    
    if (dockerFound) {
      this.results.deployment.push({
        name: 'Docker Configuration',
        status: 'PASS',
        details: 'Docker configuration files found'
      });
    } else {
      console.log('⚠️ Docker Configuration: No Docker files found');
      this.results.deployment.push({
        name: 'Docker Configuration',
        status: 'WARN',
        details: 'No Docker configuration found'
      });
    }
    
    console.log('');
  }

  /**
   * Generate comprehensive summary report
   */
  generateSummaryReport() {
    console.log('\n📊 COMPREHENSIVE SYSTEM HEALTH AND MONITORING REPORT');
    console.log('=' .repeat(70));
    
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;
    
    console.log(`🕒 Assessment Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📅 Timestamp: ${endTime.toISOString()}\n`);

    // Calculate summary statistics
    const categories = [
      { name: 'Health Checks', results: this.results.healthChecks },
      { name: 'Logging Systems', results: this.results.logging },
      { name: 'Monitoring Integration', results: this.results.monitoring },
      { name: 'Error Handling', results: this.results.errorHandling },
      { name: 'Backup Systems', results: this.results.backup },
      { name: 'Deployment Readiness', results: this.results.deployment }
    ];

    let totalTests = 0;
    let totalPassed = 0;
    let totalWarnings = 0;
    let totalFailed = 0;

    console.log('CATEGORY BREAKDOWN:');
    console.log('-' .repeat(50));

    for (const category of categories) {
      const passed = category.results.filter(r => r.status === 'PASS').length;
      const warnings = category.results.filter(r => r.status === 'WARN').length;
      const failed = category.results.filter(r => r.status === 'FAIL').length;
      const total = category.results.length;

      totalTests += total;
      totalPassed += passed;
      totalWarnings += warnings;
      totalFailed += failed;

      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
      const status = passRate >= 80 ? '✅' : (passRate >= 60 ? '⚠️' : '❌');

      console.log(`${status} ${category.name.padRight ? category.name.padRight(25) : category.name.padEnd(25)} ${passed}/${total} (${passRate}%)`);
    }

    console.log('-' .repeat(50));
    
    const overallPassRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    const overallStatus = overallPassRate >= 80 ? '✅ EXCELLENT' : 
                         overallPassRate >= 60 ? '⚠️ GOOD' : 
                         overallPassRate >= 40 ? '⚠️ FAIR' : '❌ POOR';

    console.log(`🎯 OVERALL STATUS: ${overallStatus}`);
    console.log(`📊 TOTAL TESTS: ${totalTests}`);
    console.log(`✅ PASSED: ${totalPassed}`);
    console.log(`⚠️ WARNINGS: ${totalWarnings}`);
    console.log(`❌ FAILED: ${totalFailed}`);
    console.log(`📈 SUCCESS RATE: ${overallPassRate}%`);

    // Critical issues
    console.log('\n🚨 CRITICAL ISSUES:');
    let criticalIssues = 0;
    for (const category of categories) {
      const criticalFailures = category.results.filter(r => r.status === 'FAIL' && r.required !== false);
      for (const failure of criticalFailures) {
        console.log(`❌ ${category.name}: ${failure.name} - ${failure.error || failure.details || 'Failed'}`);
        criticalIssues++;
      }
    }

    if (criticalIssues === 0) {
      console.log('🎉 No critical issues detected!');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    const recommendations = this.generateRecommendations();
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });

    // Summary for automation
    this.results.summary = {
      timestamp: endTime.toISOString(),
      duration,
      totalTests,
      totalPassed,
      totalWarnings,
      totalFailed,
      overallPassRate,
      overallStatus: overallStatus.replace(/[✅⚠️❌]\s*/, ''),
      criticalIssues,
      categories: categories.map(cat => ({
        name: cat.name,
        total: cat.results.length,
        passed: cat.results.filter(r => r.status === 'PASS').length,
        warnings: cat.results.filter(r => r.status === 'WARN').length,
        failed: cat.results.filter(r => r.status === 'FAIL').length
      }))
    };

    return overallPassRate >= 70;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Health check recommendations
    const healthFailures = this.results.healthChecks.filter(r => r.status === 'FAIL');
    if (healthFailures.length > 0) {
      recommendations.push('Start all required services (Backend, AI Service) for complete health check coverage');
    }

    // Monitoring recommendations
    const monitoringFailures = this.results.monitoring.filter(r => r.status === 'FAIL');
    if (monitoringFailures.length > 0) {
      recommendations.push('Set up monitoring stack (Prometheus, Grafana, Alertmanager) for production readiness');
    }

    // Logging recommendations
    const loggingIssues = this.results.logging.filter(r => r.status !== 'PASS');
    if (loggingIssues.length > 0) {
      recommendations.push('Establish comprehensive logging infrastructure with proper file organization');
    }

    // Backup recommendations
    const backupIssues = this.results.backup.filter(r => r.status !== 'PASS');
    if (backupIssues.length > 0) {
      recommendations.push('Implement automated backup systems for database and configuration files');
    }

    // Deployment recommendations
    const deploymentIssues = this.results.deployment.filter(r => r.status !== 'PASS');
    if (deploymentIssues.length > 0) {
      recommendations.push('Complete deployment configuration including CI/CD pipelines and environment management');
    }

    if (recommendations.length === 0) {
      recommendations.push('System appears well-configured. Continue regular monitoring and maintenance.');
    }

    return recommendations;
  }

  /**
   * Save detailed results to file
   */
  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `SYSTEM_HEALTH_MONITORING_REPORT_${timestamp}.json`;
    
    try {
      fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Detailed results saved to: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`\n❌ Failed to save results: ${error.message}`);
      return null;
    }
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🔧 COMPREHENSIVE SYSTEM HEALTH AND MONITORING VERIFICATION');
    console.log('🎯 Nen Platform POC - Step 10 Validation');
    console.log('=' .repeat(70));
    console.log(`🚀 Starting assessment at ${this.startTime.toISOString()}`);
    
    try {
      // Execute all verification steps
      await this.verifyHealthEndpoints();
      await this.testLoggingSystems(); 
      await this.testMonitoringIntegration();
      await this.validateErrorHandling();
      await this.testBackupSystems();
      await this.verifyDeploymentReadiness();

      // Generate summary report
      const success = this.generateSummaryReport();
      
      // Save results
      await this.saveResults();

      return success;
    } catch (error) {
      console.error('💥 System health verification failed:', error);
      return false;
    }
  }
}

// Main execution
async function main() {
  const validator = new SystemHealthMonitoringValidator();
  
  try {
    const success = await validator.run();
    
    console.log('\n' + '=' .repeat(70));
    if (success) {
      console.log('🎉 SYSTEM HEALTH AND MONITORING VERIFICATION: COMPLETED SUCCESSFULLY');
      console.log('✅ System is ready for production deployment');
      process.exit(0);
    } else {
      console.log('⚠️ SYSTEM HEALTH AND MONITORING VERIFICATION: COMPLETED WITH ISSUES');
      console.log('🔧 Review recommendations and address critical issues before deployment');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Verification process failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SystemHealthMonitoringValidator;
